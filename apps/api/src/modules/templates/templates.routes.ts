import { Router } from 'express';
import { z } from 'zod';
import { templateDesignSchema, type TemplateDto } from '@invite/shared';
import { notFound, parseInput } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';

export const templatesRouter = Router();

const listQuery = z.object({
  category: z
    .string()
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

type TemplateRow = Awaited<
  ReturnType<typeof prisma.template.findFirstOrThrow<{ include: { category: true } }>>
>;

/** Returns null when the stored design is invalid, so one bad row never breaks the gallery. */
function toDto(row: TemplateRow): TemplateDto | null {
  const design = templateDesignSchema.safeParse(row.designConfig);
  if (!design.success) {
    logger.warn('Template has an invalid design config', { slug: row.slug });
    return null;
  }
  return {
    id: row.id,
    slug: row.slug,
    categorySlug: row.category.slug,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    descriptionEn: row.descriptionEn,
    descriptionAr: row.descriptionAr,
    isPremium: row.isPremium,
    design: design.data,
  };
}

// Public: only ACTIVE templates in enabled categories are ever exposed.
const visible = { status: 'ACTIVE' as const, category: { enabled: true } };

templatesRouter.get('/', async (req, res) => {
  const { category } = parseInput(listQuery, req.query);
  const rows = await prisma.template.findMany({
    where: { ...visible, ...(category ? { category: { enabled: true, slug: category } } : {}) },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    include: { category: true },
  });
  // Revalidate on every request (cheap: unchanged data answers 304) so admin changes show up at once.
  res.set('Cache-Control', 'no-cache');
  res.json({ data: rows.map(toDto).filter((dto): dto is TemplateDto => dto !== null) });
});

templatesRouter.get('/:slug', async (req, res) => {
  const row = await prisma.template.findFirst({
    where: { ...visible, slug: req.params.slug },
    include: { category: true },
  });
  const dto = row ? toDto(row) : null;
  if (!dto) throw notFound('Template not found');
  // Revalidate on every request (cheap: unchanged data answers 304) so admin changes show up at once.
  res.set('Cache-Control', 'no-cache');
  res.json({ data: dto });
});
