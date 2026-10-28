# Deployment

One server running Docker Compose: **caddy** (HTTPS) → **web** (nginx, static files, proxies `/api`) →
**api** (Express + Prisma, SQLite file on a volume), plus a **backup** service. The images have been
built by CI but this stack has not yet been run end to end on a real server, so expect to fix small
things on the first deploy.

## What you need

- A small Linux VPS (1 GB RAM is enough to start) with Docker and the Compose plugin.
- A domain whose DNS `A` record points at the server, and ports 80 and 443 open (Caddy needs both
  to get its certificate).
- A **live-mode** Lemon Squeezy store with its own product, API key and webhook (the test ones do not carry over).

## First deploy

```bash
git clone <repo> invite && cd invite
cp .env.production.example .env.production   # fill every value, see the comments inside
docker compose up -d --build
docker compose logs -f api                   # wait for "API listening"
```

The API applies database migrations on every start. Then, once:

```bash
# Categories, packages and starter templates. Run this ONE time: it resets template names and order,
# so running it again would undo edits made in the admin panel.
docker compose exec api node apps/api/dist/seed.js

# The first administrator (use a real password of at least 12 characters).
docker compose exec -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='change-me-please-1' api node apps/api/dist/create-admin.js
```

Then open `https://<your domain>/health` (should answer `ok`) and sign in as the administrator.

## Payments (Lemon Squeezy, live)

1. Activate the store (Lemon Squeezy asks for payout and identity details). Confirm Egypt is a supported payout country.
2. Create the product and one variant; copy the store id and variant id.
3. Settings → API: create a key. Settings → Webhooks: add `https://<your domain>/api/v1/webhooks/payments/lemonsqueezy`
   with a signing secret of at most 40 characters, events `order_created` and `order_refunded`.
4. Put the four values in `.env.production`, then `docker compose up -d api`.
5. Make one real purchase with your own card, check the invitation publishes, refund it from the admin panel, and check it goes offline.

Details and assumptions to verify are in `docs/payments.md`. Receipts and refund notices are sent to
the customer by Lemon Squeezy itself.

## Updating

```bash
git pull
docker compose up -d --build
```

Migrations run on start and are additive. To roll back, check out the previous commit and run the
same command; a migration that already ran is not undone, so restore a backup if one went wrong.

## Backups

The `backup` service writes a copy of the database (`app-<time>.db.gz`) and the uploads
(`uploads-<time>.tar.gz`) to `./backups` once a day and keeps 14 days (`BACKUP_KEEP_DAYS`).
That protects against mistakes, not against losing the server, so also copy `./backups` somewhere
else (another machine or object storage) on a schedule, for example with `rclone` from cron.

Restore the database:

```bash
docker compose stop api
gunzip -c backups/app-<time>.db.gz > app.db
docker compose cp app.db api:/data/app.db      # api must exist; use `docker compose run --rm` if it is stopped
docker compose start api
```

Do a restore test once before you rely on it.

## Environment variables

See `.env.example` for development and `.env.production.example` for production.

| Variable | Notes |
| --- | --- |
| `DOMAIN` | Public domain, without `https://`; Caddy issues its certificate |
| `APP_URL`, `CORS_ORIGINS` | The public `https://` origin |
| `COOKIE_SECURE` | Must be `true` in production (the API refuses to start otherwise) |
| `TRUST_PROXY` | Set to `2` by compose (caddy and nginx) |
| `PAYMENT_PROVIDER` | `lemonsqueezy` (or `paymob`); `test` is refused in production |
| `LEMONSQUEEZY_*` | API key, store id, variant id, webhook secret (max 40 characters), currency |
| `PAYMENT_SWEEP_ENABLED` | `true` re-checks stuck pending payments |
| `EMAIL_PROVIDER` | Only `console` exists, so password-reset emails are not delivered; the "forgot password" link is hidden for now |

Never commit real secrets. `SEED_ADMIN_*` are for development only; the seed refuses to create a
development admin when `NODE_ENV=production`.

## Before announcing it

- [ ] Replace any API key that was ever pasted into a chat or committed.
- [ ] The legal pages (terms, privacy, refund) are final, since Lemon Squeezy checks them when activating the store.
- [ ] A restore from a backup has been tested.
- [ ] Uptime monitoring (for example UptimeRobot on `/health`) and error tracking are on.
- [ ] Real email sending is added, then the "forgot password" link is restored (it is commented out in `AuthPages.tsx`).

## Other reference

- API reference: `GET /api/v1/openapi.json` (a test fails if a documented endpoint is not routed).
- View counts: `POST /public/invitations/:slug/view` stores a number per published invitation, once per browser session, and no visitor data.
- Build without Docker: `npm run build` produces `apps/api/dist` (run with `node`, needs `node_modules` for Prisma) and `apps/web/dist` (static files with an SPA fallback to `index.html`, served on the same site as `/api` so the session cookie works).
