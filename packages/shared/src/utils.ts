import { RTL_LOCALES, type Locale } from './constants.js';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function directionFor(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}

/** Picks the localized field of a bilingual record ({ nameAr, nameEn }). */
export function localized<T extends { nameAr: string; nameEn: string }>(
  record: T,
  locale: Locale,
): string {
  return locale === 'ar' ? record.nameAr : record.nameEn;
}
