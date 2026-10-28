import { createContext, useContext } from 'react';
import type { TemplateDesign } from '@invite/shared';

/** Classes for the two lines the intro shows, so they match the invitation's own hero. */
export interface IntroFonts {
  label: string;
  title: string;
}

const FONT_CLASS = {
  script: 'font-script',
  luxe: 'font-luxe',
  caps: 'font-caps',
  display: 'font-display',
  sans: 'font-sans',
} as const;
const WEIGHT_CLASS = { light: 'font-light', regular: '', bold: 'font-bold' } as const;

/** The font each poster theme draws its small first line and its names in. */
const THEME_FONTS: Record<string, IntroFonts> = {
  cinema: { label: 'font-caps', title: 'font-script' },
  editorial: { label: 'font-caps', title: 'font-luxe font-semibold' },
  nightsky: { label: 'font-caps', title: 'font-script' },
  paper: { label: 'font-caps', title: 'font-script' },
  arch: { label: 'font-script', title: 'font-script' },
  royal: { label: 'font-caps', title: 'font-luxe font-semibold' },
  bloom: { label: 'font-caps', title: 'font-script' },
  laurel: { label: 'font-caps', title: 'font-luxe font-semibold' },
};

/** The fonts the invitation's hero uses for its first line and its name. */
export function introFonts(design: TemplateDesign, titleFont: string): IntroFonts {
  const custom = design.theme === 'custom' ? design.custom : undefined;
  if (custom) {
    const pick = (...keys: string[]) => custom.texts.find((item) => keys.includes(item.key));
    const toClass = (item: ReturnType<typeof pick>) =>
      item ? `${FONT_CLASS[item.font]} ${WEIGHT_CLASS[item.weight]}`.trim() : '';
    return {
      label: toClass(pick('label')),
      title: toClass(pick('title', 'name1')) || titleFont,
    };
  }
  return THEME_FONTS[design.theme ?? ''] ?? { label: '', title: titleFont };
}

export const IntroFontsContext = createContext<IntroFonts>({ label: '', title: '' });

export function useIntroFonts(): IntroFonts {
  return useContext(IntroFontsContext);
}
