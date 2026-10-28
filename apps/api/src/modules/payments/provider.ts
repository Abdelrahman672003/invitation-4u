import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { lemonSqueezyProvider } from './lemonsqueezy.js';
import { paymobProvider } from './paymob.js';
import { InvalidSignatureError } from './signature-error.js';

export type ProviderOutcome = 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

/** A provider event reduced to what the platform needs, after its signature was verified. */
export interface ProviderEvent {
  externalEventId: string;
  type: string;
  providerReference: string;
  outcome: ProviderOutcome;
  amountMinor: number;
  currency: string;
  /** The gateway's id of the charge, kept so it can be refunded later. */
  transactionId?: string;
}

export interface CheckoutRequest {
  paymentId: string;
  amountMinor: number;
  currency: string;
  description: string;
  customer: { name: string; email: string };
}

/**
 * Everything provider-specific lives behind this interface so a real gateway (Paymob, Fawry,
 * Kashier…) can be added without touching the payment rules.
 */
export interface PaymentProvider {
  readonly name: string;
  /** Creates a hosted checkout and returns where to send the customer. */
  createCheckout(
    request: CheckoutRequest,
  ): Promise<{ providerReference: string; redirectUrl: string }>;
  /**
   * Verifies the signature of a raw webhook and parses it. Throws if it is not authentic; returns
   * null for authentic events that carry no outcome yet (e.g. a charge still awaiting the customer).
   */
  parseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    query: Record<string, unknown>,
  ): ProviderEvent | null;
  /** Asks the provider what happened to a checkout (used for reconciliation). */
  fetchStatus(providerReference: string): Promise<ProviderEvent | null>;
  /** Returns a successful charge to the customer, in full. Absent when refunds are manual. */
  refund?(charge: { transactionId: string; amountMinor: number }): Promise<void>;
}

export { InvalidSignatureError };

export const sign = (rawBody: Buffer | string, secret = env.PAYMENT_WEBHOOK_SECRET) =>
  createHmac('sha256', secret).update(rawBody).digest('hex');

function verifySignature(rawBody: Buffer, header: string | string[] | undefined) {
  const given = Array.isArray(header) ? header[0] : header;
  if (!given) throw new InvalidSignatureError('Missing signature');
  const expected = Buffer.from(sign(rawBody), 'hex');
  const actual = Buffer.from(given, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new InvalidSignatureError('Invalid signature');
  }
}

/**
 * Simulated gateway for development and automated tests. It issues a checkout reference, sends the
 * customer to a local "test checkout" page, and reports the outcome through a signed webhook that is
 * verified exactly like a real provider's. It must never run in production (enforced in env.ts).
 */
export const testProvider: PaymentProvider = {
  name: 'test',

  async createCheckout(request) {
    const providerReference = `test_${request.paymentId.replace(/-/g, '').slice(0, 20)}`;
    return { providerReference, redirectUrl: `${env.APP_URL}/pay/test/${providerReference}` };
  },

  parseWebhook(rawBody, headers) {
    verifySignature(rawBody, headers['x-signature']);
    const body = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    const outcome = body.outcome;
    if (
      typeof body.id !== 'string' ||
      typeof body.reference !== 'string' ||
      typeof body.amountMinor !== 'number' ||
      typeof body.currency !== 'string' ||
      (outcome !== 'SUCCEEDED' && outcome !== 'FAILED' && outcome !== 'CANCELLED')
    ) {
      throw new InvalidSignatureError('Malformed event');
    }
    return {
      externalEventId: body.id,
      type: `payment.${outcome.toLowerCase()}`,
      providerReference: body.reference,
      outcome,
      amountMinor: body.amountMinor,
      currency: body.currency,
    };
  },

  async fetchStatus(providerReference) {
    // The simulator has no remote state; the latest stored event for the reference is its source of truth.
    const events = await prisma.webhookEvent.findMany({
      where: { provider: 'test' },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });
    for (const event of events) {
      const body = event.payload as Record<string, unknown>;
      if (body.reference === providerReference) {
        return testProvider.parseWebhook(
          Buffer.from(JSON.stringify(body)),
          { 'x-signature': sign(JSON.stringify(body)) },
          {},
        );
      }
    }
    return null;
  },
};

export function getProvider(name: string = env.PAYMENT_PROVIDER): PaymentProvider {
  if (name === 'test') return testProvider;
  if (name === 'paymob') return paymobProvider;
  if (name === 'lemonsqueezy') return lemonSqueezyProvider;
  throw new Error(`Unknown payment provider: ${name}`);
}
