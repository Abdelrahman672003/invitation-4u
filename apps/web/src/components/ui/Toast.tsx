import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

type Kind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}
interface Toaster {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<Toaster | null>(null);
const noop = () => undefined;
const silent: Toaster = { success: noop, error: noop, info: noop };

const styles: Record<Kind, string> = {
  success: 'border-success-600/30 bg-success-50 text-success-700',
  error: 'border-danger-600/30 bg-danger-50 text-danger-700',
  info: 'border-info-600/30 bg-info-50 text-info-600',
};
const icons = { success: CheckCircle2, error: XCircle, info: Info } as const;

/** Short confirmation messages ("Saved successfully") shown for a few seconds in a corner of the screen. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback(
    (id: number) => setItems((current) => current.filter((item) => item.id !== id)),
    [],
  );
  const push = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId.current++;
      // Keep the stack short so a burst of actions never covers the page.
      setItems((current) => [...current.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );
  const toaster = useMemo<Toaster>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toaster}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:end-4 sm:items-end"
        aria-live="polite"
      >
        {items.map((item) => {
          const Icon = icons[item.kind];
          return (
            <div
              key={item.id}
              role={item.kind === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lift',
                styles[item.kind],
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p className="flex-1">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label={t('common.close')}
                className="-me-1 grid size-6 shrink-0 place-items-center rounded-full opacity-70 hover:opacity-100"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** Without a provider (some isolated tests) the messages are simply not shown. */
export function useToast(): Toaster {
  return useContext(ToastContext) ?? silent;
}
