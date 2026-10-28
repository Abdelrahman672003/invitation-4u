import type { User } from '@prisma/client';
import {
  normalizeEmail,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@invite/shared';
import { env } from '../../config/env.js';
import { recordAudit } from '../../lib/audit.js';
import { AppError } from '../../lib/errors.js';
import { getDummyHash, hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { generateToken, hashToken } from '../../lib/tokens.js';
import { emailService } from '../../services/email.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function registerUser(input: RegisterInput): Promise<User> {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists', {
      email: 'validation.emailTaken',
    });
  }
  return prisma.user.create({
    data: {
      email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      locale: input.locale ?? 'ar',
    },
  });
}

export async function authenticate(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(input.email) } });
  // Always run a hash comparison so response time does not reveal whether the email exists.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !user.passwordHash || !valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  return user;
}

/** Always resolves the same way whether or not the account exists (no account enumeration). */
export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(input.email) } });
  if (!user || !user.passwordHash) return;

  const token = generateToken();
  await prisma.$transaction([
    // Only the newest link stays valid.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const isArabic = user.locale === 'ar';
  await emailService.send({
    to: user.email,
    subject: isArabic ? 'إعادة تعيين كلمة المرور' : 'Reset your password',
    text: isArabic
      ? `مرحبًا ${user.name}،\n\nلإعادة تعيين كلمة المرور افتح الرابط التالي خلال ساعة:\n${link}\n\nإذا لم تطلب ذلك يمكنك تجاهل هذه الرسالة.`
      : `Hi ${user.name},\n\nOpen this link within one hour to reset your password:\n${link}\n\nIf you did not request this, you can ignore this email.`,
  });
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw new AppError(
      400,
      'INVALID_OR_EXPIRED_TOKEN',
      'This reset link is invalid or has expired',
    );
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async (tx) => {
    // Conditional update guards against the same token being used twice concurrently.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new AppError(
        400,
        'INVALID_OR_EXPIRED_TOKEN',
        'This reset link is invalid or has expired',
      );
    }
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    // Sign out everywhere after a password change.
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await recordAudit(
      {
        actorId: record.userId,
        action: 'user.password_reset',
        entityType: 'user',
        entityId: record.userId,
      },
      tx,
    );
  });
}
