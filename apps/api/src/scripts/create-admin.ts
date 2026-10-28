import { normalizeEmail } from '@invite/shared';
import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';

/**
 * Creates (or promotes) the first administrator in a deployed environment, where the development
 * seed refuses to make one. Reads ADMIN_EMAIL, ADMIN_PASSWORD and optionally ADMIN_NAME.
 *
 *   docker compose exec -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='…' api \
 *     node apps/api/dist/create-admin.js
 */
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD.');
  if (password.length < 12) throw new Error('Use a password of at least 12 characters.');

  const normalized = normalizeEmail(email);
  await prisma.user.upsert({
    where: { email: normalized },
    update: { role: 'ADMIN', passwordHash: await hashPassword(password) },
    create: {
      email: normalized,
      name: process.env.ADMIN_NAME ?? 'Platform Admin',
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
    },
  });
  console.log(`Administrator ready: ${normalized}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
