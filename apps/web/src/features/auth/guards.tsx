import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Role } from '@invite/shared';
import { PageLoader } from '@/components/ui/Spinner';
import { ForbiddenPage } from '@/pages/ErrorPages';
import { useCurrentUser } from './api';

/**
 * UX-only route guards. The API enforces every permission on the server;
 * these just avoid showing screens the user cannot use.
 */
export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { data: user, isPending } = useCurrentUser();

  if (isPending) return <PageLoader label={t('common.loading')} />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (role && user.role !== role) return <ForbiddenPage />;
  return <>{children}</>;
}

/** For sign-in/up pages: bounce already-authenticated users to their dashboard. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Only allow same-site relative paths as post-login destinations (no open redirects). */
export function safeNextPath(value: string | null): string {
  if (!value) return '/dashboard';
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : '/dashboard';
}
