import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  Brush,
  Flower2,
  ImageIcon,
  Paintbrush,
  Trash2,
  Type,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CUSTOM_PHOTO_SHAPES,
  CUSTOM_TEXT_FONTS,
  CUSTOM_TEXT_KEYS,
  type CustomDesign,
  type InvitationContent,
  type TemplateDesign,
} from '@invite/shared';
import { ThemePoster } from '@/components/invitation/ThemePoster';
import { useToast } from '@/components/ui/Toast';
import { ToggleRow as Toggle } from '@/components/ui/Toggle';
import { mediaUrl } from '@/lib/media';
import {
  AccordionSection,
  ColorField,
  IconButton,
  ItemRow,
  Labeled,
  Slider,
  UploadButton,
  round,
  selectClass,
} from './controls';

type Text = CustomDesign['texts'][number];
type Layer = CustomDesign['layers'][number];
type Palette = TemplateDesign['palette'];
type Selection = { kind: 'photo' } | { kind: 'layer' | 'text'; index: number } | null;
type SectionId = 'background' | 'photo' | 'artwork' | 'text' | 'colors' | string;

export interface ArtItem {
  id: string;
  file: string;
  label: string;
}

export const newText = (key: Text['key'], y: number, size = 5): Text => ({
  key,
  x: 50,
  y,
  w: 80,
  size,
  font: 'luxe',
  color: '#2a2018',
  align: 'center',
  tracking: 0,
  upper: false,
  weight: 'regular',
});

export const defaultPalette: Palette = {
  background: '#f6f2ea',
  surface: '#fffdf8',
  text: '#2a2018',
  muted: '#76695a',
  accent: '#8a6a3f',
};

export const defaultCustom = (): CustomDesign => ({
  background: { color: '#f6f2ea' },
  photo: { shape: 'arch', x: 50, y: 38, w: 74, h: 58, fade: true },
  layers: [],
  texts: [
    { ...newText('label', 8, 3.2), font: 'caps', tracking: 0.3, upper: true },
    { ...newText('title', 70, 12), font: 'script' },
    { ...newText('occasion', 78, 3.4), font: 'caps', tracking: 0.12 },
    { ...newText('date', 84, 4), font: 'caps', tracking: 0.2, upper: true },
    { ...newText('venue', 90, 3.4), font: 'caps', tracking: 0.2, upper: true },
  ],
});

export interface AccordionApi {
  open: string;
  toggle: (id: string) => void;
}

interface Props {
  custom: CustomDesign;
  palette: Palette;
  onChange: (next: { custom: CustomDesign; palette: Palette }) => void;
  /** Uploads one image and returns its stored name. */
  uploadImage: (file: File) => Promise<string>;
  /** Ready-made artwork to add with one tap. */
  library: ArtItem[];
  /** Sample or real text shown on the poster while designing. */
  content: InvitationContent;
  dir: 'rtl' | 'ltr';
  eventDate: string | null;
  /** The customer's photo URL, when there is one. */
  photo?: string | null;
  /** Extra controls at the end of the "photo" section (the customer's own photo upload). */
  photoControls?: ReactNode;
  /** Extra sidebar sections before / after the built-in ones; they share the one-open-at-a-time state. */
  topSections?: (accordion: AccordionApi) => ReactNode;
  extraSections?: (accordion: AccordionApi) => ReactNode;
  /** Shown above the sections (language switch of the preview, etc). */
  previewTools?: ReactNode;
}

/**
 * The poster designer used by admins (template builder) and customers (Design Studio): a sidebar
 * of collapsible sections on one side, a live preview with drag-to-move on the other.
 */
export function DesignEditor({
  custom,
  palette,
  onChange,
  uploadImage,
  library,
  content,
  dir,
  eventDate,
  photo,
  photoControls,
  topSections,
  extraSections,
  previewTools,
}: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [open, setOpen] = useState<SectionId>('photo');
  const [selection, setSelection] = useState<Selection>({ kind: 'photo' });
  const [uploading, setUploading] = useState(false);
  const [ratios, setRatios] = useState<Record<string, number>>({});

  const setCustom = (patch: Partial<CustomDesign>) =>
    onChange({ custom: { ...custom, ...patch }, palette });
  const patchText = (index: number, patch: Partial<Text>) =>
    setCustom({
      texts: custom.texts.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    });
  const patchLayer = (index: number, patch: Partial<Layer>) =>
    setCustom({
      layers: custom.layers.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    });
  const patchPhoto = (patch: Partial<NonNullable<CustomDesign['photo']>>) =>
    custom.photo && setCustom({ photo: { ...custom.photo, ...patch } });

  // Natural height/width of each layer image, so the drag outline matches the artwork.
  useEffect(() => {
    for (const layer of custom.layers) {
      if (ratios[layer.image]) continue;
      const image = new Image();
      image.onload = () =>
        setRatios((current) => ({
          ...current,
          [layer.image]: image.naturalHeight / image.naturalWidth,
        }));
      image.src = mediaUrl(layer.image);
    }
  }, [custom.layers, ratios]);

  const design: TemplateDesign = useMemo(
    () => ({
      layout: 'centered',
      frame: 'none',
      ornament: 'none',
      pattern: 'none',
      font: 'elegant',
      theme: 'custom',
      custom,
      palette,
    }),
    [custom, palette],
  );

  function toggleSection(id: SectionId) {
    const next = open === id ? '' : id;
    setOpen(next);
    setSelection(next === 'photo' && custom.photo ? { kind: 'photo' } : null);
  }

  async function upload(file: File | undefined, apply: (name: string) => void) {
    if (!file) return;
    setUploading(true);
    try {
      apply(await uploadImage(file));
    } catch {
      toast.error(t('builder.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  function addLayer(image: string) {
    if (custom.layers.length >= 16) {
      toast.error(t('studio.tooManyLayers'));
      return;
    }
    setCustom({
      layers: [
        ...custom.layers,
        {
          image,
          x: 50,
          y: 50,
          w: 40,
          rotate: 0,
          opacity: 1,
          flipX: false,
          flipY: false,
          behindPhoto: false,
        },
      ],
    });
    setOpen('artwork');
    setSelection({ kind: 'layer', index: custom.layers.length });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= custom.layers.length) return;
    const layers = [...custom.layers];
    [layers[index], layers[target]] = [layers[target]!, layers[index]!];
    setCustom({ layers });
    setSelection({ kind: 'layer', index: target });
  }

  const layerOpen = (index: number) => selection?.kind === 'layer' && selection.index === index;
  const textOpen = (index: number) => selection?.kind === 'text' && selection.index === index;

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
      <div className="space-y-3">
        {topSections?.({ open, toggle: toggleSection })}
        <AccordionSection
          id="sec-photo"
          icon={<ImageIcon className="size-5" />}
          title={t('studio.sections.photo')}
          summary={custom.photo ? t(`builder.shapes.${custom.photo.shape}`) : t('studio.off')}
          open={open === 'photo'}
          onToggle={() => toggleSection('photo')}
        >
          <Toggle
            label={t('builder.photoOn')}
            checked={custom.photo !== null}
            onChange={(on) => {
              setCustom({
                photo: on ? { shape: 'arch', x: 50, y: 40, w: 70, h: 55, fade: false } : null,
              });
              setSelection(on ? { kind: 'photo' } : null);
            }}
          />
          {photoControls}
          {custom.photo && (
            <>
              <Labeled label={t('builder.shape')}>
                <select
                  className={selectClass}
                  value={custom.photo.shape}
                  onChange={(e) => patchPhoto({ shape: e.target.value as 'rect' })}
                >
                  {CUSTOM_PHOTO_SHAPES.map((shape) => (
                    <option key={shape} value={shape}>
                      {t(`builder.shapes.${shape}`)}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Slider
                label={t('studio.horizontal')}
                value={custom.photo.x}
                min={-20}
                max={120}
                onChange={(x) => patchPhoto({ x })}
              />
              <Slider
                label={t('studio.vertical')}
                value={custom.photo.y}
                min={-20}
                max={120}
                onChange={(y) => patchPhoto({ y })}
              />
              <Slider
                label={t('builder.width')}
                value={custom.photo.w}
                min={10}
                max={150}
                onChange={(w) => patchPhoto({ w })}
              />
              <Slider
                label={t('builder.height')}
                value={custom.photo.h}
                min={10}
                max={150}
                onChange={(h) => patchPhoto({ h })}
              />
              <Toggle
                label={t('builder.fade')}
                checked={custom.photo.fade}
                onChange={(fade) => patchPhoto({ fade })}
              />
            </>
          )}
        </AccordionSection>

        <AccordionSection
          id="sec-background"
          icon={<Paintbrush className="size-5" />}
          title={t('studio.sections.background')}
          summary={custom.background.image ? t('studio.withImage') : custom.background.color}
          open={open === 'background'}
          onToggle={() => toggleSection('background')}
        >
          <Labeled label={t('builder.bgColor')}>
            <ColorField
              value={custom.background.color}
              onChange={(color) => setCustom({ background: { ...custom.background, color } })}
            />
          </Labeled>
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton
              busy={uploading}
              label={t(custom.background.image ? 'builder.changeImage' : 'builder.bgImage')}
              onFile={(file) =>
                void upload(file, (image) =>
                  setCustom({ background: { ...custom.background, image } }),
                )
              }
            />
            {custom.background.image && (
              <IconButton
                label={t('builder.remove')}
                icon={<Trash2 className="size-4" />}
                onClick={() => setCustom({ background: { color: custom.background.color } })}
              />
            )}
          </div>
          <div className="space-y-2 border-t border-line pt-4">
            <p className="text-sm text-ink-soft">{t('studio.decorHint')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {custom.decor && (
                <img
                  src={mediaUrl(custom.decor)}
                  alt=""
                  className="size-10 rounded bg-sunken object-contain"
                />
              )}
              <UploadButton
                busy={uploading}
                label={t(custom.decor ? 'builder.changeImage' : 'studio.decorAdd')}
                onFile={(file) => void upload(file, (decor) => setCustom({ decor }))}
              />
              {custom.decor && (
                <IconButton
                  label={t('builder.remove')}
                  icon={<Trash2 className="size-4" />}
                  onClick={() => setCustom({ decor: undefined })}
                />
              )}
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          id="sec-artwork"
          icon={<Flower2 className="size-5" />}
          title={t('studio.sections.artwork')}
          summary={t('studio.layerCount', { count: custom.layers.length })}
          open={open === 'artwork'}
          onToggle={() => toggleSection('artwork')}
        >
          {library.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-ink-soft">{t('studio.library')}</p>
              <ul className="grid grid-cols-4 gap-2">
                {library.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      title={item.label}
                      aria-label={t('studio.addArt', { name: item.label })}
                      onClick={() => addLayer(item.file)}
                      className="grid aspect-square w-full place-items-center rounded-lg border border-line bg-[repeating-conic-gradient(#f1ece4_0_25%,#fff_0_50%)] bg-[length:12px_12px] p-1 hover:border-brand-600"
                    >
                      <img
                        src={mediaUrl(item.file)}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <UploadButton
            busy={uploading}
            label={t('builder.addLayer')}
            onFile={(file) => void upload(file, addLayer)}
          />
          {custom.layers.length > 0 && (
            <ul className="space-y-2">
              {custom.layers.map((layer, index) => (
                <ItemRow
                  key={`${layer.image}-${index}`}
                  open={layerOpen(index)}
                  onToggle={() => setSelection(layerOpen(index) ? null : { kind: 'layer', index })}
                  leading={
                    <img
                      src={mediaUrl(layer.image)}
                      alt=""
                      className="size-9 shrink-0 rounded bg-sunken object-contain"
                    />
                  }
                  title={t('builder.layer', { n: index + 1 })}
                  actions={
                    <>
                      <IconButton
                        label={t('builder.up')}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        icon={<ArrowUp className="size-4" />}
                      />
                      <IconButton
                        label={t('builder.down')}
                        disabled={index === custom.layers.length - 1}
                        onClick={() => move(index, 1)}
                        icon={<ArrowDown className="size-4" />}
                      />
                      <IconButton
                        label={t('builder.remove')}
                        icon={<Trash2 className="size-4" />}
                        onClick={() => {
                          setCustom({
                            layers: custom.layers.filter((_, position) => position !== index),
                          });
                          setSelection(null);
                        }}
                      />
                    </>
                  }
                >
                  <Slider
                    label={t('studio.horizontal')}
                    value={layer.x}
                    min={-20}
                    max={120}
                    onChange={(x) => patchLayer(index, { x })}
                  />
                  <Slider
                    label={t('studio.vertical')}
                    value={layer.y}
                    min={-20}
                    max={120}
                    onChange={(y) => patchLayer(index, { y })}
                  />
                  <Slider
                    label={t('builder.width')}
                    value={layer.w}
                    min={5}
                    max={200}
                    onChange={(w) => patchLayer(index, { w })}
                  />
                  <Slider
                    label={t('builder.rotate')}
                    value={layer.rotate}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(rotate) => patchLayer(index, { rotate })}
                  />
                  <Slider
                    label={t('builder.opacity')}
                    value={layer.opacity}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(opacity) => patchLayer(index, { opacity })}
                  />
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <Toggle
                      label={t('builder.flipX')}
                      checked={layer.flipX}
                      onChange={(flipX) => patchLayer(index, { flipX })}
                    />
                    <Toggle
                      label={t('builder.flipY')}
                      checked={layer.flipY}
                      onChange={(flipY) => patchLayer(index, { flipY })}
                    />
                    <Toggle
                      label={t('builder.behindPhoto')}
                      checked={layer.behindPhoto}
                      onChange={(behindPhoto) => patchLayer(index, { behindPhoto })}
                    />
                  </div>
                </ItemRow>
              ))}
            </ul>
          )}
        </AccordionSection>

        <AccordionSection
          id="sec-text"
          icon={<Type className="size-5" />}
          title={t('studio.sections.text')}
          summary={t('studio.textCount', { count: custom.texts.length })}
          open={open === 'text'}
          onToggle={() => toggleSection('text')}
        >
          <select
            className={selectClass}
            aria-label={t('builder.addText')}
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              setCustom({ texts: [...custom.texts, newText(e.target.value as Text['key'], 50)] });
              setSelection({ kind: 'text', index: custom.texts.length });
            }}
          >
            <option value="">{t('builder.addText')}</option>
            {CUSTOM_TEXT_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`builder.keys.${key}`)}
              </option>
            ))}
          </select>
          {custom.texts.length > 0 && (
            <ul className="space-y-2">
              {custom.texts.map((item, index) => (
                <ItemRow
                  key={`${item.key}-${index}`}
                  open={textOpen(index)}
                  onToggle={() => setSelection(textOpen(index) ? null : { kind: 'text', index })}
                  leading={
                    <span
                      className="size-3 shrink-0 rounded-full border border-line"
                      style={{ background: item.color }}
                      aria-hidden
                    />
                  }
                  title={t(`builder.keys.${item.key}`)}
                  actions={
                    <IconButton
                      label={t('builder.remove')}
                      icon={<Trash2 className="size-4" />}
                      onClick={() => {
                        setCustom({
                          texts: custom.texts.filter((_, position) => position !== index),
                        });
                        setSelection(null);
                      }}
                    />
                  }
                >
                  <Slider
                    label={t('studio.horizontal')}
                    value={item.x}
                    min={-20}
                    max={120}
                    onChange={(x) => patchText(index, { x })}
                  />
                  <Slider
                    label={t('studio.vertical')}
                    value={item.y}
                    min={-20}
                    max={120}
                    onChange={(y) => patchText(index, { y })}
                  />
                  <Slider
                    label={t('builder.width')}
                    value={item.w}
                    min={10}
                    max={150}
                    onChange={(w) => patchText(index, { w })}
                  />
                  <Slider
                    label={t('builder.size')}
                    value={item.size}
                    min={1.5}
                    max={30}
                    step={0.5}
                    onChange={(size) => patchText(index, { size })}
                  />
                  <Slider
                    label={t('builder.tracking')}
                    value={item.tracking}
                    min={0}
                    max={0.8}
                    step={0.02}
                    onChange={(tracking) => patchText(index, { tracking })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Labeled label={t('builder.font')}>
                      <select
                        className={selectClass}
                        value={item.font}
                        onChange={(e) => patchText(index, { font: e.target.value as Text['font'] })}
                      >
                        {CUSTOM_TEXT_FONTS.map((font) => (
                          <option key={font} value={font}>
                            {t(`builder.fonts.${font}`)}
                          </option>
                        ))}
                      </select>
                    </Labeled>
                    <Labeled label={t('builder.weight')}>
                      <select
                        className={selectClass}
                        value={item.weight}
                        onChange={(e) =>
                          patchText(index, { weight: e.target.value as Text['weight'] })
                        }
                      >
                        {(['light', 'regular', 'bold'] as const).map((weight) => (
                          <option key={weight} value={weight}>
                            {t(`builder.weights.${weight}`)}
                          </option>
                        ))}
                      </select>
                    </Labeled>
                    <Labeled label={t('builder.align')}>
                      <select
                        className={selectClass}
                        value={item.align}
                        onChange={(e) =>
                          patchText(index, { align: e.target.value as Text['align'] })
                        }
                      >
                        {(['start', 'center', 'end'] as const).map((align) => (
                          <option key={align} value={align}>
                            {t(`builder.aligns.${align}`)}
                          </option>
                        ))}
                      </select>
                    </Labeled>
                    <Labeled label={t('builder.color')}>
                      <ColorField
                        value={item.color}
                        onChange={(color) => patchText(index, { color })}
                      />
                    </Labeled>
                  </div>
                  <Toggle
                    label={t('builder.upper')}
                    checked={item.upper}
                    onChange={(upper) => patchText(index, { upper })}
                  />
                </ItemRow>
              ))}
            </ul>
          )}
        </AccordionSection>

        <AccordionSection
          id="sec-colors"
          icon={<Brush className="size-5" />}
          title={t('studio.sections.colors')}
          summary={t('studio.colorsSummary')}
          open={open === 'colors'}
          onToggle={() => toggleSection('colors')}
        >
          <p className="text-sm text-ink-soft">{t('builder.pageColorsHint')}</p>
          <div className="grid grid-cols-2 gap-3">
            {(['accent', 'background', 'surface', 'text', 'muted'] as const).map((key) => (
              <Labeled key={key} label={t(`builder.palette.${key}`)}>
                <ColorField
                  value={palette[key]}
                  onChange={(value) => onChange({ custom, palette: { ...palette, [key]: value } })}
                />
              </Labeled>
            ))}
          </div>
        </AccordionSection>

        {extraSections?.({ open, toggle: toggleSection })}
      </div>

      {/* On desktop the preview stays put, centred in the visible screen, while the panel scrolls. */}
      <div className="lg:sticky lg:top-[4.5rem] lg:flex lg:h-[calc(100vh-5.5rem)] lg:flex-col lg:items-center lg:justify-center">
        {previewTools && (
          <div className="mb-3 w-full max-w-[26rem] lg:max-w-[min(26rem,calc((100vh-12rem)*5/7))]">
            {previewTools}
          </div>
        )}
        <div className="mx-auto w-full max-w-[26rem] lg:max-w-[min(26rem,calc((100vh-12rem)*5/7))]">
          <Stage
            selection={selection}
            custom={custom}
            ratios={ratios}
            onMove={(x, y) => {
              if (!selection) return;
              if (selection.kind === 'photo') patchPhoto({ x, y });
              else if (selection.kind === 'layer') patchLayer(selection.index, { x, y });
              else patchText(selection.index, { x, y });
            }}
            onDeselect={() => setSelection(null)}
          >
            <ThemePoster
              design={design}
              content={content}
              dir={dir}
              eventDate={eventDate}
              photo={photo}
              hint
            />
          </Stage>
          <p className="mt-3 text-xs text-ink-soft">{t('studio.dragHint')}</p>
        </div>
      </div>
    </div>
  );
}

/** The poster preview with a draggable outline around the selected element. */
function Stage({
  children,
  selection,
  custom,
  ratios,
  onMove,
  onDeselect,
}: {
  children: ReactNode;
  selection: Selection;
  custom: CustomDesign;
  ratios: Record<string, number>;
  onMove: (x: number, y: number) => void;
  onDeselect: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  // A drag ends with a click on whatever is under the pointer; it must not count as "click away".
  const justDragged = useRef(false);
  const endDrag = () => {
    if (drag.current) {
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
    }
    drag.current = null;
  };

  // Box of the selected element in % of the poster (a poster is 5:7, so 1% of height = 0.714% of width).
  const box = (() => {
    if (!selection) return null;
    if (selection.kind === 'photo' && custom.photo)
      return { x: custom.photo.x, y: custom.photo.y, w: custom.photo.w, h: custom.photo.h };
    if (selection.kind === 'layer') {
      const layer = custom.layers[selection.index];
      if (!layer) return null;
      return {
        x: layer.x,
        y: layer.y,
        w: layer.w,
        h: (layer.w * (ratios[layer.image] ?? 1)) / 1.4,
      };
    }
    if (selection.kind === 'text') {
      const text = custom.texts[selection.index];
      if (!text) return null;
      return { x: text.x, y: text.y, w: text.w, h: (text.size * 1.2) / 1.4 };
    }
    return null;
  })();

  function start(event: ReactPointerEvent<HTMLDivElement>) {
    if (!box) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers cannot be captured; dragging still works while the pointer stays over the box.
    }
    drag.current = { startX: event.clientX, startY: event.clientY, x: box.x, y: box.y };
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current;
    const rect = stage.current?.getBoundingClientRect();
    if (!current || !rect) return;
    onMove(
      round(current.x + ((event.clientX - current.startX) / rect.width) * 100),
      round(current.y + ((event.clientY - current.startY) / rect.height) * 100),
    );
  }

  return (
    <div
      ref={stage}
      className="relative aspect-[5/7] w-full overflow-hidden rounded-sm shadow-lift ring-1 ring-line"
      onClick={() => !justDragged.current && onDeselect()}
    >
      {children}
      {box && (
        <div
          role="presentation"
          className="absolute cursor-move touch-none border-2 border-dashed border-brand-600 bg-brand-600/10"
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.w}%`,
            height: `${box.h}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      )}
    </div>
  );
}
