import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { app, resetDatabase } from './helpers.js';

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

async function seed() {
  const wedding = await prisma.eventCategory.create({ data: { slug: 'wedding', nameEn: 'Wedding', nameAr: 'زفاف', sortOrder: 1 } });
  const birthday = await prisma.eventCategory.create({ data: { slug: 'birthday', nameEn: 'Birthday', nameAr: 'عيد ميلاد', sortOrder: 2 } });
  const base = { nameEn: 'T', nameAr: 'ت', designConfig: design };
  await prisma.template.create({ data: { ...base, categoryId: wedding.id, slug: 'gold-1', status: 'ACTIVE', sortOrder: 1 } });
  await prisma.template.create({ data: { ...base, categoryId: wedding.id, slug: 'draft-1', status: 'DRAFT' } });
  await prisma.template.create({ data: { ...base, categoryId: wedding.id, slug: 'broken-1', status: 'ACTIVE', designConfig: { layout: 'x' } } });
  await prisma.template.create({ data: { ...base, categoryId: birthday.id, slug: 'party-1', status: 'ACTIVE', isPremium: true } });
}

describe('templates', () => {
  it('lists only active, valid templates', async () => {
    await seed();
    const res = await request(app).get('/api/v1/templates');
    expect(res.status).toBe(200);
    expect(res.body.data.map((t: { slug: string }) => t.slug)).toEqual(['gold-1', 'party-1']);
    expect(res.body.data[1]).toMatchObject({ categorySlug: 'birthday', isPremium: true });
  });

  it('filters by category', async () => {
    await seed();
    const res = await request(app).get('/api/v1/templates?category=birthday');
    expect(res.body.data.map((t: { slug: string }) => t.slug)).toEqual(['party-1']);
  });

  it('rejects a malformed category filter', async () => {
    const res = await request(app).get('/api/v1/templates?category=wed%20ding');
    expect(res.status).toBe(400);
  });

  it('returns one template and hides drafts and broken ones', async () => {
    await seed();
    expect((await request(app).get('/api/v1/templates/gold-1')).status).toBe(200);
    expect((await request(app).get('/api/v1/templates/draft-1')).status).toBe(404);
    expect((await request(app).get('/api/v1/templates/broken-1')).status).toBe(404);
  });
});

describe('packages', () => {
  it('lists enabled packages with price and limits only', async () => {
    await prisma.package.create({
      data: { code: 'standard', nameEn: 'Standard', nameAr: 'الأساسية', priceMinor: 29900, features: { premiumTemplates: false, maxGuests: 300 }, sortOrder: 1 },
    });
    await prisma.package.create({ data: { code: 'off', nameEn: 'Off', nameAr: 'x', priceMinor: 1, features: {}, enabled: false } });
    const res = await request(app).get('/api/v1/packages');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ code: 'standard', priceMinor: 29900, currency: 'EGP', premiumTemplates: false, maxGuests: 300 });
  });
});
