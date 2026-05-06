---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
workstream: 01
language: en-US
audience: agent
doc_type: workstream
status: validated
owner: worker-01-passport-dashboard-api
depends_on: []
claimed_at: 2026-05-06T16:20:45+08:00
lease_expires_at: 2026-05-06T18:20:45+08:00
updated: 2026-05-06
---

# Workstream 01: Passport Dashboard API And Proxy

## Goal

Add the authenticated Passport backend surface that detects an already-running
Dispatch Engine dashboard for an allowlisted local repo and exposes it through
a same-origin proxy URL.

## Scope

- Add dashboard availability/open routes under Passport.
- Add allowlisted repo-root resolution for browser-provided workspace paths.
- Call `de dashboard <repo> --status --json` for availability.
- Treat missing CLI, missing `.dispatch`, dead dashboard, malformed JSON, and
  outside-root paths as unavailable.
- Add same-origin proxying for alive loopback dashboard URLs.
- Do not auto-start dashboards.
- Do not return raw dashboard URLs or raw repo paths.

## Files Or Modules

- `apps/passport-server/src/index.ts`
- New Passport server module under `apps/passport-server/src/dispatch-dashboard/`
- `apps/passport-server/src/config.ts`
- `apps/passport-server/tests/*`

## Validation

- Add targeted API/proxy tests.
- Run `npm test -- --run dispatch` or the chosen targeted suite.
- Run `npm run build`.

## Acceptance

- Authenticated availability returns `available: true` only for alive
  allowlisted dashboard sessions.
- Unauthenticated and unsafe requests fail closed.
- Proxy serves a fixture dashboard through a Passport same-origin path.
- Responses exclude raw local URLs, raw repo paths, secrets, and credentials.

## Activity Log

- 2026-05-06T16:20:45+08:00: Claimed workstream for
  `worker-01-passport-dashboard-api`; starting backend TDD pass.
- 2026-05-06T16:23:10+08:00: Red TDD run captured:
  `npm test -- --run dispatch-dashboard` failed because
  `../src/dispatch-dashboard/routes` did not exist.
- 2026-05-06T16:25:19+08:00: Green TDD run passed:
  `npm test -- --run dispatch-dashboard` with 9 tests.
- 2026-05-06T16:25:44+08:00: Required build validation passed:
  `npm run build`.
- 2026-05-06T16:27:18+08:00: Final required validation rerun passed:
  `npm test -- --run dispatch-dashboard` with 9 tests.
- 2026-05-06T16:27:18+08:00: Final required build rerun passed:
  `npm run build`.
- 2026-05-06T16:31:20+08:00: Acceptance repair red run captured:
  `npm test -- --run dispatch-dashboard` failed because availability returned
  `/dispatch-dashboard/<random-session-id>/` instead of
  `/dispatch-dashboard/20260506T081555540696Z/`, and proxy route handoff still
  used `sessionId`.
- 2026-05-06T16:31:54+08:00: Acceptance repair green run passed:
  `npm test -- --run dispatch-dashboard` with 10 tests.
- 2026-05-06T16:32:16+08:00: Acceptance repair build validation passed:
  `npm run build`.
- 2026-05-06T16:33:03+08:00: Final acceptance repair validation rerun
  passed: `npm test -- --run dispatch-dashboard` with 10 tests.
- 2026-05-06T16:33:13+08:00: Final acceptance repair build rerun passed:
  `npm run build`.

## TDD Evidence

- Red: `npm test -- --run dispatch-dashboard` failed before implementation
  with missing `dispatch-dashboard` route module. Acceptance repair red rerun
  failed because the availability URL used a random session ID instead of the
  reported run ID, and the proxy route passed `sessionId` instead of `runId`.
- Green: `npm test -- --run dispatch-dashboard` passed after implementation
  with 9 tests covering auth, allowlisted path resolution, missing `.dispatch`,
  malformed status JSON, alive loopback status, raw URL/path exclusion, and
  proxy behavior. Acceptance repair green rerun passed with 10 tests covering
  run-ID-shaped availability URLs, run-ID proxy lookup, and fetch failure
  fail-closed behavior.
- Broader validation: `npm run build` passed. Final rerun after the last
  service adjustment also passed. Acceptance repair build rerun also passed.
- Tests not run: none for this workstream's assigned validation.

## Worker Completion

- Workstream: `01-passport-dashboard-api`
- Status: validated
- Files changed:
  - `apps/passport-server/src/index.ts`
  - `apps/passport-server/src/config.ts`
  - `apps/passport-server/src/dispatch-dashboard/routes.ts`
  - `apps/passport-server/src/dispatch-dashboard/service.ts`
  - `apps/passport-server/tests/dispatch-dashboard.test.ts`
  - `specs/rfc-0004-paseo-dispatch-dashboard-tab/workstreams/01-passport-dashboard-api.md`
- Validation run:
  - `npm test -- --run dispatch-dashboard`
  - `npm run build`
- Validation not run: none for assigned workstream.
- Behavior/spec changes: Passport now exposes authenticated dashboard
  availability and same-origin proxy routes that fail closed and do not return
  raw local dashboard URLs or repo paths.
- Conflicts or blockers: none.
- Residual risk: proxy is HTTP GET-only for the MVP; WebSocket or mutating
  dashboard interactions remain out of scope.
- Suggested acceptance checks: coordinator can inspect this diff and rerun the
  assigned commands before accepting workstream 01.

## Acceptance Repair Completion

- Workstream: `01-passport-dashboard-api`
- Repair agent: `repair-worker-01-runid-proxy-contract`
- Status: validated
- Files changed:
  - `apps/passport-server/src/dispatch-dashboard/routes.ts`
  - `apps/passport-server/src/dispatch-dashboard/service.ts`
  - `apps/passport-server/tests/dispatch-dashboard.test.ts`
  - `specs/rfc-0004-paseo-dispatch-dashboard-tab/workstreams/01-passport-dashboard-api.md`
- Validation run:
  - `npm test -- --run dispatch-dashboard`
  - `npm run build`
- Validation not run: none for assigned repair.
- Behavior/spec changes: availability now returns
  `/dispatch-dashboard/<run-id>/`, proxy lookup uses the same run ID path
  segment, responses continue to exclude raw loopback URLs and repo paths, and
  dashboard fetch failures fail closed with the unavailable route response.
- Conflicts or blockers: none.
- Residual risk: proxy remains tied to the latest cached availability check
  for the run ID; this is the intended MVP shape for already-running local
  dashboards.
