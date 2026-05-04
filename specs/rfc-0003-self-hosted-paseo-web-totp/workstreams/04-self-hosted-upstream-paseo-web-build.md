---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 04
language: en-US
audience: agent
doc_type: workstream
status: implemented
owner: worker-04-upstream-build
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

- Upstream web build command passed locally through `npm run build:paseo-web`
  and produced `vendor/paseo/packages/app/dist/index.html`.
- `.gitmodules` points `vendor/paseo` at `https://github.com/getpaseo/paseo.git`.
- The submodule gitlink and local checkout are verified at `v0.1.67` /
  `15a2e3bdcbefda97587f74e499d6b81a278d458c`.
- Passport serves the copied upstream app from protected workspace routes.
- Deep-link fallback is preserved for client routes, while missing generated
  static assets return `404`.
- The copied public output preserves the upstream license notice at
  `apps/passport-server/public/upstream-paseo-LICENSE.txt`.

## Implementation Evidence

- `npm test -- --run workspace-serving` red phase failed before implementation:
  `npm run build:paseo-web` still emitted the old Passport workspace shell and
  missing generated JavaScript assets fell back to `index.html`.
- `npm test -- --run workspace-serving` green phase passed after the upstream
  build/copy script and static fallback changes.
- Final validation passed: `npm run build:paseo-web`, `npm run build`,
  `npm test -- --run workspace-serving`, `npm run passport:reset-totp --
  --db :memory:`, and explicit submodule HEAD/tag checks.
- Browser smoke against loopback local-auth-bypass served the upstream Paseo
  welcome UI from Passport. Evidence:
  `.out/screenshots/worker-04-upstream-paseo-root-15s.png`.

## Acceptance

- `/` after Passport auth opens the real self-hosted Paseo UI.
- The page is served by Passport, not `https://app.paseo.sh`.
- Upstream source is managed through the `vendor/paseo` submodule, not a loose
  clone or committed vendor snapshot.
