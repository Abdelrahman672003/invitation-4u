import i18n from 'i18next';

/** Non-interactive stand-in for the guest reply form, used by previews and the home page demo. */
export function RsvpSample({ locale }: { locale: 'ar' | 'en' }) {
  const t = i18n.getFixedT(locale);
  return (
    <div
      className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-soft"
      aria-hidden
    >
      <h2 className="text-xl font-semibold">{t('public.rsvpTitle')}</h2>
      <div className="h-12 rounded-(--radius-field) border border-line-strong" />
      <div className="flex gap-2">
        <span className="flex-1 rounded-full bg-brand-700 px-4 py-3 text-center font-medium text-white">
          {t('public.accept')}
        </span>
        <span className="flex-1 rounded-full border border-line-strong px-4 py-3 text-center font-medium">
          {t('public.decline')}
        </span>
      </div>
    </div>
  );
}
