export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';
export const RTL_LOCALES: readonly Locale[] = ['ar'];

export const ROLES = ['CUSTOMER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const INVITATION_STATUSES = [
  'DRAFT',
  'PENDING_PAYMENT',
  'PUBLISHED',
  'UNPUBLISHED',
  'ARCHIVED',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const TEMPLATE_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const RSVP_RESPONSES = ['ACCEPTED', 'DECLINED'] as const;
export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

export const CATEGORY_SLUGS = ['wedding', 'birthday', 'engagement-bridal', 'graduation'] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const API_BASE_PATH = '/api/v1';

/** The built-in free plan: a short, watermarked trial of a published invitation. Not a database package. */
export const FREE_PLAN = {
  durationHours: 48,
  maxGuests: 30,
  /** Free publications per account, so the plan cannot be used as unlimited free hosting. */
  maxPerAccount: 3,
} as const;
