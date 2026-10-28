import { z } from 'zod';
import { RSVP_RESPONSES, type RsvpResponse } from '../constants.js';
import type { InvitationContentData } from './invitation.js';
import type { TemplateDesign } from './template.js';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'validation.tooLong')
    .optional()
    .transform((value) => value || undefined);

export const guestInputSchema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(100, 'validation.tooLong'),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9()\-\s]{6,20}$/, 'validation.phone')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  groupName: optionalText(60),
  maxAttendees: z
    .number()
    .int()
    .min(1, 'validation.attendees')
    .max(20, 'validation.attendees')
    .default(1),
  notes: optionalText(500),
});
export type GuestInput = z.infer<typeof guestInputSchema>;

export const guestUpdateSchema = guestInputSchema.partial().strict();

export const GUEST_STATUS_FILTERS = ['ACCEPTED', 'DECLINED', 'PENDING'] as const;
export type GuestStatus = (typeof GUEST_STATUS_FILTERS)[number];

/** Public RSVP submission. `website` is a honeypot: real users never fill it in. */
export const publicRsvpSchema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(100, 'validation.tooLong'),
  response: z.enum(RSVP_RESPONSES),
  attendeesCount: z
    .number()
    .int()
    .min(1, 'validation.attendees')
    .max(20, 'validation.attendees')
    .optional(),
  message: optionalText(300),
  website: z.string().max(200).optional(),
});
export type PublicRsvpInput = z.infer<typeof publicRsvpSchema>;

/** A guest's congratulation. `website` is a honeypot, as on the RSVP form. */
export const publicBlessingSchema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(60, 'validation.tooLong'),
  message: z.string().trim().min(1, 'validation.required').max(300, 'validation.tooLong'),
  website: z.string().max(200).optional(),
});
export type PublicBlessingInput = z.infer<typeof publicBlessingSchema>;

export interface BlessingDto {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

/** Normalized identity used to recognise a repeated response from the same person. */
export function rsvpDedupeKey(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // Arabic diacritics and tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Private: only ever returned to the invitation owner. */
export interface GuestDto {
  id: string;
  name: string;
  phone: string | null;
  groupName: string | null;
  maxAttendees: number;
  notes: string | null;
  status: GuestStatus;
  attendeesCount: number;
  createdAt: string;
  /** A reply from someone who is not on the guest list: shown read-only, counted in the totals. */
  fromInvite?: boolean;
}

export interface GuestSummary {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
  /** People attending, summed over accepted responses (including walk-in responders). */
  attendees: number;
}

/** Private: a response as seen by the host. */
export interface RsvpDto {
  id: string;
  name: string;
  response: RsvpResponse;
  attendeesCount: number;
  message: string | null;
  guestId: string | null;
  respondedAt: string;
}

/** What anyone with the link may see. Contains no guest, owner or payment data. */
export interface PublicInvitationDto {
  slug: string;
  contentLocale: 'ar' | 'en';
  eventDate: string | null;
  categorySlug: string;
  content: InvitationContentData;
  design: TemplateDesign;
  /** True on the free plan: the page shows a watermark and stops working at `expiresAt`. */
  watermark: boolean;
  expiresAt: string | null;
  rsvp: {
    enabled: boolean;
    askAttendees: boolean;
    maxPerResponse: number;
    deadline: string | null;
    closed: boolean;
  };
}
