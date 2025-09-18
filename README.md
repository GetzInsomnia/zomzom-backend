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
- **Prisma ORM** with MySQL schema, migrations, and seed script generating demo data (50 properties, 5 articles, base rates, and admin user).

## Getting started

### Requirements

- Node.js 18+
- npm 9+
- MySQL 8+ (or compatible Aurora/MySQL service)

### Installation

```bash
npm install
cp .env.example .env
# Update .env with real credentials and secrets
```

### Developer runbook

1. **Boot MySQL** – run `docker compose up -d db` (or point `DATABASE_URL` to your own MySQL 8 instance). When developing migrations locally, also create an empty shadow database and expose it through `SHADOW_DATABASE_URL`.
2. **Apply migrations** – when pulling an existing branch, execute `npm run migrate` to run `prisma migrate deploy` against the main database. When authoring new schema changes, use `npx prisma migrate dev --name <change>` which consumes both `DATABASE_URL` and `SHADOW_DATABASE_URL`.
3. **Seed demo content** – `npm run seed` applies migrations and inserts the v6 fixtures (admin user `admin`/`ChangeMe123!`, 50 properties, 5 articles, base FX rate). The script is idempotent and safe to rerun.
4. **Start the API server** – `npm run dev` launches Fastify via `ts-node-dev` with auto-reload. For a production-like run, build once with `npm run build` and serve using `npm run start`.

### Dev (shadow) vs Prod (deploy)

- **Local development** – use `prisma migrate dev` to create new migrations or iterate on schema changes. Prisma requires a shadow database for this workflow; supply it via `SHADOW_DATABASE_URL` (for example a secondary schema on your local MySQL). The command resets the shadow database on every run, so never point it at a shared environment.
- **Deployed environments** – only run `prisma migrate deploy` (surfaced through `npm run migrate` and inside the seeding script) against staging/production. This command executes already-checked-in migrations without needing a shadow database and is safe for zero-downtime deploys.

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | MySQL connection string (`mysql://USER:PASS@HOST:3306/DB`) |
| `SHADOW_DATABASE_URL` | Optional MySQL URL used only by `prisma migrate dev` when generating migrations |
| `JWT_SECRET` | 32+ character secret for signing JWT access tokens |
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
3. Configure environment variables in Plesk using the values from `.env.example` (ensure a strong `JWT_SECRET` and production `CORS_ORIGIN`).
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
