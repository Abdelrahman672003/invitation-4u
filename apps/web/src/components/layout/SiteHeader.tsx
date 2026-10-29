import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/Logo';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useCurrentUser, useLogout } from '@/features/auth/api';
import { cn } from '@/lib/cn';
import { LanguageToggle } from './LanguageToggle';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-3 py-2 text-[0.95rem] transition-colors',
    isActive ? 'text-brand-700 font-medium' : 'text-ink-soft hover:text-ink',
  );

const sectionLinkClass =
  'rounded-full px-3 py-2 text-[0.95rem] text-ink-soft transition-colors hover:text-ink';

export function SiteHeader() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const links = (
    <>
      <NavLink to="/" end className={navLinkClass}>
        {t('nav.home')}
      </NavLink>
      <NavLink to="/templates" className={navLinkClass}>
        {t('nav.templates')}
      </NavLink>
      {/* These scroll to sections of the home page. */}
      <Link to="/#how-it-works" className={sectionLinkClass}>
        {t('nav.howItWorks')}
      </Link>
      <Link to="/#pricing" className={sectionLinkClass}>
        {t('nav.pricing')}
      </Link>
      {user && (
        <NavLink to="/dashboard" className={navLinkClass}>
          {t('nav.dashboard')}
        </NavLink>
      )}
      {user?.role === 'ADMIN' && (
        <NavLink to="/admin" className={navLinkClass}>
          {t('nav.admin')}
        </NavLink>
      )}
      {/* {user && (
        <NavLink to="/payments" className={navLinkClass}>
          {t('nav.payments')}
        </NavLink>
      )} */}
    </>
  );

  const initial = user ? (Array.from(user.name.trim())[0] ?? '?') : '';
  const contact = (
    <ButtonLink to="/contact" variant="secondary" size="sm">
      {t('nav.contact')}
    </ButtonLink>
  );
  const actions = user ? (
    <>
      {contact}
      <Button
        variant="secondary"
        size="sm"
        loading={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/') })}
      >
        {t('nav.logout')}
      </Button>
      <Link
        to="/account"
        title={user.name}
        aria-label={`${t('nav.profile')}: ${user.name}`}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-semibold uppercase text-white shadow-soft ring-2 ring-transparent transition-shadow hover:ring-brand-200 focus-visible:ring-brand-300"
      >
        {initial}
      </Link>
    </>
  ) : (
    <>
      {contact}
      <ButtonLink to="/login" variant="ghost" size="sm">
        {t('nav.login')}
      </ButtonLink>
      <ButtonLink to="/register" size="sm">
        {t('nav.register')}
      </ButtonLink>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="ms-4 hidden items-center gap-1 md:flex" aria-label={t('nav.menu')}>
          {links}
        </nav>
        <div className="ms-auto hidden items-center gap-2 md:flex">
          <LanguageToggle />
          {actions}
        </div>
        <div className="ms-auto flex items-center gap-1 md:hidden">
          <LanguageToggle />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-ink hover:bg-sunken"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t('nav.closeMenu') : t('nav.menu')}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-nav" className="border-t border-line bg-canvas px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label={t('nav.menu')}>
            {links}
          </nav>
          <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
        </div>
      )}
    </header>
  );
}
