import i18n from 'i18next';
import type { Locale } from '@invite/shared';
import type { GuestbookLabels } from './Guestbook';

export function guestbookLabels(locale: Locale, count: number): GuestbookLabels {
  const t = i18n.getFixedT(locale);
  return {
    name: t('landing.guestName'),
    message: t('landing.guestMessage'),
    send: t('landing.guestSend'),
    sent: t('landing.guestSent'),
    empty: t('landing.guestEmpty'),
    error: t('landing.guestError'),
    count: t('landing.guestCount', { count }),
  };
}
