---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 01
language: en-US
audience: agent
doc_type: workstream
status: draft
owner: unassigned
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
