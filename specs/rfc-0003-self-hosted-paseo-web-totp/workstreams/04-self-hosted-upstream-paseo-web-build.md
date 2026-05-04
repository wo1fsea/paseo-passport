---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 04
language: en-US
audience: agent
doc_type: workstream
status: draft
owner: unassigned
depends_on:
  - 01
updated: 2026-05-04
---

# Workstream 04: Self-Hosted Upstream Paseo Web Build

## Goal

Replace the generated Passport workspace shell with a protected, self-hosted
build of upstream Paseo web.

## Scope

- Add upstream Paseo as a git submodule at `vendor/paseo`.
- Pin the submodule to upstream stable release `v0.1.67`
  (`15a2e3bdcbefda97587f74e499d6b81a278d458c`).
- Use the confirmed upstream web build command:
  `npm run build --workspace=@getpaseo/app`.
- Use the confirmed build output directory:
  `vendor/paseo/packages/app/dist`.
- Build the upstream web app reproducibly.
- Copy or serve the built output from Passport.
- Preserve deep-link fallback for client-side routes.
- Record license and source provenance.

## Validation

- Upstream web build command passes locally and produces
  `vendor/paseo/packages/app/dist/index.html`.
- `.gitmodules` and the submodule gitlink point at the accepted upstream stable
  release tag/commit.
- Agent setup can initialize the submodule and verify `vendor/paseo` is at
  `v0.1.67` / `15a2e3bdcbefda97587f74e499d6b81a278d458c`.
- Passport serves the built upstream app from the protected workspace route.
- Browser smoke shows real Paseo interactive UI, not the Passport shell.

## Acceptance

- `/` after Passport auth opens the real self-hosted Paseo UI.
- The page is served by Passport, not `https://app.paseo.sh`.
- Upstream source is managed through the `vendor/paseo` submodule, not a loose
  clone or committed vendor snapshot.
