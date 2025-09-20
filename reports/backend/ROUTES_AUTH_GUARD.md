# ROUTES_AUTH_GUARD

- files scanned: 8
- no "import { authenticate } ...authGuard": ✅
- ⚠ routes that do not use app.authenticate anywhere (manual review):
  - src/modules/articles/routes.ts
  - src/modules/backup/routes.ts
  - src/modules/catalog/routes.ts
  - src/modules/index/routes.ts
  - src/modules/properties/routes.ts
  - src/modules/scheduler/routes.ts
  - src/modules/suggest/routes.ts