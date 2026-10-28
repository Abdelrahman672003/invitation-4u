import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import {
  FREE_PLAN,
  GUEST_STATUS_FILTERS,
  guestInputSchema,
  guestUpdateSchema,
  rsvpDedupeKey,
  type GuestDto,
  type GuestSummary,
  type RsvpDto,
} from '@invite/shared';
import { AppError, notFound, parseInput } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';

/**
 * Guest list and responses for one invitation. Everything here is owner-only: guest names,
 * phone numbers and notes are private and never reach the public endpoints.
 */
export const guestsRouter = Router({ mergeParams: true });
guestsRouter.use(requireAuth);

const uuid = z.string().uuid();

async function ownedInvitationId(req: {
  params: Record<string, string>;
  auth?: { user: { id: string } };
}) {
  const id = parseInput(uuid, req.params.id);
  const found = await prisma.invitation.findFirst({
    where: { id, ownerId: req.auth!.user.id },
    select: { id: true },
  });
  if (!found) throw notFound('Invitation not found');
  return found.id;
}

type GuestRow = Prisma.GuestGetPayload<{ include: { rsvps: true } }>;

function toGuestDto(row: GuestRow): GuestDto {
  const rsvp = row.rsvps[0];
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    groupName: row.groupName,
    maxAttendees: row.maxAttendees,
    notes: row.notes,
    status: rsvp ? rsvp.response : 'PENDING',
    attendeesCount: rsvp && rsvp.response === 'ACCEPTED' ? rsvp.attendeesCount : 0,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Attaches earlier public responses to a guest whose name matches (same rule as the RSVP form). */
async function linkResponses(invitationId: string) {
  const guests = await prisma.guest.findMany({
    where: { invitationId },
    select: { id: true, name: true },
  });
  for (const guest of guests) {
    await prisma.rsvp.updateMany({
      where: { invitationId, dedupeKey: rsvpDedupeKey(guest.name), guestId: null },
      data: { guestId: guest.id },
    });
  }
}

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(GUEST_STATUS_FILTERS).optional(),
  group: z.string().trim().max(60).optional(),
});

guestsRouter.get('/guests', async (req, res) => {
  const invitationId = await ownedInvitationId(req);
  const query = parseInput(listQuery, req.query);

  const rows = await prisma.guest.findMany({
    where: { invitationId },
    orderBy: [{ name: 'asc' }],
    include: { rsvps: { orderBy: { respondedAt: 'desc' }, take: 1 } },
  });

  // Filtering happens in memory: guest lists are small and SQLite LIKE is not Unicode case-aware.
  const needle = query.q ? rsvpDedupeKey(query.q) : null;
  const listed = rows.map(toGuestDto);
  // People who answered on the public page but are not on the list still count: they appear as
  // read-only rows so the totals match what is actually happening on the invitation.
  const walkIns = await prisma.rsvp.findMany({
    where: { invitationId, guestId: null },
    orderBy: { respondedAt: 'desc' },
  });
  const walkInGuests: GuestDto[] = walkIns.map((rsvp) => ({
    id: `reply-${rsvp.id}`,
    name: rsvp.name,
    phone: null,
    groupName: null,
    maxAttendees: rsvp.attendeesCount,
    notes: rsvp.message,
    status: rsvp.response,
    attendeesCount: rsvp.response === 'ACCEPTED' ? rsvp.attendeesCount : 0,
    createdAt: rsvp.respondedAt.toISOString(),
    fromInvite: true,
  }));
  const all = [...listed, ...walkInGuests];
  const filtered = all.filter(
    (guest) =>
      (!needle || rsvpDedupeKey(guest.name).includes(needle)) &&
      (!query.status || guest.status === query.status) &&
      (!query.group || guest.groupName === query.group),
  );

  const summary: GuestSummary = {
    total: all.length,
    accepted: all.filter((guest) => guest.status === 'ACCEPTED').length,
    declined: all.filter((guest) => guest.status === 'DECLINED').length,
    pending: all.filter((guest) => guest.status === 'PENDING').length,
    attendees: 0,
  };
  const attendees = await prisma.rsvp.aggregate({
    where: { invitationId, response: 'ACCEPTED' },
    _sum: { attendeesCount: true },
  });
  summary.attendees = attendees._sum.attendeesCount ?? 0;

  const groups = [
    ...new Set(all.map((guest) => guest.groupName).filter((name): name is string => Boolean(name))),
  ].sort();
  res.json({ data: filtered, summary, groups });
});

guestsRouter.post('/guests', async (req, res) => {
  const invitationId = await ownedInvitationId(req);
  const input = parseInput(guestInputSchema, req.body);
  // Free-plan invitations have a smaller guest list.
  const plan = await prisma.invitation.findUniqueOrThrow({
    where: { id: invitationId },
    select: { expiresAt: true },
  });
  if (
    plan.expiresAt &&
    (await prisma.guest.count({ where: { invitationId } })) >= FREE_PLAN.maxGuests
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Too many guests for the free plan', {
      plan: 'validation.tooManyGuests',
    });
  }
  const created = await prisma.guest.create({
    data: {
      invitationId,
      name: input.name,
      phone: input.phone ?? null,
      groupName: input.groupName ?? null,
      maxAttendees: input.maxAttendees,
      notes: input.notes ?? null,
    },
  });
  await linkResponses(invitationId);
  const row = await prisma.guest.findUniqueOrThrow({
    where: { id: created.id },
    include: { rsvps: { orderBy: { respondedAt: 'desc' }, take: 1 } },
  });
  res.status(201).json({ data: toGuestDto(row) });
});

guestsRouter.patch('/guests/:guestId', async (req, res) => {
  const invitationId = await ownedInvitationId(req);
  const guestId = parseInput(uuid, req.params.guestId);
  const input = parseInput(guestUpdateSchema, req.body);
  const existing = await prisma.guest.findFirst({ where: { id: guestId, invitationId } });
  if (!existing) throw notFound('Guest not found');

  await prisma.guest.update({
    where: { id: guestId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(req.body && 'phone' in req.body && { phone: input.phone ?? null }),
      ...(req.body && 'groupName' in req.body && { groupName: input.groupName ?? null }),
      ...(input.maxAttendees !== undefined && { maxAttendees: input.maxAttendees }),
      ...(req.body && 'notes' in req.body && { notes: input.notes ?? null }),
    },
  });
  await linkResponses(invitationId);
  const row = await prisma.guest.findUniqueOrThrow({
    where: { id: guestId },
    include: { rsvps: { orderBy: { respondedAt: 'desc' }, take: 1 } },
  });
  res.json({ data: toGuestDto(row) });
});

guestsRouter.delete('/guests/:guestId', async (req, res) => {
  const invitationId = await ownedInvitationId(req);
  const guestId = parseInput(uuid, req.params.guestId);
  const result = await prisma.guest.deleteMany({ where: { id: guestId, invitationId } });
  if (result.count === 0) throw notFound('Guest not found');
  res.status(204).end();
});

guestsRouter.get('/rsvps', async (req, res) => {
  const invitationId = await ownedInvitationId(req);
  const rows = await prisma.rsvp.findMany({
    where: { invitationId },
    orderBy: { respondedAt: 'desc' },
  });
  const data: RsvpDto[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    response: row.response,
    attendeesCount: row.attendeesCount,
    message: row.message,
    guestId: row.guestId,
    respondedAt: row.respondedAt.toISOString(),
  }));
  res.json({ data });
});
