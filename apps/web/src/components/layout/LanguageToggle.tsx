import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { CurrentUser, Locale } from '@invite/shared';
import { currentLocale, storeLocale } from '@/i18n';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { meQueryKey } from '@/features/auth/api';

export function LanguageToggle({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();

  const toggle = () => {
    const next: Locale = currentLocale() === 'ar' ? 'en' : 'ar';
    void i18n.changeLanguage(next);
    storeLocale(next);
    // Remember the preference on the account too, when signed in (best effort).
    const user = client.getQueryData<CurrentUser | null>(meQueryKey);
    if (user && user.locale !== next) {
      api<{ user: CurrentUser }>('/me', { method: 'PATCH', body: { locale: next } })
        .then(({ user: updated }) => client.setQueryData(meQueryKey, updated))
        .catch(() => undefined);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      lang={currentLocale() === 'ar' ? 'en' : 'ar'}
      aria-label={t('nav.switchLanguageLabel')}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-soft hover:bg-sunken hover:text-ink',
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      {t('nav.switchLanguage')}
    </button>
  );
}
