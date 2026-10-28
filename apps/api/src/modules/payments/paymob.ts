import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import type { PaymentProvider, ProviderEvent } from './provider.js';
import { InvalidSignatureError } from './signature-error.js';

/**
 * Paymob (Accept) adapter: hosted "Unified Checkout" through the Intention API, results through
 * the transaction-processed callback. Field names follow Paymob's public documentation; check them
 * against a real test transaction before going live (see docs/payments.md).
 */

type Json = Record<string, unknown>;

/** Fields of a transaction object, in the order Paymob's HMAC covers them. */
const HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const;

function pluck(obj: Json, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value as Json | undefined)?.[key], obj);
}

/** The HMAC Paymob expects for a transaction object. */
export function paymobHmac(obj: Json, secret: string) {
  const joined = HMAC_FIELDS.map((path) => {
    const value = pluck(obj, path);
    return value === undefined || value === null ? '' : String(value);
  }).join('');
  return createHmac('sha512', secret).update(joined).digest('hex');
}

function isAuthentic(obj: Json, given: unknown, secret: string) {
  if (typeof given !== 'string' || !/^[0-9a-f]+$/i.test(given)) return false;
  const expected = Buffer.from(paymobHmac(obj, secret), 'hex');
  const actual = Buffer.from(given, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Reduces a transaction object to an outcome. Returns null while the customer has not paid yet. */
export function eventFromTransaction(obj: Json): ProviderEvent | null {
  const order = obj.order as Json | undefined;
  const reference = order?.merchant_order_id;
  const id = obj.id;
  if (
    (typeof id !== 'number' && typeof id !== 'string') ||
    typeof reference !== 'string' ||
    typeof obj.amount_cents !== 'number' ||
    typeof obj.currency !== 'string'
  ) {
    throw new InvalidSignatureError('Malformed event');
  }
  if (obj.pending === true) return null;

  const refunded = obj.is_refunded === true || obj.is_voided === true;
  const outcome = refunded ? 'REFUNDED' : obj.success === true ? 'SUCCEEDED' : 'FAILED';
  return {
    // One transaction reports several states over time, so the state is part of the event's identity.
    externalEventId: [id, obj.success, obj.pending, obj.is_refunded, obj.is_voided].join(':'),
    type: `payment.${outcome.toLowerCase()}`,
    providerReference: reference,
    outcome,
    amountMinor: obj.amount_cents,
    currency: obj.currency,
    transactionId: String(id),
  };
}

/** Verifies a transaction callback against the HMAC secret, then reduces it to an event. */
export function parsePaymobWebhook(
  rawBody: Buffer,
  query: Record<string, unknown>,
  secret: string | undefined,
) {
  // Without a secret nothing can be authentic; never verify against an empty key.
  if (!secret) throw new InvalidSignatureError('Paymob is not configured');
  let body: Json;
  try {
    body = JSON.parse(rawBody.toString('utf8')) as Json;
  } catch {
    throw new InvalidSignatureError('Malformed event');
  }
  const obj = body.obj as Json | undefined;
  if (body.type !== 'TRANSACTION' || !obj || typeof obj !== 'object') {
    throw new InvalidSignatureError('Malformed event');
  }
  if (!isAuthentic(obj, query.hmac, secret)) throw new InvalidSignatureError('Invalid signature');
  return eventFromTransaction(obj);
}

async function call(path: string, init: { token: string; scheme: 'Token' | 'Bearer'; body: Json }) {
  let response: Response;
  try {
    response = await fetch(`${env.PAYMOB_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${init.scheme} ${init.token}`,
      },
      body: JSON.stringify(init.body),
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

/** Legacy auth token, needed for inquiry and refunds. */
async function authToken() {
  const data = await call('/api/auth/tokens', {
    token: '',
    scheme: 'Bearer',
    body: { api_key: env.PAYMOB_API_KEY },
  });
  if (typeof data.token !== 'string')
    throw new AppError(502, 'INTERNAL_ERROR', 'The payment gateway did not authenticate');
  return data.token;
}

export const paymobProvider: PaymentProvider = {
  name: 'paymob',

  async createCheckout(request) {
    const [first = '', ...rest] = request.customer.name.trim().split(/\s+/);
    const name = { first_name: first || 'NA', last_name: rest.join(' ') || 'NA' };
    const data = await call('/v1/intention/', {
      token: env.PAYMOB_SECRET_KEY ?? '',
      scheme: 'Token',
      body: {
        amount: request.amountMinor,
        currency: request.currency,
        payment_methods: env.PAYMOB_INTEGRATION_IDS,
        items: [
          {
            name: request.description.slice(0, 50) || 'Invitation',
            amount: request.amountMinor,
            description: request.description.slice(0, 200) || 'Invitation',
            quantity: 1,
          },
        ],
        billing_data: { ...name, email: request.customer.email, phone_number: 'NA' },
        customer: { ...name, email: request.customer.email },
        // Our payment id comes back as the transaction's merchant_order_id.
        special_reference: request.paymentId,
        notification_url:
          env.PAYMOB_NOTIFICATION_URL ?? `${env.APP_URL}/api/v1/webhooks/payments/paymob`,
        redirection_url: `${env.APP_URL}/payments/return?payment=${request.paymentId}`,
      },
    });
    if (typeof data.client_secret !== 'string')
      throw new AppError(502, 'INTERNAL_ERROR', 'The payment gateway returned no checkout');
    const query = new URLSearchParams({
      publicKey: env.PAYMOB_PUBLIC_KEY ?? '',
      clientSecret: data.client_secret,
    });
    return {
      providerReference: request.paymentId,
      redirectUrl: `${env.PAYMOB_BASE_URL}/unifiedcheckout/?${query}`,
    };
  },

  parseWebhook(rawBody, _headers, query) {
    return parsePaymobWebhook(rawBody, query, env.PAYMOB_HMAC_SECRET);
  },

  async fetchStatus(providerReference) {
    const token = await authToken();
    const data = await call('/api/ecommerce/orders/transaction_inquiry', {
      token,
      scheme: 'Bearer',
      body: { merchant_order_id: providerReference },
    });
    return eventFromTransaction(data);
  },

  async refund({ transactionId, amountMinor }) {
    const token = await authToken();
    await call('/api/acceptance/void_refund/refund', {
      token,
      scheme: 'Bearer',
      body: { transaction_id: transactionId, amount_cents: amountMinor },
    });
  },
};
