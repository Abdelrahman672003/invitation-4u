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

async function setup(options: { premiumTemplate?: boolean } = {}) {
  const category = await prisma.eventCategory.create({ data: { slug: 'wedding', nameEn: 'Wedding', nameAr: 'زفاف' } });
  await prisma.template.create({
    data: { categoryId: category.id, slug: 't1', nameEn: 'T', nameAr: 'ت', designConfig: design, status: 'ACTIVE', isPremium: options.premiumTemplate ?? false },
  });
  await prisma.package.create({ data: { code: 'standard', nameEn: 'Standard', nameAr: 'أ', priceMinor: 29900, features: { premiumTemplates: false, maxGuests: 2 } } });
  await prisma.package.create({ data: { code: 'premium', nameEn: 'Premium', nameAr: 'م', priceMinor: 49900, features: { premiumTemplates: true } } });
  const { user, password } = await createUser();
  const owner = await signIn(user.email, password);
  const invitation = (await post(owner, '/invitations', { templateSlug: 't1', title: 'Wedding' })).body.data;
  await patch(owner, `/invitations/${invitation.id}`, {
    baseRevision: 0,
    eventDate: '2026-12-12',
    content: { headline: 'Sara & Omar', venueName: 'Hall' },
  });
  return { owner, id: invitation.id as string, slug: invitation.slug as string, user };
}

async function checkout(owner: Agent, id: string, packageCode = 'standard') {
  const res = await post(owner, '/payments/checkout', { invitationId: id, packageCode });
  expect(res.status).toBe(201);
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.body.data.paymentId } });
  return { payment, redirectUrl: res.body.data.redirectUrl as string };
}

function webhook(payload: object, signature?: string) {
  const body = JSON.stringify(payload);
  return request(app)
    .post('/api/v1/webhooks/payments/test')
    .set('Content-Type', 'application/json')
    .set('x-signature', signature ?? sign(body))
    .send(body);
}

const event = (payment: { providerReference: string | null; amountMinor: number; currency: string }, outcome = 'SUCCEEDED', id = 'evt_1') => ({
  id,
  reference: payment.providerReference,
  outcome,
  amountMinor: payment.amountMinor,
  currency: payment.currency,
});

describe('checkout', () => {
  it('prices from the database, marks the invitation pending and returns a redirect', async () => {
    const { owner, id } = await setup();
    const { payment, redirectUrl } = await checkout(owner, id);
    expect(payment).toMatchObject({ amountMinor: 29900, currency: 'EGP', status: 'PENDING', provider: 'test' });
    expect(redirectUrl).toContain(`/pay/test/${payment.providerReference}`);
    const invitation = await prisma.invitation.findUniqueOrThrow({ where: { id } });
    expect(invitation.status).toBe('PENDING_PAYMENT');
  });

  it('ignores any client-supplied amount', async () => {
    const { owner, id } = await setup();
    const res = await post(owner, '/payments/checkout', { invitationId: id, packageCode: 'standard', amountMinor: 1 });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.body.data.paymentId } });
    expect(payment.amountMinor).toBe(29900);
  });

  it('refuses incomplete invitations, premium templates on standard, and other peoples invitations', async () => {
    const { owner, id } = await setup({ premiumTemplate: true });
    expect((await post(owner, '/payments/checkout', { invitationId: id, packageCode: 'standard' })).status).toBe(400);
    expect((await post(owner, '/payments/checkout', { invitationId: id, packageCode: 'premium' })).status).toBe(201);

    const { user, password } = await createUser();
    const stranger = await signIn(user.email, password);
    expect((await post(stranger, '/payments/checkout', { invitationId: id, packageCode: 'premium' })).status).toBe(404);
  });

  it('supersedes an abandoned checkout when retrying', async () => {
    const { owner, id } = await setup();
    const first = await checkout(owner, id);
    const second = await checkout(owner, id);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: first.payment.id } })).status).toBe('CANCELLED');
    expect(second.payment.status).toBe('PENDING');
  });
});

describe('webhooks', () => {
  it('publishes only after a verified successful webhook', async () => {
    const { owner, id, slug } = await setup();
    const { payment } = await checkout(owner, id);
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(404);

    const res = await webhook(event(payment));
    expect(res.status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCEEDED');
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('PUBLISHED');
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(200);
  });

  it('rejects bad or missing signatures and changes nothing', async () => {
    const { owner, id } = await setup();
    const { payment } = await checkout(owner, id);
    expect((await webhook(event(payment), 'deadbeef')).status).toBe(401);
    expect((await webhook(event(payment), sign('other body'))).status).toBe(401);
    const noHeader = await request(app).post('/api/v1/webhooks/payments/test').set('Content-Type', 'application/json').send(JSON.stringify(event(payment)));
    expect(noHeader.status).toBe(401);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('is idempotent for repeated events', async () => {
    const { owner, id } = await setup();
    const { payment } = await checkout(owner, id);
    expect((await webhook(event(payment))).body.duplicate).toBe(false);
    expect((await webhook(event(payment))).body.duplicate).toBe(true);
    expect(await prisma.webhookEvent.count()).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'payment.succeeded' } })).toBe(1);
  });

  it('never downgrades a successful payment on a later failure event', async () => {
    const { owner, id } = await setup();
    const { payment } = await checkout(owner, id);
    await webhook(event(payment, 'SUCCEEDED', 'evt_a'));
    await webhook(event(payment, 'FAILED', 'evt_b'));
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCEEDED');
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('PUBLISHED');
  });

  it('rejects an amount that does not match and records the failure', async () => {
    const { owner, id } = await setup();
    const { payment } = await checkout(owner, id);
    const res = await webhook({ ...event(payment), amountMinor: 100 });
    expect(res.status).toBe(500);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('PENDING_PAYMENT');
    expect((await prisma.webhookEvent.findFirstOrThrow()).processingStatus).toBe('FAILED');
  });

  it('returns the invitation to draft on failure so the customer can retry', async () => {
    const { owner, id } = await setup();
    const { payment } = await checkout(owner, id);
    await webhook(event(payment, 'FAILED'));
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('FAILED');
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('DRAFT');
    const retry = await checkout(owner, id);
    await webhook(event(retry.payment, 'SUCCEEDED', 'evt_2'));
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('PUBLISHED');
  });

  it('allows unlimited republishing once paid', async () => {
    const { owner, id } = await setup();
    const { payment } = await checkout(owner, id);
    await webhook(event(payment));
    await post(owner, `/invitations/${id}/unpublish`);
    expect((await post(owner, `/invitations/${id}/publish`)).status).toBe(200);
    expect((await post(owner, '/payments/checkout', { invitationId: id, packageCode: 'standard' })).status).toBe(409);
  });
});

describe('customer payments and the simulator', () => {
  it('lists only the customers own payments', async () => {
    const { owner, id } = await setup();
    await checkout(owner, id);
    expect((await owner.get('/api/v1/payments')).body.data).toHaveLength(1);
    const { user, password } = await createUser();
    const stranger = await signIn(user.email, password);
    expect((await stranger.get('/api/v1/payments')).body.data).toEqual([]);
  });

  it('completes through the simulated gateway using a signed webhook', async () => {
    const { owner, id } = await setup();
    const { payment } = await checkout(owner, id);
    const res = await post(owner, `/payments/test/${payment.providerReference}/complete`, { outcome: 'SUCCEEDED' });
    expect(res.status).toBe(200);
    expect((await owner.get(`/api/v1/payments/${payment.id}`)).body.data.status).toBe('SUCCEEDED');
    expect((await owner.get(`/api/v1/invitations/${id}`)).body.data).toMatchObject({ status: 'PUBLISHED', paid: true });
  });
});

describe('deleting invitations', () => {
  const remove = (agent: Agent, id: string) => agent.delete(`/api/v1/invitations/${id}`).set('Origin', ORIGIN);

  it('deletes an unpaid invitation with its guests and replies, and the link stops working', async () => {
    const { owner, id, slug } = await setup();
    await post(owner, `/invitations/${id}/publish`);
    await post(owner, `/invitations/${id}/guests`, { name: 'Guest' });
    await request(app).post(`/api/v1/public/invitations/${slug}/rsvp`).send({ name: 'Guest', response: 'ACCEPTED' });

    expect((await remove(owner, id)).status).toBe(204);
    expect(await prisma.invitation.count({ where: { id } })).toBe(0);
    expect(await prisma.guest.count({ where: { invitationId: id } })).toBe(0);
    expect(await prisma.rsvp.count({ where: { invitationId: id } })).toBe(0);
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(404);
    expect((await owner.get(`/api/v1/invitations/${id}`)).status).toBe(404);
    const audit = await prisma.auditLog.findFirst({ where: { action: 'invitation.deleted', entityId: id } });
    expect(audit).not.toBeNull();
  });

  it('refuses to delete a paid invitation', async () => {
    const { owner, id } = await setup();
    const { payment } = await checkout(owner, id);
    await webhook(event(payment));
    expect((await remove(owner, id)).status).toBe(409);
    expect(await prisma.invitation.count({ where: { id } })).toBe(1);
  });

  it('cancels an unfinished checkout, so a late webhook cannot revive anything', async () => {
    const { owner, id } = await setup();
    const { payment } = await checkout(owner, id);
    expect((await remove(owner, id)).status).toBe(204);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('CANCELLED');
    await webhook(event(payment, 'SUCCEEDED', 'late'));
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCEEDED');
    expect(await prisma.invitation.count({ where: { id } })).toBe(0);
  });

  it('only lets the owner delete, and needs sign-in', async () => {
    const { owner, id } = await setup();
    const { user, password } = await createUser();
    const stranger = await signIn(user.email, password);
    expect((await remove(stranger, id)).status).toBe(404);
    expect((await request(app).delete(`/api/v1/invitations/${id}`).set('Origin', ORIGIN)).status).toBe(401);
    expect((await remove(owner, id)).status).toBe(204);
  });
});

describe('free plan', () => {
  const publish = (owner: Agent, id: string) => post(owner, `/invitations/${id}/publish`);
  const hoursFromNow = (iso: string) => (new Date(iso).getTime() - Date.now()) / 3_600_000;

  it('publishes for 48 hours with a watermark, once per invitation', async () => {
    const { owner, id, slug } = await setup();
    const res = await publish(owner, id);
    expect(res.status).toBe(200);
    expect(hoursFromNow(res.body.data.expiresAt)).toBeGreaterThan(47.9);
    expect(hoursFromNow(res.body.data.expiresAt)).toBeLessThan(48.1);
    expect(res.body.data).toMatchObject({ expired: false, freeUsed: true, paid: false });

    const page = (await request(app).get(`/api/v1/public/invitations/${slug}`)).body.data;
    expect(page.watermark).toBe(true);

    // The free period cannot be restarted by unpublishing and publishing again.
    await post(owner, `/invitations/${id}/unpublish`);
    expect((await publish(owner, id)).status).toBe(402);
  });

  it('stops serving the page, RSVPs and view counts after it expires', async () => {
    const { owner, id, slug } = await setup();
    await publish(owner, id);
    await prisma.invitation.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const page = await request(app).get(`/api/v1/public/invitations/${slug}`);
    expect(page.status).toBe(410);
    expect(page.body.error.code).toBe('EXPIRED');
    expect((await request(app).post(`/api/v1/public/invitations/${slug}/rsvp`).send({ name: 'Ali', response: 'ACCEPTED' })).status).toBe(410);
    await request(app).post(`/api/v1/public/invitations/${slug}/view`);

    const dto = (await owner.get(`/api/v1/invitations/${id}`)).body.data;
    expect(dto).toMatchObject({ expired: true, views: 0 });
  });

  it('is not available for premium templates', async () => {
    const premium = await setup({ premiumTemplate: true });
    expect((await publish(premium.owner, premium.id)).status).toBe(402);
  });

  it('is limited per account', async () => {
    const { owner } = await setup();
    for (let index = 0; index < 3; index += 1) {
      const created = (await post(owner, '/invitations', { templateSlug: 't1', title: `E${index}` })).body.data;
      await patch(owner, `/invitations/${created.id}`, { baseRevision: 0, eventDate: '2026-12-12', content: { headline: 'H', venueName: 'V' } });
      expect((await publish(owner, created.id)).status).toBe(200);
    }
    const extra = (await post(owner, '/invitations', { templateSlug: 't1', title: 'Extra' })).body.data;
    await patch(owner, `/invitations/${extra.id}`, { baseRevision: 0, eventDate: '2026-12-12', content: { headline: 'H', venueName: 'V' } });
    expect((await publish(owner, extra.id)).status).toBe(402);
  });

  it('caps the guest list on the free plan', async () => {
    const { owner, id } = await setup();
    await publish(owner, id);
    await prisma.guest.createMany({ data: Array.from({ length: 30 }, (_, index) => ({ invitationId: id, name: `G${index}` })) });
    expect((await post(owner, `/invitations/${id}/guests`, { name: 'One too many' })).status).toBe(400);
  });

  it('upgrades in place: paying removes the watermark and the expiry without taking the page offline', async () => {
    const { owner, id, slug } = await setup();
    await publish(owner, id);
    const { payment } = await checkout(owner, id);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('PUBLISHED');
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(200);

    await webhook(event(payment));
    const row = await prisma.invitation.findUniqueOrThrow({ where: { id } });
    expect(row.expiresAt).toBeNull();
    const page = (await request(app).get(`/api/v1/public/invitations/${slug}`)).body.data;
    expect(page.watermark).toBe(false);
  });

  it('can be upgraded after it has expired', async () => {
    const { owner, id, slug } = await setup();
    await publish(owner, id);
    await prisma.invitation.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const { payment } = await checkout(owner, id);
    await webhook(event(payment));
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(200);
  });
});
