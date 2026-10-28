import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { generateToken, hashToken } from '../../lib/tokens.js';

export const SESSION_COOKIE = 'inv_session';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Only touch the session row at most once per hour to avoid a write on every request. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_TTL_DAYS * DAY_MS,
  };
}

export async function createSession(userId: string, req: Request, res: Response) {
  const token = generateToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * DAY_MS),
      ipAddress: req.ip?.slice(0, 64),
      userAgent: req.get('user-agent')?.slice(0, 512),
    },
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export async function findActiveSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    // Sliding expiration.
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(now + env.SESSION_TTL_DAYS * DAY_MS) },
    });
  }
  return session;
}

export async function destroySession(sessionId: string | undefined, res: Response) {
  if (sessionId) await prisma.session.deleteMany({ where: { id: sessionId } });
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
}
