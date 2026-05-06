---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
workstream: 01
language: en-US
audience: agent
doc_type: workstream
status: ready
owner: unassigned
depends_on: []
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
