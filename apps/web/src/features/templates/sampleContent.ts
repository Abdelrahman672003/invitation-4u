import type { TFunction } from 'i18next';
import type { InvitationContent } from '@invite/shared';

/** Placeholder text used to preview a template before the customer enters real details. */
export function sampleContent(t: TFunction, categorySlug: string): InvitationContent {
  const key = (field: string) => t(`samples.${categorySlug}.${field}`, { defaultValue: '' });
  return {
    label: key('label'),
    title: key('title'),
    occasion: key('occasion'),
    date: key('date'),
    time: key('time'),
    venue: key('venue'),
    address: key('address') || undefined,
  };
}
