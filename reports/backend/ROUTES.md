# ROUTES

## Backend (Fastify) — static scan

| Method | Path/Url | File |
|---|---|---|
| POST | `/v1/auth/register` | `src/auth/routes.ts` |
| POST | `/v1/auth/login` | `src/auth/routes.ts` |
| GET | `/v1/auth/me` | `src/auth/routes.ts` |
| POST | `/v1/auth/logout` | `src/auth/routes.ts` |
| POST | `/v1/auth/verify/request` | `src/auth/routes.ts` |
| POST | `/v1/auth/verify/confirm` | `src/auth/routes.ts` |
| POST | `/v1/auth/refresh` | `src/auth/routes.ts` |
| POST | `/v1/auth/revoke-all` | `src/auth/routes.ts` |
| GET | `/v1/articles/:slug` | `src/modules/articles/routes.ts` |
| POST | `/v1/articles` | `src/modules/articles/routes.ts` |
| PATCH | `/v1/articles/:id` | `src/modules/articles/routes.ts` |
| POST | `/v1/admin/articles/:id/draft` | `src/modules/articles/routes.ts` |
| POST | `/v1/admin/articles/:id/review` | `src/modules/articles/routes.ts` |
| POST | `/v1/admin/articles/:id/schedule` | `src/modules/articles/routes.ts` |
| POST | `/v1/admin/articles/:id/publish` | `src/modules/articles/routes.ts` |
| POST | `/v1/admin/articles/:id/hide` | `src/modules/articles/routes.ts` |
| DELETE | `/v1/admin/articles/:id` | `src/modules/articles/routes.ts` |
| POST | `/v1/admin/articles/:id/restore` | `src/modules/articles/routes.ts` |
| GET | `/api/admin/backup` | `src/modules/backup/routes.ts` |
| GET | `/api/catalog/filters` | `src/modules/catalog/routes.ts` |
| GET | `/api/catalog/transit` | `src/modules/catalog/routes.ts` |
| GET | `/v1/properties` | `src/modules/properties/routes.ts` |
| GET | `/v1/properties/:id` | `src/modules/properties/routes.ts` |
| POST | `/v1/properties` | `src/modules/properties/routes.ts` |
| PATCH | `/v1/properties/:id` | `src/modules/properties/routes.ts` |
| POST | `/v1/properties/:id/images` | `src/modules/properties/routes.ts` |
| DELETE | `/v1/properties/:id/images/:imageId` | `src/modules/properties/routes.ts` |
| POST | `/v1/admin/properties/:id/draft` | `src/modules/properties/routes.ts` |
| POST | `/v1/admin/properties/:id/review` | `src/modules/properties/routes.ts` |
| POST | `/v1/admin/properties/:id/schedule` | `src/modules/properties/routes.ts` |
| POST | `/v1/admin/properties/:id/publish` | `src/modules/properties/routes.ts` |
| POST | `/v1/admin/properties/:id/hide` | `src/modules/properties/routes.ts` |
| DELETE | `/v1/admin/properties/:id` | `src/modules/properties/routes.ts` |
| POST | `/v1/admin/properties/:id/restore` | `src/modules/properties/routes.ts` |
| POST | `/v1/schedule` | `src/modules/scheduler/routes.ts` |
| GET | `/v1/schedule/jobs` | `src/modules/scheduler/routes.ts` |
| GET | `/api/suggest` | `src/modules/suggest/routes.ts` |
| GET | `/health` | `src/server.ts` |
| GET | `/ready` | `src/server.ts` |