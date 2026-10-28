import { env } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { sweepPendingPayments } from './modules/payments/payments.service.js';

const server = createApp().listen(env.API_PORT, () => {
  logger.info(`API listening on http://localhost:${env.API_PORT}`);
});

// Off until a real gateway is live (PAYMENT_SWEEP_ENABLED=true): re-checks stuck pending payments.
const sweeper = env.PAYMENT_SWEEP_ENABLED
  ? setInterval(
      () =>
        sweepPendingPayments().catch((error: unknown) =>
          logger.error('Payment sweep failed', {
            message: error instanceof Error ? error.message : 'unknown error',
          }),
        ),
      15 * 60 * 1000,
    )
  : null;

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  if (sweeper) clearInterval(sweeper);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
