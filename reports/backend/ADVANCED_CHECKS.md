# ADVANCED_CHECKS

## Auth Phase-2 readiness

- ✅ Refresh cookie name set to `rt` — found=rt
- ❌ Refresh cookie path locked to /v1/auth/refresh — path option missing
- ❌ Refresh cookie SameSite is 'lax' — sameSite option missing
- ✅ Email verification request endpoint
- ✅ Email verification confirm endpoint
- ✅ Revoke-all sessions endpoint
- ✅ Refresh endpoint with rotation
- ✅ Logout endpoint clears refresh cookie
- ✅ JWT payloads include token version (`tv`) claim
- ✅ Idempotency middleware stores and replays responses
- ✅ Idempotency middleware schedules cleanup for expired keys
- ✅ Scheduler can release expired reservations
- ✅ Prisma model for IdempotencyKey present
- ✅ Prisma model for RefreshToken present
- ✅ docker-compose defines `api` service
- ✅ docker-compose defines `db` service
- ✅ Postman collection present — postman/Realestate-API.postman_collection.json
- ✅ Postman local environment present — postman/local.postman_environment.json
