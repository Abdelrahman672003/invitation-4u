import { useTranslation } from 'react-i18next';
import { ENVELOPE_STYLES, type InvitationContentData, type TemplateDesign } from '@invite/shared';
import { EnvelopeThumb } from '@/components/invitation/Envelope';
import { cn } from '@/lib/cn';

/** Lets the customer pick which envelope guests open first. */
export function EnvelopePicker({
  value,
  palette,
  onChange,
}: {
  value: InvitationContentData['envelopeStyle'];
  palette: TemplateDesign['palette'];
  onChange: (style: InvitationContentData['envelopeStyle']) => void;
}) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t('editor.envelopeStyle')} className="space-y-2">
      <p className="text-sm font-medium text-ink-soft">{t('editor.envelopeStyle')}</p>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {ENVELOPE_STYLES.map((style) => (
          <li key={style}>
            <button
              type="button"
              role="radio"
              aria-checked={value === style}
              onClick={() => onChange(style)}
              className={cn(
                'block w-full rounded-xl p-1 text-center ring-2 transition-shadow',
                value === style ? 'ring-brand-600' : 'ring-transparent hover:ring-line-strong',
              )}
            >
              <EnvelopeThumb variant={style} palette={palette} />
              <span className="mt-1.5 block text-xs font-medium">
                {t(`editor.envelopeStyles.${style}`)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
