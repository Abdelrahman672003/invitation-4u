import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Copy, Crown, Pencil, Plus, Share2, Trash2, Users } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  FREE_PLAN,
  GUEST_STATUS_FILTERS,
  localized,
  type GuestDto,
  type InvitationDto,
} from '@invite/shared';
import { PageContainer } from '@/components/layout/Layouts';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Alert, Badge, Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { usePackages } from '@/features/packages/api';
import { api, ApiError } from '@/lib/api';
import { currentLocale } from '@/i18n';
import { formatDate, formatMoney } from '@/lib/format';
import { saveInvitation, useInvitation } from './api';
import { DeleteInvitationButton } from './DeleteInvitationButton';
import {
  useGuestMutations,
  useGuests,
  usePublishAction,
  useDeleteBlessing,
  useOwnerBlessings,
  useRsvps,
  type GuestFilters,
} from './manageApi';

const selectClass =
  'h-11 rounded-(--radius-field) border border-line-strong bg-surface px-3 text-sm';
const statusTone = { ACCEPTED: 'success', DECLINED: 'danger', PENDING: 'neutral' } as const;

export function publicUrl(slug: string) {
  return `${window.location.origin}/i/${slug}`;
}

export function ManagePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const invitation = useInvitation(id);

  if (invitation.isPending) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner />
      </div>
    );
  }
  if (invitation.isError) {
    return (
      <PageContainer>
        <Alert title={t('editor.notFound')}>
          <ButtonLink to="/dashboard" variant="secondary" size="sm" className="mt-3">
            {t('editor.backToDashboard')}
          </ButtonLink>
        </Alert>
      </PageContainer>
    );
  }
  return <Manage invitation={invitation.data} />;
}

function Manage({ invitation }: { invitation: InvitationDto }) {
  const { t } = useTranslation();
  const publish = usePublishAction('publish');
  const unpublish = usePublishAction('unpublish');
  const navigate = useNavigate();
  const published = invitation.status === 'PUBLISHED';
  const onFreePlan = published && invitation.expiresAt !== null;
  const archived = invitation.status === 'ARCHIVED';

  const publishError = publish.error instanceof ApiError ? publish.error : null;
  const publishMessage = publishError
    ? publishError.code === 'PAYMENT_REQUIRED'
      ? t('manage.paymentRequired')
      : publishError.code === 'VALIDATION_ERROR'
        ? t('manage.notReady')
        : t('manage.publishFailed')
    : null;

  return (
    <PageContainer>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t('editor.backToDashboard')}
      </Link>
      <div className="mb-8 mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{invitation.title}</h1>
          <Badge tone={invitation.expired ? 'warning' : published ? 'success' : 'neutral'}>
            {t(invitation.expired ? 'free.expiredBadge' : `status.${invitation.status}`)}
          </Badge>
          {onFreePlan && !invitation.expired && <Badge tone="info">{t('free.badge')}</Badge>}
        </div>
        {!archived && (
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink to={`/invitations/${invitation.id}/edit`} variant="secondary">
              <Pencil className="size-4" aria-hidden />
              {t('dashboard.edit')}
            </ButtonLink>
            {published ? (
              <Button
                variant="secondary"
                loading={unpublish.isPending}
                onClick={() => unpublish.mutate(invitation.id)}
              >
                {t('manage.unpublish')}
              </Button>
            ) : invitation.paid ? (
              <Button loading={publish.isPending} onClick={() => publish.mutate(invitation.id)}>
                {t('editor.publish')}
              </Button>
            ) : null}
            <DeleteInvitationButton
              invitation={invitation}
              onDeleted={() => navigate('/dashboard', { replace: true })}
            />
          </div>
        )}
      </div>

      {publishMessage && (
        <Alert className="mb-6" title={publishMessage}>
          {publishError?.code === 'VALIDATION_ERROR' && publishError.fields && (
            <ul className="list-inside list-disc">
              {Object.keys(publishError.fields).map((key) => (
                <li key={key}>{t(`editor.missing.${key}`, { defaultValue: key })}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {invitation.expired && (
        <Alert tone="warning" className="mb-6" title={t('free.expiredTitle')}>
          {t('free.expiredBody')}
        </Alert>
      )}
      {onFreePlan && !invitation.expired && invitation.expiresAt && (
        <Alert tone="info" className="mb-6" title={t('free.activeTitle')}>
          {t('free.activeBody', {
            date: formatDate(invitation.expiresAt, currentLocale(), {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          })}
        </Alert>
      )}
      {published && !invitation.expired && <SharePanel invitation={invitation} />}
      {onFreePlan ? (
        <PublishPanel invitation={invitation} upgrade />
      ) : published ? null : invitation.paid ? (
        <Alert tone="info" className="mb-8">
          {t('manage.notPublished')}
        </Alert>
      ) : (
        !archived && <PublishPanel invitation={invitation} />
      )}

      {published && (
        <p className="mb-6 text-sm text-ink-soft">
          {t('manage.views', { count: invitation.views })}
        </p>
      )}

      <GuestsSection invitationId={invitation.id} />
      <ResponsesSection invitationId={invitation.id} />
      <BlessingsSection invitationId={invitation.id} />
    </PageContainer>
  );
}

function PublishPanel({
  invitation,
  upgrade = false,
}: {
  invitation: InvitationDto;
  upgrade?: boolean;
}) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const packages = usePackages();
  const publishFree = usePublishAction('publish');
  const freeError = publishFree.error instanceof ApiError ? publishFree.error : null;
  const client = useQueryClient();
  const premiumItems = [
    invitation.template.isPremium && 'template',
    invitation.content.design.studio && 'studio',
    invitation.content.design.colors && 'colors',
  ].filter((item): item is 'template' | 'studio' | 'colors' => Boolean(item));
  const needsPremium = premiumItems.length > 0 && !invitation.paid;
  const removable = premiumItems.filter((item) => item !== 'template');
  const removePremium = useMutation({
    mutationFn: () =>
      saveInvitation(invitation.id, {
        baseRevision: invitation.revision,
        content: {
          ...invitation.content,
          design: { ...invitation.content.design, studio: undefined, colors: undefined },
        },
      }),
    onSuccess: (saved) => {
      client.setQueryData(['invitation', invitation.id], saved);
      void client.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
  const freeAvailable = !upgrade && !invitation.freeUsed && !needsPremium;
  const checkout = useMutation({
    mutationFn: (packageCode: string) =>
      api<{ data: { redirectUrl: string } }>('/payments/checkout', {
        method: 'POST',
        body: { invitationId: invitation.id, packageCode },
      }),
    // The gateway decides the outcome; the page we come back to only reads the server's status.
    onSuccess: (res) => window.location.assign(res.data.redirectUrl),
  });
  const error = checkout.error instanceof ApiError ? checkout.error : null;

  return (
    <Card className="mb-10 space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold">
          {t(upgrade ? 'free.upgradeTitle' : 'manage.payTitle')}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t(upgrade ? 'free.upgradeBody' : 'manage.payBody')}
        </p>
      </div>
      {invitation.paymentStatus === 'FAILED' && (
        <Alert tone="warning">{t('manage.lastFailed')}</Alert>
      )}
      {needsPremium && (
        <div className="rounded-card border-2 border-gold-400 bg-gradient-to-b from-gold-50 to-surface p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <Crown className="size-5 text-gold-600" aria-hidden />
            {t('manage.premium.title')}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">{t('manage.premium.body')}</p>
          <ul className="mt-3 list-inside list-disc text-sm">
            {premiumItems.map((item) => (
              <li key={item}>{t(`manage.premium.items.${item}`)}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            {removable.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                loading={removePremium.isPending}
                onClick={() => removePremium.mutate()}
              >
                {t('manage.premium.remove')}
              </Button>
            )}
            {invitation.template.isPremium && (
              <ButtonLink size="sm" variant="secondary" to={`/invitations/${invitation.id}/edit`}>
                {t('manage.premium.changeTemplate')}
              </ButtonLink>
            )}
          </div>
        </div>
      )}
      {error && (
        <Alert
          title={
            error.code === 'VALIDATION_ERROR' ? t('manage.notReady') : t('manage.publishFailed')
          }
        >
          {error.fields && (
            <ul className="list-inside list-disc">
              {Object.entries(error.fields).map(([key, message]) => (
                <li key={key}>
                  {t(`editor.missing.${key}`, { defaultValue: t(message, { defaultValue: key }) })}
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      {freeError && (
        <Alert
          title={
            freeError.code === 'VALIDATION_ERROR' ? t('manage.notReady') : t('free.unavailable')
          }
        >
          {freeError.fields && (
            <ul className="list-inside list-disc">
              {Object.entries(freeError.fields).map(([key, message]) => (
                <li key={key}>
                  {t(`editor.missing.${key}`, { defaultValue: t(message, { defaultValue: key }) })}
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {freeAvailable && (
          <div className="flex flex-col gap-3 rounded-card border border-dashed border-line-strong p-5">
            <h3 className="font-semibold">{t('free.name')}</h3>
            <p className="text-2xl font-semibold">{t('free.price')}</p>
            <p className="text-sm text-ink-soft">
              {t('free.features', { hours: FREE_PLAN.durationHours, guests: FREE_PLAN.maxGuests })}
            </p>
            <Button
              variant="secondary"
              loading={publishFree.isPending}
              disabled={checkout.isPending}
              onClick={() => publishFree.mutate(invitation.id)}
            >
              {t('free.publish')}
            </Button>
          </div>
        )}
        {packages.data?.map((pkg) => (
          <div key={pkg.id} className="flex flex-col gap-3 rounded-card border border-line p-5">
            <h3 className="font-semibold">{localized(pkg, locale)}</h3>
            <p className="text-2xl font-semibold">
              {formatMoney(pkg.priceMinor, pkg.currency, locale)}
            </p>
            <p className="text-sm text-ink-soft">
              {pkg.maxGuests
                ? t('marketing.pricing.upToGuests', { count: pkg.maxGuests }) + ' · '
                : ''}
              {t(
                pkg.premiumTemplates
                  ? 'marketing.pricing.premiumYes'
                  : 'marketing.pricing.premiumNo',
              )}
            </p>
            <Button
              variant={pkg.premiumTemplates ? 'gold' : 'primary'}
              loading={checkout.isPending && checkout.variables === pkg.code}
              disabled={
                checkout.isPending ||
                publishFree.isPending ||
                (needsPremium && !pkg.premiumTemplates)
              }
              onClick={() => checkout.mutate(pkg.code)}
            >
              {t(upgrade ? 'free.upgrade' : 'manage.payAndPublish')}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SharePanel({ invitation }: { invitation: InvitationDto }) {
  const { t } = useTranslation();
  const url = publicUrl(invitation.slug);
  const [message, setMessage] = useState(() =>
    t('share.defaultMessage', { title: invitation.content.headline || invitation.title }),
  );
  const [copied, setCopied] = useState(false);
  const full = `${message}\n${url}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t('share.copyManually'), url);
    }
  };

  return (
    <Card className="mb-10 space-y-4 p-6">
      <h2 className="text-xl font-semibold">{t('share.title')}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-sunken px-3 py-2 text-sm" dir="ltr">
          {url}
        </code>
        <Button variant="secondary" size="sm" onClick={copy}>
          <Copy className="size-4" aria-hidden />
          {copied ? t('share.copied') : t('share.copy')}
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-brand-700 underline"
        >
          {t('share.open')}
        </a>
      </div>
      <Field label={t('share.message')} hint={t('share.messageHint')}>
        {(p) => (
          <textarea
            id={p.id}
            aria-describedby={p['aria-describedby']}
            rows={2}
            maxLength={300}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="block w-full rounded-(--radius-field) border border-line-strong bg-surface px-4 py-3 shadow-field"
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        {/* Opens WhatsApp with the text prefilled; the host chooses the recipients and presses send. */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(full)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1f8f4d] px-5 text-[0.95rem] font-medium text-white hover:bg-[#187a41]"
        >
          <Share2 className="size-4" aria-hidden />
          {t('share.whatsapp')}
        </a>
        {canNativeShare && (
          <Button
            variant="secondary"
            onClick={() =>
              void navigator
                .share({ title: invitation.title, text: message, url })
                .catch(() => undefined)
            }
          >
            {t('share.native')}
          </Button>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </Card>
  );
}

function GuestsSection({ invitationId }: { invitationId: string }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<GuestFilters>({ q: '', status: '', group: '' });
  const guests = useGuests(invitationId, filters);
  const { add, update, remove } = useGuestMutations(invitationId);
  const confirm = useConfirm();
  const [editing, setEditing] = useState<GuestDto | 'new' | null>(null);
  const summary = guests.data?.summary;

  return (
    <section className="mb-12" aria-labelledby="guests-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="guests-heading" className="flex items-center gap-2 text-xl font-semibold">
          <Users className="size-5" aria-hidden />
          {t('guests.title')}
        </h2>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          {t('guests.add')}
        </Button>
      </div>

      {summary && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label={t('guests.total')} value={summary.total} />
          <Stat label={t('guests.accepted')} value={summary.accepted} />
          <Stat label={t('guests.declined')} value={summary.declined} />
          <Stat label={t('guests.pending')} value={summary.pending} />
          <Stat label={t('guests.attendees')} value={summary.attendees} />
        </div>
      )}

      {editing && (
        <GuestForm
          key={editing === 'new' ? 'new' : editing.id}
          guest={editing === 'new' ? null : editing}
          groups={guests.data?.groups ?? []}
          saving={add.isPending || update.isPending}
          error={add.error ?? update.error}
          onCancel={() => setEditing(null)}
          onSubmit={(input) => {
            const done = { onSuccess: () => setEditing(null) };
            if (editing === 'new') add.mutate(input, done);
            else update.mutate({ id: editing.id, input }, done);
          }}
        />
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          aria-label={t('guests.search')}
          placeholder={t('guests.search')}
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          className="h-11 max-w-xs"
        />
        <select
          aria-label={t('guests.filterStatus')}
          className={selectClass}
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value as GuestFilters['status'] })
          }
        >
          <option value="">{t('guests.allStatuses')}</option>
          {GUEST_STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {t(`guests.status.${status}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('guests.filterGroup')}
          className={selectClass}
          value={filters.group}
          onChange={(e) => setFilters({ ...filters, group: e.target.value })}
        >
          <option value="">{t('guests.allGroups')}</option>
          {guests.data?.groups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>

      {guests.isError && <Alert>{t('guests.error')}</Alert>}
      {guests.data?.data.length === 0 && (
        <p className="rounded-card border border-dashed border-line-strong p-8 text-center text-ink-soft">
          {summary?.total ? t('guests.noMatches') : t('guests.empty')}
        </p>
      )}
      {guests.data && guests.data.data.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-start text-sm">
            <thead className="bg-sunken text-ink-soft">
              <tr>
                <Th>{t('guests.name')}</Th>
                <Th>{t('guests.group')}</Th>
                <Th>{t('guests.phone')}</Th>
                <Th>{t('guests.response')}</Th>
                <Th>
                  <span className="sr-only">{t('guests.actions')}</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {guests.data.data.map((guest) => (
                <tr key={guest.id}>
                  <td className="px-4 py-3 font-medium">
                    {guest.name}
                    {guest.fromInvite && (
                      <span className="ms-2 rounded-full bg-gold-50 px-2 py-0.5 text-xs font-normal text-gold-700">
                        {t('guests.fromInvite')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{guest.groupName ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-soft" dir="ltr">
                    <span className="inline-block text-start">{guest.phone ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[guest.status]}>
                      {t(`guests.status.${guest.status}`)}
                      {guest.status === 'ACCEPTED' ? ` · ${guest.attendeesCount}` : ''}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-end">
                    {!guest.fromInvite && (
                      <>
                        <button
                          type="button"
                          className="p-2 text-ink-soft hover:text-ink"
                          aria-label={`${t('guests.edit')} ${guest.name}`}
                          onClick={() => setEditing(guest)}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 text-ink-soft hover:text-danger-600"
                          aria-label={`${t('guests.delete')} ${guest.name}`}
                          onClick={async () =>
                            (await confirm({
                              message: t('guests.deleteConfirm', { name: guest.name }),
                              tone: 'danger',
                            })) && remove.mutate(guest.id)
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function GuestForm({
  guest,
  groups,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  guest: GuestDto | null;
  groups: string[];
  saving: boolean;
  error: unknown;
  onSubmit: (input: {
    name: string;
    phone: string;
    groupName: string;
    maxAttendees: number;
    notes: string;
  }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(guest?.name ?? '');
  const [phone, setPhone] = useState(guest?.phone ?? '');
  const [groupName, setGroupName] = useState(guest?.groupName ?? '');
  const [maxAttendees, setMaxAttendees] = useState(guest?.maxAttendees ?? 1);
  const [notes, setNotes] = useState(guest?.notes ?? '');
  const [nameError, setNameError] = useState<string>();
  const fields = error instanceof ApiError ? error.fields : undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setNameError('validation.required');
    setNameError(undefined);
    onSubmit({ name, phone, groupName, maxAttendees, notes });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mb-5 grid gap-4 rounded-card border border-line bg-surface p-5 shadow-soft sm:grid-cols-2"
    >
      <Field label={t('guests.name')} error={nameError ?? fields?.name}>
        {(p) => (
          <Input {...p} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        )}
      </Field>
      <Field label={t('guests.phone')} error={fields?.phone} hint={t('guests.phoneHint')}>
        {(p) => (
          <Input
            {...p}
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}
      </Field>
      <Field label={t('guests.group')}>
        {(p) => (
          <>
            <Input
              {...p}
              list="guest-groups"
              value={groupName}
              maxLength={60}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <datalist id="guest-groups">
              {groups.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field label={t('guests.maxAttendees')} error={fields?.maxAttendees}>
        {(p) => (
          <Input
            {...p}
            type="number"
            min={1}
            max={20}
            value={maxAttendees}
            onChange={(e) => setMaxAttendees(Number(e.target.value) || 1)}
          />
        )}
      </Field>
      <Field label={t('guests.notes')} hint={t('guests.notesHint')} className="sm:col-span-2">
        {(p) => (
          <Input {...p} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
        )}
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={saving}>
          {t('common.save')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('guests.cancel')}
        </Button>
      </div>
    </form>
  );
}

function ResponsesSection({ invitationId }: { invitationId: string }) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const rsvps = useRsvps(invitationId);
  return (
    <section aria-labelledby="responses-heading">
      <h2 id="responses-heading" className="mb-4 text-xl font-semibold">
        {t('responses.title')}
      </h2>
      {rsvps.data?.length === 0 && (
        <p className="rounded-card border border-dashed border-line-strong p-8 text-center text-ink-soft">
          {t('responses.empty')}
        </p>
      )}
      <ul className="space-y-3">
        {rsvps.data?.map((rsvp) => (
          <li key={rsvp.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{rsvp.name}</span>
                <Badge tone={rsvp.response === 'ACCEPTED' ? 'success' : 'danger'}>
                  {t(`guests.status.${rsvp.response}`)}
                  {rsvp.response === 'ACCEPTED' ? ` · ${rsvp.attendeesCount}` : ''}
                </Badge>
              </div>
              {rsvp.message && <p className="mt-2 text-sm text-ink-soft">{rsvp.message}</p>}
              <p className="mt-2 text-xs text-muted">
                {formatDate(rsvp.respondedAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}
                {!rsvp.guestId && ` · ${t('responses.notOnList')}`}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BlessingsSection({ invitationId }: { invitationId: string }) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const blessings = useOwnerBlessings(invitationId);
  const remove = useDeleteBlessing(invitationId);
  if (!blessings.data?.length) return null;
  return (
    <section className="mt-12" aria-labelledby="blessings-heading">
      <h2 id="blessings-heading" className="mb-4 text-xl font-semibold">
        {t('blessings.title')}
      </h2>
      <ul className="space-y-3">
        {blessings.data.map((item) => (
          <li key={item.id}>
            <Card className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{item.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {formatDate(item.createdAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-danger-600 hover:underline"
                disabled={remove.isPending}
                onClick={() => remove.mutate(item.id)}
              >
                {t('blessings.remove')}
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
