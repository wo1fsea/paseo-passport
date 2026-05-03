---
id: 06-paseo-vendor-and-patch
language: en-US
audience: agent
doc_type: spec
status: ready
owner: unassigned
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
claimed_at:
lease_expires_at:
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
