---
id: 02-auth-and-sessions
language: en-US
audience: agent
doc_type: spec
status: ready
owner: unassigned
branch:
pr:
files:
  - apps/passport-server/src/auth/
  - apps/passport-server/src/db.ts
  - apps/passport-server/migrations/001_initial.sql
  - apps/passport-server/tests/auth.test.ts
  - scripts/init-auth.ts
depends_on:
  - 01-project-skeleton
claimed_at:
lease_expires_at:
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

## Acceptance

- Bad password fails.
- Bad TOTP fails.
- Missing credentials fail safely.
- Valid password plus TOTP sets an `HttpOnly` session cookie.
- Expired or revoked sessions fail.
- Logout revokes the current session.
- Protected route middleware returns `401` for unauthenticated API requests.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined.
