---
spec_id: rfc-0002-single-user-mvp
workstream: 11
language: en-US
audience: agent
doc_type: workstream
status: validated
owner: worker-codex
depends_on:
  - 08
updated: 2026-05-04
---

# Workstream 11: Local Test Mode And Upstream Paseo Pairing

## Goal

Add an explicit local-only test mode that can skip Passport authentication while
the service is bound to loopback, then verify a local upstream Paseo start and
pairing flow against the Passport registry.

This workstream records an approved follow-up decision. It does not change the
phase-A MVP validation result for workstreams 01-08.

## Scope

In scope:

- Add `PASSPORT_LOCAL_AUTH_BYPASS` config handling.
- Fail startup when auth bypass is enabled on any non-local bind address.
- Treat protected admin, workspace, and Passport host routes as the configured
  single-user test session only when bypass is enabled and loopback validation
  passes.
- Document and verify local upstream Paseo install/start commands.
- Import a local upstream Paseo pairing offer into the Passport test registry.
- Confirm the workspace can load the imported host profile in the local test
  environment.

Out of scope:

- Production or development-machine deployment bypass.
- Public network exposure without HTTPS.
- Storing raw pairing offers, daemon credentials, or local upstream config in
  git.
- Replacing the phase-A workspace shell before the full upstream web build is
  pinned, patched, built, and validated.

## Implementation Notes

- The bypass flag should default to `false`.
- Loopback/local-only hosts are `127.0.0.1`, `localhost`, and `::1`.
- Startup validation must happen before the server accepts requests.
- Tests should cover both the allowed loopback path and the rejected non-local
  bind path.
- If upstream Paseo installation is unavailable in CI or the operator machine,
  record the skipped manual validation with the exact blocker.

## Validation

Required automated validation:

- Build passes.
- Unit/API tests cover bypass disabled, bypass enabled on loopback, and bypass
  enabled on non-local host.
- Protected admin, workspace, and `/api/passport/hosts` routes remain protected
  when bypass is disabled.

Required local/operator validation:

- Start Passport in local bypass mode bound to a loopback host.
- Install/start upstream Paseo locally using documented commands.
- Generate or obtain a local test pairing offer.
- Import the pairing offer through Passport.
- Confirm the imported host appears in the workspace or host API without
  committing secrets or raw offers.

## Acceptance

- `PASSPORT_LOCAL_AUTH_BYPASS=true` cannot serve protected routes on a
  non-local bind address.
- Local bypass mode allows auth-free testing only on a loopback/local-only bind.
- A local upstream Paseo pairing offer can be imported and represented as a
  Passport host profile.
- Confirmed upstream local test commands are recorded in `docs/upstream-paseo.md`.

## Activity Log

- 2026-05-04: worker-codex claimed workstream 11 automated scope.
- 2026-05-04: Implemented loopback-only `PASSPORT_LOCAL_AUTH_BYPASS` config,
  fail-closed service build validation, bypassed single-user test access for
  `/api/auth/me`, `/api/passport/hosts`, admin routes, and workspace routes,
  and documented local upstream pairing placeholders without raw offers or
  secrets.
- 2026-05-04: Main session accepted the automated scope after targeted tests,
  full tests, build, and local HTTP smoke. Real upstream Paseo daemon pairing
  remains operator-gated.
- 2026-05-04: Installed `@getpaseo/cli@0.1.67`, started an isolated local Paseo
  daemon under `.out/paseo-local-test`, generated a real pairing offer, imported
  it into Passport test registry, and verified the host profile response. Raw
  offer and daemon secrets were not committed.

## Evidence

Automated validation:

- Red: `npm test -- --run config local-auth-bypass` failed before
  implementation with missing `localAuthBypass`, cookie-free bypass still
  returning `401`, and non-local bypass build not throwing.
- Green: `npm test -- --run config local-auth-bypass` passed after
  implementation.
- Broader validation: `npm test -- --run auth config admin-ui workspace-serving
  hosts-api local-auth-bypass`; `npm test -- --run`; `npm run build`.
- Main-session validation: `npm test -- --run auth config admin-ui
  workspace-serving hosts-api local-auth-bypass`; `npm test -- --run`;
  `npm run build`; local HTTP smoke against `127.0.0.1:7317` with
  `PASSPORT_LOCAL_AUTH_BYPASS=true` confirmed `/api/auth/me`,
  `/api/passport/hosts`, `/admin/machines`, `/`, `/passport-hosts.js`, and a
  fixture import through `/api/admin/machines/import-offer`.

Operator validation:

- `npm install -g @getpaseo/cli@0.1.67`.
- `paseo daemon start --home .out/paseo-local-test --port 6767`.
- `paseo daemon status --home .out/paseo-local-test --json` returned
  `serverId: srv_cxpKpFRXo1T0`, `localDaemon: running`,
  `connectedDaemon: reachable`, `listen: 127.0.0.1:6767`, CLI/daemon version
  `0.1.67`, and detected Claude, Codex, and OpenCode providers.
- `paseo daemon pair --home .out/paseo-local-test --json` produced a real
  pairing offer shaped as upstream `#offer=<base64url>`.
- `POST /api/admin/machines/import-offer` returned `201` for
  `Local Paseo daemon 0.1.67`.
- `/api/passport/hosts` returned the registered host profile for
  `srv_cxpKpFRXo1T0` with relay endpoint `relay.paseo.sh:443`.
- No raw pairing offers, daemon credentials, local provider credentials, or
  secrets were committed.
