import { z } from 'zod';
import { LOCALES } from '../constants.js';
import {
  TEMPLATE_FONTS,
  customDesignSchema,
  paletteSchema,
  type TemplateDesign,
} from './template.js';

const text = (max: number) => z.string().trim().max(max, 'validation.tooLong');

/**
 * Structured, plain-text invitation content. No HTML or CSS is ever stored or rendered;
 * the renderer escapes everything and styling comes from the template design config.
 */
export const ENVELOPE_STYLES = [
  'classic',
  'luxe',
  'floral',
  'minimal',
  'night',
  'curtain',
  'doors',
  'hall',
] as const;

/** Fonts the customer can pick for a passage of text; 'auto' follows the template. */
export const TEXT_FONTS = ['auto', 'display', 'script', 'luxe', 'sans', 'caps'] as const;

export const GALLERY_LAYOUTS = ['grid', 'carousel', 'polaroid'] as const;

export const invitationContentSchema = z.object({
  hostLine: text(80).default(''),
  headline: text(80).default(''),
  occasionLine: text(100).default(''),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'validation.time')
    .or(z.literal(''))
    .default(''),
  venueName: text(120).default(''),
  venueAddress: text(200).default(''),
  message: text(400).default(''),
  /** Longer text for the "our story" section of the landing page. */
  story: text(600).default(''),
  /** Programme of the day: up to six entries, shown as a timeline. */
  schedule: z
    .array(
      z.object({
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'validation.time'),
        // Blank rows are allowed while typing and are simply not shown.
        title: text(60),
      }),
    )
    .max(6)
    .default([]),
  dressCode: text(80).default(''),
  notes: text(300).default(''),
  /** Look of the opening envelope. */
  envelopeStyle: z.enum(ENVELOPE_STYLES).default('classic'),
  /** A verse or quotation shown at the top of the invitation. */
  verse: text(300).default(''),
  /** Font of the verse and of the story, chosen by the customer. */
  verseFont: z.enum(TEXT_FONTS).default('auto'),
  storyFont: z.enum(TEXT_FONTS).default('auto'),
  /** Stored name of the uploaded background music (mp3), or ''. */
  music: z
    .string()
    .regex(/^[a-f0-9]{32}\.mp3$/, 'validation.music')
    .or(z.literal(''))
    .default(''),
  /** Extra photos for the gallery section (up to 6), stored names. */
  gallery: z
    .array(z.string().regex(/^[a-f0-9]{32}\.(jpg|png|webp)$/, 'validation.photo'))
    .max(6)
    .default([]),
  galleryLayout: z.enum(GALLERY_LAYOUTS).default('grid'),
  /** Stored name of the customer's uploaded photo ('' when none). Served from /api/media. */
  photo: z
    .string()
    .regex(/^[a-f0-9]{32}\.(jpg|png|webp)$/, 'validation.photo')
    .or(z.literal(''))
    .default(''),
  /** Link to the venue on a map. https only, so it can never run script. */
  mapUrl: z
    .string()
    .trim()
    .max(300, 'validation.tooLong')
    .regex(/^https:\/\/[^\s]+$/, 'validation.url')
    .or(z.literal(''))
    .default(''),
  sections: z
    .object({
      time: z.boolean().default(true),
      address: z.boolean().default(true),
      message: z.boolean().default(true),
      countdown: z.boolean().default(true),
      story: z.boolean().default(true),
      schedule: z.boolean().default(true),
      details: z.boolean().default(true),
      envelope: z.boolean().default(true),
      calendar: z.boolean().default(true),
      guestbook: z.boolean().default(true),
      gallery: z.boolean().default(true),
    })
    .default({}),
  rsvp: z
    .object({
      enabled: z.boolean().default(true),
      askAttendees: z.boolean().default(true),
      maxPerResponse: z.number().int().min(1).max(20).default(10),
    })
    .default({ enabled: true, askAttendees: true, maxPerResponse: 10 }),
  design: z
    .object({
      accent: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, 'validation.color')
        .optional(),
      font: z.enum(TEMPLATE_FONTS).optional(),
      /**
       * The customer's own poster design (Design Studio). Needs the premium package to publish,
       * like a premium template.
       */
      studio: z.object({ custom: customDesignSchema, palette: paletteSchema }).optional(),
      /** Whole-page colours chosen by the customer (premium). Missing means the template's colours. */
      colors: paletteSchema.optional(),
    })
    .default({}),
});
export type InvitationContentData = z.infer<typeof invitationContentSchema>;

export const emptyInvitationContent = (headline = ''): InvitationContentData =>
  invitationContentSchema.parse({ headline });

export const createInvitationSchema = z.object({
  templateSlug: z.string().min(1).max(80),
  subtypeSlug: z.string().min(1).max(80).optional(),
  title: z.string().trim().min(1, 'validation.required').max(120, 'validation.tooLong'),
  locale: z.enum(LOCALES).optional(),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const updateInvitationSchema = z
  .object({
    /** The revision the client last saw; stale writes are rejected with 409. */
    baseRevision: z.number().int().min(0),
    title: z
      .string()
      .trim()
      .min(1, 'validation.required')
      .max(120, 'validation.tooLong')
      .optional(),
    content: invitationContentSchema.optional(),
    /** Calendar date (YYYY-MM-DD) or null to clear. */
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date')
      .nullable()
      .optional(),
    contentLocale: z.enum(LOCALES).optional(),
    /** Last day (YYYY-MM-DD, inclusive) on which RSVPs are accepted, or null for no deadline. */
    rsvpDeadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date')
      .nullable()
      .optional(),
    templateSlug: z.string().min(1).max(80).optional(),
  })
  .strict();
export type UpdateInvitationInput = z.infer<typeof updateInvitationSchema>;

/** Merges the customer's colour/font choices over the template's design. */
/** True when the content uses a premium design tool (own poster or whole-page colours). */
export function usesPremiumDesign(content: InvitationContentData): boolean {
  return Boolean(content.design.studio || content.design.colors);
}

export function applyDesignOverrides(
  design: TemplateDesign,
  overrides: InvitationContentData['design'],
): TemplateDesign {
  if (overrides.studio) {
    return {
      layout: 'centered',
      frame: 'none',
      ornament: 'none',
      pattern: 'none',
      font: 'elegant',
      theme: 'custom',
      custom: overrides.studio.custom,
      palette: overrides.studio.palette,
    };
  }
  return {
    ...design,
    font: overrides.font ?? design.font,
    palette: overrides.colors ?? {
      ...design.palette,
      accent: overrides.accent ?? design.palette.accent,
    },
  };
}

/** Fields that must be filled before an invitation can be published (enforced again server-side in M6). */
export function publishReadiness(
  content: InvitationContentData,
  eventDate: string | null,
): Record<string, string> {
  const problems: Record<string, string> = {};
  if (!content.headline) problems.headline = 'validation.required';
  if (!eventDate) problems.eventDate = 'validation.required';
  if (!content.venueName) problems.venueName = 'validation.required';
  return problems;
}
