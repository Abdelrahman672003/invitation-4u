import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { hashToken } from '../src/lib/tokens.js';
import { emailService } from '../src/services/email.js';
import { ORIGIN, app, createUser, resetDatabase, signIn } from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const api = (path: string) => `/api/v1${path}`;

describe('registration', () => {
  it('creates a customer, normalizes email and starts a session', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post(api('/auth/register'))
      .set('Origin', ORIGIN)
      .send({ name: 'سارة عمر', email: '  Sara@Example.COM ', password: 'a-very-long-password' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'سارة عمر', email: 'sara@example.com', role: 'CUSTOMER', locale: 'ar' });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/inv_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await agent.get(api('/me'));
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('sara@example.com');
  });

  it('rejects a duplicate email regardless of case', async () => {
    await createUser({ email: 'taken@example.com' });
    const res = await request(app)
      .post(api('/auth/register'))
      .set('Origin', ORIGIN)
      .send({ name: 'Other', email: 'TAKEN@example.com', password: 'a-very-long-password' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns field-level validation keys', async () => {
    const res = await request(app)
      .post(api('/auth/register'))
      .set('Origin', ORIGIN)
      .send({ name: 'A', email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({
      name: 'validation.nameTooShort',
      email: 'validation.email',
      password: 'validation.passwordTooShort',
    });
  });

  it('never lets a client choose its role', async () => {
    const res = await request(app)
      .post(api('/auth/register'))
      .set('Origin', ORIGIN)
      .send({ name: 'Mallory', email: 'm@example.com', password: 'a-very-long-password', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('CUSTOMER');
  });
});

describe('login and logout', () => {
  it('logs in with correct credentials and logs out', async () => {
    const { user, password } = await createUser({ email: 'login@example.com' });
    const agent = await signIn('LOGIN@example.com', password);

    expect((await agent.get(api('/me'))).body.user.id).toBe(user.id);

    const out = await agent.post(api('/auth/logout')).set('Origin', ORIGIN);
    expect(out.status).toBe(204);
    expect((await agent.get(api('/me'))).status).toBe(401);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    await createUser({ email: 'known@example.com' });
    const wrong = await request(app)
      .post(api('/auth/login'))
      .set('Origin', ORIGIN)
      .send({ email: 'known@example.com', password: 'wrong-password' });
    const unknown = await request(app)
      .post(api('/auth/login'))
      .set('Origin', ORIGIN)
      .send({ email: 'unknown@example.com', password: 'wrong-password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('rejects an expired session', async () => {
    const { user, password } = await createUser();
    const agent = await signIn(user.email, password);
    await prisma.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await agent.get(api('/me'))).status).toBe(401);
  });

  it('rejects state-changing requests from a foreign origin', async () => {
    const { user, password } = await createUser();
    const res = await request(app)
      .post(api('/auth/login'))
      .set('Origin', 'https://evil.example')
      .send({ email: user.email, password });
    expect(res.status).toBe(403);
  });
});

describe('password recovery', () => {
  it('responds identically for unknown emails and sends a link for known ones', async () => {
    const { user } = await createUser({ email: 'reset@example.com' });
    emailService.sent.length = 0;

    const unknown = await request(app).post(api('/auth/forgot-password')).set('Origin', ORIGIN).send({ email: 'nobody@example.com' });
    const known = await request(app).post(api('/auth/forgot-password')).set('Origin', ORIGIN).send({ email: user.email });

    expect(unknown.status).toBe(202);
    expect(known.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
    expect(emailService.sent).toHaveLength(1);
    expect(emailService.sent[0]?.text).toContain('/reset-password?token=');
  });

  it('resets the password once, revokes sessions and rejects reuse', async () => {
    const { user, password } = await createUser();
    const oldAgent = await signIn(user.email, password);
    emailService.sent.length = 0;
    await request(app).post(api('/auth/forgot-password')).set('Origin', ORIGIN).send({ email: user.email });
    const token = decodeURIComponent(/token=([^\s]+)/.exec(emailService.sent[0]!.text)![1]!);

    const reset = await request(app)
      .post(api('/auth/reset-password'))
      .set('Origin', ORIGIN)
      .send({ token, password: 'brand-new-password' });
    expect(reset.status).toBe(200);

    expect((await oldAgent.get(api('/me'))).status).toBe(401);
    await signIn(user.email, 'brand-new-password');

    const reuse = await request(app)
      .post(api('/auth/reset-password'))
      .set('Origin', ORIGIN)
      .send({ token, password: 'another-new-password' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect(await prisma.auditLog.count({ where: { action: 'user.password_reset' } })).toBe(1);
  });

  it('stores only token hashes', async () => {
    const { user } = await createUser();
    emailService.sent.length = 0;
    await request(app).post(api('/auth/forgot-password')).set('Origin', ORIGIN).send({ email: user.email });
    const token = decodeURIComponent(/token=([^\s]+)/.exec(emailService.sent[0]!.text)![1]!);
    const row = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.tokenHash).toBe(hashToken(token));
    expect(row.tokenHash).not.toBe(token);
  });
});

describe('profile', () => {
  it('updates name and locale only', async () => {
    const { user, password } = await createUser();
    const agent = await signIn(user.email, password);
    const res = await agent
      .patch(api('/me'))
      .set('Origin', ORIGIN)
      .send({ name: 'Omar', locale: 'en', role: 'ADMIN', email: 'x@y.z' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Omar', locale: 'en', role: 'CUSTOMER', email: user.email });
  });
});
