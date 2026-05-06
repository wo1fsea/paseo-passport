---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
workstream: 03
language: en-US
audience: agent
doc_type: workstream
status: validated
owner: repair-worker-03-patch-build-docs
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

## Validation Evidence

- 2026-05-06: repair-worker-03-patch-build-docs ran
  `npx tsx scripts/apply-paseo-patch.ts`; it passed and confirmed the
  host-registry and Dispatch Dashboard tab patches were already applied in
  `vendor/paseo`.
- 2026-05-06: repair-worker-03-patch-build-docs ran
  `npm run build:paseo-web`; it passed, confirmed both upstream patches are
  idempotent, built upstream Paseo `v0.1.67`, and copied
  `packages/app/dist` into `apps/passport-server/public`.
- 2026-05-06: repair-worker-03-patch-build-docs ran `npm run build`; it passed
  for
  `@paseo-passport/passport-server`.

## Acceptance

- Clean checkout can reproduce the patched self-hosted Paseo build.
- The existing host-registry patch contract remains intact.
- Documentation names the dashboard-tab patch and confirms no submodule version
  change.

## Activity Log

- 2026-05-06: repair-worker-03-patch-build-docs reclaimed the workstream after
  the prior registered worker failed to produce a Dispatch Engine report; the
  repair pass will re-verify patch capture, build integration, documentation,
  and required validation before reporting completion.
- 2026-05-06: worker-03-patch-build-docs claimed the workstream to capture the
  current `vendor/paseo` dashboard-tab edits as a parent-repo patch, preserve
  the existing host-registry patch contract, and run build validation.
- 2026-05-06: Captured
  `patches/paseo-web-dispatch-dashboard-tab.patch`, updated the patch/build
  scripts and upstream provenance docs, and validated the workstream.
- 2026-05-06: repair-worker-03-patch-build-docs revalidated the captured patch,
  build integration, upstream docs, and required build commands, then restored
  the workstream to `validated`.
