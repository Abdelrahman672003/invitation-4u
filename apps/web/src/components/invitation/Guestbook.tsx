import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import type { BlessingDto, Locale, TemplateDesign } from '@invite/shared';
import { glass } from './sectionLook';

export interface GuestbookLabels {
  name: string;
  message: string;
  send: string;
  sent: string;
  empty: string;
  error: string;
  count: string;
}

/** The guestbook: a form to leave a congratulation and the wall of those already left. */
export function Guestbook({
  entries,
  locale,
  palette,
  labels,
  onSubmit,
  pending,
  failed,
  sample,
}: {
  entries: BlessingDto[];
  locale: Locale;
  palette: TemplateDesign['palette'];
  labels: GuestbookLabels;
  onSubmit?: (input: { name: string; message: string; website: string }) => Promise<boolean>;
  pending?: boolean;
  failed?: boolean;
  /** Static preview in the editor and demo: nothing is sent. */
  sample?: boolean;
}) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sample || !onSubmit || !name.trim() || !message.trim()) return;
    if (await onSubmit({ name: name.trim(), message: message.trim(), website })) {
      setSent(true);
      setName('');
      setMessage('');
    }
  }

  const field =
    'block w-full rounded-xl border bg-transparent px-4 py-3 focus:outline-none focus:ring-2';
  const date = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    dateStyle: 'medium',
  });

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={submit}
        className="space-y-3 rounded-[2rem] p-6"
        style={glass(palette, 'strong')}
        noValidate
      >
        <input
          className={field}
          style={{ borderColor: `${palette.accent}66` }}
          placeholder={labels.name}
          aria-label={labels.name}
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          readOnly={sample}
        />
        <textarea
          className={field}
          style={{ borderColor: `${palette.accent}66` }}
          placeholder={labels.message}
          aria-label={labels.message}
          rows={3}
          value={message}
          maxLength={300}
          onChange={(event) => setMessage(event.target.value)}
          readOnly={sample}
        />
        <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-full px-7 font-medium disabled:opacity-60"
          style={{ background: palette.accent, color: '#fff' }}
        >
          <Send className="size-4 rtl:-scale-x-100" aria-hidden />
          {labels.send}
        </button>
        {sent && (
          <p role="status" className="text-sm" style={{ color: palette.accent }}>
            {labels.sent}
          </p>
        )}
        {failed && (
          <p role="alert" className="text-sm text-red-600">
            {labels.error}
          </p>
        )}
      </form>
      <p className="mb-4 mt-10 text-center text-sm" style={{ color: palette.muted }}>
        {labels.count}
      </p>
      {entries.length === 0 ? (
        <p className="text-center" style={{ color: palette.muted }}>
          {labels.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-3xl p-5 transition-transform duration-300 hover:-translate-y-0.5"
              style={glass(palette)}
            >
              <p className="whitespace-pre-line leading-relaxed">{entry.message}</p>
              <p className="mt-3 text-sm" style={{ color: palette.muted }}>
                <span className="font-semibold" style={{ color: palette.accent }}>
                  {entry.name}
                </span>
                {' · '}
                {date.format(new Date(entry.createdAt))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
