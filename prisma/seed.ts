import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../apps/api/src/lib/password.js';
import { normalizeEmail, templateDesignSchema } from '../packages/shared/src/index.js';
import { templates } from './templates.js';

const prisma = new PrismaClient();

const categories = [
  {
    slug: 'wedding',
    nameEn: 'Wedding',
    nameAr: 'زفاف',
    sortOrder: 1,
    subtypes: [],
  },
  {
    slug: 'birthday',
    nameEn: 'Birthday',
    nameAr: 'عيد ميلاد',
    sortOrder: 2,
    subtypes: [],
  },
  {
    slug: 'engagement-bridal',
    nameEn: 'Engagement & Bridal Events',
    nameAr: 'الخطوبة ومناسبات العروس',
    sortOrder: 3,
    subtypes: [
      { slug: 'engagement-party', nameEn: 'Engagement party', nameAr: 'حفل خطوبة' },
      { slug: 'henna-night', nameEn: 'Henna night', nameAr: 'ليلة الحنة' },
      { slug: 'bridal-shower', nameEn: 'Bridal shower', nameAr: 'حفل استقبال العروس' },
      { slug: 'bachelor-party', nameEn: 'Bachelor party', nameAr: 'حفل توديع العزوبية للعريس' },
      { slug: 'bachelorette-party', nameEn: 'Bachelorette party', nameAr: 'حفل توديع العزوبية للعروس' },
      { slug: 'other', nameEn: 'Other bridal celebration', nameAr: 'مناسبة أخرى للعروس' },
    ],
  },
  {
    slug: 'graduation',
    nameEn: 'Graduation',
    nameAr: 'تخرج',
    sortOrder: 4,
    subtypes: [],
  },
];

// Prices are placeholders until the business confirms them (EGP, minor units = piasters).
const packages = [
  {
    code: 'standard',
    nameEn: 'Standard',
    nameAr: 'الأساسية',
    priceMinor: 29900,
    sortOrder: 1,
    features: { allowsPublish: true, premiumTemplates: false, maxGuests: 300 },
  },
  {
    code: 'premium',
    nameEn: 'Premium',
    nameAr: 'المميزة',
    priceMinor: 49900,
    sortOrder: 2,
    features: { allowsPublish: true, premiumTemplates: true, maxGuests: 1000 },
  },
];

async function main() {
  for (const { subtypes, ...category } of categories) {
    const saved = await prisma.eventCategory.upsert({
      where: { slug: category.slug },
      update: { nameEn: category.nameEn, nameAr: category.nameAr, sortOrder: category.sortOrder },
      create: category,
    });
    for (const [index, subtype] of subtypes.entries()) {
      await prisma.eventSubtype.upsert({
        where: { categoryId_slug: { categoryId: saved.id, slug: subtype.slug } },
        update: { nameEn: subtype.nameEn, nameAr: subtype.nameAr, sortOrder: index },
        create: { ...subtype, categoryId: saved.id, sortOrder: index },
      });
    }
  }

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { code: pkg.code },
      update: { nameEn: pkg.nameEn, nameAr: pkg.nameAr },
      create: { ...pkg, currency: 'EGP' },
    });
  }

  for (const [index, template] of templates.entries()) {
    const category = await prisma.eventCategory.findUniqueOrThrow({ where: { slug: template.category } });
    const fields = {
      nameEn: template.nameEn,
      nameAr: template.nameAr,
      descriptionEn: template.descriptionEn,
      descriptionAr: template.descriptionAr,
      isPremium: template.isPremium ?? false,
      sortOrder: index,
      designConfig: templateDesignSchema.parse(template.design),
      status: 'ACTIVE' as const,
    };
    await prisma.template.upsert({
      where: { slug: template.slug },
      update: fields,
      create: { ...fields, slug: template.slug, categoryId: category.id },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to seed a development admin in production.');
    }
    const email = normalizeEmail(adminEmail);
    await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN' },
      create: {
        email,
        name: process.env.SEED_ADMIN_NAME ?? 'Platform Admin',
        passwordHash: await hashPassword(adminPassword),
        role: 'ADMIN',
      },
    });
    console.log(`Seeded admin user ${email}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
