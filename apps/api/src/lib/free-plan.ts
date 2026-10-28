import { FREE_PLAN } from '@invite/shared';

/** True while a published invitation may be opened: paid ones always, free ones until they expire. */
export function isLive(row: { status: string; expiresAt: Date | null }, now = new Date()) {
  return row.status === 'PUBLISHED' && (!row.expiresAt || row.expiresAt.getTime() > now.getTime());
}

export const freeExpiry = (from = new Date()) =>
  new Date(from.getTime() + FREE_PLAN.durationHours * 60 * 60 * 1000);
