import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { AdminOverviewDto } from '@invite/shared';
import { Button } from '@/components/ui/Button';
import { Alert, Badge, Card } from '@/components/ui/Card';
import { currentLocale } from '@/i18n';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';

const statusColor: Record<string, string> = {
  PUBLISHED: 'bg-success-600',
  DRAFT: 'bg-line-strong',
  PENDING_PAYMENT: 'bg-gold-500',
  UNPUBLISHED: 'bg-info-600',
  ARCHIVED: 'bg-ink-soft/50',
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-brand-800">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
}

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** Fourteen thin bars, one per day, tallest day at full height. */
function Bars({
  days,
  value,
  format,
  color,
  locale,
}: {
  days: AdminOverviewDto['daily'];
  value: (day: AdminOverviewDto['daily'][number]) => number;
  format: (amount: number) => string;
  color: string;
  locale: 'ar' | 'en';
}) {
  const max = Math.max(1, ...days.map(value));
  return (
    <div
      className="flex h-24 items-end gap-1"
      role="img"
      aria-label={days.map((d) => format(value(d))).join(', ')}
    >
      {days.map((day) => (
        <span
          key={day.date}
          title={`${formatDate(day.date, locale, { dateStyle: 'medium' })}: ${format(value(day))}`}
          className={cn('flex-1 rounded-t-md transition-all', color)}
          style={{
            height: `${Math.max(4, (value(day) / max) * 100)}%`,
            opacity: value(day) ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

function RankBars({
  rows,
}: {
  rows: { key: string; label: string; count: number; hint?: string }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{row.label}</span>
            <span className="shrink-0 text-ink-soft">{row.hint ?? row.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sunken">
            <span
              className="block h-full rounded-full bg-brand-600"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The admin landing tab; the page chrome and tab bar come from AdminLayout. */
export function AdminOverviewPage() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => (await api<{ data: AdminOverviewDto }>('/admin/overview')).data,
  });
  const data = overview.data;
  const number = (value: number) => formatNumber(value, locale);
  const money = (value: number) => formatMoney(value, 'EGP', locale);
  const name = (row: { nameAr: string; nameEn: string }) =>
    locale === 'ar' ? row.nameAr : row.nameEn;

  const statusTotal = data
    ? Object.values(data.invitationsByStatus).reduce((sum, count) => sum + count, 0)
    : 0;
  const payments = Object.entries(data?.payments ?? {});
  const charts: {
    label: string;
    pick: (day: AdminOverviewDto['daily'][number]) => number;
    format: (amount: number) => string;
    color: string;
  }[] = [
    {
      label: 'admin.ov.signups',
      pick: (day) => day.signups,
      format: number,
      color: 'bg-brand-600',
    },
    {
      label: 'admin.ov.newInvitations',
      pick: (day) => day.invitations,
      format: number,
      color: 'bg-gold-500',
    },
    {
      label: 'admin.ov.dailyRevenue',
      pick: (day) => day.revenueMinor,
      format: money,
      color: 'bg-success-600',
    },
  ];

  return (
    <div className="space-y-6">
      {overview.isError && (
        <Alert>
          {t('errors.generic')}{' '}
          <Button variant="ghost" size="sm" onClick={() => overview.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      )}
      {overview.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-card bg-sunken" />
          ))}
        </div>
      )}
      {data && (
        <>
          {data.failedWebhooks > 0 && (
            <Alert tone="warning" title={t('admin.failedWebhooks', { count: data.failedWebhooks })}>
              {t('admin.failedWebhooksHint')}
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={t('admin.customers')}
              value={number(data.customers)}
              hint={t('admin.ov.newThisWeek', { count: data.newCustomers7d })}
            />
            <Stat
              label={t('admin.invitations')}
              value={number(data.invitations)}
              hint={t('admin.ov.publishedOf', { count: data.publishedInvitations })}
            />
            <Stat
              label={t('admin.ov.paidInvitations')}
              value={number(data.paidInvitations)}
              hint={t('admin.ov.conversion', { percent: data.conversionPercent })}
            />
            <Stat
              label={t('admin.revenue')}
              value={money(data.revenueMinor)}
              hint={`${t('admin.ov.last30')}: ${money(data.revenue30dMinor)}`}
            />
            <Stat
              label={t('admin.ov.guests')}
              value={number(data.totals.guests)}
              hint={t('admin.ov.attendees', { count: data.totals.attendees })}
            />
            <Stat
              label={t('admin.ov.replies')}
              value={number(data.totals.accepted + data.totals.declined)}
              hint={`${t('admin.ov.accepted')}: ${number(data.totals.accepted)} · ${t('admin.ov.declined')}: ${number(data.totals.declined)}`}
            />
            <Stat label={t('admin.ov.views')} value={number(data.totals.views)} />
            <Stat
              label={t('admin.ov.templates')}
              value={number(data.totals.templates)}
              hint={t('admin.ov.premiumCount', { count: data.totals.premiumTemplates })}
            />
          </div>

          <Section title={t('admin.ov.last14')}>
            <div className="grid gap-6 md:grid-cols-3">
              {charts.map(({ label, pick, format, color }) => (
                <div key={label}>
                  <p className="mb-2 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{t(label)}</span>
                    <span className="text-ink-soft">
                      {format(data.daily.reduce((sum, day) => sum + pick(day), 0))}
                    </span>
                  </p>
                  <Bars
                    days={data.daily}
                    value={pick}
                    format={format}
                    color={color}
                    locale={locale}
                  />
                </div>
              ))}
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={t('admin.ov.byStatus')}>
              {statusTotal === 0 ? (
                <p className="text-sm text-muted">{t('admin.ov.noData')}</p>
              ) : (
                <>
                  <div className="flex h-3 overflow-hidden rounded-full bg-sunken">
                    {Object.entries(data.invitationsByStatus).map(([status, count]) => (
                      <span
                        key={status}
                        title={`${t(`status.${status}`)}: ${count}`}
                        className={statusColor[status] ?? 'bg-line-strong'}
                        style={{ width: `${(count / statusTotal) * 100}%` }}
                      />
                    ))}
                  </div>
                  <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(data.invitationsByStatus).map(([status, count]) => (
                      <li key={status} className="flex items-center gap-2">
                        <span className={cn('size-2.5 rounded-full', statusColor[status])} />
                        <span className="text-ink-soft">{t(`status.${status}`)}</span>
                        <span className="ms-auto font-medium">{number(count)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            <Section title={t('admin.payments')}>
              {payments.length === 0 ? (
                <p className="text-sm text-muted">{t('admin.noPayments')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {payments.map(([status, count]) => (
                    <Badge
                      key={status}
                      tone={
                        status === 'SUCCEEDED'
                          ? 'success'
                          : status === 'FAILED'
                            ? 'danger'
                            : 'neutral'
                      }
                    >
                      {t(`pay.status.${status}`, { defaultValue: status })}: {number(count)}
                    </Badge>
                  ))}
                </div>
              )}
              <ul className="mt-4 divide-y divide-line text-sm">
                {data.recentPayments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span dir="ltr" className="block truncate">
                        {payment.email}
                      </span>
                      <span className="text-xs text-ink-soft">
                        {formatDate(payment.createdAt, locale, { dateStyle: 'medium' })}
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className="block font-medium">
                        {formatMoney(payment.amountMinor, payment.currency, locale)}
                      </span>
                      <span className="text-xs text-ink-soft">
                        {t(`pay.status.${payment.status}`, { defaultValue: payment.status })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={t('admin.ov.byOccasion')}>
              <RankBars
                rows={data.invitationsByCategory.map((row) => ({
                  key: row.nameEn,
                  label: name(row),
                  count: row.count,
                }))}
              />
            </Section>

            <Section title={t('admin.ov.topTemplates')}>
              {data.topTemplates.length === 0 ? (
                <p className="text-sm text-muted">{t('admin.ov.noData')}</p>
              ) : (
                <RankBars
                  rows={data.topTemplates.map((row) => ({
                    key: row.slug,
                    label: name(row),
                    count: row.count,
                  }))}
                />
              )}
            </Section>
          </div>

          <Section
            title={t('admin.ov.recentInvitations')}
            action={
              <Link to="/admin/invitations" className="text-sm text-brand-700 hover:underline">
                {t('admin.ov.viewAll')}
              </Link>
            }
          >
            {data.recentInvitations.length === 0 ? (
              <p className="text-sm text-muted">{t('admin.ov.noData')}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {data.recentInvitations.map((invitation) => (
                  <li key={invitation.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{invitation.title}</span>
                      <span dir="ltr" className="block truncate text-xs text-ink-soft">
                        {invitation.ownerEmail}
                      </span>
                    </span>
                    <Badge tone={invitation.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                      {t(`status.${invitation.status}`)}
                    </Badge>
                    <span className="w-28 text-end text-xs text-ink-soft">
                      {formatDate(invitation.updatedAt, locale, { dateStyle: 'medium' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
