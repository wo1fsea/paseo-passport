---
id: 02-auth-and-sessions
language: en-US
audience: agent
doc_type: spec
status: validated
owner: worker-003
branch:
pr:
files:
  - package.json
  - package-lock.json
  - apps/passport-server/package.json
  - apps/passport-server/src/index.ts
  - apps/passport-server/src/config.ts
  - apps/passport-server/src/auth/
  - apps/passport-server/src/db.ts
  - apps/passport-server/migrations/001_initial.sql
  - apps/passport-server/tests/auth.test.ts
  - scripts/init-auth.ts
depends_on:
  - 01-project-skeleton
claimed_at: 2026-05-04T01:43:54+08:00
lease_expires_at: 2026-05-04T03:43:54+08:00
updated: 2026-05-04
---

# Auth And Sessions Workstream

## Scope

Implement single-user password plus TOTP login, DB-backed sessions, auth
middleware, logout, and auth tests.

## Plan

- Extend config validation for required auth/session secrets.
- Add SQLite connection and migration runner for `sessions`.
- Implement Argon2id password verification.
- Implement TOTP verification with `otplib`.
- Implement `scripts/init-auth.ts` to generate password hash, TOTP secret, and
  `otpauth://` URL without writing secrets to git.
- Implement `POST /api/auth/login`.
- Implement `GET /api/auth/me`.
- Implement `POST /api/auth/logout`.
- Implement session creation, hashing, expiry, revocation, and cookie handling.
- Add login rate limiting.

## Validation

```powershell
npm run build
npm test -- --run auth
```

Manual checks:

```powershell
curl -i -X POST http://127.0.0.1:7317/api/auth/login
curl -i http://127.0.0.1:7317/api/auth/me --cookie "pp_session=..."
curl -i -X POST http://127.0.0.1:7317/api/auth/logout --cookie "pp_session=..."
```

Worker-003 validation:

```powershell
npm install --workspace @paseo-passport/passport-server argon2 otplib better-sqlite3
npm install
npm install --save-dev --workspace @paseo-passport/passport-server @types/better-sqlite3
npm test -- --run auth
npm run build
npm test -- --run
curl smoke on 127.0.0.1:7327 for /api/auth/login, /api/auth/me, /api/auth/logout
```

## Acceptance

- Bad password fails.
- Bad TOTP fails.
- Missing credentials fail safely.
- Valid password plus TOTP sets an `HttpOnly` session cookie.
- Expired or revoked sessions fail.
- Logout revokes the current session.
- Protected route middleware returns `401` for unauthenticated API requests.

## Change Gate Evidence

- Problem: the auth plugin needed production server/config integration and the
  fixed auth dependencies selected by `TECH.md`.
- Existing path considered: keep worker-002's local scrypt/TOTP/Node SQLite
  fallbacks and direct plugin tests only.
- Why existing path is insufficient: `/api/auth/*` was not reachable from
  `buildServer()`, and the spec requires Argon2id, otplib, and better-sqlite3.
- Smallest new surface: auth config fields, route registration in
  `buildServer()`, and the three fixed auth/database dependencies.
- Owner: worker-003 for implementation; main session for acceptance.
- Validation: auth tests, build, full tests, and local curl smoke.
- Temporary or permanent: permanent MVP surface.
- Removal condition: superseded by a later auth architecture spec.

## Activity Log

- 2026-05-04: workstream defined.
- 2026-05-04: worker-002 claimed workstream.
- 2026-05-04: worker-002 implemented auth plugin, session store,
  password/TOTP helpers, init-auth script, and auth tests.
- 2026-05-04: worker-002 validated with `npm run build`,
  `npm test -- --run auth`, `npm test -- --run`, and a redacted
  `scripts/init-auth.ts` smoke run.
- 2026-05-04: worker-002 marked workstream blocked for entrypoint/config
  integration outside assigned write scope.
- 2026-05-04: decision `decision-auth-scope-expansion` granted worker-003
  package, config, and server entrypoint scope.
- 2026-05-04: worker-003 wired auth into `buildServer()`, extended auth config,
  aligned dependencies to Argon2id/otplib/better-sqlite3, and validated the
  login, me, and logout flow through tests plus local curl smoke.
