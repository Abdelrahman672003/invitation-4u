import express, { Router } from 'express';
import { z } from 'zod';
import { env, isProduction } from '../../config/env.js';
import { AppError, notFound, parseInput } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/security.js';
import { InvalidSignatureError, getProvider } from './provider.js';
import {
  paymentWithRelations,
  processWebhook,
  simulateProviderEvent,
  startCheckout,
  toPaymentDto,
} from './payments.service.js';

export const paymentsRouter = Router();
const checkoutLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 20 });

paymentsRouter.use(requireAuth);

const checkoutSchema = z.object({
  invitationId: z.string().uuid(),
  packageCode: z.string().min(1).max(40),
});

paymentsRouter.post('/checkout', checkoutLimiter, async (req, res) => {
  const input = parseInput(checkoutSchema, req.body);
  const result = await startCheckout({ userId: req.auth!.user.id, ...input });
  res.status(201).json({ data: result });
});

paymentsRouter.get('/', async (req, res) => {
  const rows = await prisma.payment.findMany({
    where: { userId: req.auth!.user.id },
    orderBy: { createdAt: 'desc' },
    include: paymentWithRelations,
  });
  res.json({ data: rows.map(toPaymentDto) });
});

paymentsRouter.get('/:id', async (req, res) => {
  const id = parseInput(z.string().uuid(), req.params.id);
  const row = await prisma.payment.findFirst({
    where: { id, userId: req.auth!.user.id },
    include: paymentWithRelations,
  });
  if (!row) throw notFound('Payment not found');
  res.json({ data: toPaymentDto(row) });
});

/** What the simulated checkout page needs to show; only for the payment's owner. */
paymentsRouter.get('/test/:reference', async (req, res) => {
  assertSimulator();
  const row = await prisma.payment.findFirst({
    where: {
      provider: 'test',
      providerReference: String(req.params.reference),
      userId: req.auth!.user.id,
    },
    include: paymentWithRelations,
  });
  if (!row) throw notFound('Payment not found');
  res.json({ data: toPaymentDto(row) });
});

const outcomeSchema = z.object({ outcome: z.enum(['SUCCEEDED', 'FAILED', 'CANCELLED']) });

/** Stand-in for the gateway's own page: the "customer" picks an outcome, which is sent as a signed webhook. */
paymentsRouter.post('/test/:reference/complete', async (req, res) => {
  assertSimulator();
  const { outcome } = parseInput(outcomeSchema, req.body);
  const reference = String(req.params.reference);
  const owned = await prisma.payment.findFirst({
    where: { provider: 'test', providerReference: reference, userId: req.auth!.user.id },
    select: { id: true },
  });
  if (!owned) throw notFound('Payment not found');
  await simulateProviderEvent(reference, outcome);
  res.json({ data: { paymentId: owned.id } });
});

function assertSimulator() {
  if (isProduction || env.PAYMENT_PROVIDER !== 'test') throw notFound('Endpoint not found');
}

/** Provider callbacks. Mounted before the JSON parser: signatures cover the exact raw bytes. */
export const webhooksRouter = Router();

webhooksRouter.post(
  '/payments/:provider',
  express.raw({ type: '*/*', limit: '100kb' }),
  async (req, res) => {
    let provider;
    try {
      provider = getProvider(String(req.params.provider));
    } catch {
      throw notFound('Unknown provider');
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Empty webhook body');
    }
    try {
      const result = await processWebhook(provider, req.body, req.headers, req.query);
      res.json({ received: true, duplicate: result.duplicate });
    } catch (error) {
      if (error instanceof InvalidSignatureError || error instanceof SyntaxError) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Invalid webhook signature');
      }
      throw error;
    }
  },
);
