import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import {
  INVITATION_STATUSES,
  PAYMENT_STATUSES,
  TEMPLATE_STATUSES,
  ROLES,
  templateDesignSchema,
  type AdminOverviewDto,
} from '@invite/shared';
import { AppError, notFound, parseInput } from '../../lib/errors.js';
import { recordAudit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { requireRole } from '../../middleware/auth.js';
import {
  paymentWithRelations,
  reconcilePayment,
  refundPayment,
  toPaymentDto,
} from '../payments/payments.service.js';

export const adminRouter = Router();

// Server-side boundary for every admin endpoint.
adminRouter.use(requireRole('ADMIN'));

const uuid = z.string().uuid();
const search = z.string().trim().max(100).optional();
const actor = (req: { auth?: { user: { id: string } } }) => req.auth!.user.id;

// ---------- Overview ----------

const DAY = 24 * 60 * 60 * 1000;

adminRouter.get('/overview', async (_req, res) => {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * DAY);
  const monthAgo = new Date(now - 30 * DAY);
  const since = new Date(now - 13 * DAY);
  since.setUTCHours(0, 0, 0, 0);

  const [
    customers,
    newCustomers7d,
    invitations,
    statusGroups,
    paymentGroups,
    revenue,
    revenue30d,
    failedWebhooks,
    paidGroups,
    guests,
    rsvpGroups,
    attendees,
    blessings,
    views,
    templates,
    premiumTemplates,
    categories,
    templateUsage,
    recentInvites,
    recentPays,
    recentUsers,
    recentInviteDates,
    recentPaid,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: weekAgo } } }),
    prisma.invitation.count(),
    prisma.invitation.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amountMinor: true } }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED', createdAt: { gte: monthAgo } },
      _sum: { amountMinor: true },
    }),
    prisma.webhookEvent.count({ where: { processingStatus: 'FAILED' } }),
    prisma.payment.groupBy({
      by: ['invitationId'],
      where: { status: 'SUCCEEDED', invitationId: { not: null } },
    }),
    prisma.guest.count(),
    prisma.rsvp.groupBy({ by: ['response'], _count: { _all: true } }),
    prisma.rsvp.aggregate({ where: { response: 'ACCEPTED' }, _sum: { attendeesCount: true } }),
    prisma.blessing.count(),
    prisma.invitation.aggregate({ _sum: { viewCount: true } }),
    prisma.template.count(),
    prisma.template.count({ where: { isPremium: true } }),
    prisma.eventCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { nameEn: true, nameAr: true, _count: { select: { invitations: true } } },
    }),
    prisma.template.findMany({
      orderBy: { invitations: { _count: 'desc' } },
      take: 5,
      select: { slug: true, nameEn: true, nameAr: true, _count: { select: { invitations: true } } },
    }),
    prisma.invitation.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: { owner: { select: { email: true } } },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
    prisma.user.findMany({
      where: { role: 'CUSTOMER', createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.invitation.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.payment.findMany({
      where: { status: 'SUCCEEDED', createdAt: { gte: since } },
      select: { createdAt: true, amountMinor: true },
    }),
  ]);

  const dayKey = (date: Date) => date.toISOString().slice(0, 10);
  const daily = Array.from({ length: 14 }, (_, index) => ({
    date: dayKey(new Date(since.getTime() + index * DAY)),
    signups: 0,
    invitations: 0,
    revenueMinor: 0,
  }));
  const slot = (date: Date) => daily.find((entry) => entry.date === dayKey(date));
  for (const row of recentUsers) {
    const entry = slot(row.createdAt);
    if (entry) entry.signups += 1;
  }
  for (const row of recentInviteDates) {
    const entry = slot(row.createdAt);
    if (entry) entry.invitations += 1;
  }
  for (const row of recentPaid) {
    const entry = slot(row.createdAt);
    if (entry) entry.revenueMinor += row.amountMinor;
  }

  const rsvp = Object.fromEntries(rsvpGroups.map((group) => [group.response, group._count._all]));
  const paidInvitations = paidGroups.length;
  const data: AdminOverviewDto = {
    customers,
    invitations,
    publishedInvitations:
      statusGroups.find((group) => group.status === 'PUBLISHED')?._count._all ?? 0,
    payments: Object.fromEntries(paymentGroups.map((group) => [group.status, group._count._all])),
    revenueMinor: revenue._sum.amountMinor ?? 0,
    failedWebhooks,
    newCustomers7d,
    revenue30dMinor: revenue30d._sum.amountMinor ?? 0,
    paidInvitations,
    invitationsByStatus: Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    ),
    conversionPercent: invitations ? Math.round((paidInvitations / invitations) * 100) : 0,
    totals: {
      guests,
      accepted: rsvp.ACCEPTED ?? 0,
      declined: rsvp.DECLINED ?? 0,
      attendees: attendees._sum.attendeesCount ?? 0,
      blessings,
      views: views._sum.viewCount ?? 0,
      templates,
      premiumTemplates,
    },
    invitationsByCategory: categories.map((row) => ({
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      count: row._count.invitations,
    })),
    topTemplates: templateUsage.map((row) => ({
      slug: row.slug,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      count: row._count.invitations,
    })),
    daily,
    recentInvitations: recentInvites.map((row) => ({
      id: row.id,
      title: row.title,
      ownerEmail: row.owner.email,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    })),
    recentPayments: recentPays.map((row) => ({
      id: row.id,
      email: row.user.email,
      amountMinor: row.amountMinor,
      currency: row.currency,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  };
  res.json({ data });
});

// ---------- Users ----------

adminRouter.get('/users', async (req, res) => {
  const { q } = parseInput(z.object({ q: search }), req.query);
  const rows = await prisma.user.findMany({
    where: q
      ? { OR: [{ email: { contains: q.toLowerCase() } }, { name: { contains: q } }] }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { invitations: true } } },
  });
  res.json({
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      invitations: row._count.invitations,
    })),
  });
});

adminRouter.patch('/users/:id', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const { role } = parseInput(z.object({ role: z.enum(ROLES) }).strict(), req.body);
  if (id === actor(req)) throw new AppError(409, 'CONFLICT', 'You cannot change your own role');
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound('User not found');
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { role } });
    // Sessions keep working, but the role is re-read on every request, so the change is immediate.
    await recordAudit(
      {
        actorId: actor(req),
        action: 'user.role_changed',
        entityType: 'user',
        entityId: id,
        metadata: { from: existing.role, to: role },
      },
      tx,
    );
  });
  res.json({ data: { id, role } });
});

// ---------- Invitations (moderation) ----------

adminRouter.get('/invitations', async (req, res) => {
  const query = parseInput(
    z.object({ q: search, status: z.enum(INVITATION_STATUSES).optional() }),
    req.query,
  );
  const where: Prisma.InvitationWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.q && {
      OR: [
        { title: { contains: query.q } },
        { slug: { contains: query.q.toLowerCase() } },
        { owner: { email: { contains: query.q.toLowerCase() } } },
      ],
    }),
  };
  const rows = await prisma.invitation.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      owner: { select: { email: true } },
      category: true,
      template: { select: { slug: true } },
    },
  });
  res.json({ data: await presentInvitations(rows) });
});

type InvitationRow = Prisma.InvitationGetPayload<{
  include: {
    owner: { select: { email: true } };
    category: true;
    template: { select: { slug: true } };
  };
}>;

/** Which of these invitations have a successful payment (a real one or one an admin granted). */
async function presentInvitations(rows: InvitationRow[]) {
  const paidRows = await prisma.payment.findMany({
    where: { invitationId: { in: rows.map((row) => row.id) }, status: 'SUCCEEDED' },
    select: { invitationId: true },
  });
  const paid = new Set(paidRows.map((row) => row.invitationId));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    paid: paid.has(row.id),
    ownerEmail: row.owner.email,
    categorySlug: row.category.slug,
    categoryNameEn: row.category.nameEn,
    categoryNameAr: row.category.nameAr,
    templateSlug: row.template.slug,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

adminRouter.get('/users/:id/invitations', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const rows = await prisma.invitation.findMany({
    where: { ownerId: id },
    orderBy: { updatedAt: 'desc' },
    include: {
      owner: { select: { email: true } },
      category: true,
      template: { select: { slug: true } },
    },
  });
  res.json({ data: await presentInvitations(rows) });
});

// Grants a paid package without a card payment (cash, bank transfer, a gift). It is recorded as a
// zero-amount payment from the "admin" provider, so every paid-only rule applies to it as usual.
adminRouter.post('/invitations/:id/mark-paid', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const { packageCode } = parseInput(
    z.object({ packageCode: z.string().trim().min(1).max(40).default('premium') }).strict(),
    req.body ?? {},
  );
  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) throw notFound('Invitation not found');
  const pkg = await prisma.package.findUnique({ where: { code: packageCode } });
  if (!pkg) throw notFound('Package not found');
  const already = await prisma.payment.count({
    where: { invitationId: id, status: 'SUCCEEDED' },
  });
  if (already > 0) throw new AppError(409, 'CONFLICT', 'This invitation is already paid');
  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { invitationId: id, status: 'PENDING' },
      data: { status: 'CANCELLED', failureReason: 'marked_paid_by_admin' },
    });
    await tx.payment.create({
      data: {
        userId: invitation.ownerId,
        invitationId: id,
        packageId: pkg.id,
        provider: 'admin',
        providerReference: `admin-${id}`,
        amountMinor: 0,
        currency: pkg.currency,
        status: 'SUCCEEDED',
        paidAt: new Date(),
      },
    });
    await recordAudit(
      {
        actorId: actor(req),
        action: 'invitation.admin_marked_paid',
        entityType: 'invitation',
        entityId: id,
        metadata: { packageCode },
      },
      tx,
    );
  });
  res.json({ data: { id, paid: true } });
});

// Permanent deletion by an admin. Payment records are kept (they just lose the link to the invitation).
adminRouter.delete('/invitations/:id', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const existing = await prisma.invitation.findUnique({ where: { id } });
  if (!existing) throw notFound('Invitation not found');
  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { invitationId: id, status: 'PENDING' },
      data: { status: 'CANCELLED', failureReason: 'invitation_deleted' },
    });
    await tx.invitation.delete({ where: { id } });
    await recordAudit(
      {
        actorId: actor(req),
        action: 'invitation.admin_deleted',
        entityType: 'invitation',
        entityId: id,
        metadata: { title: existing.title, status: existing.status },
      },
      tx,
    );
  });
  res.status(204).end();
});

for (const action of ['unpublish', 'archive'] as const) {
  adminRouter.post(`/invitations/:id/${action}`, async (req, res) => {
    const id = parseInput(uuid, req.params.id);
    const existing = await prisma.invitation.findUnique({ where: { id } });
    if (!existing) throw notFound('Invitation not found');
    const data: Prisma.InvitationUpdateInput =
      action === 'unpublish'
        ? { status: 'UNPUBLISHED', unpublishedAt: new Date() }
        : { status: 'ARCHIVED', archivedAt: new Date() };
    if (action === 'unpublish' && existing.status !== 'PUBLISHED')
      throw new AppError(409, 'CONFLICT', 'Invitation is not published');
    if (action === 'archive' && existing.status === 'ARCHIVED')
      throw new AppError(409, 'CONFLICT', 'Invitation is already archived');
    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({ where: { id }, data });
      await recordAudit(
        {
          actorId: actor(req),
          action: `invitation.admin_${action}`,
          entityType: 'invitation',
          entityId: id,
          metadata: { from: existing.status },
        },
        tx,
      );
    });
    res.json({ data: { id, status: action === 'unpublish' ? 'UNPUBLISHED' : 'ARCHIVED' } });
  });
}

// ---------- Templates ----------

adminRouter.get('/templates', async (_req, res) => {
  const rows = await prisma.template.findMany({
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    include: { category: true, _count: { select: { invitations: true } } },
  });
  res.json({
    data: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      categorySlug: row.category.slug,
      categoryNameEn: row.category.nameEn,
      categoryNameAr: row.category.nameAr,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      status: row.status,
      isPremium: row.isPremium,
      sortOrder: row.sortOrder,
      invitations: row._count.invitations,
      custom: (row.designConfig as { theme?: string } | null)?.theme === 'custom',
    })),
  });
});

// Saves a new order for the templates of one occasion: the ids in the order they should appear.
adminRouter.post('/templates/reorder', async (req, res) => {
  const { ids } = parseInput(z.object({ ids: z.array(uuid).min(1).max(200) }).strict(), req.body);
  if (new Set(ids).size !== ids.length)
    throw new AppError(400, 'VALIDATION_ERROR', 'Duplicate templates in the new order');
  const found = await prisma.template.findMany({
    where: { id: { in: ids } },
    select: { id: true, categoryId: true },
  });
  if (found.length !== ids.length) throw notFound('Template not found');
  if (new Set(found.map((row) => row.categoryId)).size > 1)
    throw new AppError(400, 'VALIDATION_ERROR', 'Templates must belong to one occasion');
  await prisma.$transaction(async (tx) => {
    for (const [index, id] of ids.entries())
      await tx.template.update({ where: { id }, data: { sortOrder: index + 1 } });
    await recordAudit(
      {
        actorId: actor(req),
        action: 'template.reordered',
        entityType: 'template',
        metadata: { ids },
      },
      tx,
    );
  });
  res.json({ data: { ids } });
});

const templatePatch = z
  .object({
    status: z.enum(TEMPLATE_STATUSES),
    isPremium: z.boolean(),
    sortOrder: z.number().int().min(0).max(10_000),
    nameEn: z.string().trim().min(1).max(80),
    nameAr: z.string().trim().min(1).max(80),
  })
  .partial()
  .strict();

adminRouter.patch('/templates/:id', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const input = parseInput(templatePatch, req.body);
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) throw notFound('Template not found');
  // Archiving only hides the template from new invitations; published ones keep their own design snapshot.
  await prisma.$transaction(async (tx) => {
    await tx.template.update({ where: { id }, data: input });
    await recordAudit(
      {
        actorId: actor(req),
        action: 'template.updated',
        entityType: 'template',
        entityId: id,
        metadata: input,
      },
      tx,
    );
  });
  res.json({ data: { id, ...input } });
});

const builderBody = z
  .object({
    categorySlug: z.string().min(1).max(80),
    nameEn: z.string().trim().min(1).max(80),
    nameAr: z.string().trim().min(1).max(80),
    descriptionEn: z.string().trim().max(300).default(''),
    descriptionAr: z.string().trim().max(300).default(''),
    isPremium: z.boolean().default(false),
    design: templateDesignSchema,
  })
  .strict();

async function categoryBySlug(slug: string) {
  const category = await prisma.eventCategory.findUnique({ where: { slug } });
  if (!category)
    throw new AppError(400, 'VALIDATION_ERROR', 'Unknown category', {
      categorySlug: 'validation.required',
    });
  return category;
}

/** One template with its design, for the template builder. */
adminRouter.get('/templates/:id', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const row = await prisma.template.findUnique({ where: { id }, include: { category: true } });
  if (!row) throw notFound('Template not found');
  res.json({
    data: {
      id: row.id,
      slug: row.slug,
      categorySlug: row.category.slug,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      descriptionEn: row.descriptionEn ?? '',
      descriptionAr: row.descriptionAr ?? '',
      isPremium: row.isPremium,
      design: templateDesignSchema.parse(row.designConfig),
    },
  });
});

adminRouter.post('/templates', async (req, res) => {
  const input = parseInput(builderBody, req.body);
  const category = await categoryBySlug(input.categorySlug);
  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.template.aggregate({
      where: { categoryId: category.id },
      _max: { sortOrder: true },
    });
    const row = await tx.template.create({
      data: {
        categoryId: category.id,
        slug: `${category.slug}-custom-${randomBytes(4).toString('hex')}`,
        nameEn: input.nameEn,
        nameAr: input.nameAr,
        descriptionEn: input.descriptionEn,
        descriptionAr: input.descriptionAr,
        isPremium: input.isPremium,
        designConfig: input.design,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        // New artwork stays hidden until the admin activates it from the templates list.
        status: 'DRAFT',
      },
    });
    await recordAudit(
      {
        actorId: actor(req),
        action: 'template.created',
        entityType: 'template',
        entityId: row.id,
        metadata: { slug: row.slug },
      },
      tx,
    );
    return row;
  });
  res.status(201).json({ data: { id: created.id, slug: created.slug } });
});

adminRouter.put('/templates/:id', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const input = parseInput(builderBody, req.body);
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) throw notFound('Template not found');
  const category = await categoryBySlug(input.categorySlug);
  await prisma.$transaction(async (tx) => {
    await tx.template.update({
      where: { id },
      data: {
        categoryId: category.id,
        nameEn: input.nameEn,
        nameAr: input.nameAr,
        descriptionEn: input.descriptionEn,
        descriptionAr: input.descriptionAr,
        isPremium: input.isPremium,
        designConfig: input.design,
        version: { increment: 1 },
      },
    });
    await recordAudit(
      { actorId: actor(req), action: 'template.designed', entityType: 'template', entityId: id },
      tx,
    );
  });
  res.json({ data: { id } });
});

/**
 * Permanently deletes a template. A template that invitations were made from cannot be deleted,
 * because those invitations still point at it; archive it instead to hide it from new invitations.
 */
adminRouter.delete('/templates/:id', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const existing = await prisma.template.findUnique({
    where: { id },
    include: { _count: { select: { invitations: true } } },
  });
  if (!existing) throw notFound('Template not found');
  if (existing._count.invitations > 0) {
    throw new AppError(
      409,
      'CONFLICT',
      'This template is used by invitations and cannot be deleted. Archive it instead.',
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.template.delete({ where: { id } });
    await recordAudit(
      {
        actorId: actor(req),
        action: 'template.deleted',
        entityType: 'template',
        entityId: id,
        metadata: { slug: existing.slug },
      },
      tx,
    );
  });
  res.status(204).end();
});

// ---------- Categories and subtypes ----------

adminRouter.get('/categories', async (_req, res) => {
  const rows = await prisma.eventCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { subtypes: { orderBy: { sortOrder: 'asc' } } },
  });
  res.json({
    data: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      enabled: row.enabled,
      sortOrder: row.sortOrder,
      subtypes: row.subtypes.map((s) => ({
        id: s.id,
        slug: s.slug,
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        enabled: s.enabled,
      })),
    })),
  });
});

const newCategory = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(40)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'validation.slug'),
    nameEn: z.string().trim().min(1).max(60),
    nameAr: z.string().trim().min(1).max(60),
  })
  .strict();

adminRouter.post('/categories', async (req, res) => {
  const input = parseInput(newCategory, req.body);
  if (await prisma.eventCategory.findUnique({ where: { slug: input.slug } }))
    throw new AppError(409, 'CONFLICT', 'An occasion with this slug already exists');
  const last = await prisma.eventCategory.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.eventCategory.create({
    data: { ...input, sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
  await recordAudit({
    actorId: actor(req),
    action: 'category.created',
    entityType: 'category',
    entityId: created.id,
    metadata: input,
  });
  res.status(201).json({ data: { id: created.id, slug: created.slug } });
});

adminRouter.post('/categories/:id/subtypes', async (req, res) => {
  const categoryId = parseInput(uuid, req.params.id);
  const input = parseInput(newCategory, req.body);
  const category = await prisma.eventCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw notFound('Category not found');
  if (
    await prisma.eventSubtype.findUnique({
      where: { categoryId_slug: { categoryId, slug: input.slug } },
    })
  )
    throw new AppError(409, 'CONFLICT', 'This occasion already has a type with this slug');
  const last = await prisma.eventSubtype.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });
  const created = await prisma.eventSubtype.create({
    data: { ...input, categoryId, sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
  await recordAudit({
    actorId: actor(req),
    action: 'subtype.created',
    entityType: 'subtype',
    entityId: created.id,
    metadata: { ...input, categoryId },
  });
  res.status(201).json({ data: { id: created.id, slug: created.slug } });
});

const enabledPatch = z.object({ enabled: z.boolean() }).strict();

adminRouter.patch('/categories/:id', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const input = parseInput(enabledPatch, req.body);
  const result = await prisma.eventCategory.updateMany({ where: { id }, data: input });
  if (result.count === 0) throw notFound('Category not found');
  await recordAudit({
    actorId: actor(req),
    action: 'category.updated',
    entityType: 'category',
    entityId: id,
    metadata: input,
  });
  res.json({ data: { id, ...input } });
});

adminRouter.patch('/subtypes/:id', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const input = parseInput(enabledPatch, req.body);
  const result = await prisma.eventSubtype.updateMany({ where: { id }, data: input });
  if (result.count === 0) throw notFound('Subtype not found');
  await recordAudit({
    actorId: actor(req),
    action: 'subtype.updated',
    entityType: 'subtype',
    entityId: id,
    metadata: input,
  });
  res.json({ data: { id, ...input } });
});

// ---------- Packages and pricing ----------

adminRouter.get('/packages', async (_req, res) => {
  const rows = await prisma.package.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({
    data: rows.map((row) => ({
      id: row.id,
      code: row.code,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      priceMinor: row.priceMinor,
      currency: row.currency,
      enabled: row.enabled,
      features: row.features,
    })),
  });
});

const packagePatch = z
  .object({
    nameEn: z.string().trim().min(1).max(60),
    nameAr: z.string().trim().min(1).max(60),
    priceMinor: z.number().int().min(0).max(100_000_000),
    enabled: z.boolean(),
    features: z.object({
      premiumTemplates: z.boolean(),
      maxGuests: z.number().int().min(1).max(100_000).nullable(),
    }),
  })
  .partial()
  .strict();

adminRouter.patch('/packages/:id', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  const input = parseInput(packagePatch, req.body);
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) throw notFound('Package not found');
  // Existing payments keep the amount they were charged; only new checkouts use the new price.
  await prisma.$transaction(async (tx) => {
    await tx.package.update({ where: { id }, data: input });
    await recordAudit(
      {
        actorId: actor(req),
        action: 'package.updated',
        entityType: 'package',
        entityId: id,
        metadata: { ...input, previousPriceMinor: existing.priceMinor },
      },
      tx,
    );
  });
  res.json({ data: { id } });
});

// ---------- Payments ----------

adminRouter.get('/payments', async (req, res) => {
  const query = parseInput(z.object({ status: z.enum(PAYMENT_STATUSES).optional() }), req.query);
  const rows = await prisma.payment.findMany({
    where: query.status ? { status: query.status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { ...paymentWithRelations, user: { select: { email: true } } },
  });
  res.json({
    data: rows.map((row) => ({
      ...toPaymentDto(row),
      userEmail: row.user.email,
      providerReference: row.providerReference,
    })),
  });
});

adminRouter.post('/payments/:id/reconcile', async (req, res) => {
  const result = await reconcilePayment(parseInput(uuid, req.params.id), actor(req));
  res.json({ data: result });
});

/** Refunds a payment: returned through the gateway when it supports it, then the invitation goes offline. */
adminRouter.post('/payments/:id/refund', async (req, res) => {
  const id = parseInput(uuid, req.params.id);
  await refundPayment(id, actor(req));
  res.json({ data: { id, status: 'REFUNDED' } });
});

// ---------- Audit log ----------

adminRouter.get('/audit', async (_req, res) => {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { actor: { select: { email: true } } },
  });
  res.json({
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorEmail: row.actor?.email ?? null,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    })),
  });
});
