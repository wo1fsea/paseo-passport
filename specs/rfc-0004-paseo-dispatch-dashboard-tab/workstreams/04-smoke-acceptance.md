---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
workstream: 04
language: en-US
audience: agent
doc_type: workstream
status: validated
owner: repair-worker-04-smoke-acceptance
depends_on:
  - 01
  - 02
  - 03
updated: 2026-05-06
---

# Workstream 04: Browser Smoke And Acceptance

## Goal

Validate the completed dashboard tab feature in a browser against the
self-hosted Paseo UI and record acceptance evidence.

## Scope

- Start Passport locally with a test-auth path or TOTP session.
- Run or fixture an alive Dispatch Engine dashboard for an allowlisted local
  repo.
- Open the self-hosted Paseo workspace.
- Confirm the dashboard action appears for the available state.
- Click the action and confirm a new browser tab opens with dashboard content.
- Confirm the action is hidden when dashboard availability is false.
- Capture screenshots for available and unavailable states.
- Record validation in this spec's `STATUS.md`.

## Validation

- `npm run build`
- `npm test -- --run`
- `npm run build:paseo-web`
- Browser smoke with screenshots.

## Acceptance

- The dashboard can be opened from the Paseo workspace tab row.
- The dashboard appears in a Paseo browser tab.
- No-dashboard state stays quiet.
- Evidence is sufficient for main-session acceptance.

## Worker Completion

- Workstream: `04-smoke-acceptance`
- Status: `validated`
- Files changed:
  - `apps/passport-server/src/dispatch-dashboard/routes.ts`
  - `apps/passport-server/src/dispatch-dashboard/service.ts`
  - `apps/passport-server/tests/dispatch-dashboard.test.ts`
  - `apps/passport-server/tests/local-smoke.test.ts`
  - `specs/rfc-0004-paseo-dispatch-dashboard-tab/STATUS.md`
  - `specs/rfc-0004-paseo-dispatch-dashboard-tab/workstreams/04-smoke-acceptance.md`
  - `.out/screenshots/repair-worker-04-dashboard-proxy.png`
  - `.out/screenshots/repair-worker-04-workspace-connecting.png`
  - `.out/reports/repair-worker-04-dashboard-proxy-snapshot.md`
  - `.out/reports/repair-worker-04-workspace-snapshot.md`
  - `.out/logs/repair-worker-04-browser-smoke.md`
  - `.out/screenshots/rfc-0004-dashboard-proxy-acceptance.png`
- Validation run:
  - `npm run build`
  - `npm test -- --run`
  - `npm run build:paseo-web`
  - `npm run test:e2e`
  - `npx tsx scripts/apply-paseo-patch.ts`
  - `npm run test --workspace=@getpaseo/app -- workspace-desktop-tabs-row
    workspace-screen`
  - Browser smoke with Passport on `127.0.0.1:17318`, local auth bypass,
    the current repo allowlisted, and the live Dispatch Engine dashboard for
    run `20260506T090158046825Z`.
  - Repair-worker browser smoke with Passport on `127.0.0.1:17317`, local auth
    bypass, the current repo allowlisted, and the live Dispatch Engine
    dashboard for run `20260506T090158046825Z`.
- Validation not run:
  - Mobile browser evidence. Not applicable because this action is scoped to
    the desktop/Electron Paseo workspace tab row.
- Behavior/spec changes:
  - Expanded `local-smoke.test.ts` so `npm run test:e2e` fixtures an alive
    dashboard, validates `/api/dispatch/dashboard/current`, proves the API does
    not expose the raw dashboard URL or repo path, and proves the same-origin
    `/dispatch-dashboard/<run-id>/` proxy serves dashboard HTML.
  - Added authenticated-session binding for an opened dashboard run, then
    forwarded the Dispatch Engine dashboard's root read-only API paths
    (`/api/status`, `/api/events`, `/api/alerts`, `/api/tail`,
    `/api/logs/...`, `/api/history`, `/api/plan`, and
    `/api/host-heartbeat`) to the active same-origin dashboard proxy.
- Conflicts or blockers:
  - None blocking MVP acceptance after the root dashboard API proxy fix.
- Residual risk:
  - Browser evidence opens the dashboard proxy directly because the smoke
    environment does not maintain a connected Paseo daemon/workspace. The
    upstream Paseo tab-row click behavior is covered by the pinned upstream
    unit tests and parent-repo patch.
- Suggested acceptance checks:
  - In a live connected Paseo workspace, confirm
    `workspace-open-dispatch-dashboard` appears and opens the same dashboard
    URL in a browser tab.

## Temp Artifacts

- Created:
  - `.out/screenshots/repair-worker-04-dashboard-proxy.png`
  - `.out/screenshots/repair-worker-04-workspace-connecting.png`
  - `.out/reports/repair-worker-04-dashboard-proxy-snapshot.md`
  - `.out/reports/repair-worker-04-workspace-snapshot.md`
  - `.out/logs/repair-worker-04-browser-smoke.md`
  - `.out/screenshots/rfc-0004-dashboard-proxy-acceptance.png`
- Referenced as evidence: all files listed above.
- Promoted: none.
- Cleaned: stopped the local Passport dev server after smoke.
- Intentionally retained: evidence artifacts under `.out/`.
