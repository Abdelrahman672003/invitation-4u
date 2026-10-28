# Payments

## Lemon Squeezy (no company needed)

`PAYMENT_PROVIDER=lemonsqueezy`, adapter in `modules/payments/lemonsqueezy.ts`. Lemon Squeezy is the
merchant of record, so it takes the payment, handles tax and pays us out.

1. Create a store, then a product with one variant (any price; each checkout overrides it).
2. Settings → API: create a key. Settings → Webhooks: add
   `https://<public-host>/api/v1/webhooks/payments/lemonsqueezy`, choose a signing secret, and tick
   `order_created` and `order_refunded`.
3. Fill the `LEMONSQUEEZY_*` variables (`.env.example`): API key, store id, variant id, signing secret.
4. Prices are stored in EGP, but the store charges in its own currency (USD). Each checkout converts
   at `LEMONSQUEEZY_RATE` (EGP per USD). The webhook is accepted only if the charged subtotal equals
   what that payment asked for, so a tampered or mismatched order never publishes an invitation.
5. Refund: the admin refund button calls Lemon Squeezy's refund endpoint, then takes the invitation
   offline. A refund made in their dashboard arrives as `order_refunded` with the same effect.

To verify with one test-mode order: the custom data we send comes back in `meta.custom_data`, the
`order_created` payload has `attributes.subtotal` / `currency` / `status`, and
`POST /v1/orders/{id}/refund` is accepted. Lemon Squeezy cannot look an order up by our reference, so
the admin "reconcile" button reports no record; it retries failed webhooks itself.
Confirm in their payout settings that Egypt is a supported payout country before relying on it.

# Paymob

Cards only for now. Everything Paymob-specific lives in `apps/api/src/modules/payments/paymob.ts`
behind the `PaymentProvider` interface; the payment rules (`payments.service.ts`) do not know which
gateway is used. The adapter is built but **not switched on**: `PAYMENT_PROVIDER` stays `test`.

## Flow

1. `POST /payments/checkout` creates a `PENDING` payment (price from the database) and calls
   Paymob's Intention API with `special_reference = payment.id`.
2. The customer is redirected to Paymob's Unified Checkout and pays there. Card data never reaches us.
3. Paymob calls `POST /api/v1/webhooks/payments/paymob?hmac=...` (transaction processed callback).
   The HMAC (SHA-512 over the documented field list) is verified, the event is stored once, and
   `applyOutcome` publishes the invitation and emails a receipt.
4. The customer returns to `/payments/return?payment=<id>`, which polls until the server reports a
   final status. The redirect itself is never trusted.

Event mapping: `pending` is ignored, `success` is SUCCEEDED, a failed charge is FAILED, and
`is_refunded` / `is_voided` is REFUNDED. Amount and currency must equal what we stored.
The event id includes the transaction's state, because one transaction reports several states.

## Refunds

A refund stops the service completely: the payment becomes `REFUNDED` and the invitation goes
`UNPUBLISHED`. Admin "refund" calls Paymob's refund endpoint first (needs `PAYMOB_API_KEY` and the
stored charge id), then marks the payment. A refund made in Paymob's dashboard arrives as a webhook
and has the same effect. The customer gets a short email either way.

## Going live checklist

- [ ] Set `PAYMENT_PROVIDER=paymob` and the `PAYMOB_*` variables (`.env.example`).
- [ ] Give Paymob a public HTTPS notification URL (`PAYMOB_NOTIFICATION_URL`); locally use a tunnel.
- [ ] Make one real test-mode payment and confirm against the adapter's assumptions, because the
      adapter was written from Paymob's documentation without a live account:
  - `order.merchant_order_id` equals the `special_reference` we sent;
  - the callback HMAC field list matches your account's callback version;
  - the transaction-inquiry and refund endpoints (`/api/ecommerce/orders/transaction_inquiry`,
    `/api/acceptance/void_refund/refund`) accept the bodies in `paymob.ts`;
  - `phone_number: "NA"` is accepted in `billing_data`.
- [ ] Turn on `PAYMENT_SWEEP_ENABLED=true`.
- [ ] Replace the console email adapter (`services/email.ts`) with a real one so receipts are sent.
