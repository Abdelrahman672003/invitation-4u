import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { TemplateDesign } from '@invite/shared';
import { mediaUrl } from '@/lib/media';
import { FlowerCorner, SprigCorner } from './posterArt';

type Palette = TemplateDesign['palette'];

/** How the sections under the poster are drawn, so each template feels like one piece. */
export interface SectionLook {
  /** Heading style: a plain line, a line with a diamond, spaced capitals, or a script title. */
  heading: 'line' | 'ornament' | 'caps' | 'script';
  /** Tile style for details, notes and the venue card. */
  tile: 'card' | 'line' | 'filled';
  /** Font classes for headings and big numbers. */
  headingFont: string;
  /** Artwork drawn in the corners of some sections. */
  decor: { kind: 'image'; src: string } | { kind: 'flowers' } | { kind: 'sprig' } | null;
  palette: Palette;
}

const classicPalette: Palette = {
  background: '#ffffff',
  surface: '#ffffff',
  text: '#000000',
  muted: '#555555',
  accent: '#8a6a3f',
};
const classic: SectionLook = {
  heading: 'line',
  tile: 'card',
  headingFont: '',
  decor: null,
  palette: classicPalette,
};

export function lookFor(design: TemplateDesign): SectionLook {
  const palette = design.palette;
  switch (design.theme) {
    case 'cinema':
      return {
        heading: 'ornament',
        tile: 'line',
        headingFont: 'font-luxe font-semibold',
        decor: null,
        palette,
      };
    case 'editorial':
      return {
        heading: 'caps',
        tile: 'line',
        headingFont: 'font-caps font-light',
        decor: null,
        palette,
      };
    case 'nightsky':
      return {
        heading: 'script',
        tile: 'filled',
        headingFont: 'font-script font-normal',
        decor: { kind: 'flowers' },
        palette,
      };
    case 'paper':
      return {
        heading: 'ornament',
        tile: 'card',
        headingFont: 'font-luxe font-semibold',
        decor: { kind: 'sprig' },
        palette,
      };
    case 'arch':
      return {
        heading: 'script',
        tile: 'filled',
        headingFont: 'font-script font-normal',
        decor: { kind: 'flowers' },
        palette,
      };
    case 'royal':
      return {
        heading: 'ornament',
        tile: 'filled',
        headingFont: 'font-luxe font-semibold',
        decor: null,
        palette,
      };
    case 'bloom':
      return {
        heading: 'script',
        tile: 'filled',
        headingFont: 'font-script font-normal',
        decor: { kind: 'flowers' },
        palette,
      };
    case 'laurel':
      return {
        heading: 'ornament',
        tile: 'line',
        headingFont: 'font-luxe font-semibold',
        decor: { kind: 'sprig' },
        palette,
      };
    case 'custom': {
      const title = design.custom?.texts.find(
        (item) => item.key === 'title' || item.key === 'name1',
      );
      const font = title?.font ?? 'luxe';
      const decor = design.custom?.decor
        ? ({ kind: 'image', src: mediaUrl(design.custom.decor) } as const)
        : null;
      if (font === 'script')
        return {
          heading: 'script',
          tile: 'filled',
          headingFont: 'font-script font-normal',
          decor,
          palette,
        };
      if (font === 'caps')
        return {
          heading: 'caps',
          tile: 'line',
          headingFont: 'font-caps font-light',
          decor,
          palette,
        };
      if (font === 'sans')
        return {
          heading: 'line',
          tile: 'card',
          headingFont: 'font-sans font-bold',
          decor,
          palette,
        };
      return {
        heading: 'ornament',
        tile: 'card',
        headingFont: 'font-luxe font-semibold',
        decor,
        palette,
      };
    }
    default:
      return { ...classic, palette };
  }
}

const LookContext = createContext<SectionLook>(classic);
export const LookProvider = ({ look, children }: { look: SectionLook; children: ReactNode }) => (
  <LookContext.Provider value={look}>{children}</LookContext.Provider>
);
// eslint-disable-next-line react-refresh/only-export-components
export const useLook = () => useContext(LookContext);

/** Shades a #rrggbb colour toward black (negative) or white (positive); amount is -1..1. */
// eslint-disable-next-line react-refresh/only-export-components
export function shade(hex: string, amount: number) {
  const mix = amount < 0 ? 0 : 255;
  const weight = Math.abs(amount);
  const channel = (index: number) =>
    Math.round(parseInt(hex.slice(index, index + 2), 16) * (1 - weight) + mix * weight);
  return `rgb(${channel(1)} ${channel(3)} ${channel(5)})`;
}

function isDark(hex: string) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return ((r ?? 0) * 299 + (g ?? 0) * 587 + (b ?? 0) * 114) / 1000 < 110;
}

/**
 * Frosted-glass surface: a translucent tint of the card colour, a blur of whatever is behind it,
 * a bright hairline edge and a soft long shadow. Works on light and dark palettes.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function glass(palette: Palette, strength: 'soft' | 'strong' = 'soft'): CSSProperties {
  const dark = isDark(palette.surface);
  const edge = dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.7)';
  const highlight = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)';
  const alpha = strength === 'strong' ? ['d9', 'a6'] : ['b3', '70'];
  return {
    background: `linear-gradient(135deg, ${palette.surface}${alpha[0]}, ${palette.surface}${alpha[1]})`,
    backdropFilter: 'blur(18px) saturate(160%)',
    WebkitBackdropFilter: 'blur(18px) saturate(160%)',
    border: `1px solid ${edge}`,
    boxShadow: `0 28px 60px -30px ${palette.text}55, 0 2px 6px ${palette.text}12, inset 0 1px 0 ${highlight}`,
  };
}

/** Soft blurred glows behind the whole page, so the glass has something to refract. */
export function GlassBackdrop({ palette }: { palette: Palette }) {
  const orbs = [
    { top: '6%', side: 'start', size: 26, color: palette.accent, opacity: 0.28 },
    { top: '22%', side: 'end', size: 22, color: palette.muted, opacity: 0.2 },
    { top: '38%', side: 'start', size: 28, color: palette.accent, opacity: 0.22 },
    { top: '55%', side: 'end', size: 26, color: palette.accent, opacity: 0.26 },
    { top: '72%', side: 'start', size: 24, color: palette.muted, opacity: 0.2 },
    { top: '88%', side: 'end', size: 28, color: palette.accent, opacity: 0.24 },
  ] as const;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {orbs.map((orb, index) => (
        <span
          key={index}
          className="absolute rounded-full blur-3xl"
          style={{
            top: orb.top,
            [orb.side === 'start' ? 'insetInlineStart' : 'insetInlineEnd']: '-8rem',
            width: `${orb.size}rem`,
            height: `${orb.size}rem`,
            background: orb.color,
            opacity: orb.opacity,
          }}
        />
      ))}
    </div>
  );
}

/** Corner artwork for a section. The parent must be `relative overflow-hidden`. */
export function Decor({ palette }: { palette: Palette }) {
  const { decor } = useLook();
  if (!decor) return null;
  const common = 'pointer-events-none absolute z-0 select-none';
  if (decor.kind === 'image') {
    return (
      <>
        <img
          src={decor.src}
          alt=""
          aria-hidden
          className={`${common} start-0 top-0 w-[34%] max-w-[16rem] opacity-90 rtl:-scale-x-100`}
        />
        <img
          src={decor.src}
          alt=""
          aria-hidden
          className={`${common} bottom-0 end-0 w-[34%] max-w-[16rem] -scale-100 opacity-90 rtl:scale-x-100`}
        />
      </>
    );
  }
  if (decor.kind === 'sprig') {
    return (
      <>
        <SprigCorner
          leaf="#5d7a5b"
          leafSoft="#9db79b"
          className={`${common} start-0 top-0 w-[14%] max-w-[7rem] opacity-80 rtl:-scale-x-100`}
        />
        <SprigCorner
          leaf="#5d7a5b"
          leafSoft="#9db79b"
          className={`${common} bottom-0 end-0 w-[14%] max-w-[7rem] -scale-100 opacity-80 rtl:scale-x-100`}
        />
      </>
    );
  }
  const tint = {
    petal: palette.accent,
    petalSoft: `${palette.accent}aa`,
    center: palette.text,
    leaf: palette.muted,
  };
  return (
    <>
      <FlowerCorner
        {...tint}
        className={`${common} start-0 top-0 w-[22%] max-w-[12rem] opacity-35 rtl:-scale-x-100`}
      />
      <FlowerCorner
        {...tint}
        className={`${common} bottom-0 end-0 w-[22%] max-w-[12rem] -scale-100 opacity-35 rtl:scale-x-100`}
      />
    </>
  );
}
