# CHECKLIST (preflight)

- server.ts uses runtime import of .d.ts: ✅
- server.ts uses `import type './types/fastify'`: –
- tsconfig includes src/**/*.d.ts: ✅
- jwtPlugin registered before routes: ✅
- /health route present: ✅