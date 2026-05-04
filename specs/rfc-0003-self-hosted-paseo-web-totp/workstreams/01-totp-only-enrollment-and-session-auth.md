---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 01
language: en-US
audience: agent
doc_type: workstream
status: implemented
owner: worker-01-totp-auth
depends_on: []
updated: 2026-05-04
---

# Workstream 01: TOTP-Only Enrollment And Session Auth

## Goal

Replace password plus TOTP with a pure TOTP single-user enrollment and login
state machine.

## Scope

- Add first-run TOTP enrollment state.
- Generate TOTP secret and QR payload when no enrollment exists.
- Complete enrollment only after a valid code.
- Store enrolled TOTP secret encrypted with `PASSPORT_DATA_KEY`.
- Remove username/password login requirements from target auth flow.
- Create `HttpOnly` sessions after enrollment or login.
- Add authenticated reset flow that clears enrollment and revokes sessions.
- Add local server-side emergency reset command for lost TOTP devices.
- Preserve loopback-only local auth bypass for test runs.

## Validation

- Red/green tests for enrollment start, enrollment complete, TOTP-only login,
  rejected password/username payloads, authenticated reset, emergency reset,
  session revocation, and bypass.
- Tests prove plaintext TOTP secret is not stored in SQLite.
- Tests prove persistent DB startup fails without a valid `PASSPORT_DATA_KEY`.
- Existing protected route tests updated to use TOTP-only sessions.

## Acceptance

- No password is required or accepted for normal auth.
- QR appears only on the full-screen first-run enrollment surface before
  enrollment or after reset.
- TOTP secret is encrypted at rest.
- Reset returns the system to first-enrollment mode.
- Lost-device recovery is available only through the local emergency reset
  command, not through a public web recovery flow.

## Worker Completion

- Worker: `worker-01-totp-auth`
- Status: implemented with concerns
- Files changed:
  - `.env.example`
  - `apps/passport-server/migrations/001_initial.sql`
  - `apps/passport-server/src/auth/middleware.ts`
  - `apps/passport-server/src/auth/routes.ts`
  - `apps/passport-server/src/auth/totp.ts`
  - `apps/passport-server/src/config.ts`
  - `apps/passport-server/src/db.ts`
  - `apps/passport-server/src/index.ts`
  - `apps/passport-server/tests/auth.test.ts`
  - `apps/passport-server/tests/config.test.ts`
  - `apps/passport-server/tests/local-auth-bypass.test.ts`
  - `scripts/init-auth.ts`
- TDD evidence:
  - Red: `npm test -- --run auth`, `npm test -- --run config`, and
    `npm test -- --run local-auth-bypass` failed against the old password plus
    TOTP contract and missing enrollment/config behavior.
  - Green: `npm test -- --run auth`, `npm test -- --run config`, and
    `npm test -- --run local-auth-bypass` passed after implementation.
  - Broader validation: `npm run build` passed.
- Residual risk:
  - The assigned file list did not include `package.json`, so the exact
    `npm run passport:reset-totp -- --db ...` package-script alias was not
    added. The reset command behavior is implemented in `scripts/init-auth.ts`
    as `tsx scripts/init-auth.ts reset-totp --db <passport.sqlite>`.
  - UI pages are still handled by later workstream 02; this workstream exposes
    the enrollment/login/reset API state machine only.
