# CHECKS (pre-dev)

- ✅ .env file present
- ✅ DATABASE_URL present
- ✅ JWT_SECRET present (>=32 chars) — length=64
- ✅ CORS_ORIGIN present
- ✅ src/server.ts exists
- import './types/fastify' in server.ts: ❌
- helmet/cors/rate-limit registered: ✅
- /health route exists: ✅
- jwtPlugin BEFORE registerAuthRoutes: ❌
- tsconfig.include includes .d.ts — include=✅ "src/**/*.ts | src/**/*.tsx | src/**/*.d.ts | prisma/**/*.ts | scripts/**/*.ts"
- prisma/migrations present — ✅
- prisma/seed.light.ts present: ✅
- package.json script: dev ✅
- package.json script: seed:light ✅
- package.json script: generate ✅