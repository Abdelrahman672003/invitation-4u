import { Router } from 'express';
import type { PackageDto } from '@invite/shared';
import { prisma } from '../../lib/prisma.js';

export const packagesRouter = Router();

packagesRouter.get('/', async (_req, res) => {
  const rows = await prisma.package.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: 'asc' },
  });
  const data: PackageDto[] = rows.map((row) => {
    const features = (row.features ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      code: row.code,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      priceMinor: row.priceMinor,
      currency: row.currency,
      premiumTemplates: features.premiumTemplates === true,
      maxGuests: typeof features.maxGuests === 'number' ? features.maxGuests : null,
    };
  });
  // Revalidate on every request (cheap: unchanged data answers 304) so admin changes show up at once.
  res.set('Cache-Control', 'no-cache');
  res.json({ data });
});
