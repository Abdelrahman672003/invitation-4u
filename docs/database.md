# Database

MySQL 8.4 via Prisma. Development and tests use the container in `docker-compose.dev.yml` (`npm run db:up`; databases `invite` and `invite_test` on port 3307); production uses the `db` service in `docker-compose.yml`. Schema: `prisma/schema.prisma`. Migrations: `prisma/migrations` (one baseline migration, written when the project moved from SQLite to MySQL).

Tables use `utf8mb4` with the `utf8mb4_unicode_ci` collation, so Arabic is stored correctly and text comparisons and unique indexes ignore letter case (and some accents). Strings are `VARCHAR(191)`; free text (notes, messages, descriptions, errors) is `TEXT`.

## Conventions

- UUID primary keys; snake_case table and column names.
- All timestamps are written in UTC.
- Money: `*_minor` integer columns plus a 3-letter `currency`.
- JSON only for flexible content (`invitations.content_json`, `templates.design_config`,
  `invitations.template_snapshot`, `packages.features`, audit/webhook metadata).
- Uploaded media lives in object storage; the database stores URLs/keys only.

## Tables

| Table | Purpose |
| --- | --- |
| `users` | Accounts. `email` is unique and always lower-case (CHECK). Role `CUSTOMER` or `ADMIN`. |
| `sessions` | Server-side sessions; only the SHA-256 of the cookie token is stored. |
| `password_reset_tokens` | Single-use reset tokens (hashed), 1-hour expiry. |
| `event_categories`, `event_subtypes` | Seeded: Wedding, Birthday, Engagement & Bridal (6 subtypes), Graduation. |
| `templates` | Design configuration + `version`; `ARCHIVED` templates are hidden from new invitations. |
| `invitations` | Owned by a user. Permanent unique `slug`. `revision` guards against stale autosaves. `template_snapshot` is frozen at publication. |
| `guests` | Private guest list per invitation. `invite_token` reserved for personalized links. |
| `rsvps` | Responses. Unique `(invitation_id, dedupe_key)` prevents duplicates. |
| `packages` | Configurable pricing. |
| `payments` | Checkout records. Unique `(provider, provider_reference)`. |
| `webhook_events` | Unique `(provider, external_event_id)` makes webhook processing idempotent. |
| `audit_logs` | Sensitive actions (admin changes, password resets). |

## Constraints beyond Prisma

Added by hand at the end of the baseline migration as MySQL `CHECK` constraints (enforced by MySQL 8). Because the
columns are case-insensitive, the rules compare as binary or use a case-sensitive `REGEXP_LIKE`:

- `users.email` equals `LOWER(TRIM(email))`
- Non-negative `packages.price_minor`, `payments.amount_minor`, `rsvps.attendees_count`; `guests.max_attendees >= 1`
- Currency codes are 3 upper-case letters
- `invitations.slug` is lower-case kebab-case ASCII

## RSVP duplicate rule (implemented)

`dedupe_key` = the guest id for personalized links, otherwise the normalized submitted name (NFKC, lower-case, Arabic diacritics/tatweel removed, alef variants unified, whitespace collapsed).
A resubmission with the same key updates the existing response instead of creating a new one.

## Deletion & retention

- Deleting a user cascades to sessions, reset tokens, invitations, guests and RSVPs.
- Payments are financial records and are kept (`ON DELETE RESTRICT` on the user). Account
  deletion therefore anonymizes the user row (name/email/password cleared) instead of deleting it
  when payments exist. The workflow is implemented with the admin milestone.
- Expired sessions are deleted when encountered; a scheduled cleanup job comes with deployment.
