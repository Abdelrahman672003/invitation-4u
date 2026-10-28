import type { CSSProperties } from 'react';
import type { CustomDesign, InvitationContent } from '@invite/shared';
import { mediaUrl } from '@/lib/media';
import { PhotoSlot } from './posterArt';

export interface CustomParts {
  weekday: string;
  month: string;
  day: string;
  year: string;
}

const FONT_CLASS = {
  script: 'font-script',
  luxe: 'font-luxe',
  caps: 'font-caps',
  display: 'font-display',
  sans: 'font-sans',
} as const;
const WEIGHT = { light: 300, regular: 400, bold: 700 } as const;
const SHAPE_RADIUS = { rect: '0', arch: '999px 999px 0 0', oval: '50%' } as const;
const ALIGN = { start: 'start', center: 'center', end: 'end' } as const;

/**
 * A poster assembled from an admin's uploaded artwork. Everything is positioned in percentages of
 * the poster, and text is plain text taken from the invitation, so any aspect or size scales.
 */
export function CustomPoster({
  custom,
  content,
  dir,
  names,
  parts,
  photo,
  hint,
}: {
  custom: CustomDesign;
  content: InvitationContent;
  dir: 'rtl' | 'ltr';
  names: string[];
  parts: CustomParts | null;
  photo?: string | null;
  hint?: boolean;
}) {
  const values: Record<(typeof custom.texts)[number]['key'], string> = {
    label: content.label,
    title: content.title,
    name1: names[0] ?? '',
    name2: names[1] ?? '',
    occasion: content.occasion,
    date: content.date,
    weekday: parts?.weekday ?? '',
    day: parts?.day ?? '',
    month: parts?.month ?? '',
    year: parts?.year ?? '',
    time: content.time ?? '',
    venue: content.venue,
    address: content.address ?? '',
  };

  const layer = (item: CustomDesign['layers'][number], index: number) => (
    <img
      key={`${item.image}-${index}`}
      src={mediaUrl(item.image)}
      alt=""
      draggable={false}
      className="pointer-events-none absolute h-auto max-w-none select-none"
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.w}%`,
        opacity: item.opacity,
        transform: `translate(-50%, -50%) rotate(${item.rotate}deg) scale(${item.flipX ? -1 : 1}, ${item.flipY ? -1 : 1})`,
      }}
    />
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: custom.background.color }}
    >
      {custom.background.image && (
        <img
          src={mediaUrl(custom.background.image)}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {custom.layers.map((item, index) => (item.behindPhoto ? layer(item, index) : null))}
      {custom.photo && (
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${custom.photo.x}%`,
            top: `${custom.photo.y}%`,
            width: `${custom.photo.w}%`,
            height: `${custom.photo.h}%`,
            transform: 'translate(-50%, -50%)',
            borderRadius: SHAPE_RADIUS[custom.photo.shape],
          }}
        >
          <PhotoSlot photo={photo} hint={hint} from="#d9d2c6" to="#a79d8d" />
          {custom.photo.fade && (
            <div
              className="absolute inset-x-0 bottom-0 h-2/5"
              style={{
                background: `linear-gradient(to top, ${custom.background.color}, ${custom.background.color}00)`,
              }}
            />
          )}
        </div>
      )}
      {custom.layers.map((item, index) => (item.behindPhoto ? null : layer(item, index)))}
      {custom.texts.map((item, index) => {
        const value = values[item.key];
        if (!value) return null;
        const style: CSSProperties = {
          left: `${item.x}%`,
          top: `${item.y}%`,
          width: `${item.w}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: `${item.size}cqw`,
          lineHeight: 1.15,
          color: item.color,
          textAlign: ALIGN[item.align],
          fontWeight: WEIGHT[item.weight],
          letterSpacing: dir === 'ltr' && item.tracking > 0 ? `${item.tracking}em` : undefined,
          textTransform: item.upper ? 'uppercase' : undefined,
        };
        return (
          <p
            key={`${item.key}-${index}`}
            className={`absolute whitespace-pre-line text-balance ${FONT_CLASS[item.font]}`}
            style={style}
          >
            {value}
          </p>
        );
      })}
    </div>
  );
}
