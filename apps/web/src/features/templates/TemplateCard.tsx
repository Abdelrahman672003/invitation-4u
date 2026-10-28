import { Crown, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { localized, type TemplateDto } from '@invite/shared';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { TemplateThumb } from './TemplateThumb';

/** The velvet "display stand" the invitation sits on; shared by the card and the preview page. */
export function TemplateStage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-brand-700 via-brand-900 to-[#240610] ring-1 ring-gold-400/40',
        className,
      )}
    >
      {/* Warm spotlight and a gold hairline frame make the paper stand out from the velvet. */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-gold-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-2 rounded-[1.35rem] border border-gold-400/30"
        aria-hidden
      />
      {children}
    </div>
  );
}

/** A template shown on a velvet stand with a gold frame, a premium crown and a sheen on hover. */
export function TemplateCard({
  template,
  className,
}: {
  template: TemplateDto;
  className?: string;
}) {
  const { t } = useTranslation();
  const locale = currentLocale();
  return (
    <Link
      to={`/templates/${template.slug}`}
      className={cn('group block rounded-[1.75rem] focus-visible:outline-offset-4', className)}
    >
      <TemplateStage className="p-6 pb-7 shadow-lift transition-all duration-500 group-hover:-translate-y-2 group-hover:ring-gold-300 group-hover:shadow-[0_32px_60px_-24px_rgb(61_10_22/0.7)]">
        {template.isPremium && (
          <span className="absolute end-4 top-4 z-20 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gold-200 via-gold-300 to-gold-500 px-3 py-1 text-xs font-semibold text-brand-900 shadow-soft">
            <Crown className="size-3.5" aria-hidden />
            {t('templates.premium')}
          </span>
        )}
        <div className="relative transition-transform duration-500 group-hover:scale-[1.04] group-hover:[transform:perspective(900px)_rotateX(2deg)_scale(1.04)]">
          <TemplateThumb
            template={template}
            className="rounded-lg shadow-[0_22px_40px_-14px_rgb(0_0_0/0.65)]"
          />
          <span
            dir="ltr"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
            aria-hidden
          >
            <span className="absolute inset-y-0 -left-1/2 w-1/3 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-[420%]" />
          </span>
        </div>
        <span className="absolute inset-x-0 bottom-4 z-20 mx-auto inline-flex w-fit translate-y-3 items-center gap-2 rounded-full bg-white/95 px-5 py-2 text-sm font-medium text-brand-800 opacity-0 shadow-lift transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <Eye className="size-4" aria-hidden />
          {t('templates.view')}
        </span>
      </TemplateStage>
      <p className="mt-4 text-center font-display text-lg font-semibold text-ink">
        {localized(template, locale)}
      </p>
    </Link>
  );
}
