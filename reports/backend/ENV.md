# ENV

## Present env files
- ✅ .env
- ❌ .env.local
- ✅ .env.example
- ❌ .env.development
- ❌ .env.production

## src/env.ts keys (best-effort)

| Key | Type/Default |
|---|---|
| `NODE_ENV` | z.enum(['development', 'test', 'production']).default( |
| `HOST` | z.string |
| `PORT` | z.coerce.number |
| `DATABASE_URL` | z.string |
| `SHADOW_DATABASE_URL` | z.string |
| `REFRESH_COOKIE_HTTP_ONLY` | z.coerce.boolean |
| `REFRESH_COOKIE_SECURE` | z.coerce.boolean |
| `REFRESH_COOKIE_PATH` | z.string |
| `REFRESH_COOKIE_DOMAIN` | z.string |
| `ADMIN_FALLBACK_USERNAME` | z.string |
| `ADMIN_FALLBACK_PASSWORD` | z.string |
| `CORS_ORIGIN` | z.string |
| `APP_BASE_URL` | z.string |
| `UPLOAD_DIR` | z.string |
| `WATERMARK_ENABLED` | z.coerce.boolean |
| `WATERMARK_TEXT` | z.string |
| `RATE_LIMIT_MAX` | z.coerce.number |
| `RATE_LIMIT_WINDOW` | z.coerce.number |
| `INDEX_DIR` | z.string |