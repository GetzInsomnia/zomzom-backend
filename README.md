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

### Database setup

Run migrations and seed sample content (admin user `admin`/`ChangeMe123!`, update after first login):

```bash
npm run seed
```

The seed script executes `prisma migrate deploy` before inserting data.

### Development

```bash
npm run dev
```

The dev server uses `ts-node-dev` with automatic reloads.

### Build & production start

```bash
npm run build
npm run start
```

### Prisma utilities

```bash
npm run migrate      # prisma migrate deploy
npm run seed         # migrate + seed demo data
```

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | MySQL connection string (`mysql://USER:PASS@HOST:3306/DB?sslmode=prefer`) |
| `JWT_SECRET` | 32+ character secret for signing JWT access tokens |
| `CORS_ORIGIN` | Comma-delimited origin allow list (production must include `https://www.zomzomproperty.com`) |
| `PORT` | HTTP port (default `3001`) |
| `UPLOAD_DIR` | Filesystem path to store processed uploads (`./public/uploads`) |
| `WATERMARK_ENABLED` | Toggle watermark overlay for Sharp-processed images (`true`/`false`) |
| `WATERMARK_TEXT` | Text rendered in the image watermark |
| `RATE_LIMIT_MAX` | Requests per window (default `100`) |
| `RATE_LIMIT_WINDOW` | Rate limit window in seconds (default `900`, i.e. 15 minutes) |
| `INDEX_DIR` | Directory for MiniSearch index JSON files (`./public/data/index`) |

## API overview

All routes are prefixed with `/v1`. Mutation endpoints require JWT Bearer authentication (`Authorization: Bearer <token>`), and additional role checks (`ADMIN`, `EDITOR`, `AGENT`, `USER`).

- `POST /v1/auth/login` – Obtain access token
- `GET /v1/auth/me` – Current user profile
- `POST /v1/properties` – Create property (ADMIN/EDITOR)
- `PATCH /v1/properties/:id` – Update property (ADMIN/EDITOR)
- `POST /v1/properties/:id/images` – Upload watermarked images (ADMIN/EDITOR)
- `DELETE /v1/properties/:id/images/:imageId` – Remove image (ADMIN/EDITOR)
- `GET /v1/properties` – Filterable, paginated list
- `GET /v1/properties/:id` – Property detail
- `POST /v1/articles` / `PATCH /v1/articles/:id` – Manage articles (ADMIN/EDITOR)
- `GET /v1/articles/:slug` – Public article view (published only)
- `POST /v1/schedule` – Queue change set (ADMIN)
- `GET /v1/schedule/jobs` – List publish jobs (ADMIN)
- `POST /v1/index/rebuild` – Force index rebuild (ADMIN)
- `POST /v1/backup` – Stream ZIP backup (ADMIN)
- `GET /api/suggest?q=` – Lightweight suggestion service sourced from prebuilt data

All mutating operations emit audit log entries.

## File uploads

`POST /v1/properties/:id/images` accepts multipart form data (handled via Formidable). Files are processed through Sharp with optional watermark overlay before being written under `UPLOAD_DIR/properties/<propertyId>/`. The response returns persisted image metadata and URLs.

## Scheduling & publishing

`POST /v1/schedule` stores a `ChangeSet` and `PublishJob`. The scheduler (in-process `setInterval` loop) polls every 60 seconds for `queued` jobs whose `runAt` is in the past, applies the patch (property/article update), logs success/failure, and triggers a MiniSearch index rebuild.

## Backups

`POST /v1/backup` streams a ZIP archive that contains JSON exports for properties, articles, users, locations, rates, change sets, publish jobs, audit logs, plus the entire upload directory if present.

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
