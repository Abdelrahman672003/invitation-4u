import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for deletions and other changes that cannot be undone. */
  tone?: 'primary' | 'danger';
}
type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** Replaces window.confirm: `if (await confirm({ message })) …` shows a modal instead. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>(
    (next) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(next);
      }),
    [],
  );
  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);
  const cancel = useCallback(() => settle(false), [settle]);
  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={options !== null}
        onClose={cancel}
        title={options?.title ?? t('common.confirmTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={cancel}>
              {options?.cancelLabel ?? t('common.cancel')}
            </Button>
            <Button
              variant={options?.tone === 'danger' ? 'danger' : 'primary'}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? t('common.confirm')}
            </Button>
          </>
        }
      >
        <p>{options?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** Without a provider (some isolated tests) the browser's own dialog is the fallback. */
export function useConfirm(): Confirm {
  return (
    useContext(ConfirmContext) ?? ((options) => Promise.resolve(window.confirm(options.message)))
  );
}
