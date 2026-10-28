import { useTranslation } from 'react-i18next';
import { directionFor, type TemplateDto } from '@invite/shared';
import { InvitationRenderer } from '@/components/invitation/InvitationRenderer';
import { currentLocale } from '@/i18n';
import { sampleContent } from './sampleContent';

/** A template rendered with sample text in the current UI language. */
export function TemplateThumb({
  template,
  className,
}: {
  template: TemplateDto;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <InvitationRenderer
      design={template.design}
      content={sampleContent(t, template.categorySlug)}
      dir={directionFor(currentLocale())}
      eventDate="2026-12-10"
      className={className ?? 'rounded-xl shadow-soft'}
    />
  );
}
