import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { sign } from '../src/modules/payments/provider.js';
import { app, createUser, ORIGIN, resetDatabase, signIn } from './helpers.js';

beforeEach(async () => {
  await resetDatabase();
});
afterAll(() => prisma.$disconnect());

const design = {
  layout: 'centered',
  frame: 'thin',
  ornament: 'floral',
  pattern: 'none',
  font: 'elegant',
  palette: { background: '#ffffff', surface: '#fffdf8', text: '#222222', muted: '#777777', accent: '#b08446' },
};

type Agent = Awaited<ReturnType<typeof signIn>>;
const post = (agent: Agent, path: string, body?: object) => agent.post(`/api/v1${path}`).set('Origin', ORIGIN).send(body);
const patch = (agent: Agent, path: string, body: object) => agent.patch(`/api/v1${path}`).set('Origin', ORIGIN).send(body);

async function world() {
  const category = await prisma.eventCategory.create({ data: { slug: 'wedding', nameEn: 'Wedding', nameAr: 'زفاف' } });
  const template = await prisma.template.create({
    data: { categoryId: category.id, slug: 't1', nameEn: 'T', nameAr: 'ت', designConfig: design, status: 'ACTIVE' },
  });
  const pkg = await prisma.package.create({ data: { code: 'standard', nameEn: 'Standard', nameAr: 'أ', priceMinor: 29900, features: {} } });
  const admin = await createUser({ role: 'ADMIN' });
  const adminAgent = await signIn(admin.user.email, admin.password);
  const customer = await createUser();
  const customerAgent = await signIn(customer.user.email, customer.password);
  const invitation = (await post(customerAgent, '/invitations', { templateSlug: 't1', title: 'Wedding' })).body.data;
  await patch(customerAgent, `/invitations/${invitation.id}`, { baseRevision: 0, eventDate: '2026-12-12', content: { headline: 'A', venueName: 'Hall' } });
  return { category, template, pkg, adminAgent, admin: admin.user, customerAgent, customer: customer.user, invitation };
}

async function pay(w: Awaited<ReturnType<typeof world>>) {
  const res = await post(w.customerAgent, '/payments/checkout', { invitationId: w.invitation.id, packageCode: 'standard' });
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.body.data.paymentId } });
  const body = JSON.stringify({ id: 'evt', reference: payment.providerReference, outcome: 'SUCCEEDED', amountMinor: payment.amountMinor, currency: payment.currency });
  await request(app).post('/api/v1/webhooks/payments/test').set('Content-Type', 'application/json').set('x-signature', sign(body)).send(body);
  return payment;
}

describe('admin authorization', () => {
  const endpoints = ['/overview', '/users', '/invitations', '/templates', '/categories', '/packages', '/payments', '/audit'];

  it('rejects anonymous users and customers on every endpoint', async () => {
    const w = await world();
    for (const path of endpoints) {
      expect((await request(app).get(`/api/v1/admin${path}`)).status).toBe(401);
      expect((await w.customerAgent.get(`/api/v1/admin${path}`)).status).toBe(403);
      expect((await w.adminAgent.get(`/api/v1/admin${path}`)).status).toBe(200);
    }
  });

  it('rejects customers on mutating endpoints', async () => {
    const w = await world();
    expect((await patch(w.customerAgent, `/admin/templates/${w.template.id}`, { status: 'ARCHIVED' })).status).toBe(403);
    expect((await patch(w.customerAgent, `/admin/packages/${w.pkg.id}`, { priceMinor: 1 })).status).toBe(403);
    expect((await patch(w.customerAgent, `/admin/users/${w.customer.id}`, { role: 'ADMIN' })).status).toBe(403);
    expect((await post(w.customerAgent, `/admin/invitations/${w.invitation.id}/archive`)).status).toBe(403);
  });
});

describe('admin actions', () => {
  it('manages users safely and audits role changes', async () => {
    const w = await world();
    expect((await patch(w.adminAgent, `/admin/users/${w.admin.id}`, { role: 'CUSTOMER' })).status).toBe(409);
    expect((await patch(w.adminAgent, `/admin/users/${w.customer.id}`, { role: 'ADMIN' })).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: w.customer.id } })).role).toBe('ADMIN');
    const audit = (await w.adminAgent.get('/api/v1/admin/audit')).body.data;
    expect(audit[0]).toMatchObject({ action: 'user.role_changed', actorEmail: w.admin.email });
    const users = (await w.adminAgent.get(`/api/v1/admin/users?q=${w.customer.email.slice(0, 8)}`)).body.data;
    expect(users[0]).not.toHaveProperty('passwordHash');
  });

  it('archiving a template hides it from new invitations but not from published ones', async () => {
    const w = await world();
    const payment = await pay(w);
    expect(payment).toBeTruthy();
    const slug = w.invitation.slug as string;
    await patch(w.adminAgent, `/admin/templates/${w.template.id}`, { status: 'ARCHIVED' });
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/templates')).body.data).toEqual([]);
    expect((await post(w.customerAgent, '/invitations', { templateSlug: 't1', title: 'New' })).status).toBe(400);
  });

  it('changes prices for new checkouts only', async () => {
    const w = await world();
    const first = await pay(w);
    await patch(w.adminAgent, `/admin/packages/${w.pkg.id}`, { priceMinor: 59900 });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: first.id } })).amountMinor).toBe(29900);
    expect((await request(app).get('/api/v1/packages')).body.data[0].priceMinor).toBe(59900);
    expect((await patch(w.adminAgent, `/admin/packages/${w.pkg.id}`, { priceMinor: -5 })).status).toBe(400);
  });

  it('moderates invitations', async () => {
    const w = await world();
    await pay(w);
    const slug = w.invitation.slug as string;
    expect((await post(w.adminAgent, `/admin/invitations/${w.invitation.id}/unpublish`)).status).toBe(200);
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(404);
    expect((await w.adminAgent.get('/api/v1/admin/invitations?status=UNPUBLISHED')).body.data).toHaveLength(1);
  });

  it('refunds a payment, unpublishes the invitation and records it', async () => {
    const w = await world();
    const payment = await pay(w);
    expect((await post(w.adminAgent, `/admin/payments/${payment.id}/refund`)).status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('REFUNDED');
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: w.invitation.id } })).status).toBe('UNPUBLISHED');
    expect(await prisma.auditLog.count({ where: { action: 'payment.refunded' } })).toBe(1);
    expect((await post(w.adminAgent, `/admin/payments/${payment.id}/refund`)).status).toBe(409);
  });

  it('reconciles a payment whose webhook failed processing', async () => {
    const w = await world();
    const res = await post(w.customerAgent, '/payments/checkout', { invitationId: w.invitation.id, packageCode: 'standard' });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.body.data.paymentId } });
    // A stored, authentic event that was never applied (e.g. a crash after receiving it).
    await prisma.webhookEvent.create({
      data: {
        provider: 'test',
        externalEventId: 'evt-lost',
        payload: { id: 'evt-lost', reference: payment.providerReference, outcome: 'SUCCEEDED', amountMinor: payment.amountMinor, currency: payment.currency },
        processingStatus: 'FAILED',
      },
    });
    const result = await post(w.adminAgent, `/admin/payments/${payment.id}/reconcile`);
    expect(result.body.data.changed).toBe(true);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCEEDED');
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id: w.invitation.id } })).status).toBe('PUBLISHED');
  });

  it('disables categories', async () => {
    const w = await world();
    await patch(w.adminAgent, `/admin/categories/${w.category.id}`, { enabled: false });
    expect((await request(app).get('/api/v1/categories')).body.data).toEqual([]);
  });
});
