---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
workstream: 03
language: en-US
audience: agent
doc_type: workstream
status: ready
owner: unassigned
depends_on:
  - 02
updated: 2026-05-06
---

# Workstream 03: Patch, Build, And Documentation Integration

## Goal

Make the upstream Paseo UI change reproducible through parent-repo patch files
and update integration documentation without changing the pinned submodule
version.

## Scope

- Add a dedicated upstream patch for the dashboard tab action or deliberately
  update the patch script to apply multiple patches.
- Keep `vendor/paseo` pinned to the current approved release.
- Do not commit upstream source changes inside the submodule as the durable
  integration mechanism.
- Update `scripts/apply-paseo-patch.ts` and `scripts/build-paseo-web.ts` only
  if needed for multiple patches.
- Update `docs/upstream-paseo.md` with the new patch contract and validation
  evidence.

## Files Or Modules

- `patches/paseo-web-dispatch-dashboard-tab.patch`
- `scripts/apply-paseo-patch.ts`
- `scripts/build-paseo-web.ts`
- `docs/upstream-paseo.md`
- `specs/rfc-0004-paseo-dispatch-dashboard-tab/STATUS.md`

## Validation

- `npx tsx scripts/apply-paseo-patch.ts`
- `npm run build:paseo-web`
- `npm run build`

## Acceptance

- Clean checkout can reproduce the patched self-hosted Paseo build.
- The existing host-registry patch contract remains intact.
- Documentation names the dashboard-tab patch and confirms no submodule version
  change.
