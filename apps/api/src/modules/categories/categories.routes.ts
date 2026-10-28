import { Router } from 'express';
import type { EventCategoryDto } from '@invite/shared';
import { prisma } from '../../lib/prisma.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.eventCategory.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: 'asc' },
    include: { subtypes: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
  });

  const data: EventCategoryDto[] = categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    nameEn: category.nameEn,
    nameAr: category.nameAr,
    subtypes: category.subtypes.map((subtype) => ({
      id: subtype.id,
      slug: subtype.slug,
      nameEn: subtype.nameEn,
      nameAr: subtype.nameAr,
    })),
  }));

  // Revalidate on every request (cheap: unchanged data answers 304) so admin changes show up at once.
  res.set('Cache-Control', 'no-cache');
  res.json({ data });
});
