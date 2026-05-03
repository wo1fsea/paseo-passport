---
id: 08-local-end-to-end-smoke
language: en-US
audience: agent
doc_type: spec
status: ready
owner: unassigned
branch:
pr:
files:
  - apps/passport-server/tests/
  - docs/mvp.md
depends_on:
  - 05-admin-ui
  - 07-workspace-serving
claimed_at:
lease_expires_at:
updated: 2026-05-04
---

# Local End-To-End Smoke Workstream

## Scope

Prove the local MVP flow with a fixture offer and a browser-level smoke test or
documented manual equivalent.

## Plan

- Add a safe fixture relay offer that does not contain real machine secrets.
- Start Passport locally.
- Login with configured test credentials and TOTP.
- Import the fixture machine.
- Confirm `/api/passport/hosts` returns the fixture host profile.
- Load the workspace.
- Confirm the host appears in the UI, or document the exact manual verification
  if UI automation is not feasible yet.
- Add `docs/mvp.md` with local smoke instructions.

## Validation

Preferred:

```powershell
npm run test:e2e
```

Required if e2e automation is not ready:

```powershell
npm run build
npm test -- --run
npm run dev
```

Then record manual browser smoke evidence in `docs/mvp.md`.

## Acceptance

- The local flow proves login, import, host profile API, and workspace load.
- Manual smoke gaps are explicitly documented.
- Fixture data contains no real machine-control credentials.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined.
