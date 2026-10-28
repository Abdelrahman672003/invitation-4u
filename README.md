# Daawa (دعوة) — Digital Invitation Platform

Arabic-first platform for creating, publishing and sharing digital invitations, with guest RSVP management.
"Daawa" is a working name; the brand strings live in `apps/web/src/i18n/locales/*.json`.

## Stack

| Layer | Choice |
| --- | --- |
| Web | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query, react-hook-form, i18next |
| API | Node 22, Express 5, TypeScript, Zod |
| Data | SQLite, Prisma (migrations in `prisma/migrations`) |
| Tests | Vitest, React Testing Library, Supertest (Playwright arrives with the E2E milestone) |

```
apps/web         React app (feature modules under src/features)
apps/api         Express API (modules under src/modules)
packages/shared  Zod schemas, types and constants used by both
prisma/          schema.prisma, migrations, seed
docs/            requirements, api, database, deployment
```

## Getting started

Requirements: Node 22+ (no database server needed; SQLite is a local file).

```bash
cp .env.example .env          # dev defaults work out of the box
npm install
npm run db:deploy             # apply migrations
npm run db:seed               # categories, packages, dev admin (see SEED_ADMIN_* in .env)
npm run dev                   # API :4000 and web :5173
```

Open http://localhost:5173. The design-system reference is at `/styleguide` in development.
Password-reset emails are printed to the API console (console email adapter).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (tsx watch) + web (Vite) together |
| `npm test` | Shared unit tests, API integration tests (uses `TEST_DATABASE_URL`), web component tests |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript across the workspace |
| `npm run build` | Production builds of API (`apps/api/dist`) and web (`apps/web/dist`) |
| `npm run db:migrate` | Create a new migration during development |

## Milestones

1. **Foundation** — monorepo, database schema, auth, design system, RTL/i18n, CI ✅
2. **Templates** — shared invitation renderer, 16 templates, gallery ✅
3. **Marketing site** — home, categories, how it works, pricing, FAQ, contact, legal drafts ✅
4. **Editor + customer dashboard** — autosave editor, live preview, dashboard (photo upload deferred) ✅
5. **Public invitations, guests, RSVP, sharing** — `/i/:slug`, guest list, RSVP, WhatsApp/native share ✅
6. **Payments** — provider adapter, backend checkout, signed idempotent webhooks, history (simulated gateway only) ✅
7. **Admin** — users, moderation, templates, pricing, payments, audit log ✅
8. Quality — OpenAPI ✅, deployment config ✅, view analytics ✅; browser E2E tests deferred

See `docs/requirements.md` for decisions and open questions.
