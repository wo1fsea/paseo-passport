---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
workstream: 02
language: en-US
audience: agent
doc_type: workstream
status: validated
owner: worker-02-upstream-paseo-tab-action
depends_on:
  - 01
claimed_at: 2026-05-06T16:37:51+08:00
lease_expires_at: 2026-05-06T18:37:51+08:00
updated: 2026-05-06
---

# Workstream 02: Upstream Paseo Tab-Row Action

## Goal

Patch the upstream Paseo workspace UI so the desktop tab row shows a Dispatch
Engine dashboard action when Passport reports a dashboard is available, and
opens the returned URL in a new browser tab.

## Scope

- Add the minimal client helper needed to query Passport dashboard
  availability.
- Thread dashboard availability and click handling into the workspace screen.
- Add a compact icon action near the existing browser-tab action.
- Reuse `createWorkspaceBrowser({ initialUrl })` and the existing browser tab
  target.
- Hide the action when unavailable.
- Keep mobile behavior hidden or explicitly not applicable if browser tabs are
  desktop/Electron-only.

## Files Or Modules

- `vendor/paseo/packages/app/src/screens/workspace/workspace-screen.tsx`
- `vendor/paseo/packages/app/src/screens/workspace/workspace-desktop-tabs-row.tsx`
- Optional new upstream app helper under `vendor/paseo/packages/app/src/`
- Upstream app tests near the touched files

## Validation

- Add or update upstream app tests for hidden/available/click behavior.
- Run targeted upstream app tests.
- Do not commit direct submodule source modifications as the durable change;
  workstream 03 must capture them as a parent-repo patch.

## Acceptance

- The action appears only when available.
- Clicking opens a new browser tab with the Passport same-origin dashboard URL.
- The tab row retains Paseo visual style and stable layout.
- No new native tab kind is introduced.

## Activity Log

- 2026-05-06T16:37:51+08:00: Claimed workstream for
  `worker-02-upstream-paseo-tab-action`; starting upstream Paseo UI TDD pass.
- 2026-05-06T16:42:19+08:00: Red TDD runs captured:
  `npm run test --workspace=@getpaseo/app -- workspace-desktop-tabs-row`
  failed because the Dispatch Dashboard action was absent, and
  `npm run test --workspace=@getpaseo/app -- workspace-screen` failed because
  `@/runtime/passport-dispatch-dashboard` did not exist.
- 2026-05-06T16:43:23+08:00: Green validation passed for both assigned
  commands from `vendor/paseo`.
- 2026-05-06T16:55:19+08:00: Repair worker
  `repair-worker-02-split-pane-dashboard-action` verified the split-pane
  dashboard action contract. The live scoped diff already contained
  `WorkspaceScreen -> SplitContainer -> WorkspaceDesktopTabsRow` wiring when
  the regression check was added, so a new red result could not be captured
  without reverting peer workspace state.
- 2026-05-06T16:52:21+08:00: Acceptance repair red run captured from
  `vendor/paseo`: `npm run test --workspace=@getpaseo/app -- workspace-screen`
  failed because `SplitContainer` did not forward `dispatchDashboardAction` or
  `onOpenDispatchDashboard` into its split-pane `WorkspaceDesktopTabsRow`.
- 2026-05-06T16:53:04+08:00: Acceptance repair green validation passed for
  both assigned commands from `vendor/paseo`.

## TDD Evidence

- Red:
  - `npm run test --workspace=@getpaseo/app -- workspace-desktop-tabs-row`
    failed with the expected missing action assertion.
  - `npm run test --workspace=@getpaseo/app -- workspace-screen` failed with
    the expected missing Passport dashboard client helper module.
- Green:
  - `npm run test --workspace=@getpaseo/app -- workspace-desktop-tabs-row`
    passed with 2 tests.
  - `npm run test --workspace=@getpaseo/app -- workspace-screen` passed with
    16 tests. The command also matched the existing `new-workspace-screen`
    suite by substring.
- Broader validation: not run by this worker; browser smoke and screenshot
  evidence remain assigned to downstream acceptance workstreams.
- Tests not run: none for this workstream's assigned validation.

## Acceptance Repair Evidence

- Red:
  - `npm run test --workspace=@getpaseo/app -- workspace-screen` from the repo
    root failed before validation because the parent repo has no npm workspace
    named `@getpaseo/app`.
  - The same command from `vendor/paseo` failed with the expected missing
    `SplitContainer` prop-forwarding assertion.
- Green:
  - `npm run test --workspace=@getpaseo/app -- workspace-screen` from
    `vendor/paseo` passed with 18 tests across the matching workspace screen
    suites.
  - `npm run test --workspace=@getpaseo/app -- workspace-desktop-tabs-row` from
    `vendor/paseo` passed with 2 tests.
- Broader validation: not run by this repair worker; browser smoke and
  screenshot evidence remain assigned to downstream acceptance workstreams.
- Tests not run: none for this repair's assigned validation after using the
  established `vendor/paseo` working directory.

## Worker Completion

- Workstream: `02-upstream-paseo-tab-action`
- Status: validated
- Files changed:
  - `vendor/paseo/packages/app/src/runtime/passport-dispatch-dashboard.ts`
  - `vendor/paseo/packages/app/src/screens/workspace/workspace-desktop-tabs-row.tsx`
  - `vendor/paseo/packages/app/src/screens/workspace/workspace-desktop-tabs-row.test.tsx`
  - `vendor/paseo/packages/app/src/screens/workspace/workspace-screen.tsx`
  - `vendor/paseo/packages/app/src/screens/workspace/workspace-screen.test.tsx`
  - `specs/rfc-0004-paseo-dispatch-dashboard-tab/STATUS.md`
  - `specs/rfc-0004-paseo-dispatch-dashboard-tab/workstreams/02-upstream-paseo-tab-action.md`
- Validation run:
  - `npm run test --workspace=@getpaseo/app -- workspace-desktop-tabs-row`
  - `npm run test --workspace=@getpaseo/app -- workspace-screen`
- Validation not run: no browser smoke or screenshots in this worker; those are
  assigned to downstream workstream 04.
- Behavior/spec changes: the upstream Paseo workspace screen now queries the
  Passport dashboard availability endpoint for the current workspace directory
  on desktop/Electron, hides unavailable results, and threads an available
  same-origin URL into a compact Dispatch Dashboard tab-row action that opens
  a regular Paseo browser tab.
- Conflicts or blockers: none.
- Residual risk: upstream vendor edits still need parent-repo patch capture by
  workstream 03, and visual smoke evidence remains for workstream 04.
- Suggested acceptance checks: inspect the vendor diff, rerun the assigned app
  tests, then run the planned patch/build and browser-smoke workstreams.

## Repair Worker Completion

- Workstream: `02-upstream-paseo-tab-action`
- Repair agent: `repair-worker-02-split-pane-dashboard-action`
- Status: validated
- Files changed:
  - `vendor/paseo/packages/app/src/components/split-container.tsx`
  - `vendor/paseo/packages/app/src/screens/workspace/workspace-screen.tsx`
  - `vendor/paseo/packages/app/src/screens/workspace/workspace-screen.test.tsx`
  - `specs/rfc-0004-paseo-dispatch-dashboard-tab/workstreams/02-upstream-paseo-tab-action.md`
  - `.dispatch/runs/20260506T081555540696Z/reports/repair-worker-02-split-pane-dashboard-action.json`
- Validation run:
  - `npm run test --workspace=@getpaseo/app -- workspace-desktop-tabs-row`
    from `vendor/paseo`: passed with 1 file and 2 tests.
  - `npm run test --workspace=@getpaseo/app -- workspace-screen` from
    `vendor/paseo`: passed with 2 files and 18 tests.
- Validation not run: browser smoke and screenshot evidence remain assigned to
  downstream acceptance workstreams.
- Behavior/spec changes: the primary desktop split-pane layout now receives the
  same Dispatch Dashboard action and open handler as the non-split desktop
  fallback row, so every `WorkspaceDesktopTabsRow` rendered by
  `SplitContainer` can show and open the dashboard action for its pane.
- Conflicts or blockers: none.
- Residual risk: no visual smoke was run by this worker; patch capture and
  browser evidence remain downstream.

## Acceptance Repair Completion

- Workstream: `02-upstream-paseo-tab-action`
- Status: validated
- Files changed:
  - `vendor/paseo/packages/app/src/components/split-container.tsx`
  - `vendor/paseo/packages/app/src/screens/workspace/workspace-screen.tsx`
  - `vendor/paseo/packages/app/src/screens/workspace/workspace-screen.test.tsx`
  - `specs/rfc-0004-paseo-dispatch-dashboard-tab/workstreams/02-upstream-paseo-tab-action.md`
- Validation run:
  - `npm run test --workspace=@getpaseo/app -- workspace-screen`
  - `npm run test --workspace=@getpaseo/app -- workspace-desktop-tabs-row`
- Validation not run: no browser smoke or screenshots in this repair worker;
  those remain assigned to downstream workstream 04.
- Behavior/spec changes: the primary desktop split-pane layout now receives the
  Dispatch Dashboard action and open handler from `WorkspaceScreen` and passes
  both into every split-pane `WorkspaceDesktopTabsRow`.
- Conflicts or blockers: the assigned npm command does not resolve from the
  parent repo root; it passes from the established `vendor/paseo` workspace
  root used by the original workstream validation.
- Residual risk: upstream vendor edits still need parent-repo patch capture by
  workstream 03, and visual smoke evidence remains for workstream 04.
- Suggested acceptance checks: inspect the split-container prop chain and rerun
  the assigned app tests from `vendor/paseo`.
