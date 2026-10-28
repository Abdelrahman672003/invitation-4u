import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { app, createUser, resetDatabase, signIn } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('admin routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/admin/overview');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('forbids customers', async () => {
    const { user, password } = await createUser();
    const agent = await signIn(user.email, password);
    const res = await agent.get('/api/v1/admin/overview');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows administrators', async () => {
    await createUser();
    const { user, password } = await createUser({ role: 'ADMIN' });
    const agent = await signIn(user.email, password);
    const res = await agent.get('/api/v1/admin/overview');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ customers: 1, invitations: 0, publishedInvitations: 0 });
  });
});

describe('public endpoints', () => {
  it('lists enabled categories with subtypes', async () => {
    const category = await prisma.eventCategory.create({
      data: { slug: 'engagement-bridal', nameEn: 'Engagement', nameAr: 'خطوبة', sortOrder: 1 },
    });
    await prisma.eventCategory.create({ data: { slug: 'hidden', nameEn: 'Hidden', nameAr: 'مخفي', enabled: false } });
    await prisma.eventSubtype.create({
      data: { categoryId: category.id, slug: 'henna-night', nameEn: 'Henna night', nameAr: 'ليلة الحنة' },
    });

    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].subtypes[0]).toMatchObject({ slug: 'henna-night', nameAr: 'ليلة الحنة' });
  });

  it('returns a JSON 404 for unknown endpoints without leaking internals', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
  });
});

describe('database constraints', () => {
  it('rejects non-normalized emails at the database level', async () => {
    await expect(
      prisma.user.create({ data: { name: 'X', email: 'Upper@Example.com' } }),
    ).rejects.toThrow();
  });

  it('rejects negative package prices', async () => {
    await expect(
      prisma.package.create({ data: { code: 'bad', nameEn: 'Bad', nameAr: 'سيئ', priceMinor: -1, features: {} } }),
    ).rejects.toThrow();
  });
});
