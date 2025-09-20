# INVENTORY

**Repo**: zomzom-backend  |  **Version**: 0.1.0  |  **Type**:  Backend(Fastify/Prisma)

## File type counts (top 20)
- `.ts`: 49
- `.md`: 21
- `.json`: 8
- `(noext)`: 6
- `.sql`: 5
- `.js`: 2
- `.example`: 1
- `.yml`: 1
- `.toml`: 1
- `.prisma`: 1

## Tree (depth=3)
```
├─ postman
│  ├─ local.postman_environment.json
│  └─ Realestate-API.postman_collection.json
├─ prisma
│  ├─ migrations
│  │  ├─ 000_init
│  │  │  └─ migration.sql
│  │  ├─ 001_add_idem_key
│  │  │  └─ migration.sql
│  │  ├─ 002_add_email_verification
│  │  │  └─ migration.sql
│  │  ├─ 003_update_auth_schema
│  │  │  └─ migration.sql
│  │  ├─ 004_update_idem_key_table
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  ├─ schema.prisma
│  ├─ seed.light.ts
│  └─ seed.ts
├─ public
│  ├─ data
│  │  └─ index
│  │     └─ .gitkeep
│  └─ uploads
│     └─ .gitkeep
├─ reports
│  └─ backend
│     ├─ ADMIN.md
│     ├─ ADVANCED_CHECKS.md
│     ├─ API_WIRING.md
│     ├─ BUILD.json
│     ├─ CHECKLIST.md
│     ├─ CHECKS.md
│     ├─ ENV.md
│     ├─ FASTIFY_AUGMENTATION.md
│     ├─ FASTIFY_TYPES.md
│     ├─ I18N.md
│     ├─ INVENTORY.md
│     ├─ PERFORMANCE.md
│     ├─ PRISMA_STATE.md
│     ├─ PRISMA.md
│     ├─ ROUTE_GUARDS.md
│     ├─ ROUTES_AUTH_GUARD.md
│     ├─ ROUTES.md
│     ├─ SECURITY.md
│     ├─ SEO.md
│     ├─ SNIPPETS.md
│     └─ XRAY_FULL.md
├─ scripts
│  ├─ generate-initial-migration.js
│  └─ xray-lite.js
├─ src
│  ├─ auth
│  │  ├─ emailVerification.service.ts
│  │  ├─ jwt.ts
│  │  ├─ refreshToken.repository.ts
│  │  ├─ refreshToken.service.ts
│  │  ├─ routes.ts
│  │  ├─ schemas.ts
│  │  ├─ service.ts
│  │  ├─ token.ts
│  │  └─ verificationToken.repository.ts
│  ├─ catalog
│  │  ├─ filters.schema.ts
│  │  ├─ filters.ts
│  │  └─ transit.ts
│  ├─ common
│  │  ├─ middlewares
│  │  │  ├─ authGuard.ts
│  │  │  ├─ csrf.ts
│  │  │  └─ errorHandler.ts
│  │  ├─ utils
│  │  │  ├─ audit.ts
│  │  │  ├─ file.ts
│  │  │  ├─ httpErrors.ts
│  │  │  ├─ preview.ts
│  │  │  └─ requestUser.ts
│  │  └─ idempotency.ts
│  ├─ modules
│  │  ├─ articles
│  │  │  ├─ routes.ts
│  │  │  ├─ schemas.ts
│  │  │  └─ service.ts
│  │  ├─ backup
│  │  │  ├─ routes.ts
│  │  │  └─ service.ts
│  │  ├─ catalog
│  │  │  └─ routes.ts
│  │  ├─ index
│  │  │  ├─ routes.ts
│  │  │  ├─ schemas.autogen.ts
│  │  │  └─ service.ts
│  │  ├─ properties
│  │  │  ├─ dto.ts
│  │  │  ├─ routes.ts
│  │  │  ├─ schemas.ts
│  │  │  └─ service.ts
│  │  ├─ scheduler
│  │  │  ├─ routes.ts
│  │  │  ├─ schemas.ts
│  │  │  └─ service.ts
│  │  ├─ suggest
│  │  │  ├─ routes.ts
│  │  │  ├─ schemas.ts
│  │  │  └─ service.ts
│  │  └─ uploads
│  │     └─ service.ts
│  ├─ prisma
│  │  ├─ client.ts
│  │  ├─ seed.light.ts
│  │  └─ types.ts
│  ├─ t
│  ├─ env.ts
│  ├─ global.d.ts
│  └─ server.ts
├─ .editorconfig
├─ .env
├─ .env.example
├─ .gitignore
├─ docker-compose.yml
├─ Dockerfile
├─ package-lock.json
├─ package.json
├─ README.md
├─ tsconfig.base.json
├─ tsconfig.build.json
└─ tsconfig.json

```