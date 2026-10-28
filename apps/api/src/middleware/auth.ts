import type { RequestHandler } from 'express';
import type { Role } from '@invite/shared';
import { forbidden, unauthenticated } from '../lib/errors.js';
import { SESSION_COOKIE, findActiveSession } from '../modules/auth/session.js';

/** Resolves the session cookie (if any) into req.auth. Never rejects on its own. */
export const loadSession: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token.length > 0) {
    const session = await findActiveSession(token);
    if (session) req.auth = { user: session.user, sessionId: session.id };
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw unauthenticated();
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw unauthenticated();
    if (!roles.includes(req.auth.user.role)) throw forbidden();
    next();
  };
}
