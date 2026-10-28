import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

const inputBase =
  'block w-full h-12 rounded-(--radius-field) border bg-surface px-4 text-ink shadow-field ' +
  'placeholder:text-muted transition-colors duration-150 hover:border-brand-300 ' +
  'focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500 ' +
  'disabled:bg-sunken disabled:text-muted';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        inputBase,
        invalid
          ? 'border-danger-600 focus:ring-danger-50 focus:border-danger-600'
          : 'border-line-strong',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  function PasswordInput(props, ref) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    return (
      // Passwords are always entered left-to-right; keep the toggle on the same side as the padding.
      <div className="relative" dir="ltr">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className="pe-12 text-start"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 end-0 grid w-12 place-items-center rounded-e-(--radius-field) text-muted hover:text-ink"
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    );
  },
);

interface FieldProps {
  label: string;
  /** Translation key or plain message. */
  error?: string;
  hint?: string;
  children: (props: { id: string; 'aria-describedby'?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, error, hint, children, className }: FieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} className="text-sm text-danger-600" role="alert">
          {t(error)}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
