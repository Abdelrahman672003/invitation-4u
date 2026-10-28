import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';
import { InvitationShowcase } from '@/components/brand/InvitationShowcase';
import { Logo } from '@/components/brand/Logo';
import { LanguageToggle } from './LanguageToggle';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** Scrolls to the top on a new page, or to the element named by the address hash (React Router does neither itself). */
function ScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // A new page starts at the top; a link with a #section scrolls to that section instead.
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    // The target may render a moment after navigation, so try again briefly.
    let tries = 0;
    const timer = setInterval(() => {
      const element = document.getElementById(id);
      tries += 1;
      if (element) {
        element.scrollIntoView({
          behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'start',
        });
        clearInterval(timer);
      } else if (tries > 20) {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [pathname, hash]);
  return null;
}

export function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <ScrollToHash />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

/** Split screen: form on the start side, sample invitation on the end side (desktop only). */
export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <LanguageToggle />
        </div>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <Outlet />
        </main>
      </div>
      <aside className="relative hidden overflow-hidden bg-brand-800 lg:flex lg:items-center lg:justify-center">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, var(--color-brand-500) 0, transparent 45%), radial-gradient(circle at 80% 85%, var(--color-gold-500) 0, transparent 40%)',
          }}
        />
        <InvitationShowcase className="relative w-[70%] max-w-sm rotate-[-2deg]" />
      </aside>
    </div>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
