---
id: 06-paseo-vendor-and-patch
language: en-US
audience: agent
doc_type: spec
status: validated
owner: worker-007
branch:
pr:
files:
  - vendor/paseo/
  - patches/paseo-web-passport-hosts.patch
  - scripts/apply-paseo-patch.ts
  - scripts/build-paseo-web.ts
  - docs/upstream-paseo.md
depends_on:
  - 04-host-profile-api
claimed_at: 2026-05-04T02:22:02+08:00
lease_expires_at: 2026-05-04T04:22:02+08:00
updated: 2026-05-04
---

# Paseo Vendor And Patch Workstream

## Scope

Vendor or pin upstream Paseo web source, record license/provenance, and patch the
web host registry boot path to load Passport hosts.

## Plan

- Add upstream Paseo as a pinned submodule or documented clone target.
- Record upstream repository, commit, license, and build command in
  `docs/upstream-paseo.md`.
- Create `patches/paseo-web-passport-hosts.patch`.
- Patch only the host registry load path.
- Add a `loadPassportHostProfiles()` helper that fetches
  `/api/passport/hosts` with credentials.
- Merge Passport hosts after local storage hosts load.
- Keep local host registry behavior working.
- Add or adapt a focused test around merge behavior when feasible.
- Add scripts for applying the patch and building the web app.

## Validation

```powershell
npm run build:paseo-web
npm run build
npm test -- --run
```

If upstream uses a workspace-specific command, record the exact command in
`docs/upstream-paseo.md`.

Latest worker-007 validation:

- `npm run build:paseo-web` passed and produced
  `apps/passport-server/public/index.html` plus `passport-hosts.js`.
- `npx tsx scripts/apply-paseo-patch.ts` passed for the current phase by
  reporting `vendor/paseo` is absent and pointing to `docs/upstream-paseo.md`.
- `npm run build` passed.
- `npm test -- --run` passed: 7 files, 24 tests.

TDD evidence: no test file was changed because this workstream was constrained
to the assigned patch, script, generated public output, and spec/doc files. The
existing workspace-serving and local-smoke tests were run as broader validation.

## Acceptance

- Upstream source provenance is documented.
- License obligations are documented.
- Patch is reproducible.
- Patched Paseo web build succeeds.
- Local hosts still work.
- Passport hosts are fetched and merged at boot.
- No daemon protocol or provider credential behavior is modified.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined.
- 2026-05-04: worker-007 claimed the workstream.
- 2026-05-04: worker-007 implemented the phase-A shell patch contract and
  validated the assigned build/test commands.
