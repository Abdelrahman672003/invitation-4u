import { useTranslation } from 'react-i18next';
import { TEXT_FONTS, type InvitationContentData } from '@invite/shared';
import { cn } from '@/lib/cn';

type Choice = InvitationContentData['verseFont'];

const SAMPLE_CLASS: Record<Choice, string> = {
  auto: '',
  display: 'font-display font-semibold',
  script: 'font-script text-xl font-normal',
  luxe: 'font-luxe font-semibold',
  sans: 'font-sans',
  caps: 'font-caps',
};

/** A row of font samples: each chip shows the font so the choice is visible before picking. */
export function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Choice;
  onChange: (value: Choice) => void;
}) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={label} className="space-y-1.5">
      <p className="text-sm font-medium text-ink-soft">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {TEXT_FONTS.map((font) => (
          <button
            key={font}
            type="button"
            role="radio"
            aria-checked={value === font}
            onClick={() => onChange(font)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 transition-colors',
              value === font
                ? 'border-brand-600 bg-brand-50 text-brand-800'
                : 'border-line hover:border-line-strong',
            )}
          >
            <span className={cn('text-lg leading-tight', SAMPLE_CLASS[font])}>
              {font === 'auto' ? '✨' : 'Aa أب'}
            </span>
            <span className="text-xs text-ink-soft">{t(`editor.textFonts.${font}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
