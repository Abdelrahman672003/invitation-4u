# API

Base path: `/api/v1`. JSON in and out. Authentication is a session cookie (`inv_session`)
set by register/login; browsers send it automatically (`credentials: 'include'`).
An OpenAPI document will be generated in the quality milestone.

## Errors

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "fields": { "email": "validation.email" } } }
```

`fields` values are translation keys. Codes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401,
`INVALID_CREDENTIALS` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT`/`EMAIL_TAKEN` 409,
`RATE_LIMITED` 429, `INTERNAL_ERROR` 500 (never includes stack traces).

## Implemented (milestones 1–7)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | `{ name, email, password, locale? }` → 201 `{ user }`, sets cookie. Rate limited. |
| POST | `/auth/login` | – | `{ email, password }` → `{ user }`, rotates session. Rate limited. |
| POST | `/auth/logout` | – | 204, deletes the session. |
| POST | `/auth/forgot-password` | – | `{ email }` → 202 always. Rate limited. |
| POST | `/auth/reset-password` | – | `{ token, password }` → 200; revokes all sessions. Rate limited. |
| GET | `/me` | user | `{ user }` |
| PATCH | `/me` | user | `{ name?, locale? }` (role/email cannot be changed here) |
| GET | `/categories` | – | Enabled categories with enabled subtypes. |
| GET | `/templates?category=slug` | – | Active templates with their validated `design` config. |
| GET | `/templates/:slug` | – | One active template; 404 for drafts/archived. |
| GET | `/packages` | – | Enabled packages (price, currency, limits). |
| GET | `/invitations` | user | Own invitations (any status). |
| POST | `/invitations` | user | `{ templateSlug, title, subtypeSlug?, locale? }` → 201 draft with a permanent slug. |
| GET | `/invitations/:id` | owner | 404 for anyone else. |
| PATCH | `/invitations/:id` | owner | `{ baseRevision, title?, content?, eventDate?, contentLocale?, templateSlug? }`. Stale `baseRevision` → 409 `STALE_REVISION`; archived → 409. |
| POST | `/invitations/:id/archive`, `/restore` | owner | Drafts only / archived only. |
| POST | `/invitations/:id/publish`, `/unpublish` | owner | Needs readiness (names, date, venue). With a successful payment it publishes for good. Otherwise it starts the free plan (48 h, watermark, `expiresAt` set): once per invitation, 3 per account, non-premium templates, up to 30 guests; else 402 `PAYMENT_REQUIRED`. |
| GET/POST | `/invitations/:id/guests` | owner | List with `?q=&status=&group=`, summary and groups; add a guest. |
| PATCH/DELETE | `/invitations/:id/guests/:guestId` | owner | |
| GET | `/invitations/:id/rsvps` | owner | All responses, including people not on the guest list. |
| GET | `/public/invitations/:slug` | – | Published only. Content, design snapshot and RSVP settings; no guest, owner or payment data. |
| POST | `/public/invitations/:slug/rsvp` | – | `{ name, response, attendeesCount?, message? }`. Rate limited; honeypot field `website`; 409 `RSVP_CLOSED` after the deadline. |
| POST | `/payments/checkout` | user | `{ invitationId, packageCode }` → 201 `{ paymentId, redirectUrl }`. Amount comes from the package in the database, never the client. |
| GET | `/payments`, `/payments/:id` | user | Own payment history / one payment (what the return page polls). |
| POST | `/webhooks/payments/:provider` | signature | Raw body, `x-signature` = HMAC-SHA256 of the body. Idempotent on `(provider, event id)`. 401 on a bad signature. |
| GET/POST | `/payments/test/:reference[/complete]` | user | Simulated gateway, development only (404 in production). |

### Admin (role ADMIN, every call audited when it mutates)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/overview` | Counts, revenue, failed webhook events. |
| GET/PATCH | `/admin/users`, `/admin/users/:id` | Search; change role (not your own). |
| GET | `/admin/invitations` | Filter by status/search. |
| POST | `/admin/invitations/:id/unpublish`, `/archive` | Moderation. |
| GET/PATCH | `/admin/templates`, `/admin/templates/:id` | Status, premium, order, names. |
| GET/PATCH | `/admin/categories`, `/admin/categories/:id`, `/admin/subtypes/:id` | Enable/disable. |
| GET/PATCH | `/admin/packages`, `/admin/packages/:id` | Price, names, features; affects new checkouts only. |
| GET | `/admin/payments` | Filter by status. |
| POST | `/admin/payments/:id/reconcile`, `/refund` | Re-check with provider; record a refund. |
| GET | `/admin/audit` | Latest 100 entries. |
| GET | `/health` (no prefix) | – | Liveness + database check. |

Rate limit for auth endpoints: 20 requests / 15 min per IP.
State-changing requests with an `Origin` header outside `CORS_ORIGINS` are rejected with 403.
