import { Router } from 'express';
import {
  invitationContentSchema,
  publicBlessingSchema,
  publicRsvpSchema,
  rsvpDedupeKey,
  templateDesignSchema,
  type PublicInvitationDto,
} from '@invite/shared';
import { AppError, notFound, parseInput } from '../../lib/errors.js';
import { isLive } from '../../lib/free-plan.js';
import { prisma } from '../../lib/prisma.js';
import { createRateLimiter } from '../../middleware/security.js';

/**
 * Unauthenticated endpoints for invitation recipients. They expose only what the host chose to
 * publish: no guest records, phone numbers, notes, owner details or payment data.
 */
export const publicRouter = Router();

// Per client IP; a venue Wi-Fi shared by many guests still has plenty of headroom.
const rsvpLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 30 });

const viewLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 120 });

async function findPublished(slug: string) {
  const row = await prisma.invitation.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: { template: true, category: true },
  });
  if (!row) throw notFound('Invitation not found');
  // A free-plan invitation stops working when its time is up; the owner can upgrade to bring it back.
  if (!isLive(row)) throw new AppError(410, 'EXPIRED', 'This invitation has ended');
  return row;
}

publicRouter.get('/invitations/:slug', async (req, res) => {
  const row = await findPublished(String(req.params.slug));
  const content = invitationContentSchema.parse(row.contentJson);
  // Published invitations render from their own snapshot, so later template edits never change them.
  const design = templateDesignSchema.parse(row.templateSnapshot ?? row.template.designConfig);
  const deadline = row.rsvpDeadline;

  const data: PublicInvitationDto = {
    slug: row.slug,
    contentLocale: row.contentLocale === 'en' ? 'en' : 'ar',
    eventDate: row.eventDate ? row.eventDate.toISOString().slice(0, 10) : null,
    categorySlug: row.category.slug,
    content,
    design,
    watermark: row.expiresAt !== null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    rsvp: {
      enabled: content.rsvp.enabled,
      askAttendees: content.rsvp.askAttendees,
      maxPerResponse: content.rsvp.maxPerResponse,
      deadline: deadline ? deadline.toISOString().slice(0, 10) : null,
      closed: Boolean(deadline && deadline.getTime() < Date.now()),
    },
  };
  res.set('Cache-Control', 'no-cache');
  res.json({ data });
});

/**
 * Counts one page open. Called once per browser session by the page itself; it stores a number only,
 * never an IP address, user agent or any other visitor identifier.
 */
publicRouter.post('/invitations/:slug/view', viewLimiter, async (req, res) => {
  await prisma.invitation.updateMany({
    where: {
      slug: String(req.params.slug),
      status: 'PUBLISHED',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });
  res.status(204).end();
});

/**
 * Duplicate rule: one response per invitation per normalized name. Submitting again with the same
 * name replaces the earlier response, so a guest can change their mind without creating duplicates.
 */
publicRouter.post('/invitations/:slug/rsvp', rsvpLimiter, async (req, res) => {
  const input = parseInput(publicRsvpSchema, req.body);
  const row = await findPublished(String(req.params.slug));

  // Honeypot: bots fill every field. Pretend success without storing anything.
  if (input.website) {
    res.status(201).json({ data: { updated: false } });
    return;
  }

  const content = invitationContentSchema.parse(row.contentJson);
  if (!content.rsvp.enabled)
    throw new AppError(409, 'RSVP_CLOSED', 'RSVPs are not enabled for this invitation');
  if (row.rsvpDeadline && row.rsvpDeadline.getTime() < Date.now()) {
    throw new AppError(409, 'RSVP_CLOSED', 'The RSVP deadline has passed');
  }

  let attendeesCount = 0;
  if (input.response === 'ACCEPTED') {
    attendeesCount = content.rsvp.askAttendees ? (input.attendeesCount ?? 1) : 1;
    if (attendeesCount > content.rsvp.maxPerResponse) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Too many attendees', {
        attendeesCount: 'validation.attendees',
      });
    }
  }

  const dedupeKey = rsvpDedupeKey(input.name);
  // Names are compared after normalization, so scan the (small) list rather than rely on SQL collation.
  const guests = await prisma.guest.findMany({
    where: { invitationId: row.id },
    select: { id: true, name: true },
  });
  const guest = guests.find((candidate) => rsvpDedupeKey(candidate.name) === dedupeKey) ?? null;

  const existing = await prisma.rsvp.findUnique({
    where: { invitationId_dedupeKey: { invitationId: row.id, dedupeKey } },
    select: { id: true },
  });
  const fields = {
    name: input.name,
    response: input.response,
    attendeesCount,
    message: input.message ?? null,
    guestId: guest?.id ?? null,
    respondedAt: new Date(),
  };
  await prisma.rsvp.upsert({
    where: { invitationId_dedupeKey: { invitationId: row.id, dedupeKey } },
    update: fields,
    create: { ...fields, invitationId: row.id, dedupeKey },
  });

  // The reply never echoes stored data or reveals whether the name matched a guest.
  res.status(existing ? 200 : 201).json({ data: { updated: Boolean(existing) } });
});

const blessingLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 10 });
const MAX_BLESSINGS = 500;

/** The guestbook: the congratulations guests left, newest first. Names and messages only. */
publicRouter.get('/invitations/:slug/blessings', viewLimiter, async (req, res) => {
  const row = await findPublished(String(req.params.slug));
  const rows = await prisma.blessing.findMany({
    where: { invitationId: row.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, name: true, message: true, createdAt: true },
  });
  res.set('Cache-Control', 'no-cache');
  res.json({ data: rows.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })) });
});

publicRouter.post('/invitations/:slug/blessings', blessingLimiter, async (req, res) => {
  const input = parseInput(publicBlessingSchema, req.body);
  const row = await findPublished(String(req.params.slug));
  if (input.website) {
    res.status(201).json({ data: { ok: true } });
    return;
  }
  const content = invitationContentSchema.parse(row.contentJson);
  if (!content.sections.guestbook)
    throw new AppError(409, 'RSVP_CLOSED', 'The guestbook is switched off');
  if ((await prisma.blessing.count({ where: { invitationId: row.id } })) >= MAX_BLESSINGS) {
    throw new AppError(409, 'RSVP_CLOSED', 'The guestbook is full');
  }
  await prisma.blessing.create({
    data: { invitationId: row.id, name: input.name, message: input.message },
  });
  res.status(201).json({ data: { ok: true } });
});
