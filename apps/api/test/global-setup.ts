import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

/** Applies migrations to the test database once per run. */
export default function setup() {
  execSync('npx prisma migrate deploy', {
    cwd: resolve(import.meta.dirname, '../../..'),
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
