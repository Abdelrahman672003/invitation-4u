import { Brush, Crown } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { TemplateDesign } from '@invite/shared';
import { ColorInput } from '@/components/ui/Pickers';

type Palette = TemplateDesign['palette'];

/** "Design your own poster": anyone can try it; publishing it needs the Premium package. */
export function PosterEntry({ invitationId, active }: { invitationId: string; active: boolean }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/invitations/${invitationId}/studio`}
      className="flex items-center gap-3 rounded-xl border border-gold-400/60 bg-gold-50 p-3 transition-colors hover:bg-gold-100"
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-700 text-white"
        aria-hidden
      >
        <Brush className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {t('studio.entryTitle')}
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[0.7rem] font-semibold text-brand-800">
            <Crown className="size-3" aria-hidden />
            {t('templates.premium')}
          </span>
        </span>
        <span className="block text-xs text-ink-soft">
          {t(active ? 'studio.entryActive' : 'studio.entryHint')}
        </span>
      </span>
    </Link>
  );
}

const KEYS = ['accent', 'background', 'surface', 'text', 'muted'] as const;

/** Whole-page colours: free to try, part of the Premium package when publishing. */
export function PageColors({
  colors,
  palette,
  onChange,
}: {
  colors: Palette | undefined;
  palette: Palette;
  onChange: (colors: Palette | undefined) => void;
}) {
  const { t } = useTranslation();
  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-3">
      <legend className="flex items-center gap-2 px-1 text-sm font-medium text-ink-soft">
        <Crown className="size-4 text-gold-600" aria-hidden />
        {t('editor.pageColors')}
      </legend>
      <p className="text-xs text-ink-soft">{t('editor.pageColorsHint')}</p>
      <div className="space-y-2.5">
        {KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 text-ink-soft">{t(`builder.palette.${key}`)}</span>
            <ColorInput
              label={t(`builder.palette.${key}`)}
              value={palette[key]}
              onChange={(value) => onChange({ ...palette, [key]: value })}
            />
          </div>
        ))}
      </div>
      {colors && (
        <button
          type="button"
          className="text-sm text-brand-700 underline"
          onClick={() => onChange(undefined)}
        >
          {t('editor.reset')}
        </button>
      )}
    </fieldset>
  );
}
