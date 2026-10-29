# Deployment

One server running Docker Compose, with every container on a single private network (`invite`):
**web** (nginx, static files, proxies `/api`) → **api** (Express + Prisma) → **db** (MySQL 8.4), plus a
**backup** job. The images are built by CI but this setup has not yet been run on a real server, so
expect to fix small things on the first deploy.

**The server exposes one port: `80`, plain http, owned by `web`.** The API, the database and the backup
job publish nothing; they can only be reached from inside the network. Open only port 80 (and 22 for
SSH) in the server's firewall. To use another port set `WEB_PORT` (for example `8080`) and put the same
port in `APP_URL` and `CORS_ORIGINS`.

**There is no HTTPS.** Passwords, sessions and everything else cross the network unencrypted, so anyone
on the path (a café Wi-Fi, an ISP) can read them. That is acceptable for a trial with test data, not for
real customers. When you want HTTPS later, put a TLS proxy in front of port 80 (Cloudflare, or nginx
with certbot), set `COOKIE_SECURE=true` and `APP_URL`/`CORS_ORIGINS` to the `https://` address, and let
the web container trust that proxy's forwarded client address (`X-Forwarded-For` in
`deploy/nginx-container.conf` and `TRUST_PROXY` in `docker-compose.yml`).

Three Docker volumes hold everything that must survive updates:

| Volume | Contents |
| --- | --- |
| `db-data` | The MySQL data files |
| `app-data` | Uploaded photos and music (`/data/uploads` in the `api` container) |
| `backups` | Daily database dumps and upload archives written by the `backup` service |

The stack is named `invite`, so the volumes are `invite_db-data`, `invite_app-data` and `invite_backups`
(list them with `docker volume ls`).

## What you need

- A small Linux server (1 GB RAM is enough to start) with Docker, the Compose plugin and `git`.
- Its public IP address (or a domain pointing at it), and port 80 open.
- A Lemon Squeezy store with its product, API key and webhook. The first deploy uses **test mode**
  (the same store as development, but a webhook that points at the server); going live later means
  swapping in the live-mode values, because test and live keys, variants and webhooks are separate.
- The domain (`invitation-4u.com`) pointing at the server, with HTTPS provided in front of it
  (for example Cloudflare). Branch `production` is the one the server pulls: `git clone -b production <repository> invite`.

## First deploy

```bash
git clone -b production <repository> invite && cd invite
cp .env.production.example .env.production   # fill every value, see the comments inside
openssl rand -hex 24                          # run twice: MYSQL_ROOT_PASSWORD and MYSQL_PASSWORD
# MYSQL_PASSWORD must also be pasted into DATABASE_URL (hex has no characters that need escaping)
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

Open `http://<server address>/health` (should answer `ok`) and sign in as the administrator.

## Payments (Lemon Squeezy, test mode first)

1. With Lemon Squeezy's **Test mode** switched on, take the store id, a variant id and an API key (Settings → API).
2. Settings → Webhooks (test mode): add `https://invitation-4u.com/api/v1/webhooks/payments/lemonsqueezy`
   with a signing secret of at most 40 characters, events `order_created` and `order_refunded`.
   A plain-`http` address or a bare IP may be refused, which is why the domain with HTTPS is needed.
3. Put the four values in `.env.production`, then `docker compose up -d api`.
4. Pay with the test card `4242 4242 4242 4242`, check the invitation publishes, refund it from the
   admin panel, and check it goes offline.

To go live: activate the store (payout and identity details; confirm Egypt is a supported payout
country), create the live product and variant, a live API key and a live webhook, replace the four
values in `.env.production` and run `docker compose up -d api`. Then repeat step 4 with a real card.

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

The `backup` service writes a `mysqldump` of the database (`db-<time>.sql.gz`) and an archive of the
uploads (`uploads-<time>.tar.gz`) into the `backups` volume once a day, and keeps 14 days
(`BACKUP_KEEP_DAYS`). The dump is taken without locking the site. Check that it is working:

```bash
docker compose logs backup
docker compose run --rm --entrypoint ls backup -lh /backups
```

The volume lives on this server, so it protects against mistakes, not against losing the server. Also
copy it somewhere else (another machine or object storage) on a schedule. For example, pack it into a
file in the current folder and download that:

```bash
docker run --rm -v invite_backups:/backups -v "$PWD":/out alpine tar czf /out/backups.tgz -C / backups
```

Restore the database from a dump (this replaces the current data):

```bash
docker compose stop api web
docker compose run --rm --entrypoint bash backup -c \
  'export MYSQL_PWD="$MYSQL_PASSWORD"; gunzip -c /backups/db-<time>.sql.gz | mysql -h db -u "$MYSQL_USER" "$MYSQL_DATABASE"'
docker compose start api web
```

The dump drops and recreates each table, so it can be loaded over an existing database. Do a restore test
once before you rely on it (for example into a copy of the stack on another machine).

## Environment variables

See `.env.example` for development and `.env.production.example` for production.

| Variable | Notes |
| --- | --- |
| `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | Create the database and its user the first time the `db` container starts. Changing them later does not change an existing database |
| `DATABASE_URL` | `mysql://<MYSQL_USER>:<MYSQL_PASSWORD>@db:3306/<MYSQL_DATABASE>` |
| `APP_URL`, `CORS_ORIGINS` | The public address, `http://<server address>` (plus `:<port>` if `WEB_PORT` is not 80) |
| `COOKIE_SECURE`, `ALLOW_INSECURE_HTTP` | `false` and `true` for plain http. With `COOKIE_SECURE=false` the API refuses to start in production unless `ALLOW_INSECURE_HTTP=true` |
| `TRUST_PROXY` | Set to `1` by compose: the web container's nginx is the only proxy in front of the API |
| `WEB_PORT` | The one published port, default `80` (read by compose from the shell or a `.env` file next to it) |
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
