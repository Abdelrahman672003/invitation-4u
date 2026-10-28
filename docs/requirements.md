# Requirements & decisions

The full product brief is the source of truth for scope. This file records the
decisions made while implementing it and what is still open.

## Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Default language | Arabic (RTL), English toggle; stored per browser and on the account | Egypt-first market |
| Digits | Latin digits (0-9) in Arabic UI by default; switch in `apps/web/src/lib/format.ts` | Unambiguous phone numbers/prices |
| Fonts | IBM Plex Sans Arabic (UI), El Messiri (display), self-hosted via Fontsource | No runtime dependency on external CDNs |
| Monorepo | npm workspaces | No extra tooling needed |
| Auth | Opaque session token in an `HttpOnly; SameSite=Lax` cookie, SHA-256 hash stored in `sessions` | Revocable server-side sessions; no tokens readable by JS |
| Password hashing | scrypt (Node built-in, N=2^15, r=8, p=1) | Memory-hard, no native build on Windows/CI |
| CSRF | SameSite=Lax + Origin allow-list check on state-changing requests | Defence in depth |
| Password reset | Single-use, 1-hour token; all sessions revoked on reset; identical response for unknown emails | No account enumeration |
| Email | `EmailService` interface with a console adapter | Provider not chosen yet |
| Shared validation | Zod schemas in `packages/shared`; messages are translation keys | Same rules on client and server, localized errors |
| Autosave | Debounced PATCH with a revision compare-and-swap; one request in flight; stale writes get 409 | Old autosaves can never overwrite newer content |
| Event date | Stored as noon UTC; time is a separate HH:mm string in content | Same calendar day in every timezone |
| RSVP duplicates | One response per invitation per normalized name; resubmitting replaces it | Guests can change their mind without duplicates |
| Free plan | Built in (constants in `@invite/shared`, not a database package): 48 hours, watermark, 30 guests, non-premium templates, once per invitation, 3 per account. Expiry is checked on read (`expiresAt`), so no scheduler is needed. After expiry the public page answers 410 `EXPIRED`; paying removes the watermark and expiry on the same link | Lets people try the product with no abuse of free hosting; guests and replies are kept for an upgrade |
| Landing page | The public invitation is a multi-section page (hero, countdown, details, story, programme, venue and map link, notes, RSVP, footer) styled from the template palette; optional sections appear only when filled. Map links must be https. Photos/gallery are not included until file storage is chosen | Premium look without storing HTML or CSS |
| Payments | Provider adapter interface; the only adapter is a simulated gateway whose outcome arrives as an HMAC-signed webhook; refused in production | Real provider is an open business decision; the payment rules are provider-independent |
| Publishing | Only a verified webhook (or an existing successful payment, for republishing) publishes; the return page just reads server status | Frontend redirects can be forged |
| Refunds | Admin records the refund and unpublishes; money is returned at the gateway | No provider API yet |
| Money | Integer minor units + ISO currency (EGP) | Exact arithmetic |

## Open questions (need business input)

- Final brand name and domain.
- Package prices (seeded placeholders: Standard 299 EGP, Premium 499 EGP).
- Payment provider (Paymob, Fawry, Kashier…) — needs merchant eligibility, fees and settlement terms. Until chosen, production cannot take payments.
- Transactional email provider.
- Legal pages (terms, privacy, refund) are working drafts and need legal review; refund terms are a business decision.
- Public support email (`VITE_SUPPORT_EMAIL`) and contact channel.
- Photo upload needs a storage choice (S3-compatible vs local adapter); deferred from milestone 4.
- WhatsApp link previews (title/image when a link is pasted) need server-rendered Open Graph tags; the SPA cannot provide them. Decide at deployment.
- Hosting target for staging/production.

## Deferred from milestone 8

- Browser end-to-end tests (register → design → pay → publish → RSVP). Deferred by the user; add Playwright later with a dedicated test database.
- Docker images and the compose stack are written and built in CI but not yet run on a real server.
- Monitoring and off-server copies of the backups remain to be set up.
