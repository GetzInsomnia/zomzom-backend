# ENV

## Present env files
- ✅ .env
- ❌ .env.local
- ❌ .env.example
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
| `JWT_SECRET` | z.string |
| `ADMIN_FALLBACK_USERNAME` | z.string |
| `ADMIN_FALLBACK_PASSWORD` | z.string |
| `CORS_ORIGIN` | z.string |
| `UPLOAD_DIR` | z.string |
| `WATERMARK_ENABLED` | z.coerce.boolean |
| `WATERMARK_TEXT` | z.string |
| `RATE_LIMIT_MAX` | z.coerce.number |
| `RATE_LIMIT_WINDOW` | z.coerce.number |
| `INDEX_DIR` | z.string |