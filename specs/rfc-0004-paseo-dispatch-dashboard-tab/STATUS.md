---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
language: en-US
audience: agent
doc_type: spec
status: completed
implementation: completed
validation: passed
coordinator: Codex
updated: 2026-05-06
---

# Status

## Summary

This spec defines a Passport-authenticated way to open an already-running
Dispatch Engine dashboard from the self-hosted Paseo workspace tab row. The
MVP reuses Paseo's existing browser tab target and records upstream Paseo UI
changes as parent-repo patches without changing the pinned `vendor/paseo`
submodule version.

## Spec Decision Gate

- Request: add a Paseo workspace tab-row entry that opens a running Dispatch
  Engine dashboard in a new tab.
- Code change expected: yes.
- Existing spec: none.
- Decision: new-full-spec.
- Reason: user-visible, cross-module, security/proxy-sensitive, and touches
  upstream Paseo patching plus Passport APIs.
- Behavior, contract, data, UI, configuration, permissions, security, test,
  docs, or governance impact: UI, API, proxy/security, configuration, build
  patch, tests, docs, and agent workflow.
- Next workflow: spec-first delivery with independent workstreams.
- Recorded in: this file.

## Parallelization Gate

- Can split: yes.
- Strategy: split by Passport backend/proxy, upstream Paseo UI patch, build
  patch integration, and smoke/acceptance validation.
- Serial dependencies: UI open behavior depends on the API response contract;
  browser smoke depends on backend and patch integration.
- Serial exception: none.

## Workstreams

| ID | Scope | Status | Owner | Branch / PR | Depends on | Updated |
|---|---|---|---|---|---|---|
| 01 | Passport dashboard availability API and same-origin proxy | validated | worker-01-passport-dashboard-api | | | 2026-05-06 |
| 02 | Upstream Paseo tab-row action patch | validated | worker-02-upstream-paseo-tab-action | | 01 | 2026-05-06 |
| 03 | Patch/build integration and docs | validated | repair-worker-03-patch-build-docs | | 02 | 2026-05-06 |
| 04 | Browser smoke and acceptance validation | validated | repair-worker-04-smoke-acceptance | | 01, 02, 03 | 2026-05-06 |

## Activity Log

- 2026-05-06: Spec created from product discussion: the entry belongs in the
  Paseo workspace tab row, appears only when a corresponding Dispatch Engine
  dashboard is already running, and opens a new Paseo browser tab.
- 2026-05-06: Accepted upstream patch rule: do not change the pinned
  `vendor/paseo` submodule version; record upstream Paseo changes as
  reproducible parent-repo patches.
- 2026-05-06: Accepted MVP limit: no remote relay-machine dashboard aggregation
  until a later spec defines machine-side or Passport-to-daemon status
  reporting.
- 2026-05-06: worker-03-patch-build-docs claimed workstream 03 to capture the
  upstream dashboard-tab edits as a reproducible parent-repo patch and validate
  the existing Paseo build path.
- 2026-05-06: worker-03-patch-build-docs validated workstream 03 with
  `npx tsx scripts/apply-paseo-patch.ts`, `npm run build:paseo-web`, and
  `npm run build`; the build path preserves the pinned `vendor/paseo`
  submodule commit and applies both parent-repo patches idempotently.
- 2026-05-06: worker-04-smoke-acceptance validated the local smoke path with
  `npm run build`, `npm test -- --run`, `npm run build:paseo-web`, and
  `npm run test:e2e`. Browser smoke evidence is under `.out/screenshots/` and
  `.out/reports/`; Passport reports dashboard availability and proxies the
  dashboard shell. The first pass identified missing root `/api/...` dashboard
  proxying, and the full Paseo tab-row click path could not be exercised
  without a connected Paseo daemon/workspace. Mobile evidence is not applicable
  for the desktop/Electron-only tab-row action.
- 2026-05-06: interactive-codex fixed the dashboard root API proxy gap by
  binding the opened dashboard run to the authenticated Passport session and
  forwarding the Dispatch Engine dashboard's read-only root `/api/...` calls.
- 2026-05-06: repair-worker-04-smoke-acceptance re-ran `npm run build`,
  `npm test -- --run`, `npm run build:paseo-web`, and `npm run test:e2e`;
  refreshed browser smoke evidence under `.out/screenshots/` and
  `.out/reports/`; confirmed the same-origin dashboard shell and root
  `/api/status` proxy return 200 after opening the dashboard session. The
  remaining acceptance concern is the unavailable full tab-row click path
  without a connected Paseo daemon/workspace.
- 2026-05-06: interactive-codex revalidated with `npm run build`,
  `npm test -- --run`, `npm run build:paseo-web`, `npm run test:e2e`,
  `npx tsx scripts/apply-paseo-patch.ts`, upstream `@getpaseo/app` workspace
  tests, and browser screenshot evidence at
  `.out/screenshots/rfc-0004-dashboard-proxy-acceptance.png`.
- 2026-05-06: interactive-codex fixed the self-hosted Web workspace path after
  live local acceptance showed the Dispatch Dashboard action was still gated to
  Electron browser tabs. The patch now allows the Dispatch Dashboard action on
  Web workspaces, preserves same-origin `/dispatch-dashboard/...` browser URLs,
  and renders those URLs inside the Web browser pane with an iframe. Verified
  locally on Passport `127.0.0.1:17318` with screenshot evidence at
  `.out/screenshots/rfc-0004-dashboard-workspace-tab.png`.

## Spec Handoff

- Spec path: `specs/rfc-0004-paseo-dispatch-dashboard-tab/`
- Status: completed.
- Spec type: feature / upstream Paseo integration.
- Open questions: none blocking MVP implementation.
- Workstreams: 4.
- Next owner: Dispatch Engine coordinator or implementation workers.
- Validation expectation: backend tests, upstream app tests, patch apply,
  upstream build, Passport build/test, and browser smoke with screenshots.
- Ready to implement: implemented.
- Subagent handoff required: completed.
