# CHECKS (pre-dev)

- ✅ .env file present
- ✅ DATABASE_URL present
- ✅ JWT_SECRET present (>=32 chars) — length=70
- ✅ CORS_ORIGIN present — http://localhost:3000
- ✅ server.ts exists
- ✅ helmet/cors/rate-limit registered
- ✅ jwtPlugin registered
- ✅ jwtPlugin BEFORE registerAuthRoutes
- ✅ /health route exists
- ✅ app.listen host '0.0.0.0'
- ✅ src/types/*.d.ts with fastify augmentation
- ✅ tsconfig.include includes .d.ts — include=["src/**/*.ts","src/**/*.tsx","src/**/*.d.ts","prisma/**/*.ts","scripts/**/*.ts"]
- ✅ prisma/migrations present — 1 folders
- ✅ has 000_init migration folder
- ✅ prisma/seed.light.ts present
- ✅ package.json script: dev
- ✅ package.json script: seed:light
- ✅ package.json script: generate