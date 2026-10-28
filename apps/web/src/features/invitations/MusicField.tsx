import { useRef, useState } from 'react';
import { Music, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { mediaUrl, uploadMusic } from '@/lib/media';

/** Lets the customer add or remove a background music track (mp3). */
export function MusicField({
  invitationId,
  value,
  onChange,
}: {
  invitationId: string;
  value: string;
  onChange: (music: string) => void;
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
      onChange(await uploadMusic(invitationId, file));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('editor.fields.music')}</p>
      {value && <audio controls src={mediaUrl(value)} className="h-10 w-full" preload="none" />}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Music className="size-4" aria-hidden />
          {value ? t('editor.fields.musicChange') : t('editor.fields.musicAdd')}
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
        <input
          ref={input}
          type="file"
          accept="audio/mpeg,.mp3"
          className="sr-only"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>
      <p className="text-xs text-ink-soft">{t('editor.fields.musicHint')}</p>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {t('validation.music')}
        </p>
      )}
    </div>
  );
}
