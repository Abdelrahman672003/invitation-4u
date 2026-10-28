import { cn } from '@/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Accessible name; required because the switch itself shows no text. */
  label: string;
  disabled?: boolean;
  /** A change is being saved: the switch stays where it is but cannot be pressed again. */
  busy?: boolean;
  className?: string;
}

/** An on/off switch. Used instead of checkboxes for settings that take effect immediately. */
export function Toggle({ checked, onChange, label, disabled, busy, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
        'disabled:cursor-not-allowed disabled:opacity-60',
        busy && 'cursor-wait',
        checked
          ? 'bg-gradient-to-br from-brand-600 to-brand-800 shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)]'
          : 'bg-line-strong shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] hover:bg-[#cdb592]',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute top-0.5 size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.3)] transition-[inset-inline-start] duration-200 ease-out"
        style={{ insetInlineStart: checked ? 'calc(100% - 1.625rem)' : '0.125rem' }}
      />
    </button>
  );
}

/** A label on one side and a switch on the other, for settings lists. */
export function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
  busy,
}: Omit<ToggleProps, 'className'>) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Toggle label={label} checked={checked} onChange={onChange} disabled={disabled} busy={busy} />
    </div>
  );
}
