import { Archive, CalendarDays, Pencil, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { localized, type InvitationDto } from '@invite/shared';
import { PageContainer, PageHeader } from '@/components/layout/Layouts';
import { mediaUrl } from '@/lib/media';
import { InvitationRenderer } from '@/components/invitation/InvitationRenderer';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Alert, Badge, Card, EmptyState } from '@/components/ui/Card';
import { useCurrentUser } from '@/features/auth/api';
import { useCategories } from '@/features/categories/api';
import { useArchiveInvitation, useInvitations } from '@/features/invitations/api';
import { DeleteInvitationButton } from '@/features/invitations/DeleteInvitationButton';
import { renderSource, toRenderContent } from '@/features/invitations/renderContent';
import { currentLocale } from '@/i18n';
import { formatDate } from '@/lib/format';
import { directionFor, applyDesignOverrides } from '@invite/shared';

const statusTone = {
  DRAFT: 'neutral',
  PENDING_PAYMENT: 'warning',
  PUBLISHED: 'success',
  UNPUBLISHED: 'info',
  ARCHIVED: 'neutral',
} as const;

function InvitationCard({ invitation }: { invitation: InvitationDto }) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const categories = useCategories();
  const archive = useArchiveInvitation('archive');
  const confirm = useConfirm();
  const restore = useArchiveInvitation('restore');
  const category = categories.data?.find((item) => item.slug === invitation.categorySlug);
  const archived = invitation.status === 'ARCHIVED';

  return (
    <Card className={archived ? 'overflow-hidden opacity-75' : 'overflow-hidden'}>
      <div className="bg-sunken p-5">
        <div className="mx-auto max-w-[11rem]">
          <InvitationRenderer
            design={applyDesignOverrides(invitation.template.design, invitation.content.design)}
            content={toRenderContent(renderSource(invitation), {
              placeholders: { t, categorySlug: invitation.categorySlug },
            })}
            dir={directionFor(invitation.contentLocale)}
            eventDate={invitation.eventDate}
            photo={invitation.content.photo ? mediaUrl(invitation.content.photo) : null}
            className="rounded-lg shadow-soft"
          />
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-lg font-semibold">{invitation.title}</h3>
          <Badge tone={statusTone[invitation.status]}>{t(`status.${invitation.status}`)}</Badge>
        </div>
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {category && <span>{localized(category, locale)}</span>}
          <span aria-hidden>·</span>
          <span>
            {invitation.eventDate
              ? formatDate(`${invitation.eventDate}T12:00:00Z`, locale, {
                  dateStyle: 'medium',
                  timeZone: 'UTC',
                })
              : t('dashboard.noDate')}
          </span>
        </p>
        {invitation.paymentStatus && (
          <p className="text-sm text-ink-soft">
            {t('dashboard.payment')}: {t(`pay.status.${invitation.paymentStatus}`)}
          </p>
        )}
        {invitation.status === 'PUBLISHED' && (
          <p className="text-sm text-ink-soft">{t('dashboard.stats', { ...invitation.stats })}</p>
        )}
        {invitation.expiresAt && (
          <p
            className={
              invitation.expired ? 'text-sm font-medium text-danger-600' : 'text-sm text-ink-soft'
            }
          >
            {invitation.expired
              ? t('free.expiredBadge')
              : t('free.activeBody', {
                  date: formatDate(invitation.expiresAt, locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }),
                })}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {archived ? (
            <Button
              variant="secondary"
              size="sm"
              loading={restore.isPending}
              onClick={() => restore.mutate(invitation.id)}
            >
              <RotateCcw className="size-4" aria-hidden />
              {t('dashboard.restore')}
            </Button>
          ) : (
            <>
              <ButtonLink to={`/invitations/${invitation.id}/edit`} size="sm">
                <Pencil className="size-4" aria-hidden />
                {t('dashboard.edit')}
              </ButtonLink>
              <ButtonLink to={`/invitations/${invitation.id}/manage`} variant="secondary" size="sm">
                {t('dashboard.manage')}
              </ButtonLink>
              {invitation.status === 'DRAFT' && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={archive.isPending}
                  onClick={async () =>
                    (await confirm({ message: t('dashboard.archiveConfirm') })) &&
                    archive.mutate(invitation.id)
                  }
                >
                  <Archive className="size-4" aria-hidden />
                  {t('dashboard.archive')}
                </Button>
              )}
            </>
          )}
          <DeleteInvitationButton invitation={invitation} />
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const invitations = useInvitations();

  return (
    <PageContainer>
      <PageHeader
        title={t('dashboard.welcome', { name: user?.name ?? '' })}
        subtitle={t('dashboard.subtitle')}
        actions={
          <ButtonLink to="/invitations/new">
            <Plus className="size-5" aria-hidden />
            {t('dashboard.create')}
          </ButtonLink>
        }
      />

      {invitations.isError && (
        <Alert title={t('dashboard.error')}>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => invitations.refetch()}
          >
            {t('common.retry')}
          </Button>
        </Alert>
      )}
      {invitations.isPending && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-96 animate-pulse rounded-card bg-sunken" />
          ))}
        </div>
      )}
      {invitations.data?.length === 0 && (
        <EmptyState
          icon={<Sparkles className="size-7" />}
          title={t('dashboard.emptyTitle')}
          body={t('dashboard.emptyBody')}
          action={
            <Link to="/invitations/new">
              <Button variant="gold">{t('dashboard.emptyCta')}</Button>
            </Link>
          }
        />
      )}
      {invitations.data && invitations.data.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {invitations.data.map((invitation) => (
            <InvitationCard key={invitation.id} invitation={invitation} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
