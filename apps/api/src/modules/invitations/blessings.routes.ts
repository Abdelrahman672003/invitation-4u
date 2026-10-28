import { Router } from 'express';
import { z } from 'zod';
import { notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';

/** The invitation owner's view of the guestbook, with the ability to remove an entry. */
export const blessingsRouter = Router({ mergeParams: true });
blessingsRouter.use(requireAuth);

async function ownedId(req: { params: unknown; auth?: { user: { id: string } } }) {
  const id = z
    .string()
    .uuid()
    .parse((req.params as { id: string }).id);
  const row = await prisma.invitation.findFirst({
    where: { id, ownerId: req.auth!.user.id },
    select: { id: true },
  });
  if (!row) throw notFound('Invitation not found');
  return row.id;
}

blessingsRouter.get('/', async (req, res) => {
  const invitationId = await ownedId(req);
  const rows = await prisma.blessing.findMany({
    where: { invitationId },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json({
    data: rows.map((item) => ({
      id: item.id,
      name: item.name,
      message: item.message,
      createdAt: item.createdAt.toISOString(),
    })),
  });
});

blessingsRouter.delete('/:blessingId', async (req, res) => {
  const invitationId = await ownedId(req);
  const blessingId = z.string().uuid().parse(req.params.blessingId);
  await prisma.blessing.deleteMany({ where: { id: blessingId, invitationId } });
  res.status(204).end();
});
