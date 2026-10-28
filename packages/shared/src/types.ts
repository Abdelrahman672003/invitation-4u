import type { InvitationStatus, Locale, PaymentStatus, Role } from './constants.js';
import type { InvitationContentData } from './schemas/invitation.js';
import type { TemplateDto } from './schemas/template.js';

/** The current user as returned by GET /me. Never includes credentials. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  locale: Locale;
  createdAt: string;
}

export interface EventSubtypeDto {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
}

export interface EventCategoryDto {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  subtypes: EventSubtypeDto[];
}

export interface AdminOverviewDto {
  customers: number;
  invitations: number;
  publishedInvitations: number;
  payments: Record<string, number>;
  /** Sum of successful payments, in minor units (EGP piasters). */
  revenueMinor: number;
  /** Webhook events that failed processing and need reconciliation. */
  failedWebhooks: number;
  /** Customers who signed up in the last 7 days. */
  newCustomers7d: number;
  /** Successful revenue in the last 30 days, in minor units. */
  revenue30dMinor: number;
  /** Invitations that have a successful payment. */
  paidInvitations: number;
  invitationsByStatus: Record<string, number>;
  /** Share of invitations that were paid for, 0 to 100. */
  conversionPercent: number;
  totals: {
    guests: number;
    accepted: number;
    declined: number;
    attendees: number;
    blessings: number;
    views: number;
    templates: number;
    premiumTemplates: number;
  };
  invitationsByCategory: { nameEn: string; nameAr: string; count: number }[];
  topTemplates: { slug: string; nameEn: string; nameAr: string; count: number }[];
  /** The last 14 days, oldest first. */
  daily: { date: string; signups: number; invitations: number; revenueMinor: number }[];
  recentInvitations: {
    id: string;
    title: string;
    ownerEmail: string;
    status: string;
    updatedAt: string;
  }[];
  recentPayments: {
    id: string;
    email: string;
    amountMinor: number;
    currency: string;
    status: string;
    createdAt: string;
  }[];
}

export interface PackageDto {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  priceMinor: number;
  currency: string;
  premiumTemplates: boolean;
  maxGuests: number | null;
}

export interface InvitationDto {
  id: string;
  slug: string;
  title: string;
  status: InvitationStatus;
  revision: number;
  contentLocale: Locale;
  /** YYYY-MM-DD or null. */
  eventDate: string | null;
  /** Last day RSVPs are accepted (YYYY-MM-DD) or null. */
  rsvpDeadline: string | null;
  content: InvitationContentData;
  stats: InvitationStats;
  /** Free-plan end time (ISO) while the invitation is on the free plan; null for paid or unpublished. */
  expiresAt: string | null;
  /** True when the free plan has ended; the public page no longer opens. */
  expired: boolean;
  /** True once the one free publication of this invitation has been used. */
  freeUsed: boolean;
  /** Times the public page was opened (aggregate only; no visitor data is kept). */
  views: number;
  /** True once a payment for this invitation has succeeded; republishing is then free. */
  paid: boolean;
  /** Whether this owner may use premium design tools (own poster, page colours). */
  premiumUnlocked: boolean;
  /** Status of the most recent payment attempt, if any. */
  paymentStatus: PaymentStatus | null;
  categorySlug: string;
  subtypeSlug: string | null;
  template: TemplateDto;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface InvitationStats {
  guests: number;
  accepted: number;
  declined: number;
  attendees: number;
}

export interface PaymentDto {
  id: string;
  invitationId: string | null;
  invitationTitle: string | null;
  packageCode: string;
  packageNameEn: string;
  packageNameAr: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  createdAt: string;
  paidAt: string | null;
}
