import { useRef, type ReactNode } from 'react';
import { ChevronDown, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ColorInput } from '@/components/ui/Pickers';
import { cn } from '@/lib/cn';

export const selectClass =
  'h-11 w-full rounded-(--radius-field) border border-line-strong bg-surface px-3 text-sm';
export const round = (value: number) => Math.round(value * 10) / 10;

/**
 * One collapsible part of the studio sidebar: an icon, a title and a one-line summary that stay
 * visible when closed, and the controls underneath when open.
 */
export function AccordionSection({
  id,
  icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h2>
        <button
          type="button"
          id={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-sunken',
            open && 'bg-sunken',
          )}
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"
            aria-hidden
          >
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{title}</span>
            {summary && (
              <span className="block truncate text-xs font-normal text-ink-soft">{summary}</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'size-5 shrink-0 text-ink-soft transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      </h2>
      {open && (
        <div
          id={`${id}-panel`}
          role="region"
          aria-labelledby={`${id}-trigger`}
          className="space-y-4 border-t border-line p-4"
        >
          {children}
        </div>
      )}
    </section>
  );
}

/** A row inside a section (one layer, one text line) that opens to its own controls. */
export function ItemRow({
  open,
  onToggle,
  leading,
  title,
  actions,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  leading?: ReactNode;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={cn('rounded-xl border bg-canvas', open ? 'border-brand-600/50' : 'border-line')}>
      <div className="flex items-center gap-2 pe-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-start"
        >
          {leading}
          <span className={cn('min-w-0 flex-1 truncate text-sm', open && 'font-semibold')}>
            {title}
          </span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-ink-soft transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
        {actions}
      </div>
      {open && <div className="space-y-3 border-t border-line p-3">{children}</div>}
    </li>
  );
}

export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm">
      <span className="text-ink-soft">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(round(Number(e.target.value)))}
        className="accent-brand-700"
      />
      <span className="text-end tabular-nums" dir="ltr">
        {value}
      </span>
    </label>
  );
}

export function ColorField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return <ColorInput label={label} value={value} onChange={onChange} className="w-full" />;
}

export function IconButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink disabled:opacity-40"
    >
      {icon}
    </button>
  );
}

export function UploadButton({
  label,
  onFile,
  busy,
}: {
  label: string;
  onFile: (file: File | undefined) => void;
  busy: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <ImagePlus className="size-4" aria-hidden />
        {label}
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/webp,image/jpeg"
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </>
  );
}
