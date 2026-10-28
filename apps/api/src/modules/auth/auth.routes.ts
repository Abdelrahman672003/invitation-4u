import { Router } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@invite/shared';
import { parseInput } from '../../lib/errors.js';
import { authRateLimiter } from '../../middleware/security.js';
import { toCurrentUser } from '../users/user.dto.js';
import { authenticate, registerUser, requestPasswordReset, resetPassword } from './auth.service.js';
import { createSession, destroySession } from './session.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, async (req, res) => {
  const input = parseInput(registerSchema, req.body);
  const user = await registerUser(input);
  await createSession(user.id, req, res);
  res.status(201).json({ user: toCurrentUser(user) });
});

authRouter.post('/login', authRateLimiter, async (req, res) => {
  const input = parseInput(loginSchema, req.body);
  const user = await authenticate(input);
  // Rotate: drop any session the client already had before issuing a new one.
  if (req.auth) await destroySession(req.auth.sessionId, res);
  await createSession(user.id, req, res);
  res.json({ user: toCurrentUser(user) });
});

authRouter.post('/logout', async (req, res) => {
  await destroySession(req.auth?.sessionId, res);
  res.status(204).end();
});

authRouter.post('/forgot-password', authRateLimiter, async (req, res) => {
  const input = parseInput(forgotPasswordSchema, req.body);
  await requestPasswordReset(input);
  res.status(202).json({ ok: true });
});

authRouter.post('/reset-password', authRateLimiter, async (req, res) => {
  const input = parseInput(resetPasswordSchema, req.body);
  await resetPassword(input);
  res.json({ ok: true });
});
