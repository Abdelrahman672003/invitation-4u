import { Fragment, useEffect, useState, type DragEvent, type ReactNode } from 'react';
import {
  Archive,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  EyeOff,
  GripVertical,
  Trash2,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  INVITATION_STATUSES,
  PAYMENT_STATUSES,
  TEMPLATE_STATUSES,
  type PaymentDto,
} from '@invite/shared';
import { PageContainer, PageHeader } from '@/components/layout/Layouts';
import { Button, buttonClasses } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { currentLocale } from '@/i18n';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney } from '@/lib/format';

const tabs = [
  '',
  'users',
  'invitations',
  'templates',
  'catalog',
  'packages',
  'payments',
  'audit',
] as const;
const selectClass =
  'h-11 rounded-(--radius-field) border border-line-strong bg-surface px-3 text-sm';

export function AdminLayout() {
  const { t } = useTranslation();
  return (
    <PageContainer>
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />
      <nav
        className="-mt-2 mb-8 flex flex-wrap gap-1 border-b border-line pb-3"
        aria-label={t('admin.title')}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab}
            to={tab ? `/admin/${tab}` : '/admin'}
            end={!tab}
            className={({ isActive }) =>
              cn(
                'rounded-full px-4 py-2 text-sm',
                isActive ? 'bg-brand-700 text-white' : 'text-ink-soft hover:bg-sunken',
              )
            }
          >
            {t(`admin.tabs.${tab || 'overview'}`)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </PageContainer>
  );
}

function useAdminList<T>(path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  return useQuery({
    queryKey: ['admin', path, params],
    queryFn: async () =>
      (await api<{ data: T[] }>(`/admin/${path}${query ? `?${query}` : ''}`)).data,
  });
}

/**
 * Runs an admin change, refreshes the lists, and tells the admin what happened: a success message
 * when it worked, or the reason (or a general message) when it did not.
 */
function useAdminAction<V, R = unknown>(
  request: (variables: V) => Promise<R>,
  successMessage: (result: R, variables: V) => string,
) {
  const client = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: request,
    onSuccess: (result, variables) => {
      // Not just the admin lists: the public gallery, occasions and pricing show these same records.
      void client.invalidateQueries();
      toast.success(successMessage(result, variables));
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError &&
          (error.code === 'CONFLICT' || error.code === 'VALIDATION_ERROR')
          ? error.message
          : t('admin.toast.failed'),
      );
    },
  });
}

const patchJson = (path: string, body: object) => api(`/admin/${path}`, { method: 'PATCH', body });
const postJson = <R,>(path: string) => api<R>(`/admin/${path}`, { method: 'POST' });

function Table({
  head,
  children,
  empty,
}: {
  head: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  const { t } = useTranslation();
  if (empty)
    return (
      <p className="rounded-card border border-dashed border-line-strong p-8 text-center text-ink-soft">
        {t('admin.empty')}
      </p>
    );
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full text-start text-sm">
        <thead className="bg-sunken text-ink-soft">
          <tr>
            {head.map((label, index) => (
              <th key={`${label}-${index}`} className="whitespace-nowrap px-4 py-3 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

const Cell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>
);

const fieldClass =
  'h-10 rounded-lg border border-line-strong bg-surface px-2 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100';

// ---------- Users ----------

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
  invitations: number;
}

function UserRow({
  user,
  setRole,
}: {
  user: AdminUser;
  setRole: {
    isPending: boolean;
    variables?: { id: string };
    mutate: (variables: { id: string; role: string; email: string }) => void;
  };
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();
  return (
    <Fragment>
      <tr
        className="cursor-pointer transition-colors hover:bg-sunken/60"
        onClick={() => setOpen((value) => !value)}
      >
        <Cell className="font-medium">
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${t('admin.expand')}: ${user.name}`}
            className="flex items-center gap-2 text-start"
            onClick={(event) => {
              event.stopPropagation();
              setOpen((value) => !value);
            }}
          >
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-ink-soft transition-transform',
                open && 'rotate-180',
              )}
              aria-hidden
            />
            {user.name}
          </button>
        </Cell>
        <Cell>
          <span dir="ltr">{user.email}</span>
        </Cell>
        <Cell>
          <Badge tone={user.role === 'ADMIN' ? 'brand' : 'neutral'}>
            {t(`admin.roles.${user.role}`)}
          </Badge>
        </Cell>
        <Cell>{user.invitations}</Cell>
        <Cell className="text-end">
          <Button
            size="sm"
            variant="secondary"
            loading={setRole.isPending && setRole.variables?.id === user.id}
            onClick={async (event) => {
              event.stopPropagation();
              if (await confirm({ message: t('admin.confirmRole', { email: user.email }) }))
                setRole.mutate({
                  id: user.id,
                  role: user.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN',
                  email: user.email,
                });
            }}
          >
            {t(user.role === 'ADMIN' ? 'admin.demote' : 'admin.promote')}
          </Button>
        </Cell>
      </tr>
      {open && (
        <tr className="bg-sunken/40">
          <td colSpan={5} className="px-4 py-4">
            <UserInvitations userId={user.id} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function UserInvitations({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const items = useAdminList<AdminInvitation>(`users/${userId}/invitations`);
  if (items.isPending) return <p className="text-sm text-ink-soft">…</p>;
  if (!items.data?.length)
    return <p className="text-sm text-ink-soft">{t('admin.noInvitations')}</p>;
  return (
    <ul className="space-y-2">
      {items.data.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{item.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
              <Badge tone={item.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                {t(`status.${item.status}`)}
              </Badge>
              <Badge tone={item.paid ? 'brand' : 'neutral'}>
                {t(item.paid ? 'admin.paid' : 'admin.unpaid')}
              </Badge>
              <span>{formatDate(item.updatedAt, currentLocale())}</span>
            </p>
          </div>
          <InvitationActions item={item} />
        </li>
      ))}
    </ul>
  );
}

export function AdminUsersPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const users = useAdminList<AdminUser>('users', { q });
  const setRole = useAdminAction(
    ({ id, role }: { id: string; role: string; email: string }) =>
      patchJson(`users/${id}`, { role }),
    (_result, { role, email }) =>
      t(role === 'ADMIN' ? 'admin.toast.promoted' : 'admin.toast.demoted', { email }),
  );
  return (
    <>
      <Input
        aria-label={t('admin.search')}
        placeholder={t('admin.search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-4 h-11 max-w-sm"
      />
      <Table
        head={[
          t('guests.name'),
          t('auth.fields.email'),
          t('admin.role'),
          t('admin.invitations'),
          t('admin.actions'),
        ]}
        empty={users.data?.length === 0}
      >
        {users.data?.map((user) => (
          <UserRow key={user.id} user={user} setRole={setRole} />
        ))}
      </Table>
    </>
  );
}

// ---------- Invitations ----------

interface AdminInvitation {
  id: string;
  title: string;
  slug: string;
  status: string;
  paid: boolean;
  ownerEmail: string;
  categorySlug: string;
  categoryNameEn: string;
  categoryNameAr: string;
  updatedAt: string;
}

/** Opens the invitation's public page in a new tab (only published invitations have one). */
function PreviewButton({ item }: { item: AdminInvitation }) {
  const { t } = useTranslation();
  if (item.status !== 'PUBLISHED')
    return (
      <Button size="sm" variant="ghost" disabled title={t('admin.notPublished')}>
        <ExternalLink className="size-4" aria-hidden />
        {t('admin.preview')}
      </Button>
    );
  return (
    <a
      href={`/i/${item.slug}`}
      target="_blank"
      rel="noreferrer"
      className={buttonClasses({ size: 'sm', variant: 'secondary' })}
    >
      <ExternalLink className="size-4" aria-hidden />
      {t('admin.preview')}
    </a>
  );
}

/** A compact icon button with a tooltip, for the row actions. */
function IconAction({
  label,
  onClick,
  loading,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={label}
      title={label}
      loading={loading}
      className={cn(
        'size-9 px-0',
        danger && 'text-danger-600 hover:bg-danger-50 hover:text-danger-700',
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** Everything an admin can do to one invitation: preview, grant paid, unpublish, archive, delete. */
function InvitationActions({ item }: { item: AdminInvitation }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [paying, setPaying] = useState(false);
  const moderate = useAdminAction(
    ({ action }: { action: 'unpublish' | 'archive' }) =>
      postJson(`invitations/${item.id}/${action}`),
    (_result, { action }) =>
      t(action === 'unpublish' ? 'admin.toast.unpublished' : 'admin.toast.archived'),
  );
  const remove = useAdminAction(
    () => api(`/admin/invitations/${item.id}`, { method: 'DELETE' }),
    () => t('admin.toast.invitationDeleted'),
  );
  const busy = (action: 'unpublish' | 'archive') =>
    moderate.isPending && moderate.variables?.action === action;
  return (
    <div
      className="flex flex-nowrap items-center justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <PreviewButton item={item} />
      {!item.paid && (
        <IconAction label={t('admin.markPaid')} onClick={() => setPaying(true)}>
          <CreditCard className="size-4" aria-hidden />
        </IconAction>
      )}
      {item.status === 'PUBLISHED' && (
        <IconAction
          label={t('admin.unpublishAction')}
          loading={busy('unpublish')}
          onClick={async () =>
            (await confirm({ message: t('admin.confirmAction') })) &&
            moderate.mutate({ action: 'unpublish' })
          }
        >
          <EyeOff className="size-4" aria-hidden />
        </IconAction>
      )}
      {item.status !== 'ARCHIVED' && (
        <IconAction
          label={t('admin.archiveAction')}
          loading={busy('archive')}
          onClick={async () =>
            (await confirm({ message: t('admin.confirmAction') })) &&
            moderate.mutate({ action: 'archive' })
          }
        >
          <Archive className="size-4" aria-hidden />
        </IconAction>
      )}
      <IconAction
        danger
        label={t('admin.deleteInvitation')}
        loading={remove.isPending}
        onClick={async () =>
          (await confirm({
            message: t('admin.confirmDeleteInvitation'),
            confirmLabel: t('admin.deleteInvitation'),
            tone: 'danger',
          })) && remove.mutate(undefined)
        }
      >
        <Trash2 className="size-4" aria-hidden />
      </IconAction>
      {paying && <MarkPaidModal item={item} onClose={() => setPaying(false)} />}
    </div>
  );
}

/** Pick which package to grant, then confirm. */
function MarkPaidModal({ item, onClose }: { item: AdminInvitation; onClose: () => void }) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const packages = useAdminList<AdminPackage>('packages');
  const [chosen, setChosen] = useState<string | null>(null);
  const available = packages.data?.filter((pkg) => pkg.enabled) ?? [];
  const code =
    chosen ?? available.find((pkg) => pkg.code === 'premium')?.code ?? available[0]?.code;
  const grant = useAdminAction(
    (packageCode: string) =>
      api(`/admin/invitations/${item.id}/mark-paid`, { method: 'POST', body: { packageCode } }),
    () => {
      onClose();
      return t('admin.toast.markedPaid');
    },
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={t('admin.markPaidTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            loading={grant.isPending}
            disabled={!code}
            onClick={() => code && grant.mutate(code)}
          >
            {t('admin.confirmMarkPaidButton')}
          </Button>
        </>
      }
    >
      <p className="font-medium text-ink">{item.title}</p>
      <p className="text-sm">
        {t('admin.forOwner')}: <span dir="ltr">{item.ownerEmail}</span>
      </p>
      <fieldset className="mt-4 space-y-2">
        <legend className="mb-1 text-sm font-medium text-ink">{t('admin.choosePackage')}</legend>
        {available.map((pkg) => (
          <label
            key={pkg.id}
            className={cn(
              'flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors',
              code === pkg.code
                ? 'border-brand-600 bg-brand-50'
                : 'border-line hover:border-line-strong',
            )}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name={`package-${item.id}`}
                checked={code === pkg.code}
                onChange={() => setChosen(pkg.code)}
                className="accent-brand-700"
              />
              <span className="font-medium text-ink">
                {locale === 'ar' ? pkg.nameAr : pkg.nameEn}
              </span>
            </span>
            <span className="text-sm">{formatMoney(pkg.priceMinor, pkg.currency, locale)}</span>
          </label>
        ))}
      </fieldset>
      <p className="mt-3 text-xs">{t('admin.markPaidNote')}</p>
    </Modal>
  );
}

export function AdminInvitationsPage() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const items = useAdminList<AdminInvitation>('invitations', { q, status });
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          aria-label={t('admin.search')}
          placeholder={t('admin.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 max-w-sm"
        />
        <select
          aria-label={t('admin.status')}
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t('admin.allStatuses')}</option>
          {INVITATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`status.${value}`)}
            </option>
          ))}
        </select>
        {items.data && (
          <span className="ms-auto text-sm text-ink-soft">
            {t('admin.invitationCount', { count: items.data.length })}
          </span>
        )}
      </div>
      <Table
        head={[
          t('admin.invitation'),
          t('admin.owner'),
          t('admin.status'),
          t('admin.updated'),
          t('admin.actions'),
        ]}
        empty={items.data?.length === 0}
      >
        {items.data?.map((item) => (
          <tr key={item.id} className="transition-colors hover:bg-sunken/50">
            <Cell>
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                <Badge tone="neutral">
                  {locale === 'ar' ? item.categoryNameAr : item.categoryNameEn}
                </Badge>
                <span dir="ltr">/i/{item.slug}</span>
              </p>
            </Cell>
            <Cell>
              <span dir="ltr" className="text-sm">
                {item.ownerEmail}
              </span>
            </Cell>
            <Cell>
              <div className="flex flex-wrap gap-1">
                <Badge tone={item.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                  {t(`status.${item.status}`)}
                </Badge>
                <Badge tone={item.paid ? 'brand' : 'neutral'}>
                  {t(item.paid ? 'admin.paid' : 'admin.unpaid')}
                </Badge>
              </div>
            </Cell>
            <Cell className="whitespace-nowrap text-ink-soft">
              {formatDate(item.updatedAt, locale, { dateStyle: 'medium' })}
            </Cell>
            <Cell>
              <InvitationActions item={item} />
            </Cell>
          </tr>
        ))}
      </Table>
    </>
  );
}

// ---------- Templates ----------

interface AdminTemplate {
  id: string;
  slug: string;
  categorySlug: string;
  categoryNameEn: string;
  categoryNameAr: string;
  nameEn: string;
  nameAr: string;
  status: string;
  isPremium: boolean;
  sortOrder: number;
  invitations: number;
  custom: boolean;
}

interface RowDrag {
  position: number;
  count: number;
  over: boolean;
  dragging: boolean;
  onMove: (to: number) => void;
  onHandleDragStart: (event: DragEvent<HTMLElement>) => void;
  onHandleDragEnd: () => void;
  onRowDragOver: (event: DragEvent<HTMLElement>) => void;
  onRowDrop: () => void;
}

function TemplateRow({ item, drag }: { item: AdminTemplate; drag: RowDrag }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [nameEn, setNameEn] = useState(item.nameEn);
  const [nameAr, setNameAr] = useState(item.nameAr);

  // Saves the typed names behind the Save button.
  const save = useAdminAction(
    (body: { nameEn: string; nameAr: string }) => patchJson(`templates/${item.id}`, body),
    () => t('admin.toast.saved'),
  );
  // Status and premium take effect at once, with a confirmation message.
  const quick = useAdminAction(
    (body: { status?: string; isPremium?: boolean }) => patchJson(`templates/${item.id}`, body),
    (_result, body) =>
      body.status !== undefined
        ? t('admin.toast.statusChanged', { status: t(`admin.templateStatus.${body.status}`) })
        : t(body.isPremium ? 'admin.toast.premiumOn' : 'admin.toast.premiumOff'),
  );

  const remove = useAdminAction(
    () => api(`/admin/templates/${item.id}`, { method: 'DELETE' }),
    () => t('admin.toast.templateDeleted'),
  );

  const valid = nameEn.trim() !== '' && nameAr.trim() !== '';
  const dirty = nameEn.trim() !== item.nameEn || nameAr.trim() !== item.nameAr;
  const premium =
    quick.isPending && quick.variables?.isPremium !== undefined
      ? quick.variables.isPremium
      : item.isPremium;

  return (
    <tr
      onDragOver={drag.onRowDragOver}
      onDrop={drag.onRowDrop}
      className={cn(
        'transition-colors',
        drag.over && 'bg-brand-50 shadow-[inset_0_2px_0_var(--color-brand-500)]',
        drag.dragging && 'opacity-40',
      )}
    >
      <Cell>
        <div className="flex items-center gap-1">
          <span
            draggable
            onDragStart={drag.onHandleDragStart}
            onDragEnd={drag.onHandleDragEnd}
            title={t('admin.dragToReorder')}
            className="grid size-9 cursor-grab place-items-center rounded-lg text-ink-soft hover:bg-sunken active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </span>
          <span className="w-6 text-center text-sm font-semibold tabular-nums text-brand-700">
            {drag.position + 1}
          </span>
          <div className="flex flex-col">
            <button
              type="button"
              aria-label={t('admin.moveUp')}
              title={t('admin.moveUp')}
              disabled={drag.position === 0}
              onClick={() => drag.onMove(drag.position - 1)}
              className="grid size-5 place-items-center rounded text-ink-soft hover:bg-sunken hover:text-ink disabled:opacity-30"
            >
              <ChevronUp className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={t('admin.moveDown')}
              title={t('admin.moveDown')}
              disabled={drag.position === drag.count - 1}
              onClick={() => drag.onMove(drag.position + 1)}
              className="grid size-5 place-items-center rounded text-ink-soft hover:bg-sunken hover:text-ink disabled:opacity-30"
            >
              <ChevronDown className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </Cell>
      <Cell>
        <div className="grid gap-2">
          <input
            aria-label={t('admin.nameEn')}
            dir="ltr"
            maxLength={80}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className={cn(fieldClass, 'w-44')}
          />
          <input
            aria-label={t('admin.nameAr')}
            dir="rtl"
            maxLength={80}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className={cn(fieldClass, 'w-44')}
          />
        </div>
      </Cell>
      <Cell>
        <select
          aria-label={t('admin.status')}
          className={selectClass}
          value={item.status}
          disabled={quick.isPending}
          onChange={(e) => quick.mutate({ status: e.target.value })}
        >
          {TEMPLATE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`admin.templateStatus.${value}`)}
            </option>
          ))}
        </select>
      </Cell>
      <Cell>
        <Toggle
          label={t('templates.premium')}
          checked={premium}
          busy={quick.isPending}
          onChange={(value) => quick.mutate({ isPremium: value })}
        />
      </Cell>
      <Cell>{item.invitations}</Cell>
      <Cell className="text-end">
        {item.custom && (
          <Link
            to={`/admin/templates/builder/${item.id}`}
            className={buttonClasses({ size: 'sm', variant: 'secondary', className: 'me-2' })}
          >
            {t('builder.design')}
          </Link>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="me-2 text-danger-600 hover:bg-danger-50 hover:text-danger-700"
          loading={remove.isPending}
          title={item.invitations > 0 ? t('admin.deleteTemplateInUse') : undefined}
          onClick={async () => {
            if (
              await confirm({
                message: t('admin.deleteTemplateConfirm', { name: item.nameEn }),
                tone: 'danger',
              })
            )
              remove.mutate(undefined);
          }}
        >
          {t('admin.deleteTemplate')}
        </Button>
        <Button
          size="sm"
          disabled={!valid || !dirty}
          loading={save.isPending}
          onClick={() => save.mutate({ nameEn: nameEn.trim(), nameAr: nameAr.trim() })}
        >
          {t('common.save')}
        </Button>
      </Cell>
    </tr>
  );
}

/** The templates of one occasion; drag the grip or use the arrows to change their order. */
function TemplateGroup({ items }: { items: AdminTemplate[] }) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const serverOrder = items.map((item) => item.id);
  const serverKey = serverOrder.join(',');
  const [ids, setIds] = useState(serverOrder);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Follow the server whenever the list changes elsewhere (a template was added or removed).
  useEffect(() => setIds(serverKey.split(',')), [serverKey]);

  const reorder = useAdminAction(
    (next: string[]) => api('/admin/templates/reorder', { method: 'POST', body: { ids: next } }),
    () => t('admin.toast.reordered'),
  );
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = ids.map((id) => byId.get(id)).filter((item): item is AdminTemplate => !!item);

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setIds(next);
    reorder.mutate(next, { onError: () => setIds(serverOrder) });
  }

  const first = items[0];
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        {first && (locale === 'ar' ? first.categoryNameAr : first.categoryNameEn)}
        <Badge tone="neutral">{items.length}</Badge>
      </h2>
      <Table
        head={[
          t('admin.order'),
          t('guests.name'),
          t('admin.status'),
          t('templates.premium'),
          t('admin.invitations'),
          t('admin.actions'),
        ]}
      >
        {ordered.map((item, index) => (
          <TemplateRow
            key={item.id}
            item={item}
            drag={{
              position: index,
              count: ordered.length,
              over: overId === item.id && dragId !== null && dragId !== item.id,
              dragging: dragId === item.id,
              onMove: (to) => move(index, to),
              onHandleDragStart: (event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.id);
                setDragId(item.id);
              },
              onHandleDragEnd: () => {
                setDragId(null);
                setOverId(null);
              },
              onRowDragOver: (event) => {
                if (!dragId) return;
                event.preventDefault();
                setOverId(item.id);
              },
              onRowDrop: () => {
                if (dragId) move(ids.indexOf(dragId), index);
                setDragId(null);
                setOverId(null);
              },
            }}
          />
        ))}
      </Table>
    </section>
  );
}

export function AdminTemplatesPage() {
  const { t } = useTranslation();
  const items = useAdminList<AdminTemplate>('templates');
  const groups: AdminTemplate[][] = [];
  for (const item of items.data ?? []) {
    const group = groups.find((list) => list[0]?.categorySlug === item.categorySlug);
    if (group) group.push(item);
    else groups.push([item]);
  }
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link to="/admin/templates/builder" className={buttonClasses({ size: 'sm' })}>
          {t('builder.newButton')}
        </Link>
      </div>
      {items.data?.length === 0 && (
        <p className="rounded-card border border-dashed border-line-strong p-8 text-center text-ink-soft">
          {t('admin.empty')}
        </p>
      )}
      {groups.map((group) => (
        <TemplateGroup key={group[0]?.categorySlug} items={group} />
      ))}
      <p className="mt-4 text-sm text-muted">{t('admin.templatesNote')}</p>
    </>
  );
}

// ---------- Catalog ----------

interface AdminCategory {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  enabled: boolean;
  subtypes: { id: string; nameEn: string; nameAr: string; enabled: boolean }[];
}

function CatalogToggle({
  kind,
  id,
  name,
  enabled,
}: {
  kind: 'categories' | 'subtypes';
  id: string;
  name: string;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  const toggle = useAdminAction(
    (value: boolean) => patchJson(`${kind}/${id}`, { enabled: value }),
    (_result, value) => t(value ? 'admin.toast.enabled' : 'admin.toast.disabled', { name }),
  );
  const checked = toggle.isPending && toggle.variables !== undefined ? toggle.variables : enabled;
  return (
    <Toggle
      label={name}
      checked={checked}
      busy={toggle.isPending}
      onChange={(value) => toggle.mutate(value)}
    />
  );
}

/** A small inline form that adds an occasion, or a type inside one. */
function AddEntry({
  path,
  buttonLabel,
  submitLabel,
  labels,
  hint,
  successKey,
}: {
  path: string;
  buttonLabel: string;
  submitLabel: string;
  labels: { nameEn: string; nameAr: string; slug: string };
  hint?: string;
  successKey: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const create = useAdminAction(
    (body: { slug: string; nameEn: string; nameAr: string }) => api(path, { method: 'POST', body }),
    (_result, body) => {
      setNameEn('');
      setNameAr('');
      setSlug('');
      setSlugTouched(false);
      setOpen(false);
      return t(successKey, { name: body.nameEn });
    },
  );
  const autoSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  if (!open)
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>
    );
  const ready = nameEn.trim() && nameAr.trim() && slug.trim();
  return (
    <form
      className="w-full space-y-3 rounded-xl border border-line bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready)
          create.mutate({ slug: slug.trim(), nameEn: nameEn.trim(), nameAr: nameAr.trim() });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          aria-label={labels.nameEn}
          placeholder={labels.nameEn}
          value={nameEn}
          dir="ltr"
          onChange={(e) => {
            setNameEn(e.target.value);
            if (!slugTouched) setSlug(autoSlug(e.target.value));
          }}
        />
        <Input
          aria-label={labels.nameAr}
          placeholder={labels.nameAr}
          value={nameAr}
          dir="rtl"
          onChange={(e) => setNameAr(e.target.value)}
        />
        <Input
          aria-label={labels.slug}
          placeholder={labels.slug}
          value={slug}
          dir="ltr"
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(autoSlug(e.target.value));
          }}
        />
      </div>
      {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={create.isPending} disabled={!ready}>
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

export function AdminCatalogPage() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const items = useAdminList<AdminCategory>('categories');
  const name = (item: { nameAr: string; nameEn: string }) =>
    locale === 'ar' ? item.nameAr : item.nameEn;
  return (
    <>
      <div className="mb-4 flex justify-end">
        <AddEntry
          path="/admin/categories"
          buttonLabel={t('admin.addOccasion')}
          submitLabel={t('admin.occasionCreate')}
          labels={{
            nameEn: t('admin.occasionNameEn'),
            nameAr: t('admin.occasionNameAr'),
            slug: t('admin.occasionSlug'),
          }}
          hint={t('admin.occasionHint')}
          successKey="admin.toast.occasionAdded"
        />
      </div>
      <ul className="space-y-4">
        {items.data?.map((category) => (
          <li key={category.id} className="rounded-card border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-3 font-semibold">
              <span>{name(category)}</span>
              <CatalogToggle
                kind="categories"
                id={category.id}
                name={name(category)}
                enabled={category.enabled}
              />
            </div>
            <div className="mt-3 space-y-3 border-t border-line pt-3">
              {category.subtypes.length === 0 && (
                <p className="text-sm text-muted">{t('admin.noTypes')}</p>
              )}
              {category.subtypes.map((subtype) => (
                <div
                  key={subtype.id}
                  className="flex items-center justify-between gap-3 text-sm text-ink-soft"
                >
                  <span>{name(subtype)}</span>
                  <CatalogToggle
                    kind="subtypes"
                    id={subtype.id}
                    name={name(subtype)}
                    enabled={subtype.enabled}
                  />
                </div>
              ))}
              <AddEntry
                path={`/admin/categories/${category.id}/subtypes`}
                buttonLabel={t('admin.addType')}
                submitLabel={t('admin.typeCreate')}
                labels={{
                  nameEn: t('admin.typeNameEn'),
                  nameAr: t('admin.typeNameAr'),
                  slug: t('admin.typeSlug'),
                }}
                successKey="admin.toast.typeAdded"
              />
            </div>
          </li>
        ))}
      </ul>
      {items.data && <p className="mt-4 text-sm text-muted">{t('admin.catalogNote')}</p>}
    </>
  );
}

// ---------- Packages ----------

interface AdminPackage {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  priceMinor: number;
  currency: string;
  enabled: boolean;
  features: { premiumTemplates?: boolean; maxGuests?: number | null };
}

function PackageRow({ pkg }: { pkg: AdminPackage }) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const [nameEn, setNameEn] = useState(pkg.nameEn);
  const [nameAr, setNameAr] = useState(pkg.nameAr);
  const [price, setPrice] = useState(String(pkg.priceMinor / 100));
  const [guests, setGuests] = useState(
    pkg.features.maxGuests ? String(pkg.features.maxGuests) : '',
  );

  const premiumTemplates = Boolean(pkg.features.premiumTemplates);
  const currentGuests = pkg.features.maxGuests ?? null;

  const minor = Math.round(Number(price) * 100);
  const priceValid = price.trim() !== '' && Number.isFinite(minor) && minor >= 0;
  const guestsNumber = guests.trim() === '' ? null : Number(guests);
  const guestsValid =
    guestsNumber === null ||
    (Number.isInteger(guestsNumber) && guestsNumber >= 1 && guestsNumber <= 100_000);
  const valid = nameEn.trim() !== '' && nameAr.trim() !== '' && priceValid && guestsValid;
  const dirty =
    nameEn.trim() !== pkg.nameEn ||
    nameAr.trim() !== pkg.nameAr ||
    (priceValid && minor !== pkg.priceMinor) ||
    (guestsValid && guestsNumber !== currentGuests);

  const save = useAdminAction(
    (body: object) => patchJson(`packages/${pkg.id}`, body),
    () => t('admin.toast.saved'),
  );
  const quick = useAdminAction(
    (body: { enabled?: boolean; premiumTemplates?: boolean }) =>
      patchJson(
        `packages/${pkg.id}`,
        body.enabled !== undefined
          ? { enabled: body.enabled }
          : { features: { premiumTemplates: body.premiumTemplates, maxGuests: currentGuests } },
      ),
    (_result, body) =>
      body.enabled !== undefined
        ? t(body.enabled ? 'admin.toast.enabled' : 'admin.toast.disabled', {
            name: locale === 'ar' ? pkg.nameAr : pkg.nameEn,
          })
        : t(body.premiumTemplates ? 'admin.toast.premiumOn' : 'admin.toast.premiumOff'),
  );
  const premium =
    quick.isPending && quick.variables?.premiumTemplates !== undefined
      ? quick.variables.premiumTemplates
      : premiumTemplates;
  const enabled =
    quick.isPending && quick.variables?.enabled !== undefined
      ? quick.variables.enabled
      : pkg.enabled;

  return (
    <tr>
      <Cell>
        <div className="grid gap-2">
          <input
            aria-label={t('admin.nameEn')}
            dir="ltr"
            maxLength={60}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className={cn(fieldClass, 'w-40')}
          />
          <input
            aria-label={t('admin.nameAr')}
            dir="rtl"
            maxLength={60}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className={cn(fieldClass, 'w-40')}
          />
        </div>
      </Cell>
      <Cell>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            aria-label={t('admin.price')}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={cn(fieldClass, 'w-28')}
            dir="ltr"
          />
          <span className="text-muted">{pkg.currency}</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {formatMoney(pkg.priceMinor, pkg.currency, locale)}
        </p>
      </Cell>
      <Cell>
        <input
          type="number"
          min={1}
          max={100000}
          aria-label={t('admin.maxGuests')}
          placeholder={t('admin.unlimited')}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          className={cn(fieldClass, 'w-28')}
          dir="ltr"
        />
      </Cell>
      <Cell>
        <Toggle
          label={t('admin.premiumTemplates')}
          checked={premium}
          busy={quick.isPending}
          onChange={(value) => quick.mutate({ premiumTemplates: value })}
        />
      </Cell>
      <Cell>
        <Toggle
          label={t('admin.enabled')}
          checked={enabled}
          busy={quick.isPending}
          onChange={(value) => quick.mutate({ enabled: value })}
        />
      </Cell>
      <Cell className="text-end">
        <Button
          size="sm"
          disabled={!valid || !dirty}
          loading={save.isPending}
          onClick={() =>
            save.mutate({
              nameEn: nameEn.trim(),
              nameAr: nameAr.trim(),
              priceMinor: minor,
              features: { premiumTemplates, maxGuests: guestsNumber },
            })
          }
        >
          {t('common.save')}
        </Button>
      </Cell>
    </tr>
  );
}

export function AdminPackagesPage() {
  const { t } = useTranslation();
  const items = useAdminList<AdminPackage>('packages');
  return (
    <>
      <Table
        head={[
          t('guests.name'),
          t('admin.price'),
          t('admin.maxGuests'),
          t('admin.premiumTemplates'),
          t('admin.enabled'),
          t('admin.actions'),
        ]}
        empty={items.data?.length === 0}
      >
        {items.data?.map((pkg) => (
          <PackageRow key={pkg.id} pkg={pkg} />
        ))}
      </Table>
      <p className="mt-4 text-sm text-muted">{t('admin.priceNote')}</p>
    </>
  );
}

// ---------- Payments ----------

type AdminPayment = PaymentDto & { userEmail: string; providerReference: string | null };
const paymentTone = {
  SUCCEEDED: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  REFUNDED: 'info',
} as const;

export function AdminPaymentsPage() {
  const confirm = useConfirm();
  const { t } = useTranslation();
  const locale = currentLocale();
  const [status, setStatus] = useState('');
  const items = useAdminList<AdminPayment>('payments', { status });
  const act = useAdminAction(
    ({ id, action }: { id: string; action: 'reconcile' | 'refund' }) =>
      postJson<{ data?: { changed?: boolean } }>(`payments/${id}/${action}`),
    (result, { action }) =>
      action === 'refund'
        ? t('admin.toast.refunded')
        : t(result?.data?.changed ? 'admin.toast.reconciled' : 'admin.toast.upToDate'),
  );
  return (
    <>
      <select
        aria-label={t('admin.status')}
        className={cn(selectClass, 'mb-4')}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">{t('admin.allStatuses')}</option>
        {PAYMENT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {t(`pay.status.${value}`)}
          </option>
        ))}
      </select>
      <Table
        head={[
          t('pay.col.date'),
          t('admin.customer'),
          t('pay.col.invitation'),
          t('pay.col.amount'),
          t('pay.col.status'),
          t('admin.actions'),
        ]}
        empty={items.data?.length === 0}
      >
        {items.data?.map((payment) => (
          <tr key={payment.id}>
            <Cell>{formatDate(payment.createdAt, locale, { dateStyle: 'medium' })}</Cell>
            <Cell>
              <span dir="ltr">{payment.userEmail}</span>
            </Cell>
            <Cell>{payment.invitationTitle ?? '—'}</Cell>
            <Cell>{formatMoney(payment.amountMinor, payment.currency, locale)}</Cell>
            <Cell>
              <Badge tone={paymentTone[payment.status]}>{t(`pay.status.${payment.status}`)}</Badge>
            </Cell>
            <Cell className="space-x-2 whitespace-nowrap text-end rtl:space-x-reverse">
              {payment.status === 'PENDING' || payment.status === 'FAILED' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={
                    act.isPending &&
                    act.variables?.id === payment.id &&
                    act.variables.action === 'reconcile'
                  }
                  onClick={() => act.mutate({ id: payment.id, action: 'reconcile' })}
                >
                  {t('admin.reconcile')}
                </Button>
              ) : null}
              {payment.status === 'SUCCEEDED' && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={
                    act.isPending &&
                    act.variables?.id === payment.id &&
                    act.variables.action === 'refund'
                  }
                  onClick={async () =>
                    (await confirm({ message: t('admin.confirmRefund'), tone: 'danger' })) &&
                    act.mutate({ id: payment.id, action: 'refund' })
                  }
                >
                  {t('admin.markRefunded')}
                </Button>
              )}
            </Cell>
          </tr>
        ))}
      </Table>
      <p className="mt-4 text-sm text-muted">{t('admin.refundNote')}</p>
    </>
  );
}

// ---------- Audit ----------

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export function AdminAuditPage() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const items = useAdminList<AuditEntry>('audit');
  return (
    <Table
      head={[t('pay.col.date'), t('admin.actor'), t('admin.action'), t('admin.entity')]}
      empty={items.data?.length === 0}
    >
      {items.data?.map((entry) => (
        <tr key={entry.id}>
          <Cell>
            {formatDate(entry.createdAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}
          </Cell>
          <Cell>
            <span dir="ltr">{entry.actorEmail ?? t('admin.system')}</span>
          </Cell>
          <Cell>
            <code className="text-xs">{entry.action}</code>
          </Cell>
          <Cell>{entry.entityType}</Cell>
        </tr>
      ))}
    </Table>
  );
}
