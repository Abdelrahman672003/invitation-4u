import { CalendarPlus, Download } from 'lucide-react';
import type { Locale, TemplateDesign } from '@invite/shared';
import { glass } from './sectionLook';

interface Details {
  title: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  timeZone: string;
}

const two = (value: number) => String(value).padStart(2, '0');

/** Local wall-clock stamps (YYYYMMDDTHHMMSS) for the start and a three-hour end. */
function stamps(date: string, time: string) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const [hours, minutes] = (time || '18:00').split(':').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, hours ?? 18, minutes ?? 0));
  const end = new Date(start.getTime() + 3 * 3600 * 1000);
  const format = (value: Date) =>
    `${value.getUTCFullYear()}${two(value.getUTCMonth() + 1)}${two(value.getUTCDate())}T${two(value.getUTCHours())}${two(value.getUTCMinutes())}00`;
  return { start: format(start), end: format(end) };
}

const place = (details: Details) => [details.venue, details.address].filter(Boolean).join(', ');

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) | 0;
  return result;
}

export function googleCalendarUrl(details: Details) {
  const { start, end } = stamps(details.date, details.time);
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: details.title,
    dates: `${start}/${end}`,
    ctz: details.timeZone,
    location: place(details),
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, (match) => `\\${match}`);

export function icsFile(details: Details) {
  const { start, end } = stamps(details.date, details.time);
  const now = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Invitation 4u//Invitation//EN',
    'BEGIN:VEVENT',
    `UID:${start}-${Math.abs(hash(details.title))}@invitation-4u.com`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${details.timeZone}:${start}`,
    `DTEND;TZID=${details.timeZone}:${end}`,
    `SUMMARY:${escapeIcs(details.title)}`,
    `LOCATION:${escapeIcs(place(details))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadIcs(details: Details) {
  const url = URL.createObjectURL(
    new Blob([icsFile(details)], { type: 'text/calendar;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'invitation.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A month grid with the event day marked, and buttons to save the date to a calendar. */
export function CalendarCard({
  details,
  locale,
  palette,
  googleLabel,
  icsLabel,
  embedded,
}: {
  details: Details;
  locale: Locale;
  palette: TemplateDesign['palette'];
  googleLabel: string;
  icsLabel: string;
  embedded?: boolean;
}) {
  const [year = 2000, month = 1, day = 1] = details.date.split('-').map(Number);
  const tag = locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
  const monthName = new Intl.DateTimeFormat(tag, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2023, 0, 1 + index, 12)),
    ),
  );
  const leading = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [
    ...Array.from({ length: leading }, () => 0),
    ...Array.from({ length }, (_, index) => index + 1),
  ];

  const buttonClass =
    'inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium transition-transform hover:-translate-y-0.5';
  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="rounded-[2rem] p-6" style={glass(palette, 'strong')}>
        <p className="mb-3 text-lg font-semibold">{monthName}</p>
        <div className="grid grid-cols-7 gap-y-1 text-sm" role="grid" aria-label={monthName}>
          {weekdays.map((name) => (
            <span key={name} className="pb-1 text-xs" style={{ color: palette.muted }}>
              {name}
            </span>
          ))}
          {cells.map((cell, index) =>
            cell === 0 ? (
              <span key={`blank-${index}`} />
            ) : (
              <span
                key={cell}
                className="mx-auto grid size-9 place-items-center rounded-full tabular-nums"
                style={
                  cell === day
                    ? { background: palette.accent, color: '#fff', fontWeight: 700 }
                    : undefined
                }
              >
                {cell}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {embedded ? (
          <span className={buttonClass} style={{ background: palette.accent, color: '#fff' }}>
            <CalendarPlus className="size-4" aria-hidden />
            {googleLabel}
          </span>
        ) : (
          <>
            <a
              href={googleCalendarUrl(details)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass}
              style={{ background: palette.accent, color: '#fff' }}
            >
              <CalendarPlus className="size-4" aria-hidden />
              {googleLabel}
            </a>
            <button
              type="button"
              onClick={() => downloadIcs(details)}
              className={buttonClass}
              style={{ border: `1px solid ${palette.accent}`, color: palette.accent }}
            >
              <Download className="size-4" aria-hidden />
              {icsLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
