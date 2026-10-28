import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
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

async function setup(options: { publish?: boolean } = {}) {
  const category = await prisma.eventCategory.create({ data: { slug: 'wedding', nameEn: 'Wedding', nameAr: 'زفاف' } });
  await prisma.template.create({
    data: { categoryId: category.id, slug: 'w1', nameEn: 'T', nameAr: 'ت', designConfig: design, status: 'ACTIVE' },
  });
  const { user, password } = await createUser();
  const owner = await signIn(user.email, password);
  const created = (await post(owner, '/invitations', { templateSlug: 'w1', title: 'Wedding' })).body.data;
  await patch(owner, `/invitations/${created.id}`, {
    baseRevision: 0,
    eventDate: '2026-12-12',
    content: { headline: 'Sara & Omar', venueName: 'Hall' },
  });
  if (options.publish !== false) {
    const res = await post(owner, `/invitations/${created.id}/publish`);
    expect(res.status).toBe(200);
  }
  return { owner, id: created.id as string, slug: created.slug as string };
}

describe('publishing', () => {
  it('requires the details to be complete', async () => {
    const { owner } = await setup({ publish: false });
    const blank = (await post(owner, '/invitations', { templateSlug: 'w1', title: 'Blank' })).body.data;
    const res = await post(owner, `/invitations/${blank.id}/publish`);
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toMatchObject({ eventDate: 'validation.required', venueName: 'validation.required' });
  });

  it('unpublishing removes public access and keeps the slug', async () => {
    const { owner, id, slug } = await setup();
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(200);
    expect((await post(owner, `/invitations/${id}/unpublish`)).body.data.status).toBe('UNPUBLISHED');
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(404);
    // The free period was used, so it comes back only with a paid package; the link never changes.
    expect((await post(owner, `/invitations/${id}/publish`)).status).toBe(402);
    expect((await owner.get(`/api/v1/invitations/${id}`)).body.data.slug).toBe(slug);
  });
});

describe('public invitation', () => {
  it('hides drafts and exposes no private data', async () => {
    const { owner, id, slug } = await setup();
    await post(owner, `/invitations/${id}/guests`, { name: 'Private Guest', phone: '+201001234567', notes: 'secret' });
    const res = await request(app).get(`/api/v1/public/invitations/${slug}`);
    expect(res.status).toBe(200);
    const text = JSON.stringify(res.body);
    for (const secret of ['Private Guest', '201001234567', 'secret', 'ownerId', 'passwordHash', 'email']) {
      expect(text).not.toContain(secret);
    }
    expect(res.body.data.content.headline).toBe('Sara & Omar');

  });

  it('returns 404 for a draft', async () => {
    const { slug } = await setup({ publish: false });
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).status).toBe(404);
  });
});

describe('rsvp', () => {
  const submit = (slug: string, body: object) => request(app).post(`/api/v1/public/invitations/${slug}/rsvp`).send(body);

  it('records a response and replaces it when the same name responds again', async () => {
    const { owner, id, slug } = await setup();
    const first = await submit(slug, { name: 'Ahmed Ali', response: 'ACCEPTED', attendeesCount: 3 });
    expect(first.status).toBe(201);
    expect(first.body).toEqual({ data: { updated: false } });
    const second = await submit(slug, { name: '  ahmed   ali ', response: 'DECLINED' });
    expect(second.status).toBe(200);
    expect(second.body.data.updated).toBe(true);

    const list = (await owner.get(`/api/v1/invitations/${id}/rsvps`)).body.data;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ response: 'DECLINED', attendeesCount: 0 });
  });

  it('validates attendee counts against the host settings', async () => {
    const { owner, id, slug } = await setup();
    await patch(owner, `/invitations/${id}`, { baseRevision: 1, content: { headline: 'x', rsvp: { maxPerResponse: 4 } } });
    expect((await submit(slug, { name: 'A', response: 'ACCEPTED', attendeesCount: 5 })).status).toBe(400);
    expect((await submit(slug, { name: 'A', response: 'ACCEPTED', attendeesCount: 0 })).status).toBe(400);
    expect((await submit(slug, { name: 'A', response: 'ACCEPTED', attendeesCount: 4 })).status).toBe(201);
  });

  it('closes after the deadline and when disabled', async () => {
    const { owner, id, slug } = await setup();
    await patch(owner, `/invitations/${id}`, { baseRevision: 1, rsvpDeadline: '2020-01-01' });
    const closed = await submit(slug, { name: 'Late', response: 'ACCEPTED' });
    expect(closed.status).toBe(409);
    expect(closed.body.error.code).toBe('RSVP_CLOSED');
    expect((await request(app).get(`/api/v1/public/invitations/${slug}`)).body.data.rsvp.closed).toBe(true);
  });

  it('ignores honeypot submissions', async () => {
    const { owner, id, slug } = await setup();
    const res = await submit(slug, { name: 'Bot', response: 'ACCEPTED', website: 'http://spam.example' });
    expect(res.status).toBe(201);
    expect((await owner.get(`/api/v1/invitations/${id}/rsvps`)).body.data).toHaveLength(0);
  });

  it('rejects responses to unpublished invitations', async () => {
    const { slug } = await setup({ publish: false });
    expect((await submit(slug, { name: 'A', response: 'ACCEPTED' })).status).toBe(404);
  });
});

describe('guests', () => {
  it('manages guests, links responses and summarises', async () => {
    const { owner, id, slug } = await setup();
    const add = await post(owner, `/invitations/${id}/guests`, { name: 'Mona Hassan', groupName: 'Family', maxAttendees: 2 });
    expect(add.status).toBe(201);
    await post(owner, `/invitations/${id}/guests`, { name: 'Karim', groupName: 'Friends' });

    await request(app).post(`/api/v1/public/invitations/${slug}/rsvp`).send({ name: 'mona hassan', response: 'ACCEPTED', attendeesCount: 2 });
    await request(app).post(`/api/v1/public/invitations/${slug}/rsvp`).send({ name: 'Walk In', response: 'ACCEPTED', attendeesCount: 1 });

    const list = await owner.get(`/api/v1/invitations/${id}/guests`);
    // Replies from people who are not on the list count too, so the numbers match the real responses.
    expect(list.body.summary).toEqual({ total: 3, accepted: 2, declined: 0, pending: 1, attendees: 3 });
    expect(list.body.groups).toEqual(['Family', 'Friends']);
    expect(list.body.data.find((g: { name: string }) => g.name === 'Mona Hassan')).toMatchObject({ status: 'ACCEPTED', attendeesCount: 2 });

    expect((await owner.get(`/api/v1/invitations/${id}/guests?status=PENDING`)).body.data).toHaveLength(1);
    expect((await owner.get(`/api/v1/invitations/${id}/guests?group=Family`)).body.data).toHaveLength(1);
    expect((await owner.get(`/api/v1/invitations/${id}/guests?q=kar`)).body.data[0].name).toBe('Karim');

    const edited = await patch(owner, `/invitations/${id}/guests/${add.body.data.id}`, { phone: '+20 100 123 4567', notes: 'VIP' });
    expect(edited.body.data).toMatchObject({ phone: '+20 100 123 4567', notes: 'VIP', name: 'Mona Hassan' });
    expect((await owner.delete(`/api/v1/invitations/${id}/guests/${add.body.data.id}`).set('Origin', ORIGIN)).status).toBe(204);
  });

  it('validates guest input and keeps lists private to the owner', async () => {
    const { owner, id } = await setup();
    expect((await post(owner, `/invitations/${id}/guests`, { name: '' })).status).toBe(400);
    expect((await post(owner, `/invitations/${id}/guests`, { name: 'X', phone: 'abc' })).status).toBe(400);
    expect((await post(owner, `/invitations/${id}/guests`, { name: 'X', maxAttendees: 0 })).status).toBe(400);

    const { user, password } = await createUser();
    const stranger = await signIn(user.email, password);
    expect((await stranger.get(`/api/v1/invitations/${id}/guests`)).status).toBe(404);
    expect((await post(stranger, `/invitations/${id}/guests`, { name: 'Intruder' })).status).toBe(404);
    expect((await request(app).get(`/api/v1/invitations/${id}/guests`)).status).toBe(401);
  });
});

describe('view counting', () => {
  it('counts opens of published invitations without storing visitor data', async () => {
    const { owner, id, slug } = await setup();
    expect((await request(app).post(`/api/v1/public/invitations/${slug}/view`)).status).toBe(204);
    expect((await request(app).post(`/api/v1/public/invitations/${slug}/view`)).status).toBe(204);

    const dto = (await owner.get(`/api/v1/invitations/${id}`)).body.data;
    expect(dto.views).toBe(2);
    // The public payload never carries the counter.
    expect(JSON.stringify((await request(app).get(`/api/v1/public/invitations/${slug}`)).body)).not.toContain('views');
  });

  it('ignores unpublished or unknown invitations', async () => {
    const { owner, id, slug } = await setup();
    await post(owner, `/invitations/${id}/unpublish`);
    expect((await request(app).post(`/api/v1/public/invitations/${slug}/view`)).status).toBe(204);
    expect((await request(app).post('/api/v1/public/invitations/nope/view')).status).toBe(204);
    expect((await owner.get(`/api/v1/invitations/${id}`)).body.data.views).toBe(0);
  });
});
