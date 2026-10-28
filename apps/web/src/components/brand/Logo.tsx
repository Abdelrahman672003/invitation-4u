import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import logo from '@/assets/logo.png';

export function LogoMark({ className }: { className?: string }) {
  return (
    // <svg viewBox="0 0 64 64" className={cn('size-9', className)} aria-hidden>
    //   <rect width="64" height="64" rx="16" className="fill-brand-700" />
    //   <rect x="14" y="18" width="36" height="28" rx="4" fill="none" className="stroke-gold-200" strokeWidth="3" />
    //   <path d="M14 22l18 13 18-13" fill="none" className="stroke-gold-200" strokeWidth="3" strokeLinejoin="round" />
    // </svg>
    <img src={logo} alt="Logo" className={cn('size-16', className)} />
  );
}

export function Logo({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2 rounded-lg', className)}>
      <LogoMark />
      <span className="font-display text-2xl font-semibold text-ink">{t('brand.name')}</span>
    </Link>
  );
}
