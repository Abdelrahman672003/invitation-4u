import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { localized, type PaymentDto } from '@invite/shared';
import { PageContainer, PageHeader } from '@/components/layout/Layouts';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, Badge, Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { currentLocale } from '@/i18n';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

const tone = {
  SUCCEEDED: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  REFUNDED: 'info',
} as const;

export function usePayment(id: string | null, poll = false) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: async () => (await api<{ data: PaymentDto }>(`/payments/${id}`)).data,
    enabled: Boolean(id),
    // Only the server-confirmed status counts; keep asking while the provider's webhook is in flight.
    refetchInterval: (query) => (poll && query.state.data?.status === 'PENDING' ? 1500 : false),
  });
}

/**
 * Stand-in for a gateway's hosted page, used only with the simulated provider. The outcome is sent
 * to the API, which turns it into a signed webhook, exactly the path a real gateway would take.
 */
export function TestCheckoutPage() {
  const { reference } = useParams();
  const { t } = useTranslation();
  const locale = currentLocale();
  const navigate = useNavigate();
  const payment = useQuery({
    queryKey: ['test-checkout', reference],
    queryFn: async () => (await api<{ data: PaymentDto }>(`/payments/test/${reference}`)).data,
    retry: false,
  });
  const complete = useMutation({
    mutationFn: (outcome: 'SUCCEEDED' | 'FAILED' | 'CANCELLED') =>
      api<{ data: { paymentId: string } }>(`/payments/test/${reference}/complete`, {
        method: 'POST',
        body: { outcome },
      }),
    onSuccess: (res) => navigate(`/payments/return?payment=${res.data.paymentId}`),
  });

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Alert tone="warning" title={t('pay.simulated')}>
        {t('pay.simulatedBody')}
      </Alert>
      {payment.isPending && <Spinner />}
      {payment.isError && <Alert className="mt-6">{t('pay.notFound')}</Alert>}
      {payment.data && (
        <Card className="mt-6 space-y-4 p-6">
          <p className="text-sm text-muted">{payment.data.invitationTitle}</p>
          <p className="text-3xl font-semibold">
            {formatMoney(payment.data.amountMinor, payment.data.currency, locale)}
          </p>
          <p className="text-ink-soft">
            {localized(
              { nameAr: payment.data.packageNameAr, nameEn: payment.data.packageNameEn },
              locale,
            )}
          </p>
          <div className="grid gap-2 pt-2">
            <Button
              loading={complete.isPending}
              onClick={() => complete.mutate('SUCCEEDED')}
              disabled={payment.data.status !== 'PENDING'}
            >
              {t('pay.simulatePay')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => complete.mutate('FAILED')}
              disabled={payment.data.status !== 'PENDING' || complete.isPending}
            >
              {t('pay.simulateFail')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => complete.mutate('CANCELLED')}
              disabled={payment.data.status !== 'PENDING' || complete.isPending}
            >
              {t('pay.simulateCancel')}
            </Button>
          </div>
          {complete.isError && <Alert>{t('pay.error')}</Alert>}
        </Card>
      )}
    </div>
  );
}

/** Where the customer lands after the gateway. It trusts only the status the server reports. */
export function PaymentReturnPage() {
  const [params] = useSearchParams();
  const { t } = useTranslation();
  const id = params.get('payment');
  const payment = usePayment(id, true);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 20_000);
    return () => clearTimeout(timer);
  }, []);

  const status = payment.data?.status;
  const invitationLink = payment.data?.invitationId
    ? `/invitations/${payment.data.invitationId}/manage`
    : '/dashboard';

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {!id || payment.isError ? (
        <Alert>{t('pay.notFound')}</Alert>
      ) : !status || status === 'PENDING' ? (
        <>
          {waited ? (
            <Clock className="mx-auto size-12 text-warning-600" aria-hidden />
          ) : (
            <Spinner />
          )}
          <h1 className="mt-4 text-2xl font-semibold">
            {t(waited ? 'pay.stillPending' : 'pay.confirming')}
          </h1>
          <p className="mt-2 text-ink-soft">
            {t(waited ? 'pay.stillPendingBody' : 'pay.confirmingBody')}
          </p>
          <ButtonLink to="/payments" variant="secondary" className="mt-6">
            {t('pay.history')}
          </ButtonLink>
        </>
      ) : status === 'SUCCEEDED' ? (
        <>
          <CheckCircle2 className="mx-auto size-14 text-success-600" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">{t('pay.successTitle')}</h1>
          <p className="mt-2 text-ink-soft">{t('pay.successBody')}</p>
          <ButtonLink to={invitationLink} className="mt-6">
            {t('pay.viewInvitation')}
          </ButtonLink>
        </>
      ) : (
        <>
          <XCircle className="mx-auto size-14 text-danger-600" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">{t('pay.failedTitle')}</h1>
          <p className="mt-2 text-ink-soft">{t('pay.failedBody')}</p>
          <ButtonLink to={invitationLink} className="mt-6">
            {t('pay.tryAgain')}
          </ButtonLink>
        </>
      )}
    </div>
  );
}

export function PaymentsPage() {
  const { t } = useTranslation();
  const locale = currentLocale();
  const payments = useQuery({
    queryKey: ['payments'],
    queryFn: async () => (await api<{ data: PaymentDto[] }>('/payments')).data,
  });

  return (
    <PageContainer>
      <PageHeader title={t('pay.historyTitle')} subtitle={t('pay.historySubtitle')} />
      {payments.isError && <Alert>{t('errors.generic')}</Alert>}
      {payments.data?.length === 0 && (
        <p className="rounded-card border border-dashed border-line-strong p-8 text-center text-ink-soft">
          {t('pay.empty')}
        </p>
      )}
      {payments.data && payments.data.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-start text-sm">
            <thead className="bg-sunken text-ink-soft">
              <tr>
                {['date', 'invitation', 'package', 'amount', 'status'].map((key) => (
                  <th key={key} className="px-4 py-3 font-medium">
                    {t(`pay.col.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.data.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">
                    {formatDate(payment.createdAt, locale, { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3">{payment.invitationTitle ?? '—'}</td>
                  <td className="px-4 py-3">
                    {localized(
                      { nameAr: payment.packageNameAr, nameEn: payment.packageNameEn },
                      locale,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatMoney(payment.amountMinor, payment.currency, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={tone[payment.status]}>{t(`pay.status.${payment.status}`)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
