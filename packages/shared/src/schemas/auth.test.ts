import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth.js';
import { normalizeEmail, directionFor } from '../utils.js';

describe('auth schemas', () => {
  it('accepts Arabic names and trims email', () => {
    const result = registerSchema.parse({
      name: 'سارة عمر',
      email: '  Sara@Example.com ',
      password: 'a-long-password',
    });
    expect(result.name).toBe('سارة عمر');
    expect(result.email).toBe('Sara@Example.com');
  });

  it('rejects short passwords with a translation key', () => {
    const result = registerSchema.safeParse({
      name: 'Sara',
      email: 'sara@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('validation.passwordTooShort');
  });

  it('does not apply password length rules on login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });
});

describe('utils', () => {
  it('normalizes emails', () => {
    expect(normalizeEmail('  A@B.Com ')).toBe('a@b.com');
  });

  it('derives text direction', () => {
    expect(directionFor('ar')).toBe('rtl');
    expect(directionFor('en')).toBe('ltr');
  });
});
