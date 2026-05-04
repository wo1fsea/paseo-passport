---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 06
language: en-US
audience: agent
doc_type: workstream
status: draft
owner: unassigned
depends_on:
  - 02
  - 03
  - 05
updated: 2026-05-04
---

# Workstream 06: End-To-End Browser And Local Daemon Smoke

## Goal

Prove the full corrected product loop in a browser with a real local Paseo
daemon.

## Scope

- Start Passport locally.
- Complete first-run TOTP enrollment.
- Confirm later visits show TOTP login only, not QR.
- Import or reuse a real local Paseo daemon registration.
- Open the self-hosted Paseo interactive UI through Passport.
- Confirm the registered daemon is available in the UI.
- Exercise the deepest feasible project/agent interaction without committing
  secrets.
- Confirm access and workspace history lists contain expected events.

## Validation

- Browser screenshots or DOM assertions for enrollment, login, self-hosted Paseo
  UI, host availability, and history lists.
- API checks for `/api/passport/hosts`, access history, and workspace history.
- No raw offers or daemon secrets in tracked files.

## Acceptance

- User can open the Passport URL, authenticate with TOTP, reach the real Paseo
  interactive UI, and see registered machines.
- Access history and workspace history both show useful recent entries.
