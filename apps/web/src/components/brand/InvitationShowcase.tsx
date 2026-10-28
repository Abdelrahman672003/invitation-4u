import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

/** Decorative, CSS-only sample invitation used on marketing and auth screens. */
export function InvitationShowcase({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'relative mx-auto aspect-[3/4] w-full max-w-sm rounded-[1.75rem] bg-[#fffdf8] p-4 shadow-lift',
        className,
      )}
      aria-hidden
    >
      <div className="relative flex h-full flex-col items-center justify-center rounded-[1.25rem] border border-gold-300 px-8 text-center">
        <div className="absolute inset-2 rounded-[1rem] border border-gold-200" />
        <Ornament className="mb-6 w-28 text-gold-400" />
        <p className="text-sm tracking-wide text-gold-600">{t('showcase.label')}</p>
        <p className="mt-4 font-display text-4xl font-semibold text-brand-800">
          {t('showcase.names')}
        </p>
        <p className="mt-3 text-ink-soft">{t('showcase.occasion')}</p>
        <div className="my-6 h-px w-16 bg-gold-300" />
        <p className="font-medium text-ink">{t('showcase.date')}</p>
        <p className="mt-1 text-sm text-muted">{t('showcase.venue')}</p>
        <Ornament className="mt-8 w-20 rotate-180 text-gold-400" />
      </div>
    </div>
  );
}

function Ornament({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <path d="M2 12h38M80 12h38" strokeLinecap="round" />
      <path d="M60 3c6 5 6 13 0 18-6-5-6-13 0-18Z" />
      <path d="M44 12c5-6 11-6 16 0-5 6-11 6-16 0ZM76 12c-5-6-11-6-16 0 5 6 11 6 16 0Z" />
      <circle cx="40" cy="12" r="1.6" fill="currentColor" />
      <circle cx="80" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}
