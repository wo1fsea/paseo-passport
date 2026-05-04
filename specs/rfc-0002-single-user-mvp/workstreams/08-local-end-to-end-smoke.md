---
id: 08-local-end-to-end-smoke
language: en-US
audience: agent
doc_type: spec
status: validated
owner: worker-001
branch:
pr:
files:
  - apps/passport-server/tests/
  - docs/mvp.md
depends_on:
  - 05-admin-ui
  - 07-workspace-serving
claimed_at: 2026-05-04T02:40:02+08:00
lease_expires_at: 2026-05-04T04:40:02+08:00
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

Recorded validation:

- `npm run test:e2e`: passed on 2026-05-04; 1 local smoke test passed.
- `npm run build:paseo-web`: passed on 2026-05-04; rebuilt
  `apps/passport-server/public`.
- `npm run build`: passed on 2026-05-04.
- `npm test -- --run`: passed on 2026-05-04; 7 test files and 26 tests passed.
- Optional browser smoke: partially attempted on 2026-05-04. The Playwright
  browser opened `/login`, but the local browser backend closed before form
  interaction; manual/browser evidence gap is documented in `docs/mvp.md`.

## Acceptance

- The local flow proves login, import, host profile API, and workspace load.
- Manual smoke gaps are explicitly documented.
- Fixture data contains no real machine-control credentials.

## TDD Evidence

- Red: existing `npm run test:e2e` passed before changes, so this pass tightened
  an already-green smoke rather than fixing a failing production behavior.
- Green: `npm run test:e2e` passed after the smoke was tightened to check the
  admin registry API, sanitized host profile response, workspace shell, and
  authenticated host-loader asset.
- Broader validation: `npm run build:paseo-web`, `npm run build`, and
  `npm test -- --run` passed.
- Tests not run: full browser UI assertion did not complete because the local
  Playwright backend closed after opening `/login`.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: worker-001 validated the local smoke and documented the browser
  evidence gap.
- 2026-05-04: worker-001 tightened automated smoke coverage for login, import,
  admin registry, host profile API, workspace shell, and host-loader asset.
- 2026-05-04: worker-001 claimed the workstream for Dispatch Engine run
  20260503T183631153640Z.
- 2026-05-04: workstream defined.
