---
language: en-US
audience: mixed
doc_type: spec
---

# Paseo Dispatch Dashboard Tab Product Spec

## Summary

Paseo Passport should surface an already-running Dispatch Engine dashboard from
inside the self-hosted Paseo workspace. When the current workspace/repo has a
running Dispatch Engine dashboard that Passport can safely resolve, the Paseo
workspace tab row shows a compact dashboard entry. Clicking it opens a new
Paseo browser tab that displays the read-only dashboard through a Passport
same-origin URL.

The dashboard entry belongs next to the existing workspace tab actions, not in
the Passport admin pages and not in a separate external browser window.

## Goals / Non-goals

Goals:

- Show a Dispatch Engine dashboard entry in the Paseo workspace tab row when a
  dashboard is already running for the current workspace/repo.
- Hide the entry when no dashboard is running or Passport cannot safely resolve
  the workspace to an allowed local repo.
- Open the dashboard in a new existing Paseo `browser` tab.
- Serve the dashboard through an authenticated Passport same-origin URL.
- Keep the Dispatch Engine dashboard read-only.
- Preserve Dispatch Engine heartbeat/status/event/alert supervision as the
  source of truth for agent run monitoring.
- Record all upstream Paseo UI changes as reproducible parent-repo patches
  without changing the pinned `vendor/paseo` submodule version.

Non-goals:

- No new native Paseo tab kind in the MVP.
- No starting, stopping, or mutating Dispatch Engine runs from the dashboard
  entry.
- No automatic dashboard launch when one is not already running.
- No direct public exposure of raw dashboard ports or `127.0.0.1:<port>` URLs.
- No relay-connected remote workspace dashboard aggregation in the MVP.
- No upgrade, repin, or direct source modification of the upstream Paseo
  submodule.
- No replacement for Codex heartbeat monitoring or `de status --json`,
  `de events`, and `de alerts`.

## Behavior Invariants

1. On a self-hosted Paseo workspace, Passport can determine whether the current
   workspace maps to an allowed local repo path.
2. If the current workspace cannot be mapped to an allowed local repo path, no
   Dispatch Engine dashboard entry is shown.
3. If the current workspace maps to an allowed local repo path but no dashboard
   process is alive for the active/latest Dispatch Engine run, no dashboard
   entry is shown.
4. If a dashboard process is alive for the mapped repo, the tab row shows a
   compact Dispatch Engine dashboard action near the existing new-tab actions.
5. The dashboard action has an accessible label and tooltip that identify it as
   the Dispatch Engine dashboard.
6. Clicking the dashboard action opens a new Paseo `browser` tab in the current
   workspace pane.
7. The browser tab loads a Passport same-origin URL, not the raw dashboard
   server URL.
8. The opened dashboard reflects the same run reported by the availability
   response.
9. If the dashboard stops between availability polling and click, the click
   fails gracefully with a visible non-secret error or disabled state.
10. The dashboard remains a read-only observer surface.
11. Dashboard URLs, APIs, logs, and UI text do not expose raw pairing offers,
    daemon keypairs, session cookies, TOTP material, provider credentials, or
    arbitrary repo paths.
12. The dashboard entry does not appear on Passport admin pages, login pages, or
    first-run enrollment pages.
13. Mobile layouts do not show an unusable desktop-only action. The MVP may
    hide the dashboard action on mobile if the existing browser-tab experience
    is desktop/Electron-only.
14. Upstream Paseo changes are captured as patch files in the parent repo and
    applied reproducibly during the existing build flow.

## States And Edge Cases

- No workspace context: do not show the dashboard entry.
- Workspace context exists but has no repo path: do not show the entry.
- Repo path is browser-provided but not under an allowed root: reject it and do
  not show the entry.
- Repo path is allowed but `.dispatch/` does not exist: do not show the entry.
- `.dispatch/` exists but `de dashboard --status --json` reports `alive:
  false`: do not show the entry.
- Dashboard status reports `alive: true` but no usable URL: do not show the
  entry and surface diagnostic information only in tests/logs.
- Dashboard status reports an alive process with a loopback URL: Passport may
  proxy it through a same-origin path.
- Dashboard process exits after the entry appears: clicking shows a graceful
  unavailable state rather than a blank tab.
- User opens the entry multiple times: each click may open a new browser tab;
  deduplication is optional and deferred.
- Remote relay workspace: no MVP entry is shown unless Passport can resolve and
  proxy a local dashboard for that repo through an explicit allowlisted mapping.
- Local auth bypass mode: allowed only under the existing loopback-only bypass
  rules and must not weaken dashboard proxy restrictions.

## Open Questions

- Whether the first implementation should include browser-tab deduplication is
  deferred; opening a new tab per click is acceptable.
- Remote-machine Dispatch Engine dashboard aggregation is deferred to a later
  spec because Passport does not currently act as a full Paseo daemon gateway.
- A future native `{ kind: "dispatchDashboard" }` tab is deferred until the
  browser-tab MVP proves insufficient.
