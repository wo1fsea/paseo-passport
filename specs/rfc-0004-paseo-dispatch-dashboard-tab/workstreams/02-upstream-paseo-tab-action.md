---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
workstream: 02
language: en-US
audience: agent
doc_type: workstream
status: ready
owner: unassigned
depends_on:
  - 01
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
