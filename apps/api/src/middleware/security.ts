import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { env, isTest } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence in depth (cookies are already SameSite=Lax): browsers always send
 * Origin on cross-site state-changing requests, so reject any that is not allow-listed.
 * Server-to-server calls (payment webhooks) carry no Origin and pass through.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin');
  if (!SAFE_METHODS.has(req.method) && origin && !env.CORS_ORIGINS.includes(origin)) {
    throw new AppError(403, 'FORBIDDEN', 'Origin not allowed');
  }
  next();
};

export function createRateLimiter(options: { windowMs: number; limit: number }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isTest && process.env.ENABLE_RATE_LIMIT_IN_TESTS !== 'true',
    handler: (_req, _res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please try again later')),
  });
}

/** Login, registration and password recovery. */
export const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, limit: 20 });
