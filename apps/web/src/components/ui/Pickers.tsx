import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronLeft, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { currentLocale } from '@/i18n';
import { formatDate } from '@/lib/format';

const trigger =
  'flex h-12 w-full items-center gap-3 rounded-(--radius-field) border bg-surface px-4 text-start shadow-field ' +
  'transition-colors duration-150 hover:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 ' +
  'focus:border-brand-500 aria-expanded:border-brand-500 aria-expanded:ring-4 aria-expanded:ring-brand-100';

interface PopoverProps {
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  /** Used to place the panel before it has been measured. */
  width: number;
  label: string;
}

/** A floating panel next to its trigger: flips above when short on room, closes on outside/Escape. */
function Popover({ anchor, onClose, children, width, label }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const el = anchor.current;
      if (!el) return;
      const a = el.getBoundingClientRect();
      const box = ref.current?.getBoundingClientRect();
      const w = box?.width ?? width;
      const h = box?.height ?? 320;
      const rtl = getComputedStyle(el).direction === 'rtl';
      const fitsBelow = window.innerHeight - a.bottom >= h + 12;
      const top = fitsBelow || a.top < h + 12 ? a.bottom + 6 : a.top - h - 6;
      const left = rtl ? a.right - w : a.left;
      const next = {
        top: Math.max(8, Math.min(top, window.innerHeight - h - 8)),
        left: Math.max(8, Math.min(left, window.innerWidth - w - 8)),
      };
      setPos((current) =>
        current && current.top === next.top && current.left === next.left ? current : next,
      );
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  });

  useEffect(() => {
    const down = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
      anchor.current?.focus();
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      style={{
        position: 'fixed',
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="z-[80] rounded-2xl border border-line bg-surface p-3 shadow-lift"
    >
      {children}
    </div>,
    document.body,
  );
}

const pad = (value: number) => String(value).padStart(2, '0');
const toIso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

function parseIso(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

interface PickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
  placeholder?: string;
  className?: string;
}

/** A date field with a calendar popover; the value is `YYYY-MM-DD` or an empty string. */
export function DateInput({
  id,
  value,
  onChange,
  invalid,
  placeholder,
  className,
  ...aria
}: PickerProps) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const picked = parseIso(value);
  const today = new Date();
  const [view, setView] = useState({
    year: (picked ?? { year: today.getFullYear() }).year,
    month: (picked ?? { month: today.getMonth() }).month,
  });
  const [mode, setMode] = useState<'days' | 'months'>('days');

  const weekStart = locale === 'ar' ? 6 : 0;
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        formatDate(new Date(2024, 0, 7 + ((weekStart + index) % 7)), locale, {
          weekday: 'narrow',
        }),
      ),
    [locale, weekStart],
  );
  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) =>
        formatDate(new Date(2024, month, 1), locale, { month: 'long' }),
      ),
    [locale],
  );

  const first = new Date(view.year, view.month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const total = new Date(view.year, view.month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + total) / 7) * 7 }, (_, index) => {
    const day = index - lead + 1;
    return day >= 1 && day <= total ? day : null;
  });

  const shift = (months: number) =>
    setView((current) => {
      const next = new Date(current.year, current.month + months, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  const isToday = (day: number) =>
    view.year === today.getFullYear() && view.month === today.getMonth() && day === today.getDate();
  const isPicked = (day: number) =>
    picked?.year === view.year && picked.month === view.month && picked.day === day;

  const nav =
    'grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink';

  return (
    <>
      <button
        ref={anchor}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => {
          if (!open) {
            setView({
              year: (picked ?? { year: today.getFullYear() }).year,
              month: (picked ?? { month: today.getMonth() }).month,
            });
            setMode('days');
          }
          setOpen((current) => !current);
        }}
        className={cn(trigger, invalid ? 'border-danger-600' : 'border-line-strong', className)}
        {...aria}
      >
        <CalendarDays className="size-5 shrink-0 text-brand-600" aria-hidden />
        <span className={cn('min-w-0 flex-1 truncate', !picked && 'text-muted')}>
          {picked
            ? formatDate(new Date(picked.year, picked.month, picked.day), locale, {
                dateStyle: 'long',
              })
            : (placeholder ?? t('picker.pickDate'))}
        </span>
      </button>
      {open && (
        <Popover
          anchor={anchor}
          onClose={() => setOpen(false)}
          width={296}
          label={t('picker.pickDate')}
        >
          <div className="w-[17.5rem]">
            <div className="mb-2 flex items-center justify-between gap-1">
              <button
                type="button"
                className={nav}
                aria-label={t('picker.prev')}
                onClick={() =>
                  mode === 'days' ? shift(-1) : setView((v) => ({ ...v, year: v.year - 1 }))
                }
              >
                <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setMode((current) => (current === 'days' ? 'months' : 'days'))}
                className="rounded-full px-3 py-1.5 font-semibold transition-colors hover:bg-sunken"
                aria-live="polite"
              >
                {mode === 'days'
                  ? `${monthNames[view.month]} ${formatDate(new Date(view.year, 0, 1), locale, { year: 'numeric' })}`
                  : formatDate(new Date(view.year, 0, 1), locale, { year: 'numeric' })}
              </button>
              <button
                type="button"
                className={nav}
                aria-label={t('picker.next')}
                onClick={() =>
                  mode === 'days' ? shift(1) : setView((v) => ({ ...v, year: v.year + 1 }))
                }
              >
                <ChevronLeft className="size-5 rotate-180 rtl:rotate-0" aria-hidden />
              </button>
            </div>

            {mode === 'months' ? (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {monthNames.map((name, month) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setView((v) => ({ ...v, month }));
                      setMode('days');
                    }}
                    className={cn(
                      'rounded-xl px-2 py-3 text-sm transition-colors',
                      month === view.month
                        ? 'bg-brand-700 font-semibold text-white'
                        : 'hover:bg-brand-50',
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 text-center text-xs text-muted">
                  {weekdays.map((name, index) => (
                    <span key={index} className="py-1">
                      {name}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {cells.map((day, index) =>
                    day === null ? (
                      <span key={index} />
                    ) : (
                      <button
                        key={index}
                        type="button"
                        onClick={() => choose(toIso(view.year, view.month, day))}
                        aria-pressed={isPicked(day)}
                        className={cn(
                          'mx-auto grid size-9 place-items-center rounded-full text-sm tabular-nums transition-colors',
                          isPicked(day)
                            ? 'bg-brand-700 font-semibold text-white shadow-field'
                            : isToday(day)
                              ? 'font-semibold text-brand-700 ring-1 ring-brand-300 hover:bg-brand-50'
                              : 'hover:bg-brand-50',
                        )}
                      >
                        {formatDate(new Date(view.year, view.month, day), locale, {
                          day: 'numeric',
                        })}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
              <button
                type="button"
                className="rounded-full px-3 py-1.5 font-medium text-brand-700 hover:bg-brand-50"
                onClick={() =>
                  choose(toIso(today.getFullYear(), today.getMonth(), today.getDate()))
                }
              >
                {t('picker.today')}
              </button>
              {value && (
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-ink-soft hover:bg-sunken"
                  onClick={() => choose('')}
                >
                  {t('picker.clear')}
                </button>
              )}
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);

/** A time field with hour / minute / AM-PM columns; the value is `HH:mm` (24-hour) or empty. */
export function TimeInput({
  id,
  value,
  onChange,
  invalid,
  placeholder,
  className,
  ...aria
}: PickerProps) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const hour24 = match ? Number(match[1]) : null;
  const minute = match ? Number(match[2]) : null;
  const pm = hour24 !== null && hour24 >= 12;
  const hour12 = hour24 === null ? null : hour24 % 12 === 0 ? 12 : hour24 % 12;

  const minutes = useMemo(() => {
    const steps = Array.from({ length: 12 }, (_, index) => index * 5);
    return minute !== null && !steps.includes(minute)
      ? [...steps, minute].sort((a, b) => a - b)
      : steps;
  }, [minute]);

  const emit = (h12: number, m: number, isPm: boolean) =>
    onChange(`${pad((h12 % 12) + (isPm ? 12 : 0))}:${pad(m)}`);
  const label = (date: Date, options: Intl.DateTimeFormatOptions) =>
    formatDate(date, locale, options);
  const periodName = (isPm: boolean) =>
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', { hour: 'numeric', hour12: true })
      .formatToParts(new Date(2024, 0, 1, isPm ? 15 : 9))
      .find((part) => part.type === 'dayPeriod')?.value ?? (isPm ? 'PM' : 'AM');

  const column = 'flex max-h-56 flex-col gap-1 overflow-y-auto px-1 [scrollbar-width:thin]';
  const cell = (active: boolean) =>
    cn(
      'grid h-9 min-w-12 place-items-center rounded-xl px-2 text-sm tabular-nums transition-colors',
      active ? 'bg-brand-700 font-semibold text-white shadow-field' : 'hover:bg-brand-50',
    );

  // Bring the chosen row into view whenever the panel opens.
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open)
      panel.current
        ?.querySelectorAll('[aria-pressed="true"]')
        .forEach((el) => el.scrollIntoView({ block: 'center' }));
  }, [open]);

  return (
    <>
      <button
        ref={anchor}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(trigger, invalid ? 'border-danger-600' : 'border-line-strong', className)}
        {...aria}
      >
        <Clock className="size-5 shrink-0 text-brand-600" aria-hidden />
        <span
          className={cn('min-w-0 flex-1 truncate tabular-nums', hour24 === null && 'text-muted')}
        >
          {hour24 !== null && minute !== null
            ? label(new Date(2024, 0, 1, hour24, minute), {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : (placeholder ?? t('picker.pickTime'))}
        </span>
      </button>
      {open && (
        <Popover
          anchor={anchor}
          onClose={() => setOpen(false)}
          width={260}
          label={t('picker.pickTime')}
        >
          <div ref={panel}>
            <div className="flex gap-2" dir="ltr">
              <div className={column} role="group" aria-label={t('picker.hour')}>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={hour12 === h}
                    className={cell(hour12 === h)}
                    onClick={() => emit(h, minute ?? 0, pm)}
                  >
                    {label(new Date(2024, 0, 1, h), { hour: 'numeric', hour12: false }).replace(
                      /^0/,
                      '',
                    )}
                  </button>
                ))}
              </div>
              <div className={column} role="group" aria-label={t('picker.minute')}>
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={minute === m}
                    className={cell(minute === m)}
                    onClick={() => emit(hour12 ?? 12, m, pm)}
                  >
                    {label(new Date(2024, 0, 1, 0, m), { minute: '2-digit' }).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <div
                className="flex flex-col gap-1 px-1"
                role="group"
                aria-label={t('picker.period')}
              >
                {[false, true].map((isPm) => (
                  <button
                    key={String(isPm)}
                    type="button"
                    aria-pressed={hour24 !== null && pm === isPm}
                    className={cell(hour24 !== null && pm === isPm)}
                    onClick={() => emit(hour12 ?? 12, minute ?? 0, isPm)}
                  >
                    {periodName(isPm)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
              {value ? (
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-ink-soft hover:bg-sunken"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  {t('picker.clear')}
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-brand-700 px-4 py-1.5 font-medium text-white hover:bg-brand-800"
                onClick={() => {
                  if (hour24 === null) onChange('19:00');
                  setOpen(false);
                }}
              >
                <Check className="size-4" aria-hidden />
                {t('picker.done')}
              </button>
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}

const SWATCHES = [
  '#9a1f3f',
  '#c2410c',
  '#b8860b',
  '#4d7c0f',
  '#0f766e',
  '#0369a1',
  '#4338ca',
  '#7e22ce',
  '#be185d',
  '#1f2937',
  '#78716c',
  '#d4a373',
  '#e8c4c4',
  '#f5e6c8',
  '#fffaf2',
  '#ffffff',
];

/** A colour field: a swatch that opens a palette of ready colours plus a free hex entry. */
export function ColorInput({
  id,
  value,
  onChange,
  label,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (text: string) => {
    const hex = text.startsWith('#') ? text : `#${text}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex.toLowerCase());
  };

  return (
    <>
      <button
        ref={anchor}
        id={id}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-10 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-surface ps-1.5 pe-3 shadow-field transition-colors hover:border-brand-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 aria-expanded:border-brand-500',
          className,
        )}
      >
        <span
          className="size-7 shrink-0 rounded-full border border-black/10"
          style={{ background: value }}
          aria-hidden
        />
        <span dir="ltr" className="text-xs uppercase tabular-nums text-ink-soft">
          {value}
        </span>
      </button>
      {open && (
        <Popover
          anchor={anchor}
          onClose={() => setOpen(false)}
          width={248}
          label={label ?? t('picker.pickColor')}
        >
          <div className="w-56 space-y-3">
            <div className="grid grid-cols-8 gap-1.5">
              {SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={hex}
                  aria-pressed={hex === value.toLowerCase()}
                  onClick={() => onChange(hex)}
                  className={cn(
                    'grid size-6 place-items-center rounded-full border border-black/10 transition-transform hover:scale-110',
                    hex === value.toLowerCase() && 'ring-2 ring-brand-600 ring-offset-2',
                  )}
                  style={{ background: hex }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label
                className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line-strong"
                style={{ background: value }}
                title={t('picker.custom')}
              >
                <input
                  type="color"
                  aria-label={t('picker.custom')}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
              <input
                aria-label="hex"
                dir="ltr"
                spellCheck={false}
                maxLength={7}
                value={draft ?? value}
                onChange={(e) => {
                  setDraft(e.target.value);
                  commit(e.target.value);
                }}
                onBlur={() => setDraft(null)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-sm uppercase tabular-nums focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
              <button
                type="button"
                aria-label={t('picker.done')}
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-700 text-white hover:bg-brand-800"
              >
                <Check className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}
