import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useParams } from 'react-router';
import i18n from 'i18next';
import { type PublicInvitationDto, type RsvpResponse } from '@invite/shared';
import { InvitationLanding } from '@/components/invitation/InvitationLanding';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/lib/api';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { applyDesignOverrides } from '@invite/shared';
import { Guestbook } from '@/components/invitation/Guestbook';
import { guestbookLabels } from '@/components/invitation/guestbookLabels';
import {
  usePublicBlessings,
  usePublicInvitation,
  useSendBlessing,
  useSubmitRsvp,
  useViewBeacon,
} from './manageApi';
import { toRenderContent } from './renderContent';

const textareaClass =
  'block w-full rounded-(--radius-field) border border-line-strong bg-surface px-4 py-3 text-ink shadow-field focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500';

/** The page guests open from a shared link. It speaks the invitation's language, not the visitor's UI setting. */
export function PublicInvitationPage() {
  const { slug } = useParams();
  const invitation = usePublicInvitation(slug);

  if (invitation.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }
  if (invitation.isError) {
    const t = i18n.getFixedT(currentLocale());
    const ended = invitation.error instanceof ApiError && invitation.error.code === 'EXPIRED';
    return (
      <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-4 text-center">
        <div>
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold">
            {t(ended ? 'free.endedTitle' : 'public.notFoundTitle')}
          </h1>
          <p className="mt-2 text-ink-soft">
            {t(ended ? 'free.endedBody' : 'public.notFoundBody')}
          </p>
        </div>
      </div>
    );
  }
  return <Invitation data={invitation.data} />;
}

function Invitation({ data }: { data: PublicInvitationDto }) {
  useViewBeacon(data.slug);
  const design = applyDesignOverrides(data.design, data.content.design);
  const text = toRenderContent({
    content: data.content,
    eventDate: data.eventDate,
    contentLocale: data.contentLocale,
  });

  return (
    <InvitationLanding
      design={design}
      content={data.content}
      text={text}
      eventDate={data.eventDate}
      locale={data.contentLocale}
      watermark={data.watermark}
      rsvp={data.rsvp.enabled ? <RsvpForm data={data} /> : undefined}
      guestbook={<PublicGuestbook data={data} palette={design.palette} />}
    />
  );
}

function PublicGuestbook({
  data,
  palette,
}: {
  data: PublicInvitationDto;
  palette: PublicInvitationDto['design']['palette'];
}) {
  const blessings = usePublicBlessings(data.slug);
  const send = useSendBlessing(data.slug);
  const entries = blessings.data ?? [];
  return (
    <Guestbook
      entries={entries}
      locale={data.contentLocale}
      palette={palette}
      labels={guestbookLabels(data.contentLocale, entries.length)}
      pending={send.isPending}
      failed={send.isError}
      onSubmit={async (input) => {
        try {
          await send.mutateAsync(input);
          return true;
        } catch {
          return false;
        }
      }}
    />
  );
}

function RsvpForm({ data }: { data: PublicInvitationDto }) {
  const t = i18n.getFixedT(data.contentLocale);
  const submit = useSubmitRsvp(data.slug);
  const [name, setName] = useState('');
  const [response, setResponse] = useState<RsvpResponse>('ACCEPTED');
  const [attendees, setAttendees] = useState(1);
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from people
  const [nameError, setNameError] = useState<string>();
  const [done, setDone] = useState<{ response: RsvpResponse; updated: boolean } | null>(null);

  if (data.rsvp.closed) {
    return <Alert tone="warning" className="mt-6" title={t('public.closed')} />;
  }

  if (done) {
    return (
      <div
        className="mt-6 rounded-card border border-line bg-surface p-6 text-center shadow-soft"
        role="status"
      >
        <CheckCircle2 className="mx-auto size-10 text-success-600" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold">
          {t(done.response === 'ACCEPTED' ? 'public.thanksAccepted' : 'public.thanksDeclined')}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t(done.updated ? 'public.updated' : 'public.recorded')}
        </p>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-brand-700 underline"
          onClick={() => setDone(null)}
        >
          {t('public.change')}
        </button>
      </div>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setNameError('validation.required');
    setNameError(undefined);
    submit.mutate(
      {
        name: name.trim(),
        response,
        attendeesCount: response === 'ACCEPTED' && data.rsvp.askAttendees ? attendees : undefined,
        message: message.trim() || undefined,
        website,
      },
      { onSuccess: (res) => setDone({ response, updated: res.data.updated }) },
    );
  };

  const choice = (value: RsvpResponse, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={response === value}
      onClick={() => setResponse(value)}
      className={cn(
        'flex-1 rounded-full border px-4 py-3 font-medium transition-colors',
        response === value
          ? 'border-brand-700 bg-brand-700 text-white'
          : 'border-line-strong bg-surface text-ink-soft hover:bg-sunken',
      )}
    >
      {label}
    </button>
  );

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mt-6 space-y-4 rounded-card border border-line bg-surface p-6 shadow-soft"
    >
      <h2 className="text-xl font-semibold">{t('public.rsvpTitle')}</h2>
      {data.rsvp.deadline && (
        <p className="text-sm text-muted">
          {t('public.deadline', {
            date: formatDate(`${data.rsvp.deadline}T12:00:00Z`, data.contentLocale, {
              dateStyle: 'long',
              timeZone: 'UTC',
            }),
          })}
        </p>
      )}
      <Field label={t('public.name')} error={nameError ? t(nameError) : undefined}>
        {(p) => (
          <Input
            {...p}
            value={name}
            maxLength={100}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>
      <div role="radiogroup" aria-label={t('public.rsvpTitle')} className="flex gap-2">
        {choice('ACCEPTED', t('public.accept'))}
        {choice('DECLINED', t('public.decline'))}
      </div>
      {response === 'ACCEPTED' && data.rsvp.askAttendees && (
        <Field label={t('public.attendees')}>
          {(p) => (
            <select
              id={p.id}
              value={attendees}
              onChange={(e) => setAttendees(Number(e.target.value))}
              className="block h-12 w-full rounded-(--radius-field) border border-line-strong bg-surface px-3"
            >
              {Array.from({ length: data.rsvp.maxPerResponse }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Field label={t('public.message')}>
        {(p) => (
          <textarea
            id={p.id}
            className={textareaClass}
            rows={2}
            maxLength={300}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}
      </Field>
      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      {submit.isError && (
        <Alert>
          {t(
            submit.error instanceof ApiError && submit.error.code === 'RSVP_CLOSED'
              ? 'public.closed'
              : 'public.error',
          )}
        </Alert>
      )}
      <Button type="submit" block loading={submit.isPending}>
        {t('public.send')}
      </Button>
    </form>
  );
}
