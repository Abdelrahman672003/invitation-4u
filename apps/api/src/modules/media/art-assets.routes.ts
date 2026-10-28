import { access } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { notFound, parseInput } from '../../lib/errors.js';
import { recordAudit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { uploadDir } from './media.routes.js';

/**
 * The artwork library for the Design Studio: any signed-in user can list it,
 * only admins can add to it or remove from it.
 */
export const artAssetsRouter = Router();
artAssetsRouter.use(requireAuth);

const toDto = (row: { id: string; file: string; label: string }) => ({
  id: row.id,
  file: row.file,
  label: row.label,
});

artAssetsRouter.get('/', async (_req, res) => {
  const rows = await prisma.artAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ data: rows.map(toDto) });
});

const addBody = z
  .object({
    file: z.string().regex(/^[a-f0-9]{32}\.(jpg|png|webp)$/),
    label: z.string().trim().min(1).max(60),
  })
  .strict();

artAssetsRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const input = parseInput(addBody, req.body);
  // Only files that were really uploaded can be added to the library.
  await access(path.join(uploadDir, input.file)).catch(() => {
    throw notFound('File not found');
  });
  const row = await prisma.artAsset.create({ data: input });
  await recordAudit({
    actorId: req.auth!.user.id,
    action: 'artasset.added',
    entityType: 'art_asset',
    entityId: row.id,
  });
  res.status(201).json({ data: toDto(row) });
});

artAssetsRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const id = parseInput(z.string().uuid(), req.params.id);
  const result = await prisma.artAsset.deleteMany({ where: { id } });
  if (result.count === 0) throw notFound('Not found');
  await recordAudit({
    actorId: req.auth!.user.id,
    action: 'artasset.removed',
    entityType: 'art_asset',
    entityId: id,
  });
  res.status(204).end();
});
