import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/Logo';

export function SiteFooter() {
  const { t } = useTranslation();
  const columns = [
    {
      title: t('footer.product'),
      links: [
        { to: '/templates', label: t('nav.templates') },
        { to: '/#how-it-works', label: t('nav.howItWorks') },
        { to: '/#pricing', label: t('nav.pricing') },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { to: '/#faq', label: t('nav.faq') },
        { to: '/contact', label: t('footer.contact') },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { to: '/terms', label: t('footer.terms') },
        { to: '/privacy', label: t('footer.privacy') },
        { to: '/refund-policy', label: t('footer.refund') },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-muted">{t('brand.tagline')}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="mb-3 text-sm font-semibold text-ink">{column.title}</h2>
            <ul className="space-y-2 text-sm text-ink-soft">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-ink hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
          <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <p>{t('footer.madeIn')}</p>
        </div>
      </div>
    </footer>
  );
}
