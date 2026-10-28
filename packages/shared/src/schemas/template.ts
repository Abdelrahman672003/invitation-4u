import { z } from 'zod';

export const TEMPLATE_LAYOUTS = ['centered', 'banner', 'split'] as const;
export const TEMPLATE_FRAMES = ['none', 'thin', 'double', 'ornate'] as const;
export const TEMPLATE_ORNAMENTS = [
  'floral',
  'geometric',
  'stars',
  'balloons',
  'cap',
  'rings',
  'none',
] as const;
export const TEMPLATE_PATTERNS = ['none', 'dots', 'diagonal', 'arabesque'] as const;
/** Poster themes: full artwork heroes. Absent or `classic` means the ornament/frame layouts. */
export const TEMPLATE_THEMES = [
  'classic',
  'cinema',
  'editorial',
  'nightsky',
  'paper',
  'arch',
  'royal',
  'bloom',
  'laurel',
  'custom',
] as const;
export const TEMPLATE_FONTS = ['elegant', 'modern'] as const;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'validation.color');

export const CUSTOM_TEXT_KEYS = [
  'label',
  'title',
  'name1',
  'name2',
  'occasion',
  'date',
  'weekday',
  'day',
  'month',
  'year',
  'time',
  'venue',
  'address',
] as const;
export const CUSTOM_TEXT_FONTS = ['script', 'luxe', 'caps', 'display', 'sans'] as const;
export const CUSTOM_PHOTO_SHAPES = ['rect', 'arch', 'oval'] as const;

export const paletteSchema = z.object({
  background: hexColor,
  surface: hexColor,
  text: hexColor,
  muted: hexColor,
  accent: hexColor,
});

/** Name of an uploaded artwork file (random hex, never user-chosen). */
const assetName = z.string().regex(/^[a-f0-9]{32}\.(jpg|png|webp)$/, 'validation.asset');
const percent = z.number().min(-50).max(150);

/**
 * A poster built from uploaded artwork: a background, an optional photo window, overlay images
 * (flowers, frames) and text lines placed by percentage. Positions are centres, in % of the poster.
 */
export const customDesignSchema = z.object({
  background: z.object({ color: hexColor, image: assetName.optional() }),
  /** Artwork drawn in the corners of the sections under the poster. */
  decor: assetName.optional(),
  photo: z
    .object({
      shape: z.enum(CUSTOM_PHOTO_SHAPES),
      x: percent,
      y: percent,
      w: z.number().min(5).max(150),
      h: z.number().min(5).max(150),
      /** Fades the bottom of the photo into the background. */
      fade: z.boolean(),
    })
    .nullable(),
  layers: z
    .array(
      z.object({
        image: assetName,
        x: percent,
        y: percent,
        w: z.number().min(2).max(200),
        rotate: z.number().min(-180).max(180),
        opacity: z.number().min(0).max(1),
        flipX: z.boolean(),
        flipY: z.boolean(),
        /** Draw under the photo (a frame behind it) instead of over it. */
        behindPhoto: z.boolean(),
      }),
    )
    .max(16),
  texts: z
    .array(
      z.object({
        key: z.enum(CUSTOM_TEXT_KEYS),
        x: percent,
        y: percent,
        /** Width of the text box, % of the poster. */
        w: z.number().min(5).max(150),
        /** Font size in cqw (1 = 1% of the poster width). */
        size: z.number().min(1).max(40),
        font: z.enum(CUSTOM_TEXT_FONTS),
        color: hexColor,
        align: z.enum(['start', 'center', 'end']),
        tracking: z.number().min(0).max(1),
        upper: z.boolean(),
        weight: z.enum(['light', 'regular', 'bold']),
      }),
    )
    .max(16),
});
export type CustomDesign = z.infer<typeof customDesignSchema>;

/**
 * Visual configuration of a template. Stored as JSON in `templates.design_config`
 * and interpreted by the shared invitation renderer; contains no executable content.
 */
export const templateDesignSchema = z.object({
  layout: z.enum(TEMPLATE_LAYOUTS),
  frame: z.enum(TEMPLATE_FRAMES),
  ornament: z.enum(TEMPLATE_ORNAMENTS),
  pattern: z.enum(TEMPLATE_PATTERNS),
  font: z.enum(TEMPLATE_FONTS),
  theme: z.enum(TEMPLATE_THEMES).optional(),
  /** Artwork definition, present when `theme` is 'custom'. */
  custom: customDesignSchema.optional(),
  palette: paletteSchema,
});
export type TemplateDesign = z.infer<typeof templateDesignSchema>;

/** The text shown on an invitation, already in the language it should display in. */
export interface InvitationContent {
  label: string;
  title: string;
  occasion: string;
  date: string;
  time?: string;
  venue: string;
  address?: string;
  message?: string;
}

export interface TemplateDto {
  id: string;
  slug: string;
  categorySlug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  isPremium: boolean;
  design: TemplateDesign;
}
