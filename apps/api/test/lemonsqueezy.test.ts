import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { chargeFor, parseLemonSqueezyWebhook } from '../src/modules/payments/lemonsqueezy.js';
import { InvalidSignatureError } from '../src/modules/payments/signature-error.js';

const SECRET = 'ls-signing-secret';

const order = (
  overrides: { attributes?: object; custom?: object; event?: string } = {},
  charge = chargeFor(29900, 'EGP'),
) => ({
  meta: {
    event_name: overrides.event ?? 'order_created',
    custom_data: {
      payment_id: 'payment-uuid-1',
      amount_minor: '29900',
      currency: 'EGP',
      charge_minor: String(charge),
      ...overrides.custom,
    },
  },
  data: {
    type: 'orders',
    id: '9001',
    attributes: {
      status: 'paid',
      subtotal: charge,
      total: charge + 100,
      currency: env.LEMONSQUEEZY_CURRENCY,
      ...overrides.attributes,
    },
  },
});

function signed(payload: object, secret = SECRET) {
  const rawBody = Buffer.from(JSON.stringify(payload));
  const headers = { 'x-signature': createHmac('sha256', secret).update(rawBody).digest('hex') };
  return { rawBody, headers };
}

describe('lemon squeezy webhook', () => {
  it('turns a paid order into a SUCCEEDED event in our own price and currency', () => {
    const { rawBody, headers } = signed(order());
    expect(parseLemonSqueezyWebhook(rawBody, headers, SECRET)).toMatchObject({
      outcome: 'SUCCEEDED',
      providerReference: 'payment-uuid-1',
      amountMinor: 29900,
      currency: 'EGP',
      transactionId: '9001',
    });
  });

  it('reports a refunded order as REFUNDED, with a different event id than the sale', () => {
    const sale = signed(order());
    const refund = signed(order({ event: 'order_refunded', attributes: { status: 'refunded' } }));
    const a = parseLemonSqueezyWebhook(sale.rawBody, sale.headers, SECRET);
    const b = parseLemonSqueezyWebhook(refund.rawBody, refund.headers, SECRET);
    expect(b?.outcome).toBe('REFUNDED');
    expect(b?.externalEventId).not.toBe(a?.externalEventId);
  });

  it('reports a failed order as FAILED and ignores unfinished or unrelated events', () => {
    const failed = signed(order({ attributes: { status: 'failed' } }));
    expect(parseLemonSqueezyWebhook(failed.rawBody, failed.headers, SECRET)?.outcome).toBe(
      'FAILED',
    );
    const pending = signed(order({ attributes: { status: 'pending' } }));
    expect(parseLemonSqueezyWebhook(pending.rawBody, pending.headers, SECRET)).toBeNull();
    const other = signed(order({ event: 'subscription_created' }));
    expect(parseLemonSqueezyWebhook(other.rawBody, other.headers, SECRET)).toBeNull();
  });

  it('accepts the few piastres Lemon Squeezy may add when billing', () => {
    const charge = chargeFor(29900, 'EGP');
    const { rawBody, headers } = signed(order({ attributes: { subtotal: charge + 15 } }));
    expect(parseLemonSqueezyWebhook(rawBody, headers, SECRET)?.outcome).toBe('SUCCEEDED');
  });

  it('rejects a charge that differs from what the payment asked for', () => {
    const cheaper = signed(order({ attributes: { subtotal: 1 } }));
    expect(() => parseLemonSqueezyWebhook(cheaper.rawBody, cheaper.headers, SECRET)).toThrow(
      InvalidSignatureError,
    );
    const otherCurrency = signed(order({ attributes: { currency: 'XXX' } }));
    expect(() =>
      parseLemonSqueezyWebhook(otherCurrency.rawBody, otherCurrency.headers, SECRET),
    ).toThrow(InvalidSignatureError);
  });

  it('rejects a wrong, missing or tampered signature', () => {
    const { rawBody, headers } = signed(order());
    expect(() => parseLemonSqueezyWebhook(rawBody, {}, SECRET)).toThrow(InvalidSignatureError);
    expect(() => parseLemonSqueezyWebhook(rawBody, { 'x-signature': 'abcd' }, SECRET)).toThrow(
      InvalidSignatureError,
    );
    const other = signed(order(), 'other-secret');
    expect(() => parseLemonSqueezyWebhook(rawBody, other.headers, SECRET)).toThrow(
      InvalidSignatureError,
    );
    const tampered = Buffer.from(rawBody.toString().replace('9001', '9002'));
    expect(() => parseLemonSqueezyWebhook(tampered, headers, SECRET)).toThrow(
      InvalidSignatureError,
    );
  });

  it('never verifies without a configured secret', () => {
    const { rawBody, headers } = signed(order(), '');
    expect(() => parseLemonSqueezyWebhook(rawBody, headers, undefined)).toThrow(
      InvalidSignatureError,
    );
    expect(() => parseLemonSqueezyWebhook(rawBody, headers, '')).toThrow(InvalidSignatureError);
  });
});

describe('charge conversion', () => {
  it('keeps the price when the store currency is the package currency', () => {
    expect(chargeFor(1234, env.LEMONSQUEEZY_CURRENCY)).toBe(1234);
  });

  it('converts at the configured rate and never charges nothing', () => {
    expect(chargeFor(29900, 'EGP')).toBe(Math.round(29900 / env.LEMONSQUEEZY_RATE));
    expect(chargeFor(1, 'EGP')).toBe(1);
  });
});
