import type { TFunction } from 'i18next';
import type { InvitationContent, InvitationDto, Locale } from '@invite/shared';
import { formatDate } from '@/lib/format';
import { sampleContent } from '@/features/templates/sampleContent';
import type { Draft } from './useInvitationEditor';

/** Formats "20:00" as a 12-hour time in the invitation's language. */
export function formatTime(value: string, locale: Locale) {
  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, hours ?? 0, minutes ?? 0)));
}

type RenderSource = Pick<Draft, 'content' | 'eventDate' | 'contentLocale'>;

/**
 * Converts stored content into the text the renderer shows. With `placeholders`, empty fields
 * fall back to sample text so the editor preview never looks blank.
 */
export function toRenderContent(
  source: RenderSource,
  options: { placeholders?: { t: TFunction; categorySlug: string } } = {},
): InvitationContent {
  const { content, eventDate, contentLocale } = source;
  const sample = options.placeholders
    ? sampleContent(options.placeholders.t, options.placeholders.categorySlug)
    : null;
  return {
    label: content.hostLine || sample?.label || '',
    title: content.headline || sample?.title || '',
    occasion: content.occasionLine || sample?.occasion || '',
    date: eventDate
      ? formatDate(`${eventDate}T12:00:00Z`, contentLocale, { dateStyle: 'full', timeZone: 'UTC' })
      : (sample?.date ?? ''),
    time:
      content.sections.time && content.time ? formatTime(content.time, contentLocale) : undefined,
    venue: content.venueName || sample?.venue || '',
    address: content.sections.address ? content.venueAddress || undefined : undefined,
    message: content.sections.message ? content.message || undefined : undefined,
  };
}

export const renderSource = (invitation: InvitationDto): RenderSource => ({
  content: invitation.content,
  eventDate: invitation.eventDate,
  contentLocale: invitation.contentLocale,
});
