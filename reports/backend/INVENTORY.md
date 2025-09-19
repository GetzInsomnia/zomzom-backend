# INVENTORY

**Repo**: zomzom-backend  |  **Version**: 0.1.0  |  **Type**:  Backend(Fastify/Prisma)

## File type counts (top 20)

- `.ts`: 38
- `(noext)`: 6
- `.json`: 3
- `.sql`: 2
- `.js`: 2
- `.yml`: 1
- `.toml`: 1
- `.prisma`: 1
- `.md`: 1

## Tree (depth=3)
```
├─ prisma
│  ├─ migrations
│  │  ├─ 20241009120000_property_enhancements
│  │  │  └─ migration.sql
│  │  ├─ 20241010120000_backend_hotfix_v6_1
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  ├─ schema.prisma
│  └─ seed.ts
├─ public
│  ├─ data
│  │  └─ index
│  │     └─ .gitkeep
│  └─ uploads
│     └─ .gitkeep
├─ reports
│  └─ backend
├─ scripts
│  ├─ generate-initial-migration.js
│  └─ xray-lite.js
├─ src
│  ├─ auth
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
│  │  └─ types.ts
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
└─ tsconfig.json

```