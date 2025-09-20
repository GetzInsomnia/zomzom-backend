# Zomzom Property Backend

Secure API layer for the Zomzom Property platform built with Fastify, Prisma, and MySQL. The service exposes RBAC-protected administration, content scheduling, search indexing, and secure asset uploads while enforcing strict CORS and rate limiting requirements.

## Features

- **Fastify API (`/v1`)** with helmet, rate limiting, and strict CORS (production: `https://www.zomzomproperty.com`; development additionally allows `http://localhost:3000`).
- **JWT authentication** with short-lived access tokens, role-based guards, and audit logging for every mutating endpoint.
- **Property & article management** including localized content, file uploads processed with Sharp, and publication scheduling via ChangeSets/PublishJobs.
- **Search indexing** powered by MiniSearch with atomic writes under `public/data/index` and an admin-only rebuild endpoint.
- **In-process scheduler** that applies queued change sets every 60 seconds and rebuilds the search index after successful execution.
- **Backup streaming** endpoint producing a ZIP archive with JSON exports and uploaded assets using Archiver.
- **Suggestion endpoint** for quick “starts with” lookups from property titles, article titles, and locations.
- **Prisma ORM** with MySQL schema, migrations, and a `prisma/seed.ts` fixture that provisions an `admin`/`admin123` superuser, roughly thirty multilingual showcase properties, and placeholder Unsplash imagery.

## Backend status

- **Auth Phase-2 flows** – Registration, email verification, refresh rotation, and session revocation are live with rate-limited endpoints and cookie helpers hardened for production refresh workflows (`src/auth/routes.ts`, `src/auth/token.ts`, `src/auth/refreshToken.service.ts`, `src/auth/emailVerification.service.ts`).
- **Idempotency replay** – `registerIdempotencyMiddleware` captures request/response payloads, hashes responses, and supports replaying safe retries on any route that opts-in, backed by the `IdempotencyKey` model (`src/common/idempotency.ts`, `src/server.ts`, `prisma/schema.prisma`, `prisma/migrations/004_update_idem_key_table/migration.sql`).
- **Schema updates** – Prisma schema reflects the refreshed auth stack (verification + refresh tokens) alongside the idempotency ledger and scheduler relationships to guarantee referential integrity (`prisma/schema.prisma`).
- **Tooling & endpoints** – Health/readiness endpoints and scheduler/index modules are registered by default, with diagnostics captured by the lightweight architecture x-ray reporter (`src/server.ts`, `scripts/xray-lite.js`, `reports/backend/XRAY_FULL.md`).

## Getting started

### Requirements

- Node.js 18+
- npm 9+
- MySQL 8+ (or compatible Aurora/MySQL service)

### Installation

```bash
npm install
cp .env.example .env
# Update .env with real credentials and secrets (see table below)
```

### Quick start

1. **Configure environment** – Duplicate `.env.example`, review cookie/security flags (`REFRESH_COOKIE_*`) and database credentials, then keep the file local to your machine. Compose services also read this file by default.
2. **Launch infrastructure** – Start the API and MySQL services together with Docker Compose: `docker compose up -d` (brings up both `api` and `db`; the API container waits on the DB health check before booting Fastify).
3. **Run migrations** – Whether you are running the API in Docker or locally, apply the checked-in migrations with `npx prisma migrate deploy` so Prisma client models stay in sync.
4. **Seed demo content** – `npm run seed` executes `prisma/seed.ts`, creating the default `admin`/`admin123` account, seeding roughly thirty multilingual showcase properties, and attaching placeholder imagery/metadata. The script is idempotent and safe to rerun after `npx prisma migrate deploy`.
5. **Start the API server** – `npm run dev` launches Fastify via `ts-node-dev` with auto-reload. For a production-like run, build once with `npm run build` and serve using `npm run start`.
6. **Exercise endpoints** – Import `postman/Realestate-API.postman_collection.json` into Postman (paired with `postman/local.postman_environment.json`) or run it headlessly via `npx newman run postman/Realestate-API.postman_collection.json -e postman/local.postman_environment.json` to validate happy-path flows against your environment.
7. **Run the architecture x-ray (optional)** – `npm run xray` executes `scripts/xray-lite.js` and writes the consolidated report to `reports/backend/`.

With a clean database, run the following in order: `docker compose up -d`, `npx prisma migrate deploy`, `npm run seed`, `npm run dev`.

### Developer runbook

1. **Boot MySQL only (optional)** – If you prefer to run the API locally rather than in Docker, use `docker compose up -d db` (or point `DATABASE_URL` to your own MySQL 8 instance). The compose file loads shared values from `.env` and defaults to `zomzom`/`zomzompass` (user) with `root`/`rootpass` for the root account so the example `DATABASE_URL` works out of the box. When developing migrations locally, also create an empty shadow database and expose it through `SHADOW_DATABASE_URL`.
2. **Manage migrations** – Choose the workflow that matches your environment:
   - **Local iteration (`prisma migrate dev`)** – When prototyping locally, run `npx prisma migrate dev --name <change>` with both `DATABASE_URL` and an empty `SHADOW_DATABASE_URL`. This flow regenerates your dev database and shadow schema so you can iterate quickly.
   - **Diff + deploy (recommended for Plesk/production)** – Use the helper script `npm run migrate:init` to wrap `prisma migrate diff` and capture SQL migrations under `prisma/migrations/`. Commit the generated folder and apply it in shared environments with `npx prisma migrate deploy` so no shadow database credentials are required.
3. **Smoke tests** – Continue to use the bundled Postman collection or Newman command above after each feature branch or migration to ensure RBAC flows and idempotent POSTs behave as expected.

### Migration workflows

- **Local development (`prisma migrate dev`)** – Optional for developers who want the full Prisma workflow. Provide `SHADOW_DATABASE_URL` for the throwaway schema Prisma creates, and keep it scoped to local resources because the shadow database is dropped/recreated on each run.
- **Diff + deploy for shared environments** – Use `npm run migrate:init` to generate SQL via `prisma migrate diff` and commit the resulting folder in `prisma/migrations/`. When promoting to staging, Plesk, or production, run `npx prisma migrate deploy` to apply the checked-in SQL without requiring a shadow database.

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | MySQL connection string (`mysql://USER:PASS@HOST:3306/DB`) |
| `SHADOW_DATABASE_URL` | Optional MySQL URL used only by `prisma migrate dev` when generating migrations |
| `ACCESS_TOKEN_SECRET` | 32+ character secret for signing JWT access tokens |
| `REFRESH_TOKEN_SECRET` | 32+ character secret for signing JWT refresh tokens |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token lifetime (seconds or time expression like `15m`) |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime (seconds or time expression like `7d`) |
| `REFRESH_COOKIE_HTTP_ONLY` | `true`/`false` flag controlling the refresh cookie `HttpOnly` attribute |
| `REFRESH_COOKIE_SECURE` | `true`/`false` flag forcing the refresh cookie `Secure` attribute (defaults to `true` in production; set `false` only for local development over HTTP) |
| `REFRESH_COOKIE_SAME_SITE` | SameSite mode for the refresh cookie (`lax`/`strict`/`none`) |
| `REFRESH_COOKIE_PATH` | Path scope for the refresh cookie (`/`) |
| `REFRESH_COOKIE_DOMAIN` | Optional domain for the refresh cookie |
| `ADMIN_FALLBACK_USERNAME` | Optional emergency admin username accepted only when no users exist |
| `ADMIN_FALLBACK_PASSWORD` | Optional emergency admin password paired with the fallback username |
| `CORS_ORIGIN` | Comma-delimited origin allow list (production must include `https://www.zomzomproperty.com`) |
| `HOST` | Interface Fastify binds to (default `0.0.0.0`) |
| `PORT` | HTTP port (default `4000`) |
| `UPLOAD_DIR` | Filesystem path to store processed uploads (`./public/uploads`) |
| `WATERMARK_ENABLED` | Toggle watermark overlay for Sharp-processed images (`true`/`false`) |
| `WATERMARK_TEXT` | Text rendered in the image watermark |
| `RATE_LIMIT_MAX` | Requests per window (default `100`) |
| `RATE_LIMIT_WINDOW` | Rate limit window in seconds (default `900`, i.e. 15 minutes) |
| `INDEX_DIR` | Directory for MiniSearch index JSON files (`./public/data/index`) |

Refer to `.env.example` for sample values that align with Docker Compose defaults and the refresh cookie guidance above.

## Tooling & diagnostics

- **Architecture x-ray** – Run `npm run xray` or invoke `node scripts/xray-lite.js --out reports/backend` directly to regenerate dependency maps and readiness notes. The full report is written to `reports/backend/XRAY_FULL.md`; supplemental extracts live alongside it in the `reports/backend` folder.
- **Health surfaces** – `GET /health` (liveness) and `GET /ready` (DB-backed readiness) are available once the server boots, making it easy to wire into container orchestrators or uptime checks.

## API overview (v6)

All application routes are prefixed with `/v1`; public utilities live under `/api`. Mutating endpoints require JWT Bearer authentication and role-based guards (`ADMIN`, `EDITOR`, `AGENT`, `USER`). Every write audited via `AuditLog`.

### Health & auth

- `GET /health` – Liveness probe.
- `POST /v1/auth/login` – Issues JWT + refreshless session metadata, returns a one-time CSRF token and sets the `csrfToken` cookie (rate-limited to 5 attempts/15 min per IP).
- `GET /v1/auth/me` – Current user profile.
- `POST /v1/auth/logout` – Clears the CSRF cookie (requires authentication).

### Properties

- `GET /v1/properties` – Filterable list, honours `x-preview-mode: true` for admins/editors to inspect drafts.
- `GET /v1/properties/:id` – Property detail with preview support.
- `POST /v1/properties` – Create property (`ADMIN`/`EDITOR`, CSRF protected).
- `PATCH /v1/properties/:id` – Update property (`ADMIN`/`EDITOR`, CSRF protected).
- `POST /v1/properties/:id/images` – Upload images processed via Sharp (`ADMIN`/`EDITOR`, multipart + CSRF protected).
- `DELETE /v1/properties/:id/images/:imageId` – Remove image (`ADMIN`/`EDITOR`, CSRF protected).
- `POST /v1/admin/properties/:id/{draft|review|schedule|publish|hide}` – Workflow transitions with audit logging (`ADMIN`/`EDITOR`, CSRF protected; `schedule` accepts `scheduledAt`).
- `DELETE /v1/admin/properties/:id` – Soft-delete (`ADMIN`/`EDITOR`, CSRF protected).
- `POST /v1/admin/properties/:id/restore` – Restore a soft-deleted record (`ADMIN`/`EDITOR`, CSRF protected).

### Articles

- `GET /v1/articles/:slug` – Public article view (preview header reveals drafts to editors/admins).
- `POST /v1/articles` – Create article (`ADMIN`/`EDITOR`, CSRF protected).
- `PATCH /v1/articles/:id` – Update article (`ADMIN`/`EDITOR`, CSRF protected).
- `POST /v1/admin/articles/:id/{draft|review|schedule|publish|hide}` – Workflow transitions mirroring properties.
- `DELETE /v1/admin/articles/:id` – Soft-delete.
- `POST /v1/admin/articles/:id/restore` – Restore.

### Scheduling & automation

- `POST /v1/schedule` – Queue a change set for the background scheduler (`ADMIN`, CSRF protected).
- `GET /v1/schedule/jobs` – Inspect queued and historical publish jobs (`ADMIN`).
- `POST /v1/index/rebuild` – Rebuild MiniSearch index and emit an audit record (`ADMIN`, CSRF protected).

### Operational utilities

- `GET /api/admin/backup` – Streamed ZIP backup with JSON exports and recent uploads (`ADMIN`).
- `GET /api/suggest?q=` – Lightweight suggestion service sourced from the on-disk search index.

## File uploads

`POST /v1/properties/:id/images` accepts multipart form data (handled via Formidable). Files are processed through Sharp with optional watermark overlay before being written under `UPLOAD_DIR/properties/<propertyId>/`. The response returns persisted image metadata and URLs.

All state-changing routes require the `x-csrf-token` header to match the `csrfToken` cookie issued at login. The same token must be echoed in the header when calling `POST`, `PATCH`, or `DELETE` endpoints.

## Scheduling & publishing

`POST /v1/schedule` stores a `ChangeSet` and `PublishJob`. The scheduler (in-process `setInterval` loop) polls every 60 seconds for `queued` jobs whose `runAt` is in the past, applies the patch (property/article update), logs success/failure, and triggers a MiniSearch index rebuild. Draft content can be previewed by authenticated editors/admins by supplying `x-preview-mode: true` on the relevant GET endpoints.

## Backups

`GET /api/admin/backup` streams a ZIP archive that contains JSON exports for properties, articles, users, locations, rates, change sets, publish jobs, audit logs, the MiniSearch index directory, an optional SQLite dev database (if present at `prisma/dev.db` or defined via `file:` `DATABASE_URL`), and uploads from the last 30 days. Older uploads are skipped to keep the archive manageable; the audit log metadata records how many recent files were included.

## Deployment (Plesk)

1. Create a **Node.js** application in Plesk (recommended subdomain: `api.zomzomproperty.com`).
2. Upload the repository or configure Git deployment.
3. Configure environment variables in Plesk using the values from `.env.example` (ensure a strong `ACCESS_TOKEN_SECRET`/`REFRESH_TOKEN_SECRET` pair and production `CORS_ORIGIN`).
4. Set the Node.js startup file to `dist/server.js` and the application mode to “production”.
5. Install dependencies and run migrations:
   ```bash
   npm install
   npx prisma migrate deploy
   npm run build
   npm run start
   ```
6. Ensure the reverse proxy passes through the original client IP (`X-Forwarded-For`) so rate limiting works correctly. Enable “Pass through all headers” or equivalent setting in Plesk if available.

For zero-trust database access, only this API should communicate with MySQL; front-end clients interact exclusively with the Fastify endpoints via HTTPS.

## Security notes

- JWT tokens expire after 15 minutes; refresh by logging in again.
- Rate limiting defaults to 100 requests per 15 minutes per IP.
- CORS denies all origins except the configured list; non-browser clients must omit the `Origin` header.
- Payloads larger than 1 MB receive HTTP 413 responses.
- All Prisma writes occur inside transactions with audit logging.

## License

Proprietary – internal use for Zomzom Property.
