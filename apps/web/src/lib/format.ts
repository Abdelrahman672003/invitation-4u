import type { Locale } from '@invite/shared';

/**
 * Digits used for Arabic UI. 'latn' (0-9) is common in Egyptian products and keeps
 * phone numbers and prices unambiguous; switch to 'arab' for ٠-٩.
 */
export const ARABIC_NUMBERING: 'latn' | 'arab' = 'latn';

function intlLocale(locale: Locale) {
  return locale === 'ar' ? `ar-EG-u-nu-${ARABIC_NUMBERING}` : 'en-GB';
}

export function formatDate(
  value: string | Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(intlLocale(locale), options ?? { dateStyle: 'long' }).format(
    new Date(value),
  );
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

export function formatMoney(amountMinor: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), { style: 'currency', currency }).format(
    amountMinor / 100,
  );
}
