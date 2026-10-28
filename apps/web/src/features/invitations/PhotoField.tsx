import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { mediaUrl, uploadPhoto } from '@/lib/media';

/** Lets the customer add, replace or remove the photo a poster-style template shows. */
export function PhotoField({
  invitationId,
  value,
  onChange,
}: {
  invitationId: string;
  value: string;
  onChange: (photo: string) => void;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      onChange(await uploadPhoto(invitationId, file));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('editor.fields.photo')}</p>
      <div className="flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-sunken text-ink-soft">
          {value ? (
            <img src={mediaUrl(value)} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {value ? t('editor.fields.photoChange') : t('editor.fields.photoAdd')}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onChange('')}
            >
              <Trash2 className="size-4" aria-hidden />
              {t('editor.fields.photoRemove')}
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>
      <p className="text-xs text-ink-soft">{t('editor.fields.photoHint')}</p>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {t('validation.photo')}
        </p>
      )}
    </div>
  );
}
