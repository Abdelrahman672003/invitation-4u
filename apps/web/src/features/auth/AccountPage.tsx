import { useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { CalendarHeart, CreditCard, Crown, Eye, Plus, Send, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LOCALES, changePasswordSchema, nameSchema, type PaymentDto } from '@invite/shared';
import { z } from 'zod';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, Badge, Card } from '@/components/ui/Card';
import { Field, Input, PasswordInput } from '@/components/ui/Field';
import { PageContainer, PageHeader } from '@/components/layout/Layouts';
import { useInvitations } from '@/features/invitations/api';
import { currentLocale, storeLocale } from '@/i18n';
import { api } from '@/lib/api';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { useChangePassword, useCurrentUser, useUpdateProfile } from './api';
import { applyServerErrors } from './formErrors';

const profileFormSchema = z.object({ name: nameSchema, locale: z.enum(LOCALES) });
type ProfileForm = z.infer<typeof profileFormSchema>;

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="font-display text-2xl font-semibold text-brand-800">{value}</p>
        {hint && <p className="text-xs text-ink-soft">{hint}</p>}
      </div>
    </Card>
  );
}

export function AccountPage() {
  const { t, i18n } = useTranslation();
  const locale = currentLocale();
  const { data: user } = useCurrentUser();
  const update = useUpdateProfile();
  const invitations = useInvitations();
  const payments = useQuery({
    queryKey: ['payments'],
    queryFn: async () => (await api<{ data: PaymentDto[] }>('/payments')).data,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    values: user ? { name: user.name, locale: user.locale } : undefined,
  });

  if (!user) return null;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    update.mutate(values, {
      onSuccess: ({ user: updated }) => {
        reset({ name: updated.name, locale: updated.locale });
        storeLocale(updated.locale);
        void i18n.changeLanguage(updated.locale);
      },
      onError: (error) => setFormError(applyServerErrors(error, setError)),
    });
  });

  const live = (invitations.data ?? []).filter((item) => item.status !== 'ARCHIVED');
  const published = live.filter((item) => item.status === 'PUBLISHED').length;
  const drafts = live.filter((item) => item.status === 'DRAFT').length;
  const guests = live.reduce((sum, item) => sum + item.stats.guests, 0);
  const accepted = live.reduce((sum, item) => sum + item.stats.accepted, 0);
  const attendees = live.reduce((sum, item) => sum + item.stats.attendees, 0);
  const paidPayments = (payments.data ?? []).filter((payment) => payment.status === 'SUCCEEDED');
  const spent = paidPayments.reduce((sum, payment) => sum + payment.amountMinor, 0);
  const recent = [...live].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const initial = Array.from(user.name.trim())[0] ?? '?';
  const number = (value: number) => formatNumber(value, locale);

  return (
    <PageContainer>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <aside className="space-y-4">
          <Card className="p-6 text-center">
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 font-display text-3xl font-semibold uppercase text-white shadow-lift">
              {initial}
            </span>
            <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
            <p dir="ltr" className="mt-1 truncate text-sm text-ink-soft">
              {user.email}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Badge tone={user.role === 'ADMIN' ? 'brand' : 'neutral'}>
                {t(`admin.roles.${user.role}`)}
              </Badge>
            </div>
            <p className="mt-4 text-xs text-muted">
              {t('profile.memberSince', { date: formatDate(user.createdAt, user.locale) })}
            </p>
          </Card>

          <Card className="space-y-2 p-4">
            <ButtonLink to="/dashboard" variant="secondary" block>
              <CalendarHeart className="size-4" aria-hidden />
              {t('profile.goInvitations')}
            </ButtonLink>
            <ButtonLink to="/payments" variant="secondary" block>
              <CreditCard className="size-4" aria-hidden />
              {t('profile.goPayments')}
            </ButtonLink>
            <ButtonLink to="/templates" block>
              <Plus className="size-4" aria-hidden />
              {t('profile.newInvitation')}
            </ButtonLink>
          </Card>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Stat
              icon={<CalendarHeart className="size-5" aria-hidden />}
              label={t('profile.stats.invitations')}
              value={number(live.length)}
              hint={t('profile.stats.invitationsHint', { published, drafts })}
            />
            <Stat
              icon={<Eye className="size-5" aria-hidden />}
              label={t('profile.stats.published')}
              value={number(published)}
            />
            <Stat
              icon={<Users className="size-5" aria-hidden />}
              label={t('profile.stats.guests')}
              value={number(guests)}
              hint={t('profile.stats.attendeesHint', { count: attendees })}
            />
            <Stat
              icon={<Send className="size-5" aria-hidden />}
              label={t('profile.stats.accepted')}
              value={number(accepted)}
            />
            <Stat
              icon={<Crown className="size-5" aria-hidden />}
              label={t('profile.stats.payments')}
              value={number(paidPayments.length)}
            />
            <Stat
              icon={<CreditCard className="size-5" aria-hidden />}
              label={t('profile.stats.spent')}
              value={formatMoney(spent, 'EGP', locale)}
            />
          </div>

          {recent.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('profile.recent')}</h2>
                <Link to="/dashboard" className="text-sm text-brand-700 hover:underline">
                  {t('admin.ov.viewAll')}
                </Link>
              </div>
              <ul className="divide-y divide-line">
                {recent.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                    <Badge tone={item.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                      {t(`status.${item.status}`)}
                    </Badge>
                    <Link
                      to={`/invitations/${item.id}/manage`}
                      className="text-sm text-brand-700 hover:underline"
                    >
                      {t('dashboard.manage')}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-6 sm:p-8">
            <h2 className="mb-5 text-lg font-semibold">{t('profile.details')}</h2>
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              {formError && <Alert>{t(formError)}</Alert>}
              {update.isSuccess && !isDirty && <Alert tone="success">{t('profile.saved')}</Alert>}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('auth.fields.name')} error={errors.name?.message}>
                  {(props) => <Input autoComplete="name" {...props} {...register('name')} />}
                </Field>
                <Field label={t('auth.fields.email')}>
                  {(props) => (
                    <Input type="email" value={user.email} readOnly disabled {...props} />
                  )}
                </Field>
              </div>
              <Field label={t('profile.language')} error={errors.locale?.message}>
                {(props) => (
                  <select
                    className="block h-12 w-full px-4 text-ink"
                    {...props}
                    {...register('locale')}
                  >
                    {LOCALES.map((code) => (
                      <option key={code} value={code}>
                        {t(`languages.${code}`)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <div className="flex justify-end pt-2">
                <Button type="submit" loading={update.isPending} disabled={!isDirty}>
                  {update.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </Card>

          <ChangePasswordCard />
        </div>
      </div>
    </PageContainer>
  );
}

const passwordFormSchema = z
  .object({
    currentPassword: changePasswordSchema.shape.currentPassword,
    newPassword: changePasswordSchema.shape.newPassword,
    confirm: z.string().min(1, 'validation.required'),
  })
  .refine((value) => value.newPassword === value.confirm, {
    path: ['confirm'],
    message: 'validation.passwordMismatch',
  });
type PasswordForm = z.infer<typeof passwordFormSchema>;

/** Change the password: needs the current one, and signs out the other devices. */
function ChangePasswordCard() {
  const { t } = useTranslation();
  const change = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordFormSchema) });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => reset(),
        onError: (error) =>
          setFormError(
            applyServerErrors(error, setError as Parameters<typeof applyServerErrors>[1]),
          ),
      },
    );
  });

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-semibold">{t('profile.password.title')}</h2>
      <p className="mb-5 mt-1 text-sm text-ink-soft">{t('profile.password.hint')}</p>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{t(formError)}</Alert>}
        {change.isSuccess && <Alert tone="success">{t('profile.password.saved')}</Alert>}
        <Field label={t('profile.password.current')} error={errors.currentPassword?.message}>
          {(props) => (
            <PasswordInput
              autoComplete="current-password"
              {...props}
              {...register('currentPassword')}
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('profile.password.new')} error={errors.newPassword?.message}>
            {(props) => (
              <PasswordInput autoComplete="new-password" {...props} {...register('newPassword')} />
            )}
          </Field>
          <Field label={t('profile.password.confirm')} error={errors.confirm?.message}>
            {(props) => (
              <PasswordInput autoComplete="new-password" {...props} {...register('confirm')} />
            )}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={change.isPending}>
            {t('profile.password.submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
