import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { API_BASE_PATH } from '@invite/shared';
import { env } from './config/env.js';
import { errorHandler, notFound } from './lib/errors.js';
import { buildOpenApiDocument } from './openapi.js';
import { prisma } from './lib/prisma.js';
import { loadSession } from './middleware/auth.js';
import { originCheck } from './middleware/security.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { invitationsRouter } from './modules/invitations/invitations.routes.js';
import { guestsRouter } from './modules/invitations/guests.routes.js';
import { blessingsRouter } from './modules/invitations/blessings.routes.js';
import { artAssetsRouter } from './modules/media/art-assets.routes.js';
import {
  artUploadRouter,
  assetUploadRouter,
  mediaRouter,
  musicUploadRouter,
  photoUploadRouter,
} from './modules/media/media.routes.js';
import { publicRouter } from './modules/public/public.routes.js';
import { paymentsRouter, webhooksRouter } from './modules/payments/payments.routes.js';
import { packagesRouter } from './modules/packages/packages.routes.js';
import { templatesRouter } from './modules/templates/templates.routes.js';
import { meRouter } from './modules/users/me.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  // Webhooks need the raw body for signature checks, so they are mounted before the JSON parser.
  app.use(API_BASE_PATH + '/webhooks', webhooksRouter);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });

  const api = Router();
  const openApiDocument = buildOpenApiDocument();
  api.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  api.use(originCheck, loadSession);
  api.use('/auth', authRouter);
  api.use('/me', meRouter);
  api.use('/categories', categoriesRouter);
  api.use('/templates', templatesRouter);
  api.use('/packages', packagesRouter);
  api.use('/invitations/:id/photo', photoUploadRouter);
  api.use('/invitations/:id/music', musicUploadRouter);
  api.use('/invitations/:id/art', artUploadRouter);
  api.use('/art-assets', artAssetsRouter);
  api.use('/invitations/:id/blessings', blessingsRouter);
  api.use('/invitations/:id', guestsRouter);
  api.use('/media', mediaRouter);
  api.use('/invitations', invitationsRouter);
  api.use('/payments', paymentsRouter);
  api.use('/public', publicRouter);
  api.use('/admin/assets', assetUploadRouter);
  api.use('/admin', adminRouter);
  api.use(() => {
    throw notFound('Endpoint not found');
  });

  app.use(API_BASE_PATH, api);
  app.use(errorHandler);
  return app;
}
