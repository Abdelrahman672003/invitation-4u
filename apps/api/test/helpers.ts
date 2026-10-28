import request from 'supertest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';

export const app = createApp();
export const ORIGIN = 'http://localhost:5173';

export async function resetDatabase() {
  // Children first, so foreign keys are never violated.
  await prisma.auditLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rsvp.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.template.deleteMany();
  await prisma.eventSubtype.deleteMany();
  await prisma.eventCategory.deleteMany();
  await prisma.package.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(overrides: { email?: string; password?: string; role?: 'CUSTOMER' | 'ADMIN' } = {}) {
  const password = overrides.password ?? 'correct-horse-battery';
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: overrides.email ?? `user-${crypto.randomUUID()}@example.com`,
      passwordHash: await hashPassword(password),
      role: overrides.role ?? 'CUSTOMER',
    },
  });
  return { user, password };
}

/** Returns a supertest agent that keeps cookies, already signed in as the given user. */
export async function signIn(email: string, password: string) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').set('Origin', ORIGIN).send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}
