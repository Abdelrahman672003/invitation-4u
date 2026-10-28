import { describe, expect, it } from 'vitest';
import { InvalidSignatureError } from '../src/modules/payments/signature-error.js';
import { paymobHmac, parsePaymobWebhook } from '../src/modules/payments/paymob.js';

const SECRET = 'paymob-test-hmac-secret';

const transaction = (overrides: Record<string, unknown> = {}) => ({
  amount_cents: 29900,
  created_at: '2026-10-28T10:00:00.000000',
  currency: 'EGP',
  error_occured: false,
  has_parent_transaction: false,
  id: 555,
  integration_id: 4001,
  is_3d_secure: true,
  is_auth: false,
  is_capture: false,
  is_refunded: false,
  is_standalone_payment: true,
  is_voided: false,
  order: { id: 777, merchant_order_id: 'payment-uuid-1' },
  owner: 12,
  pending: false,
  source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' },
  success: true,
  ...overrides,
});

function callback(obj: object, secret = SECRET) {
  const body = Buffer.from(JSON.stringify({ type: 'TRANSACTION', obj }));
  return { body, query: { hmac: paymobHmac(obj as Record<string, unknown>, secret) } };
}

describe('paymob webhook', () => {
  it('turns a successful card payment into a SUCCEEDED event keyed by our payment id', () => {
    const { body, query } = callback(transaction());
    expect(parsePaymobWebhook(body, query, SECRET)).toMatchObject({
      outcome: 'SUCCEEDED',
      providerReference: 'payment-uuid-1',
      amountMinor: 29900,
      currency: 'EGP',
      transactionId: '555',
    });
  });

  it('reports a failed charge as FAILED', () => {
    const { body, query } = callback(transaction({ success: false }));
    expect(parsePaymobWebhook(body, query, SECRET)?.outcome).toBe('FAILED');
  });

  it('ignores a charge that is still pending', () => {
    const { body, query } = callback(transaction({ success: false, pending: true }));
    expect(parsePaymobWebhook(body, query, SECRET)).toBeNull();
  });

  it('reports refunds and voids as REFUNDED', () => {
    for (const flag of ['is_refunded', 'is_voided']) {
      const { body, query } = callback(transaction({ [flag]: true }));
      expect(parsePaymobWebhook(body, query, SECRET)?.outcome).toBe('REFUNDED');
    }
  });

  it('gives each state of the same transaction its own event id', () => {
    const ids = [
      transaction({ success: false, pending: false }),
      transaction(),
      transaction({ is_refunded: true }),
    ].map((obj) => {
      const { body, query } = callback(obj);
      return parsePaymobWebhook(body, query, SECRET)?.externalEventId;
    });
    expect(new Set(ids).size).toBe(3);
  });

  it('rejects a wrong, missing or tampered signature', () => {
    const { body, query } = callback(transaction());
    expect(() => parsePaymobWebhook(body, { hmac: 'abcd' }, SECRET)).toThrow(InvalidSignatureError);
    expect(() => parsePaymobWebhook(body, {}, SECRET)).toThrow(InvalidSignatureError);
    const forged = callback(transaction({ amount_cents: 1 }));
    expect(() => parsePaymobWebhook(forged.body, query, SECRET)).toThrow(InvalidSignatureError);
    expect(() => parsePaymobWebhook(body, callback(transaction(), 'other').query, SECRET)).toThrow(
      InvalidSignatureError,
    );
  });

  it('never verifies without a configured secret', () => {
    const { body, query } = callback(transaction(), '');
    expect(() => parsePaymobWebhook(body, query, undefined)).toThrow(InvalidSignatureError);
    expect(() => parsePaymobWebhook(body, query, '')).toThrow(InvalidSignatureError);
  });

  it('rejects bodies that are not transaction callbacks', () => {
    expect(() => parsePaymobWebhook(Buffer.from('nope'), {}, SECRET)).toThrow(
      InvalidSignatureError,
    );
    expect(() => parsePaymobWebhook(Buffer.from('{"type":"TOKEN"}'), {}, SECRET)).toThrow(
      InvalidSignatureError,
    );
  });
});
