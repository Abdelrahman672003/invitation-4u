import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { PaymentStatus, Prisma } from '@prisma/client';
import {
  createInvitationSchema,
  emptyInvitationContent,
  invitationContentSchema,
  templateDesignSchema,
  updateInvitationSchema,
  DEFAULT_LOCALE,
  FREE_PLAN,
  publishReadiness,
  type InvitationDto,
  type InvitationStats,
  usesPremiumDesign,
} from '@invite/shared';
import { recordAudit } from '../../lib/audit.js';
import { freeExpiry, isLive } from '../../lib/free-plan.js';
import { AppError, notFound, parseInput } from '../../lib/errors.js';
import { hasPaid } from '../payments/payments.service.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';

export const invitationsRouter = Router();
invitationsRouter.use(requireAuth);

const include = {
  template: { include: { category: true } },
  category: true,
  subtype: true,
} satisfies Prisma.InvitationInclude;
type Row = Prisma.InvitationGetPayload<{ include: typeof include }>;

type PaymentInfo = { paid: boolean; status: PaymentStatus | null };
const noPayment: PaymentInfo = { paid: false, status: null };
const noStats: InvitationStats = { guests: 0, accepted: 0, declined: 0, attendees: 0 };

function toDto(
  row: Row,
  stats: InvitationStats = noStats,
  payment: PaymentInfo = noPayment,
): InvitationDto {
  const design = templateDesignSchema.parse(row.template.designConfig);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    revision: row.revision,
    contentLocale: row.contentLocale === 'en' ? 'en' : 'ar',
    eventDate: row.eventDate ? row.eventDate.toISOString().slice(0, 10) : null,
    // Stored content was validated on write; parsing again fills defaults for older rows.
    rsvpDeadline: row.rsvpDeadline ? row.rsvpDeadline.toISOString().slice(0, 10) : null,
    content: invitationContentSchema.parse(row.contentJson),
    stats,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    expired: row.status === 'PUBLISHED' && !isLive(row),
    freeUsed: row.freeUsedAt !== null,
    views: row.viewCount,
    paid: payment.paid,
    premiumUnlocked: false,
    paymentStatus: payment.status,
    categorySlug: row.category.slug,
    subtypeSlug: row.subtype?.slug ?? null,
    template: {
      id: row.template.id,
      slug: row.template.slug,
      categorySlug: row.template.category.slug,
      nameEn: row.template.nameEn,
      nameAr: row.template.nameAr,
      descriptionEn: row.template.descriptionEn,
      descriptionAr: row.template.descriptionAr,
      isPremium: row.template.isPremium,
      design,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

/** Guest and response counts for a set of invitations, in two grouped queries. */
async function statsFor(ids: string[]): Promise<Map<string, InvitationStats>> {
  const map = new Map<string, InvitationStats>(ids.map((id) => [id, { ...noStats }]));
  const [guests, rsvps] = await Promise.all([
    prisma.guest.groupBy({
      by: ['invitationId'],
      where: { invitationId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.rsvp.groupBy({
      by: ['invitationId', 'response'],
      where: { invitationId: { in: ids } },
      _count: { _all: true },
      _sum: { attendeesCount: true },
    }),
  ]);
  for (const row of guests) map.get(row.invitationId)!.guests = row._count._all;
  for (const row of rsvps) {
    const stats = map.get(row.invitationId)!;
    if (row.response === 'ACCEPTED') {
      stats.accepted = row._count._all;
      stats.attendees = row._sum.attendeesCount ?? 0;
    } else {
      stats.declined = row._count._all;
    }
  }
  return map;
}

async function paymentsFor(ids: string[]): Promise<Map<string, PaymentInfo>> {
  const rows = await prisma.payment.findMany({
    where: { invitationId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    select: { invitationId: true, status: true },
  });
  const map = new Map<string, PaymentInfo>();
  for (const row of rows) {
    if (!row.invitationId) continue;
    const info = map.get(row.invitationId) ?? { paid: false, status: row.status };
    if (row.status === 'SUCCEEDED') info.paid = true;
    map.set(row.invitationId, info);
  }
  return map;
}

/**
 * Whether the owners may use premium design tools (own poster, whole-page colours): admins always,
 * and customers who already paid for a package that includes premium templates.
 */
async function premiumOwners(ownerIds: string[]): Promise<Set<string>> {
  const [admins, paid] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ownerIds }, role: 'ADMIN' }, select: { id: true } }),
    prisma.payment.findMany({
      where: { userId: { in: ownerIds }, status: 'SUCCEEDED' },
      select: { userId: true, package: { select: { features: true } } },
    }),
  ]);
  const result = new Set(admins.map((user) => user.id));
  for (const payment of paid) {
    const features = (payment.package.features ?? {}) as { premiumTemplates?: boolean };
    if (features.premiumTemplates === true) result.add(payment.userId);
  }
  return result;
}

async function present(rows: Row[]): Promise<InvitationDto[]> {
  const ids = rows.map((row) => row.id);
  const [stats, payments, premium] = await Promise.all([
    statsFor(ids),
    paymentsFor(ids),
    premiumOwners([...new Set(rows.map((row) => row.ownerId))]),
  ]);
  return rows.map((row) => ({
    ...toDto(row, stats.get(row.id), payments.get(row.id)),
    premiumUnlocked: premium.has(row.ownerId),
  }));
}

/** Owner-scoped lookup. Another user's invitation is indistinguishable from a missing one. */
async function loadOwned(id: string, ownerId: string) {
  const row = await prisma.invitation.findFirst({ where: { id, ownerId }, include });
  if (!row) throw notFound('Invitation not found');
  return row;
}

const idParam = z.string().uuid();

/** Event dates are stored as noon UTC so the calendar day is the same in every timezone. */
const toEventDate = (value: string) => new Date(`${value}T12:00:00.000Z`);

/** RSVP deadlines are inclusive: they close at the end of the chosen day (UTC). */
const endOfDay = (value: string) => new Date(`${value}T23:59:59.999Z`);

function newSlug(categorySlug: string) {
  return `${categorySlug}-${randomBytes(5).toString('hex')}`;
}

async function activeTemplate(slug: string) {
  const template = await prisma.template.findFirst({
    where: { slug, status: 'ACTIVE', category: { enabled: true } },
    include: { category: true },
  });
  if (!template) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Template is not available', {
      templateSlug: 'validation.templateUnavailable',
    });
  }
  return template;
}

invitationsRouter.get('/', async (req, res) => {
  const rows = await prisma.invitation.findMany({
    where: { ownerId: req.auth!.user.id },
    orderBy: { updatedAt: 'desc' },
    include,
  });
  res.json({ data: await present(rows) });
});

invitationsRouter.post('/', async (req, res) => {
  const input = parseInput(createInvitationSchema, req.body);
  const template = await activeTemplate(input.templateSlug);

  let subtypeId: string | null = null;
  if (input.subtypeSlug) {
    const subtype = await prisma.eventSubtype.findFirst({
      where: { categoryId: template.categoryId, slug: input.subtypeSlug, enabled: true },
    });
    if (!subtype) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Unknown subtype', {
        subtypeSlug: 'validation.required',
      });
    }
    subtypeId = subtype.id;
  }

  const row = await prisma.invitation.create({
    data: {
      ownerId: req.auth!.user.id,
      categoryId: template.categoryId,
      subtypeId,
      templateId: template.id,
      templateVersion: template.version,
      title: input.title,
      slug: newSlug(template.category.slug),
      contentJson: emptyInvitationContent(input.title),
      contentLocale: input.locale ?? req.auth!.user.locale ?? DEFAULT_LOCALE,
    },
    include,
  });
  res.status(201).json({ data: toDto(row) });
});

invitationsRouter.get('/:id', async (req, res) => {
  const row = await loadOwned(parseInput(idParam, req.params.id), req.auth!.user.id);
  res.json({ data: (await present([row]))[0] });
});

invitationsRouter.patch('/:id', async (req, res) => {
  const id = parseInput(idParam, req.params.id);
  const input = parseInput(updateInvitationSchema, req.body);
  const ownerId = req.auth!.user.id;
  const current = await loadOwned(id, ownerId);

  if (current.status === 'ARCHIVED') {
    throw new AppError(409, 'CONFLICT', 'Archived invitations cannot be edited');
  }

  const data: Prisma.InvitationUncheckedUpdateManyInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.content !== undefined) data.contentJson = input.content;
  if (input.contentLocale !== undefined) data.contentLocale = input.contentLocale;
  if (input.eventDate !== undefined) {
    data.eventDate = input.eventDate === null ? null : toEventDate(input.eventDate);
  }
  if (input.rsvpDeadline !== undefined) {
    data.rsvpDeadline = input.rsvpDeadline === null ? null : endOfDay(input.rsvpDeadline);
  }
  if (input.templateSlug !== undefined && input.templateSlug !== current.template.slug) {
    const template = await activeTemplate(input.templateSlug);
    // Content is template-independent, so switching keeps every field; only the category must match.
    if (template.categoryId !== current.categoryId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Template belongs to another category', {
        templateSlug: 'validation.templateUnavailable',
      });
    }
    data.templateId = template.id;
    data.templateVersion = template.version;
    // Published invitations keep rendering from their own copy of the design.
    if (current.status === 'PUBLISHED')
      data.templateSnapshot = templateDesignSchema.parse(template.designConfig);
  }

  // Compare-and-swap on the revision so a slow, older autosave can never overwrite newer content.
  const result = await prisma.invitation.updateMany({
    where: { id, ownerId, revision: input.baseRevision, status: { not: 'ARCHIVED' } },
    data: { ...data, revision: { increment: 1 } },
  });
  if (result.count === 0) {
    throw new AppError(
      409,
      'STALE_REVISION',
      'The invitation was changed elsewhere. Reload to continue.',
    );
  }
  res.json({ data: (await present([await loadOwned(id, ownerId)]))[0] });
});

// Lifecycle here is only DRAFT <-> ARCHIVED. Publishing is added with payments (milestone 6).
invitationsRouter.post('/:id/archive', async (req, res) => {
  const id = parseInput(idParam, req.params.id);
  const current = await loadOwned(id, req.auth!.user.id);
  if (current.status !== 'DRAFT' && current.status !== 'UNPUBLISHED') {
    throw new AppError(409, 'CONFLICT', 'Unpublish the invitation before archiving it');
  }
  await prisma.invitation.update({
    where: { id },
    data: { status: 'ARCHIVED', archivedAt: new Date() },
  });
  res.json({ data: (await present([await loadOwned(id, req.auth!.user.id)]))[0] });
});

/**
 * Permanent deletion, for invitations that were never paid for. The guest list and replies go with it
 * and the public link stops working for good. Paid invitations are kept: they are tied to a payment record.
 */
invitationsRouter.delete('/:id', async (req, res) => {
  const id = parseInput(idParam, req.params.id);
  const current = await loadOwned(id, req.auth!.user.id);
  const paid = await prisma.payment.count({
    where: { invitationId: id, status: { in: ['SUCCEEDED', 'REFUNDED'] } },
  });
  if (paid > 0) throw new AppError(409, 'CONFLICT', 'A paid invitation cannot be deleted');
  await prisma.$transaction(async (tx) => {
    // A checkout that was never completed must not be completable after the invitation is gone.
    await tx.payment.updateMany({
      where: { invitationId: id, status: 'PENDING' },
      data: { status: 'CANCELLED', failureReason: 'invitation_deleted' },
    });
    await tx.invitation.delete({ where: { id } });
    await recordAudit(
      {
        actorId: req.auth!.user.id,
        action: 'invitation.deleted',
        entityType: 'invitation',
        entityId: id,
        metadata: { title: current.title, status: current.status },
      },
      tx,
    );
  });
  res.status(204).end();
});

invitationsRouter.post('/:id/restore', async (req, res) => {
  const id = parseInput(idParam, req.params.id);
  const current = await loadOwned(id, req.auth!.user.id);
  if (current.status !== 'ARCHIVED')
    throw new AppError(409, 'CONFLICT', 'Invitation is not archived');
  await prisma.invitation.update({ where: { id }, data: { status: 'DRAFT', archivedAt: null } });
  res.json({ data: (await present([await loadOwned(id, req.auth!.user.id)]))[0] });
});

// Publishing. A paid invitation publishes for good. Otherwise this starts the built-in free plan:
// 48 hours, watermarked, once per invitation, a few per account, non-premium templates only.
invitationsRouter.post('/:id/publish', async (req, res) => {
  const id = parseInput(idParam, req.params.id);
  const current = await loadOwned(id, req.auth!.user.id);
  if (current.status !== 'DRAFT' && current.status !== 'UNPUBLISHED') {
    throw new AppError(
      409,
      'CONFLICT',
      'This invitation cannot be published from its current state',
    );
  }
  const problems = publishReadiness(
    invitationContentSchema.parse(current.contentJson),
    current.eventDate ? current.eventDate.toISOString().slice(0, 10) : null,
  );
  if (Object.keys(problems).length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'The invitation is not ready to publish', problems);
  }
  const paid = await hasPaid(id);
  let expiresAt: Date | null = null;
  let freeUsedAt = current.freeUsedAt;
  if (!paid) {
    // A premium template, or the customer's own Design Studio poster, needs the premium package.
    const ownDesign = usesPremiumDesign(invitationContentSchema.parse(current.contentJson));
    if (current.template.isPremium || ownDesign) {
      throw new AppError(402, 'PAYMENT_REQUIRED', 'Premium templates need a paid package', {
        plan: 'validation.premiumRequired',
      });
    }
    if (current.freeUsedAt)
      throw new AppError(
        402,
        'PAYMENT_REQUIRED',
        'The free plan was already used for this invitation',
      );
    const guests = await prisma.guest.count({ where: { invitationId: id } });
    if (guests > FREE_PLAN.maxGuests) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Too many guests for the free plan', {
        plan: 'validation.tooManyGuests',
      });
    }
    const used = await prisma.invitation.count({
      where: { ownerId: req.auth!.user.id, freeUsedAt: { not: null } },
    });
    if (used >= FREE_PLAN.maxPerAccount) {
      throw new AppError(
        402,
        'PAYMENT_REQUIRED',
        'The free plan limit for this account has been reached',
      );
    }
    freeUsedAt = new Date();
    expiresAt = freeExpiry(freeUsedAt);
  }
  await prisma.invitation.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: current.publishedAt ?? new Date(),
      unpublishedAt: null,
      expiresAt,
      freeUsedAt,
      templateSnapshot: templateDesignSchema.parse(current.template.designConfig),
    },
  });
  res.json({ data: (await present([await loadOwned(id, req.auth!.user.id)]))[0] });
});

invitationsRouter.post('/:id/unpublish', async (req, res) => {
  const id = parseInput(idParam, req.params.id);
  const current = await loadOwned(id, req.auth!.user.id);
  if (current.status !== 'PUBLISHED')
    throw new AppError(409, 'CONFLICT', 'Invitation is not published');
  await prisma.invitation.update({
    where: { id },
    data: { status: 'UNPUBLISHED', unpublishedAt: new Date() },
  });
  res.json({ data: (await present([await loadOwned(id, req.auth!.user.id)]))[0] });
});
