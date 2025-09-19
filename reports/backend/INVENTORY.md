# INVENTORY

**Repo**: zomzom-backend  |  **Version**: 0.1.0  |  **Type**:  Backend(Fastify/Prisma)

## File type counts (top 20)
- `.ts`: 41
- `.md`: 13
- `(noext)`: 6
- `.json`: 6
- `.js`: 2
- `.yml`: 1
- `.sql`: 1
- `.toml`: 1
- `.prisma`: 1

## Tree (depth=3)
```
├─ prisma
│  ├─ migrations
│  │  ├─ 000_init
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
│     ├─ API_WIRING.md
│     ├─ BUILD.json
│     ├─ ENV.md
│     ├─ FASTIFY_TYPES.md
│     ├─ I18N.md
│     ├─ INVENTORY.md
│     ├─ PERFORMANCE.md
│     ├─ PRISMA_STATE.md
│     ├─ PRISMA.md
│     ├─ ROUTES.md
│     ├─ SECURITY.md
│     └─ SEO.md
├─ scripts
│  ├─ generate-initial-migration.js
│  └─ xray-lite.js
├─ src
│  ├─ auth
│  │  ├─ jwt.ts
│  │  ├─ routes.ts
│  │  ├─ schemas.ts
│  │  └─ service.ts
│  ├─ catalog
│  │  ├─ filters.schema.ts
│  │  ├─ filters.ts
│  │  └─ transit.ts
│  ├─ common
│  │  ├─ middlewares
│  │  │  ├─ authGuard.ts
│  │  │  ├─ csrf.ts
│  │  │  └─ errorHandler.ts
│  │  └─ utils
│  │     ├─ audit.ts
│  │     ├─ file.ts
│  │     ├─ httpErrors.ts
│  │     └─ preview.ts
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
│  ├─ types
│  │  └─ fastify.d.ts
│  ├─ env.ts
│  └─ server.ts
├─ .editorconfig
├─ .env
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