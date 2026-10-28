import { Router } from 'express';
import { changePasswordSchema, updateProfileSchema } from '@invite/shared';
import { recordAudit } from '../../lib/audit.js';
import { AppError, parseInput } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/security.js';
import { toCurrentUser } from './user.dto.js';

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get('/', (req, res) => {
  res.json({ user: toCurrentUser(req.auth!.user) });
});

meRouter.patch('/', async (req, res) => {
  const input = parseInput(updateProfileSchema, req.body);
  const user = await prisma.user.update({ where: { id: req.auth!.user.id }, data: input });
  res.json({ user: toCurrentUser(user) });
});

// Changing the password needs the current one. Every other signed-in device is signed out.
meRouter.post('/password', authRateLimiter, async (req, res) => {
  const input = parseInput(changePasswordSchema, req.body);
  const { user, sessionId } = req.auth!;
  const current = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!current.passwordHash || !(await verifyPassword(input.currentPassword, current.passwordHash)))
    throw new AppError(400, 'VALIDATION_ERROR', 'The current password is incorrect', {
      currentPassword: 'validation.currentPasswordWrong',
    });
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: user.id, NOT: { id: sessionId } } });
    await recordAudit(
      { actorId: user.id, action: 'user.password_changed', entityType: 'user', entityId: user.id },
      tx,
    );
  });
  res.json({ ok: true });
});
