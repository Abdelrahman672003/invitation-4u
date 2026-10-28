# Deployment

One server running Docker Compose: **web** (nginx, static files, proxies `/api`) → **api** (Express +
Prisma) → the **SQLite** database file on a volume, plus a **backup** service. HTTPS comes from nginx
installed on the server itself, in front of the stack. The images are built by CI but this setup has
not yet been run on a real server, so expect to fix small things on the first deploy.

The `web` container only listens on `127.0.0.1:8080` (change it with `WEB_PORT`), so it is not
reachable from the internet directly; the server's nginx receives the visitors, handles the
certificate, and forwards to it. There are two proxies, which is why `docker-compose.yml` sets
`TRUST_PROXY` to `2`.

The database is a single file, `/data/app.db`, on the `app-data` volume next to the uploaded
photos (`/data/uploads`). It is not a separate server; Docker keeps the volume across updates.

## What you need

- A small Linux server (1 GB RAM is enough to start) with Docker and the Compose plugin, plus `nginx`,
  `certbot` and `git` (`sudo apt install nginx certbot python3-certbot-nginx git`).
- A domain whose DNS `A` record points at the server, and ports 80 and 443 open.
- A **live-mode** Lemon Squeezy store with its own product, API key and webhook (the test ones do not carry over).

## First deploy

```bash
git clone <repository> invite && cd invite
cp .env.production.example .env.production   # fill every value, see the comments inside
chmod 600 .env.production
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

Then set up HTTPS with the server's nginx:

```bash
sudo cp deploy/nginx-host.conf /etc/nginx/sites-available/invite
sudo nano /etc/nginx/sites-available/invite      # replace example.com with your domain
sudo ln -s /etc/nginx/sites-available/invite /etc/nginx/sites-enabled/invite
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d <your domain>            # adds the certificate, https and the redirect
```

Certbot renews the certificate on its own. Open `https://<your domain>/health` (should answer `ok`)
and sign in as the administrator.

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
Never edit files on the server by hand: change them on your computer and push, otherwise `git pull`
stops with a conflict.

For a private repository, give the server its own read-only key:

```bash
ssh-keygen -t ed25519 -C "invite-server" -f ~/.ssh/invite_deploy -N ""
cat ~/.ssh/invite_deploy.pub
```

Add the printed key in GitHub → the repository → Settings → Deploy keys (leave write access off), and
clone with `GIT_SSH_COMMAND="ssh -i ~/.ssh/invite_deploy" git clone git@github.com:<you>/<repository>.git`.

## Backups

The `backup` service writes a copy of the database (`app-<time>.db.gz`) and the uploads
(`uploads-<time>.tar.gz`) to `./backups` once a day and keeps 14 days (`BACKUP_KEEP_DAYS`).
That protects against mistakes, not against losing the server, so also copy `./backups` somewhere
else (another machine or object storage) on a schedule, for example with `rclone` from cron.

Restore the database:

```bash
docker compose stop api
gunzip -c backups/app-<time>.db.gz > app.db
docker compose cp app.db api:/data/app.db      # use `docker compose run --rm` if api cannot start
docker compose start api
```

Do a restore test once before you rely on it.

## Environment variables

See `.env.example` for development and `.env.production.example` for production.

| Variable | Notes |
| --- | --- |
| `APP_URL`, `CORS_ORIGINS` | The public `https://` origin |
| `COOKIE_SECURE` | Must be `true` in production (the API refuses to start otherwise) |
| `TRUST_PROXY` | Set to `2` by compose (the server's nginx and the web container's nginx) |
| `WEB_PORT` | Localhost port the `web` container listens on, default `8080`; must match `proxy_pass` in the server's nginx config |
| `PAYMENT_PROVIDER` | `lemonsqueezy` (or `paymob`); `test` is refused in production |
| `LEMONSQUEEZY_*` | API key, store id, variant id, webhook secret (max 40 characters), currency |
| `PAYMENT_SWEEP_ENABLED` | `true` re-checks stuck pending payments |
| `BACKUP_KEEP_DAYS`, `BACKUP_INTERVAL_HOURS` | Optional, read by compose for the backup service |
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
