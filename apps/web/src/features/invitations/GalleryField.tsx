import { useRef, useState } from 'react';
import { GalleryHorizontal, ImagePlus, Images, LayoutGrid, X } from 'lucide-react';
import type { InvitationContentData } from '@invite/shared';
import { cn } from '@/lib/cn';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { mediaUrl, uploadPhoto } from '@/lib/media';

const MAX = 6;

const LAYOUTS = [
  { key: 'grid', Icon: LayoutGrid },
  { key: 'carousel', Icon: GalleryHorizontal },
  { key: 'polaroid', Icon: Images },
] as const;

/** Extra photos for the gallery section: add several at once, remove any. */
export function GalleryField({
  invitationId,
  value,
  layout,
  onChange,
  onLayoutChange,
}: {
  invitationId: string;
  value: string[];
  layout: InvitationContentData['galleryLayout'];
  onChange: (photos: string[]) => void;
  onLayoutChange: (layout: InvitationContentData['galleryLayout']) => void;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(false);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, MAX - value.length)) {
        added.push(await uploadPhoto(invitationId, file));
      }
    } catch {
      setError(true);
    } finally {
      if (added.length > 0) onChange([...value, ...added]);
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('editor.fields.gallery')}</p>
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {value.map((name) => (
            <li
              key={name}
              className="relative aspect-square overflow-hidden rounded-xl border border-line"
            >
              <img src={mediaUrl(name)} alt="" className="size-full object-cover" />
              <button
                type="button"
                aria-label={t('editor.fields.photoRemove')}
                onClick={() => onChange(value.filter((item) => item !== name))}
                className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy || value.length >= MAX}
        onClick={() => input.current?.click()}
      >
        <ImagePlus className="size-4" aria-hidden />
        {t('editor.fields.galleryAdd', { count: MAX - value.length })}
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => void pick(e.target.files)}
      />
      <p className="text-xs text-ink-soft">{t('editor.fields.galleryHint')}</p>
      <div role="radiogroup" aria-label={t('editor.fields.galleryLayout')} className="space-y-1.5">
        <p className="text-sm font-medium">{t('editor.fields.galleryLayout')}</p>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={layout === key}
              onClick={() => onLayoutChange(key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-medium transition-colors',
                layout === key
                  ? 'border-brand-600 bg-brand-50 text-brand-800'
                  : 'border-line hover:border-line-strong',
              )}
            >
              <Icon className="size-5" aria-hidden />
              {t(`editor.fields.galleryLayouts.${key}`)}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {t('validation.photo')}
        </p>
      )}
    </div>
  );
}
