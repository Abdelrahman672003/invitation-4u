import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

/** The panel each guide step opens ('' = none), in order. The last step points at the publish button. */
export const GUIDE_STEPS = [
  { key: 'welcome', panel: '' },
  { key: 'design', panel: 'design' },
  { key: 'details', panel: 'details' },
  { key: 'optional', panel: 'optional' },
  { key: 'landing', panel: 'landing' },
  { key: 'rsvp', panel: 'rsvp' },
  { key: 'publish', panel: '' },
] as const;

// Remembered per invitation, so every new invitation starts with the guide.
const storageKey = (invitationId: string) => `invite-editor-guide-seen:${invitationId}`;

export function guideSeen(invitationId: string): boolean {
  try {
    return localStorage.getItem(storageKey(invitationId)) === '1';
  } catch {
    return false;
  }
}

export function markGuideSeen(invitationId: string) {
  try {
    localStorage.setItem(storageKey(invitationId), '1');
  } catch {
    // The guide simply shows again next time.
  }
}

/** A floating step-by-step card shown to first-time customers. It can be skipped at any step. */
export function EditorGuide({
  step,
  manageHref,
  missing,
  onStep,
  onClose,
}: {
  step: number;
  /** Required details still empty; the details step cannot be passed until this is empty. */
  missing: string[];
  /** Where the last step leads: the share-and-guests page, where the customer pays and publishes. */
  manageHref: string;
  onStep: (step: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const current = GUIDE_STEPS[step];
  if (!current) return null;
  const last = step === GUIDE_STEPS.length - 1;
  const blocked = current.key === 'details' && missing.length > 0;
  return (
    <div
      role="dialog"
      aria-label={t('editor.guide.label')}
      className="fixed bottom-20 start-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 shadow-lift md:bottom-6"
    >
      <p className="text-xs font-medium text-brand-700">
        {t('editor.guide.stepOf', { current: step + 1, total: GUIDE_STEPS.length })}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{t(`editor.guide.steps.${current.key}.title`)}</h2>
      <p className="mt-1.5 text-sm text-ink-soft">{t(`editor.guide.steps.${current.key}.body`)}</p>
      {blocked && (
        <div
          role="status"
          className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800"
        >
          <p className="font-medium">{t('editor.guide.fillFirst')}</p>
          <ul className="mt-1 list-inside list-disc">
            {missing.map((key) => (
              <li key={key}>{t(`editor.missing.${key}`, { defaultValue: key })}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 flex gap-1" aria-hidden>
        {GUIDE_STEPS.map((item, index) => (
          <span
            key={item.key}
            className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-brand-600' : 'bg-sunken'}`}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-ink-soft underline hover:text-ink"
        >
          {t('editor.guide.skip')}
        </button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button size="sm" variant="secondary" onClick={() => onStep(step - 1)}>
              {t('editor.guide.back')}
            </Button>
          )}
          <Button
            size="sm"
            disabled={blocked}
            onClick={() => {
              if (!last) return onStep(step + 1);
              onClose();
              navigate(manageHref);
            }}
          >
            {t(last ? 'editor.guide.finish' : step === 0 ? 'editor.guide.start' : 'editor.guide.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
