import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import type { PaymentProvider, ProviderEvent } from './provider.js';
import { InvalidSignatureError } from './signature-error.js';

/**
 * Lemon Squeezy adapter. Lemon Squeezy is the merchant of record: it sells to the customer, handles
 * tax, and pays us out. A checkout is created per payment with a price override, and the customer
 * returns to our site afterwards. Results arrive as signed `order_created` / `order_refunded`
 * webhooks. Written from the public documentation; verify against a test-mode order (docs/payments.md).
 */

type Json = Record<string, unknown>;

/** What we attach to a checkout so the webhook can be tied back to our payment and checked. */
interface Custom {
  payment_id: string;
  /** Lemon Squeezy only accepts strings in custom data, so amounts travel as decimal strings. */
  amount_minor: string;
  currency: string;
  /** What Lemon Squeezy was asked to charge, in the store currency's minor units. */
  charge_minor: string;
}

/** The store-currency price for a package price. */
export function chargeFor(amountMinor: number, currency: string) {
  if (currency === env.LEMONSQUEEZY_CURRENCY) return amountMinor;
  return Math.max(1, Math.round(amountMinor / env.LEMONSQUEEZY_RATE));
}

function isAuthentic(rawBody: Buffer, given: unknown, secret: string) {
  if (typeof given !== 'string' || !/^[0-9a-f]+$/i.test(given)) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const actual = Buffer.from(given, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Verifies a webhook and reduces it to an event; null for events that need no action. */
export function parseLemonSqueezyWebhook(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string | undefined,
): ProviderEvent | null {
  // Without a secret nothing can be authentic; never verify against an empty key.
  if (!secret) throw new InvalidSignatureError('Lemon Squeezy is not configured');
  const signature = headers['x-signature'];
  if (!isAuthentic(rawBody, Array.isArray(signature) ? signature[0] : signature, secret)) {
    throw new InvalidSignatureError('Invalid signature');
  }
  let body: Json;
  try {
    body = JSON.parse(rawBody.toString('utf8')) as Json;
  } catch {
    throw new InvalidSignatureError('Malformed event');
  }

  const meta = body.meta as Json | undefined;
  const data = body.data as Json | undefined;
  const eventName = meta?.event_name;
  if (eventName !== 'order_created' && eventName !== 'order_refunded') return null;

  const attributes = data?.attributes as Json | undefined;
  const custom = meta?.custom_data as Partial<Custom> | undefined;
  const amountMinor = Number(custom?.amount_minor);
  const chargeMinor = Number(custom?.charge_minor);
  if (
    !data ||
    !attributes ||
    !custom ||
    typeof data.id !== 'string' ||
    typeof custom.payment_id !== 'string' ||
    !Number.isInteger(amountMinor) ||
    typeof custom.currency !== 'string' ||
    !Number.isInteger(chargeMinor) ||
    typeof attributes.subtotal !== 'number' ||
    typeof attributes.currency !== 'string'
  ) {
    throw new InvalidSignatureError('Malformed event');
  }
  // The customer must have been charged exactly what this payment asked for, in the store currency.
  // Lemon Squeezy's own currency handling can move the amount by a few piastres (a 299.00 checkout
  // was billed 299.15), so a 1% margin is allowed; anything further off is not our checkout.
  const margin = Math.max(2, Math.round(chargeMinor * 0.01));
  if (
    attributes.currency !== env.LEMONSQUEEZY_CURRENCY ||
    Math.abs(attributes.subtotal - chargeMinor) > margin
  ) {
    throw new InvalidSignatureError('Charge does not match the payment');
  }

  const status = attributes.status;
  const outcome =
    eventName === 'order_refunded' || status === 'refunded' || status === 'partial_refund'
      ? 'REFUNDED'
      : status === 'paid'
        ? 'SUCCEEDED'
        : status === 'failed'
          ? 'FAILED'
          : null;
  if (!outcome) return null;

  return {
    externalEventId: `${String(eventName)}:${data.id}`,
    type: `payment.${outcome.toLowerCase()}`,
    providerReference: custom.payment_id,
    outcome,
    // Reported in our own price and currency, which the signed charge check above proved equal.
    amountMinor,
    currency: custom.currency,
    transactionId: data.id,
  };
}

async function call(method: 'GET' | 'POST', path: string, body?: Json) {
  let response: Response;
  try {
    response = await fetch(`https://api.lemonsqueezy.com${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY ?? ''}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AppError(502, 'INTERNAL_ERROR', 'The payment gateway is not reachable');
  }
  const data = (await response.json().catch(() => null)) as Json | null;
  if (!response.ok || !data) {
    throw new AppError(502, 'INTERNAL_ERROR', 'The payment gateway rejected the request');
  }
  return data;
}

export const lemonSqueezyProvider: PaymentProvider = {
  name: 'lemonsqueezy',

  async createCheckout(request) {
    const charge = chargeFor(request.amountMinor, request.currency);
    const custom: Custom = {
      payment_id: request.paymentId,
      amount_minor: String(request.amountMinor),
      currency: request.currency,
      charge_minor: String(charge),
    };
    const data = await call('POST', '/v1/checkouts', {
      data: {
        type: 'checkouts',
        attributes: {
          custom_price: charge,
          product_options: {
            name: request.description.slice(0, 100) || 'Invitation',
            redirect_url: `${env.APP_URL}/payments/return?payment=${request.paymentId}`,
          },
          checkout_data: {
            email: request.customer.email,
            name: request.customer.name,
            custom,
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: env.LEMONSQUEEZY_STORE_ID } },
          variant: { data: { type: 'variants', id: env.LEMONSQUEEZY_VARIANT_ID } },
        },
      },
    });
    const url = ((data.data as Json | undefined)?.attributes as Json | undefined)?.url;
    if (typeof url !== 'string')
      throw new AppError(502, 'INTERNAL_ERROR', 'The payment gateway returned no checkout');
    return { providerReference: request.paymentId, redirectUrl: url };
  },

  parseWebhook(rawBody, headers) {
    return parseLemonSqueezyWebhook(rawBody, headers, env.LEMONSQUEEZY_WEBHOOK_SECRET);
  },

  // Lemon Squeezy cannot look an order up by our reference; it retries webhooks instead.
  async fetchStatus() {
    return null;
  },

  async refund({ transactionId }) {
    await call('POST', `/v1/orders/${encodeURIComponent(transactionId)}/refund`, {
      data: { type: 'orders', id: transactionId },
    });
  },
};
