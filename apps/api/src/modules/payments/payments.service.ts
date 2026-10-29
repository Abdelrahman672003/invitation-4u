import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import {
  invitationContentSchema,
  publishReadiness,
  templateDesignSchema,
  type PaymentDto,
  usesPremiumDesign,
} from '@invite/shared';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { recordAudit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';
import { emailService } from '../../services/email.js';
import {
  getProvider,
  sign,
  type PaymentProvider,
  type ProviderEvent,
  type ProviderOutcome,
} from './provider.js';

type Tx = Prisma.TransactionClient;

const paymentInclude = {
  package: true,
  invitation: { select: { id: true, title: true } },
} satisfies Prisma.PaymentInclude;
type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

export const paymentWithRelations = paymentInclude;

export function toPaymentDto(row: PaymentRow): PaymentDto {
  return {
    id: row.id,
    invitationId: row.invitationId,
    invitationTitle: row.invitation?.title ?? null,
    packageCode: row.package.code,
    packageNameEn: row.package.nameEn,
    packageNameAr: row.package.nameAr,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  };
}

/** True when the invitation has an unrefunded successful payment, so (re)publishing needs no new one. */
export async function hasPaid(invitationId: string, client: Tx | typeof prisma = prisma) {
  const count = await client.payment.count({ where: { invitationId, status: 'SUCCEEDED' } });
  return count > 0;
}

/** Publishes an invitation if it is complete. Returns whether it was published. */
export async function publishIfReady(
  tx: Tx,
  invitationId: string,
  actorId: string | null,
): Promise<boolean> {
  const invitation = await tx.invitation.findUnique({
    where: { id: invitationId },
    include: { template: true },
  });
  if (!invitation) return false;
  if (!['DRAFT', 'PENDING_PAYMENT', 'UNPUBLISHED'].includes(invitation.status))
    return invitation.status === 'PUBLISHED';
  const problems = publishReadiness(
    invitationContentSchema.parse(invitation.contentJson),
    invitation.eventDate ? invitation.eventDate.toISOString().slice(0, 10) : null,
  );
  if (Object.keys(problems).length > 0) return false;
  await tx.invitation.update({
    where: { id: invitationId },
    data: {
      status: 'PUBLISHED',
      publishedAt: invitation.publishedAt ?? new Date(),
      unpublishedAt: null,
      templateSnapshot: templateDesignSchema.parse(invitation.template.designConfig),
    },
  });
  await recordAudit(
    { actorId, action: 'invitation.published', entityType: 'invitation', entityId: invitationId },
    tx,
  );
  return true;
}

export class AmountMismatchError extends Error {}

/** Marks a successful payment refunded and takes its invitation offline: the service stops completely. */
export async function markRefunded(tx: Tx, paymentId: string, actorId: string | null) {
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== 'SUCCEEDED') return false;
  await tx.payment.update({ where: { id: paymentId }, data: { status: 'REFUNDED' } });
  if (payment.invitationId) {
    await tx.invitation.updateMany({
      where: { id: payment.invitationId, status: 'PUBLISHED' },
      data: { status: 'UNPUBLISHED', unpublishedAt: new Date() },
    });
  }
  await recordAudit(
    { actorId, action: 'payment.refunded', entityType: 'payment', entityId: paymentId },
    tx,
  );
  return true;
}

/**
 * Applies a verified provider outcome to a payment. Idempotent: replaying the same outcome changes
 * nothing, and a payment that already succeeded is never downgraded by a later failure event.
 */
export async function applyOutcome(
  paymentId: string,
  outcome: ProviderOutcome,
  amountMinor: number,
  currency: string,
  actorId: string | null = null,
  transactionId?: string,
) {
  let notify: 'receipt' | 'refund' | null = null;
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Payment not found');
    if (payment.amountMinor !== amountMinor || payment.currency !== currency) {
      throw new AmountMismatchError(
        `Expected ${payment.amountMinor} ${payment.currency}, got ${amountMinor} ${currency}`,
      );
    }
    if (outcome === 'REFUNDED') {
      if (await markRefunded(tx, paymentId, actorId)) notify = 'refund';
      return;
    }
    if (payment.status === 'SUCCEEDED' || payment.status === 'REFUNDED') return;

    if (outcome === 'SUCCEEDED') {
      notify = 'receipt';
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(),
          failureReason: null,
          providerTransactionId: transactionId ?? payment.providerTransactionId,
        },
      });
      await recordAudit(
        { actorId, action: 'payment.succeeded', entityType: 'payment', entityId: paymentId },
        tx,
      );
      if (payment.invitationId) {
        await publishIfReady(tx, payment.invitationId, actorId);
        // Paying upgrades a free-plan invitation: no watermark, no expiry.
        await tx.invitation.updateMany({
          where: { id: payment.invitationId, status: 'PUBLISHED' },
          data: { expiresAt: null },
        });
      }
      return;
    }

    if (payment.status !== 'PENDING') return;
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: outcome,
        failureReason: outcome === 'FAILED' ? 'provider_reported_failure' : 'cancelled',
      },
    });
    await recordAudit(
      {
        actorId,
        action: `payment.${outcome.toLowerCase()}`,
        entityType: 'payment',
        entityId: paymentId,
      },
      tx,
    );
    if (payment.invitationId) {
      // Back to a draft so the customer can retry; the work is never lost.
      await tx.invitation.updateMany({
        where: { id: payment.invitationId, status: 'PENDING_PAYMENT' },
        data: { status: 'DRAFT' },
      });
    }
  });
  if (notify) await sendPaymentEmail(paymentId, notify);
}

interface EmailFacts {
  invitation: string;
  package: string;
  amount: string;
  id: string;
}

const MESSAGES = {
  receipt: {
    ar: (p: EmailFacts) =>
      `تم استلام دفعتك بنجاح.\n\nالدعوة: ${p.invitation}\nالباقة: ${p.package}\nالمبلغ: ${p.amount}\nرقم العملية: ${p.id}\n\nشكرًا لاستخدامك دعوة.`,
    en: (p: EmailFacts) =>
      `Your payment was received.\n\nInvitation: ${p.invitation}\nPackage: ${p.package}\nAmount: ${p.amount}\nReference: ${p.id}\n\nThank you for using Invitation 4u.`,
    subject: { ar: 'إيصال الدفع', en: 'Payment receipt' },
  },
  refund: {
    ar: (p: EmailFacts) =>
      `تم رد مبلغ ${p.amount} عن دعوة «${p.invitation}»، وتم إيقاف الدعوة.\nرقم العملية: ${p.id}`,
    en: (p: EmailFacts) =>
      `${p.amount} was refunded for "${p.invitation}", and the invitation was taken offline.\nReference: ${p.id}`,
    subject: { ar: 'تم رد المبلغ', en: 'Payment refunded' },
  },
};

/** Plain-text receipt/refund notice. A failed email never undoes a payment. */
async function sendPaymentEmail(paymentId: string, kind: 'receipt' | 'refund') {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { ...paymentInclude, user: { select: { email: true, locale: true } } },
    });
    if (!payment) return;
    const locale = payment.user.locale === 'en' ? 'en' : 'ar';
    const facts: EmailFacts = {
      invitation: payment.invitation?.title ?? '—',
      package: locale === 'ar' ? payment.package.nameAr : payment.package.nameEn,
      amount: `${(payment.amountMinor / 100).toFixed(2)} ${payment.currency}`,
      id: payment.id,
    };
    await emailService.send({
      to: payment.user.email,
      subject: MESSAGES[kind].subject[locale],
      text: MESSAGES[kind][locale](facts),
    });
  } catch (error) {
    logger.error('Payment email failed', {
      paymentId,
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }
}

async function applyProviderEvent(
  provider: PaymentProvider,
  event: ProviderEvent,
  actorId: string | null,
) {
  const payment = await prisma.payment.findUnique({
    where: {
      provider_providerReference: {
        provider: provider.name,
        providerReference: event.providerReference,
      },
    },
  });
  if (!payment) throw new Error(`Unknown payment reference ${event.providerReference}`);
  await applyOutcome(
    payment.id,
    event.outcome,
    event.amountMinor,
    event.currency,
    actorId,
    event.transactionId,
  );
}

/**
 * Entry point for provider webhooks. The signature is verified first, every event is stored once
 * (unique provider + event id) and processed once, and failures are recorded for reconciliation.
 */
export async function processWebhook(
  provider: PaymentProvider,
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  query: Record<string, unknown> = {},
): Promise<{ duplicate: boolean }> {
  const event = provider.parseWebhook(rawBody, headers, query); // throws if not authentic
  if (!event) return { duplicate: false }; // authentic, but nothing to apply yet

  const payload = JSON.parse(rawBody.toString('utf8')) as Prisma.InputJsonValue;
  let stored;
  try {
    stored = await prisma.webhookEvent.create({
      data: {
        provider: provider.name,
        externalEventId: event.externalEventId,
        eventType: event.type,
        payload,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
      throw error;
    stored = await prisma.webhookEvent.findUniqueOrThrow({
      where: {
        provider_externalEventId: {
          provider: provider.name,
          externalEventId: event.externalEventId,
        },
      },
    });
    if (stored.processingStatus === 'PROCESSED') return { duplicate: true };
  }

  try {
    await applyProviderEvent(provider, event, null);
    await prisma.webhookEvent.update({
      where: { id: stored.id },
      data: { processingStatus: 'PROCESSED', processedAt: new Date(), error: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    logger.error('Webhook processing failed', {
      provider: provider.name,
      event: event.externalEventId,
      message,
    });
    await prisma.webhookEvent.update({
      where: { id: stored.id },
      data: { processingStatus: 'FAILED', error: message.slice(0, 500) },
    });
    throw new AppError(500, 'INTERNAL_ERROR', 'Webhook processing failed');
  }
  return { duplicate: false };
}

/** Creates a payment and hosted checkout for an invitation. Prices always come from the database. */
export async function startCheckout(params: {
  userId: string;
  invitationId: string;
  packageCode: string;
}) {
  const [invitation, pkg] = await Promise.all([
    prisma.invitation.findFirst({
      where: { id: params.invitationId, ownerId: params.userId },
      include: {
        template: true,
        owner: { select: { name: true, email: true } },
        _count: { select: { guests: true } },
      },
    }),
    prisma.package.findFirst({ where: { code: params.packageCode, enabled: true } }),
  ]);
  if (!invitation) throw new AppError(404, 'NOT_FOUND', 'Invitation not found');
  if (!pkg || pkg.priceMinor <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Package not available', {
      packageCode: 'validation.required',
    });
  }
  // A published invitation can only be paid for while it is on the free plan (that is the upgrade).
  const upgrading = invitation.status === 'PUBLISHED' && invitation.expiresAt !== null;
  if (!upgrading && !['DRAFT', 'PENDING_PAYMENT', 'UNPUBLISHED'].includes(invitation.status)) {
    throw new AppError(409, 'CONFLICT', 'This invitation cannot be paid for in its current state');
  }
  if (await hasPaid(invitation.id))
    throw new AppError(409, 'CONFLICT', 'This invitation is already paid for');

  const problems = publishReadiness(
    invitationContentSchema.parse(invitation.contentJson),
    invitation.eventDate ? invitation.eventDate.toISOString().slice(0, 10) : null,
  );
  if (Object.keys(problems).length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'The invitation is not ready to publish', problems);
  }

  const features = (pkg.features ?? {}) as { premiumTemplates?: boolean; maxGuests?: number };
  const ownDesign = usesPremiumDesign(invitationContentSchema.parse(invitation.contentJson));
  if ((invitation.template.isPremium || ownDesign) && !features.premiumTemplates) {
    throw new AppError(400, 'VALIDATION_ERROR', 'This template needs a premium package', {
      packageCode: 'validation.premiumRequired',
    });
  }
  if (typeof features.maxGuests === 'number' && invitation._count.guests > features.maxGuests) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Too many guests for this package', {
      packageCode: 'validation.tooManyGuests',
    });
  }

  const provider = getProvider();
  // Supersede any abandoned checkout so there is only one live payment per invitation.
  await prisma.payment.updateMany({
    where: { invitationId: invitation.id, status: 'PENDING' },
    data: { status: 'CANCELLED', failureReason: 'superseded' },
  });

  const payment = await prisma.payment.create({
    data: {
      userId: params.userId,
      invitationId: invitation.id,
      packageId: pkg.id,
      provider: provider.name,
      amountMinor: pkg.priceMinor,
      currency: pkg.currency,
    },
  });
  const checkout = await provider.createCheckout({
    paymentId: payment.id,
    amountMinor: pkg.priceMinor,
    currency: pkg.currency,
    description: invitation.title,
    customer: invitation.owner,
  });
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { providerReference: checkout.providerReference },
    }),
    // A live free-plan page stays online while its upgrade is being paid for.
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: upgrading ? 'PUBLISHED' : 'PENDING_PAYMENT' },
    }),
  ]);
  return { paymentId: payment.id, redirectUrl: checkout.redirectUrl };
}

/** Simulator only: produces the signed webhook a real gateway would send and processes it. */
export async function simulateProviderEvent(providerReference: string, outcome: ProviderOutcome) {
  const payment = await prisma.payment.findUnique({
    where: { provider_providerReference: { provider: 'test', providerReference } },
  });
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found');
  const body = Buffer.from(
    JSON.stringify({
      id: randomUUID(),
      reference: providerReference,
      outcome,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
    }),
  );
  return processWebhook(getProvider('test'), body, { 'x-signature': sign(body) });
}

/**
 * Refunds a successful payment. With a gateway that supports it the money is returned first, and
 * only then is the payment marked refunded and the invitation taken offline.
 */
export async function refundPayment(paymentId: string, actorId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found');
  if (payment.status !== 'SUCCEEDED')
    throw new AppError(409, 'CONFLICT', 'Only successful payments can be refunded');

  const provider = getProvider(payment.provider);
  if (provider.refund) {
    if (!payment.providerTransactionId)
      throw new AppError(
        409,
        'CONFLICT',
        'The gateway charge id is unknown; refund it at the gateway',
      );
    await provider.refund({
      transactionId: payment.providerTransactionId,
      amountMinor: payment.amountMinor,
    });
  }
  const changed = await prisma.$transaction((tx) => markRefunded(tx, paymentId, actorId));
  if (changed) await sendPaymentEmail(paymentId, 'refund');
}

const STALE_AFTER_MS = 20 * 60 * 1000;
const EXPIRE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Housekeeping for payments stuck pending: asks the gateway what happened to old ones (a webhook
 * may have been missed) and cancels those nobody completed within a day.
 */
export async function sweepPendingPayments(now = new Date()) {
  const stale = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      providerReference: { not: null },
      createdAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) },
    },
    take: 50,
  });
  for (const payment of stale) {
    try {
      if (payment.provider !== 'test') await reconcilePayment(payment.id, null);
    } catch (error) {
      logger.warn('Sweep: reconcile failed', {
        paymentId: payment.id,
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
    const current = await prisma.payment.findUnique({ where: { id: payment.id } });
    if (
      current?.status === 'PENDING' &&
      now.getTime() - current.createdAt.getTime() > EXPIRE_AFTER_MS
    ) {
      await applyOutcome(current.id, 'CANCELLED', current.amountMinor, current.currency);
    }
  }
  return stale.length;
}

/** Re-checks a payment with its provider and applies the result. Used by administrators. */
export async function reconcilePayment(paymentId: string, actorId: string | null) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment not found');
  if (!payment.providerReference)
    throw new AppError(409, 'CONFLICT', 'Payment has no provider reference');
  const event = await getProvider(payment.provider).fetchStatus(payment.providerReference);
  if (!event) return { changed: false, reason: 'provider_has_no_record' as const };
  const before = payment.status;
  await applyOutcome(
    payment.id,
    event.outcome,
    event.amountMinor,
    event.currency,
    actorId,
    event.transactionId,
  );
  await recordAudit({
    actorId,
    action: 'payment.reconciled',
    entityType: 'payment',
    entityId: paymentId,
    metadata: { outcome: event.outcome },
  });
  const after = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  return { changed: after.status !== before, reason: null };
}
