---
language: en-US
audience: agent
doc_type: spec
---

# Paseo Dispatch Dashboard Tab Tech Spec

Product spec: `./PRODUCT.md`

## Current Repo Context

Passport currently serves the self-hosted upstream Paseo web app from
`apps/passport-server/src/web/static.ts`, protects workspace routes through the
existing TOTP/session middleware, and exposes active machine profiles through
`apps/passport-server/src/machines/routes.ts` at `/api/passport/hosts`.

The upstream Paseo app already has the UI primitives needed to open a dashboard
without adding a new tab kind:

- `vendor/paseo/packages/app/src/stores/workspace-tabs-store.ts` already
  supports `{ kind: "browser", browserId }`.
- `vendor/paseo/packages/app/src/stores/browser-store.ts` supports
  `createWorkspaceBrowser({ initialUrl })`.
- `vendor/paseo/packages/app/src/screens/workspace/workspace-screen.tsx`
  already has `handleOpenUrlInBrowserTab(url)`.
- `vendor/paseo/packages/app/src/screens/workspace/workspace-desktop-tabs-row.tsx`
  renders the desktop tab-row action area that currently contains new agent,
  terminal, browser, and split actions.

The existing service-link path is not enough for this feature. In
`vendor/paseo/packages/app/src/utils/workspace-script-links.ts`, relay
connections intentionally return `openUrl: null`, so a running service on a
relay-connected machine cannot simply be opened as a normal service URL.

Dispatch Engine exposes a read-only observer UI through:

```sh
python3 ~/.codex/skills/dispatch-engine/scripts/de.py dashboard <repo> --status --json
python3 ~/.codex/skills/dispatch-engine/scripts/de.py dashboard <repo> --detach --json
```

For this spec, Passport should only surface an already-running dashboard. It
may use `--status --json` to detect availability, but it must not auto-start a
dashboard in the MVP.

## Spec Decision Gate

- Request: add a Paseo workspace tab-row entry that opens a running Dispatch
  Engine dashboard in a new tab.
- Code change expected: yes.
- Existing spec: none.
- Decision: new-full-spec.
- Reason: the change is user-visible, crosses Passport server APIs and
  upstream Paseo UI patching, affects security/proxy behavior, and introduces
  agent workflow visibility inside the product UI.
- Behavior, contract, data, UI, configuration, permissions, security, test,
  docs, or governance impact: UI, API, proxy/security, build patch, tests,
  docs, and agent workflow.
- Next workflow: spec-first delivery with split workstreams.
- Recorded in: `specs/rfc-0004-paseo-dispatch-dashboard-tab/STATUS.md`.

## Change Gate

- Problem: operators cannot view an active Dispatch Engine dashboard from the
  Paseo workspace tab strip where the current work is happening.
- Existing path considered: open the dashboard in an external browser or use
  upstream Paseo service links.
- Why existing path is insufficient: external browser navigation breaks the
  workspace context, and service links are not reliably openable for relay
  connections. Raw local dashboard URLs also bypass Passport authentication.
- Smallest new surface: one authenticated Passport dashboard availability/open
  API, one Passport same-origin dashboard proxy path, and one upstream Paseo
  tab-row action that opens a browser tab.
- What will be deleted or replaced: nothing in MVP; this adds a conditional
  entry without replacing existing browser/service actions.
- Owner: implementation workers under this spec.
- Validation: Passport API tests, upstream Paseo UI unit tests, patch apply,
  upstream web build, Passport build/test, and browser smoke with screenshots.
- Temporary or permanent: permanent MVP path for read-only DE visibility.
- Removal condition: superseded by a later native dashboard tab or remote
  dashboard aggregation spec.

## Upstream Paseo Patch Contract

Do not upgrade, repin, or directly modify the `vendor/paseo` submodule as the
durable change. The submodule remains pinned to the existing project-approved
upstream release. All upstream Paseo source changes for this feature must be
captured as a parent-repo patch file under `patches/` and applied by repo
scripts during the existing build flow.

Expected patch shape:

- Extend the workspace screen and desktop tab-row props to accept dashboard
  availability and an open handler.
- Add a compact dashboard action in
  `vendor/paseo/packages/app/src/screens/workspace/workspace-desktop-tabs-row.tsx`
  near the existing browser-tab action.
- Reuse `handleOpenUrlInBrowserTab(url)` rather than adding a new tab target.
- Add a small client helper, if needed, to call Passport's same-origin
  dashboard availability/open endpoint with credentials included.
- Keep the patch narrow and independent from provider, daemon protocol, agent
  session, host registry, or terminal behavior.

If the existing `patches/paseo-web-passport-hosts.patch` remains focused on
host loading, add a separate patch such as
`patches/paseo-web-dispatch-dashboard-tab.patch` instead of expanding the host
patch beyond its original contract.

## Passport API / Proxy Contract

Preferred MVP API shape:

```http
GET /api/dispatch/dashboard/current?serverId=<serverId>&workspaceId=<workspaceId>&cwd=<encoded>
```

Response when available:

```json
{
  "available": true,
  "runId": "20260504T055050436139Z",
  "url": "/dispatch-dashboard/20260504T055050436139Z/",
  "label": "Dispatch Dashboard"
}
```

Response when unavailable:

```json
{
  "available": false,
  "reason": "not_running"
}
```

The exact parameter names may change during implementation, but these
constraints are mandatory:

- The API requires the existing Passport session unless loopback-only local auth
  bypass is enabled.
- Browser-provided repo paths are accepted only after resolving under explicit
  allowed roots.
- The API must not return the raw local dashboard URL.
- The API must not return arbitrary filesystem paths.
- The API must not auto-start the dashboard in the MVP.
- Reasons must be generic enough for UI use and must not reveal sensitive paths
  to unauthenticated users.

Preferred MVP proxy shape:

```http
GET /dispatch-dashboard/<run-id>/*
```

The proxy should map an authenticated, allowlisted dashboard session to the
loopback dashboard URL returned by Dispatch Engine status metadata. It should
forward only ordinary dashboard HTTP requests needed by the read-only UI.
WebSocket support is not required unless the current Dispatch Engine dashboard
uses it.

Allowed root configuration is required before browser-provided `cwd` can be
trusted. The implementation may introduce an environment variable such as:

```text
PASSPORT_DASHBOARD_REPO_ROOTS=/home/ubuntu/Projects,/Users/huangquanyong/Projects
```

If no allowed roots are configured, dashboard availability should fail closed
and return `available: false`.

## Dispatch Engine Status Contract

Passport should call the installed Dispatch Engine CLI with an explicit repo:

```sh
python3 ~/.codex/skills/dispatch-engine/scripts/de.py dashboard <repo> --status --json
```

Only this status is in scope for MVP availability. A dashboard is available
when status JSON indicates an alive dashboard and includes a loopback URL that
Passport can proxy. The implementation should handle malformed JSON, missing
CLI, missing `.dispatch/`, stale metadata, and dead PIDs as unavailable states.

The MVP must not call `de dashboard --detach` from the UI path. Starting or
reusing dashboard processes from Passport can be specified later, but the user
requested an entry when a corresponding dashboard is already running.

## UI Contract

- The entry appears in the desktop workspace tab-row action area.
- The entry is compact and icon-led, matching existing tab-row actions.
- It has `accessibilityLabel="Open Dispatch Dashboard"` or equivalent.
- Tooltip text is `Dispatch Dashboard` or equivalent.
- The entry is hidden when unavailable.
- The entry opens a new browser tab using the returned same-origin URL.
- The entry must not shift the tab row layout when unavailable.
- The MVP may be desktop/Electron-only if upstream browser tabs are
  desktop/Electron-only in the current app.

## Security Requirements

- Auth is enforced through the existing Passport session model.
- Local auth bypass remains loopback-only.
- Raw dashboard server URLs are never exposed as public entry points.
- Raw repo paths are not returned to the browser.
- Browser-provided paths are allowed only under configured repo roots.
- Dashboard proxying remains read-only from the Passport integration
  perspective.
- No raw pairing offers, daemon keypairs, TOTP material, session cookies,
  provider credentials, or dashboard process environment values are stored in
  logs or API responses.
- Dashboard availability checks must fail closed.

## Validation Plan

Required automated validation:

```text
npm run build
npm test -- --run
npm run build:paseo-web
```

Targeted validation to add or update:

- Passport tests for dashboard availability unavailable states:
  unauthenticated, no allowlisted roots, path outside roots, missing `.dispatch`,
  dead dashboard status, malformed CLI output, and alive status.
- Passport tests proving the API does not return raw local dashboard URLs or
  repo paths.
- Passport proxy tests proving authenticated same-origin proxying works for a
  loopback dashboard fixture.
- Upstream Paseo app tests proving the tab-row action is hidden when
  unavailable and opens a browser tab with the returned URL when available.
- Patch apply validation for the new upstream Paseo patch.
- Browser smoke in the self-hosted Paseo UI with a running local DE dashboard:
  the dashboard action appears, click opens a new browser tab, and the dashboard
  content renders.
- Browser smoke for the no-dashboard state: the entry is absent.
- Desktop screenshot evidence for available and unavailable states.
- Mobile screenshot or explicit not-applicable note if the action is
  desktop/Electron-only.

## Risks And Follow-ups

- Mapping upstream Paseo workspace context to a server-side repo path is the
  highest-risk contract. The MVP must use an allowlist and fail closed.
- Remote relay machines cannot be covered by a local Passport filesystem
  lookup. A later spec can introduce machine-side status reporting or
  Passport-to-daemon aggregation.
- A same-origin HTTP proxy may need careful path/header handling to avoid
  exposing unrelated loopback services.
- Browser-tab title and icon polish may require dashboard `<title>` or browser
  store metadata tweaks.
- If users expect the action to start dashboards, that should be a separate
  mutating-control spec with explicit security review.
