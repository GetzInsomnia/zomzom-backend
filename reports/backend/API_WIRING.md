# API_WIRING

## Findings
- Files importing @prisma/client: 17
  - prisma/seed.light.ts
  - prisma/seed.ts
  - src/auth/jwt.ts
  - src/auth/refreshToken.repository.ts
  - src/auth/verificationToken.repository.ts
  - src/common/idempotency.ts
  - src/common/middlewares/authGuard.ts
  - src/common/utils/audit.ts
  - src/common/utils/requestUser.ts
  - src/global.d.ts
  - src/modules/articles/routes.ts
  - src/modules/backup/routes.ts
  - src/modules/index/routes.ts
  - src/modules/properties/routes.ts
  - src/modules/scheduler/routes.ts
  - src/prisma/client.ts
  - src/prisma/seed.light.ts
- Files using NEXT_PUBLIC_API_URL: 0
- Files calling Next API (/api/*): 0