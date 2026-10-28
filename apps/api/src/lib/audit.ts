import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Records a sensitive action. Pass a transaction client to keep it atomic with the change. */
export function recordAudit(entry: AuditEntry, client: Prisma.TransactionClient = prisma) {
  return client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata,
    },
  });
}
