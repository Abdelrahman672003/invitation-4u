import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** Payment provider adapter. Only the simulated 'test' provider exists until a real one is chosen. */
  PAYMENT_PROVIDER: z.enum(['test', 'paymob', 'lemonsqueezy']).default('test'),
  /** Lemon Squeezy (merchant of record); all of these are required once PAYMENT_PROVIDER=lemonsqueezy. */
  LEMONSQUEEZY_API_KEY: z.string().optional(),
  LEMONSQUEEZY_STORE_ID: z.string().optional(),
  /** Any product variant of the store; each checkout overrides its price with the package price. */
  LEMONSQUEEZY_VARIANT_ID: z.string().optional(),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().optional(),
  /** Currency the Lemon Squeezy store charges in. */
  LEMONSQUEEZY_CURRENCY: z.string().length(3).default('USD'),
  /** How many units of the package currency (EGP) one unit of the store currency buys. */
  LEMONSQUEEZY_RATE: z.coerce.number().positive().default(50),
  /** Paymob (Accept) credentials; all required once PAYMENT_PROVIDER=paymob. */
  PAYMOB_BASE_URL: z.string().url().default('https://accept.paymob.com'),
  PAYMOB_SECRET_KEY: z.string().optional(),
  PAYMOB_PUBLIC_KEY: z.string().optional(),
  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_HMAC_SECRET: z.string().optional(),
  /** Comma-separated integration ids of the enabled payment methods (cards only for now). */
  PAYMOB_INTEGRATION_IDS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  /** Public URL Paymob calls with transaction results; defaults to this site's own API. */
  PAYMOB_NOTIFICATION_URL: z.string().url().optional(),
  /** Periodically re-checks stuck pending payments with the gateway and expires abandoned ones. */
  PAYMENT_SWEEP_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** Shared secret used to sign and verify payment webhooks. */
  PAYMENT_WEBHOOK_SECRET: z.string().min(16).default('dev-only-webhook-secret-change-me'),
  /** Where customer photos are stored on disk. Back this directory up and mount it on a volume in production. */
  UPLOAD_DIR: z.string().default('./uploads'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  EMAIL_PROVIDER: z.enum(['console']).default('console'),
  EMAIL_FROM: z.string().default('Daawa <no-reply@example.com>'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

if (isProduction && !env.COOKIE_SECURE) {
  throw new Error('COOKIE_SECURE must be true in production.');
}

if (env.PAYMENT_PROVIDER === 'paymob') {
  const missing: string[] = (
    ['PAYMOB_SECRET_KEY', 'PAYMOB_PUBLIC_KEY', 'PAYMOB_API_KEY', 'PAYMOB_HMAC_SECRET'] as const
  ).filter((key) => !env[key]);
  if (env.PAYMOB_INTEGRATION_IDS.length === 0) missing.push('PAYMOB_INTEGRATION_IDS');
  if (missing.length > 0) {
    throw new Error(`PAYMENT_PROVIDER=paymob needs ${missing.join(', ')}.`);
  }
}

if (env.PAYMENT_PROVIDER === 'lemonsqueezy') {
  const missing = (
    [
      'LEMONSQUEEZY_API_KEY',
      'LEMONSQUEEZY_STORE_ID',
      'LEMONSQUEEZY_VARIANT_ID',
      'LEMONSQUEEZY_WEBHOOK_SECRET',
    ] as const
  ).filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`PAYMENT_PROVIDER=lemonsqueezy needs ${missing.join(', ')}.`);
  }
}

if (isProduction && env.PAYMENT_PROVIDER === 'test') {
  throw new Error('The simulated test payment provider cannot be used in production.');
}
