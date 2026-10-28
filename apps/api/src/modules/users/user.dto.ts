import type { User } from '@prisma/client';
import { LOCALES, type CurrentUser, type Locale } from '@invite/shared';

function asLocale(value: string): Locale {
  return (LOCALES as readonly string[]).includes(value) ? (value as Locale) : 'ar';
}

/** The only shape in which a user record leaves the API. */
export function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    locale: asLocale(user.locale),
    createdAt: user.createdAt.toISOString(),
  };
}
