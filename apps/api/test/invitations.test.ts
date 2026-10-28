import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { app, createUser, ORIGIN, resetDatabase, signIn } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const design = {
  layout: 'centered',
  frame: 'thin',
  ornament: 'floral',
  pattern: 'none',
  font: 'elegant',
  palette: { background: '#ffffff', surface: '#fffdf8', text: '#222222', muted: '#777777', accent: '#b08446' },
};

async function seedCatalog() {
  const wedding = await prisma.eventCategory.create({ data: { slug: 'wedding', nameEn: 'Wedding', nameAr: 'زفاف' } });
  const birthday = await prisma.eventCategory.create({ data: { slug: 'birthday', nameEn: 'Birthday', nameAr: 'ميلاد' } });
  const base = { nameEn: 'T', nameAr: 'ت', designConfig: design, status: 'ACTIVE' as const };
  await prisma.template.create({ data: { ...base, categoryId: wedding.id, slug: 'w1' } });
  await prisma.template.create({ data: { ...base, categoryId: wedding.id, slug: 'w2' } });
  await prisma.template.create({ data: { ...base, categoryId: wedding.id, slug: 'w-draft', status: 'DRAFT' } });
  await prisma.template.create({ data: { ...base, categoryId: birthday.id, slug: 'b1' } });
}

async function customer() {
  const { user, password } = await createUser();
  return signIn(user.email, password);
}

const post = (agent: Awaited<ReturnType<typeof customer>>, path: string, body?: object) =>
  agent.post(`/api/v1${path}`).set('Origin', ORIGIN).send(body);
const patch = (agent: Awaited<ReturnType<typeof customer>>, path: string, body: object) =>
  agent.patch(`/api/v1${path}`).set('Origin', ORIGIN).send(body);

describe('invitations', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/invitations')).status).toBe(401);
  });

  it('creates a draft with a stable slug and starter content', async () => {
    await seedCatalog();
    const agent = await customer();
    const res = await post(agent, '/invitations', { templateSlug: 'w1', title: 'Sara & Omar' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'DRAFT', revision: 0, categorySlug: 'wedding', title: 'Sara & Omar' });
    expect(res.body.data.slug).toMatch(/^wedding-[0-9a-f]{10}$/);
    expect(res.body.data.content.headline).toBe('Sara & Omar');
  });

  it('rejects draft or unknown templates', async () => {
    await seedCatalog();
    const agent = await customer();
    expect((await post(agent, '/invitations', { templateSlug: 'w-draft', title: 'x' })).status).toBe(400);
    expect((await post(agent, '/invitations', { templateSlug: 'nope', title: 'x' })).status).toBe(400);
    expect((await post(agent, '/invitations', { templateSlug: 'w1', title: '' })).status).toBe(400);
  });

  it('saves content, bumps the revision and keeps the slug', async () => {
    await seedCatalog();
    const agent = await customer();
    const created = (await post(agent, '/invitations', { templateSlug: 'w1', title: 'A' })).body.data;
    const res = await patch(agent, `/invitations/${created.id}`, {
      baseRevision: 0,
      eventDate: '2026-12-12',
      content: { headline: 'Sara & Omar', venueName: 'Hall', time: '20:00' },
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ revision: 1, slug: created.slug, eventDate: '2026-12-12' });
    expect(res.body.data.content).toMatchObject({ venueName: 'Hall', time: '20:00' });
  });

  it('rejects a stale revision so an old autosave cannot overwrite newer content', async () => {
    await seedCatalog();
    const agent = await customer();
    const created = (await post(agent, '/invitations', { templateSlug: 'w1', title: 'A' })).body.data;
    await patch(agent, `/invitations/${created.id}`, { baseRevision: 0, title: 'Newer' });
    const stale = await patch(agent, `/invitations/${created.id}`, { baseRevision: 0, title: 'Older' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_REVISION');
    const current = await agent.get(`/api/v1/invitations/${created.id}`);
    expect(current.body.data.title).toBe('Newer');
  });

  it('validates content and rejects unknown fields', async () => {
    await seedCatalog();
    const agent = await customer();
    const created = (await post(agent, '/invitations', { templateSlug: 'w1', title: 'A' })).body.data;
    const bad = await patch(agent, `/invitations/${created.id}`, {
      baseRevision: 0,
      content: { time: '25:99', design: { accent: 'red' } },
    });
    expect(bad.status).toBe(400);
    expect((await patch(agent, `/invitations/${created.id}`, { baseRevision: 0, status: 'PUBLISHED' })).status).toBe(400);
  });

  it('switches templates within a category and keeps the content', async () => {
    await seedCatalog();
    const agent = await customer();
    const created = (await post(agent, '/invitations', { templateSlug: 'w1', title: 'A' })).body.data;
    const same = await patch(agent, `/invitations/${created.id}`, { baseRevision: 0, templateSlug: 'w2' });
    expect(same.body.data.template.slug).toBe('w2');
    expect(same.body.data.content.headline).toBe('A');
    const other = await patch(agent, `/invitations/${created.id}`, { baseRevision: 1, templateSlug: 'b1' });
    expect(other.status).toBe(400);
  });

  it('hides other customers invitations', async () => {
    await seedCatalog();
    const owner = await customer();
    const stranger = await customer();
    const created = (await post(owner, '/invitations', { templateSlug: 'w1', title: 'Private' })).body.data;
    expect((await stranger.get(`/api/v1/invitations/${created.id}`)).status).toBe(404);
    expect((await patch(stranger, `/invitations/${created.id}`, { baseRevision: 0, title: 'x' })).status).toBe(404);
    expect((await post(stranger, `/invitations/${created.id}/archive`)).status).toBe(404);
    expect((await stranger.get('/api/v1/invitations')).body.data).toEqual([]);
  });

  it('archives, blocks edits while archived, and restores', async () => {
    await seedCatalog();
    const agent = await customer();
    const created = (await post(agent, '/invitations', { templateSlug: 'w1', title: 'A' })).body.data;
    expect((await post(agent, `/invitations/${created.id}/archive`)).body.data.status).toBe('ARCHIVED');
    expect((await patch(agent, `/invitations/${created.id}`, { baseRevision: 0, title: 'B' })).status).toBe(409);
    expect((await post(agent, `/invitations/${created.id}/restore`)).body.data.status).toBe('DRAFT');
    expect((await patch(agent, `/invitations/${created.id}`, { baseRevision: 0, title: 'B' })).status).toBe(200);
  });
});
