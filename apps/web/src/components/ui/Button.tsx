import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,box-shadow,color,transform] duration-200 ease-(--ease-soft) ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-55';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white shadow-soft hover:bg-brand-800',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink-soft hover:bg-sunken',
  ghost: 'text-ink-soft hover:bg-sunken hover:text-ink',
  gold: 'bg-gold-500 text-white shadow-soft hover:bg-gold-600',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-13 px-7 text-base',
};

export function buttonClasses(
  options: { variant?: Variant; size?: Size; block?: boolean; className?: string } = {},
) {
  return cn(
    base,
    variants[options.variant ?? 'primary'],
    sizes[options.size ?? 'md'],
    options.block && 'w-full',
    options.className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    block,
    loading = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function ButtonLink({ variant, size, block, className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, block, className: className as string })}
      {...props}
    />
  );
}
