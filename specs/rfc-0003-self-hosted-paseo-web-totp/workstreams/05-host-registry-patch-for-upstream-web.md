---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 05
language: en-US
audience: agent
doc_type: workstream
status: implemented_with_concerns
owner: worker-05-host-registry-patch
depends_on:
  - 04
updated: 2026-05-04
---

# Workstream 05: Host Registry Patch For Upstream Web

## Goal

Patch the upstream Paseo web app so it loads Passport-registered machines at
boot and merges them into the app's host runtime.

## Scope

- Patch `packages/app/src/runtime/host-runtime.ts`.
- In `HostRuntimeStore.runBoot()`, call `await this.loadPassportHosts();`
  immediately after `await this.loadFromStorage();`.
- Add `packages/app/src/runtime/passport-hosts.ts`.
- Reuse `normalizeStoredHostProfile()` from
  `packages/app/src/types/host-connection.ts`.
- Add a narrow `/api/passport/hosts` loader using `credentials: "include"`.
- Treat `401` as no Passport hosts.
- Merge Passport hosts by `serverId` without deleting local browser-only hosts.
- Do not persist Passport-loaded hosts into AsyncStorage in the MVP.
- Avoid daemon protocol, provider, permissions, and agent-session changes.

## Validation

- Red: `npm run test --workspace=@getpaseo/app -- host-runtime` from
  `vendor/paseo` failed before implementation because Passport hosts were not
  fetched or merged.
- Green: `npm run test --workspace=@getpaseo/app -- host-runtime` from
  `vendor/paseo` passed after implementation, covering `401` as empty, invalid
  profiles filtered out, merge by `serverId`, preservation of browser-only
  hosts, and no AsyncStorage write for Passport-loaded hosts.
- Patch apply: `npx tsx scripts/apply-paseo-patch.ts` passed after reversing
  the generated patch locally and applying it again against the pinned
  `v0.1.67` source.
- Build: `npm run build:paseo-web` and `npm run build` passed.
- Browser smoke confirming registered hosts in the real Paseo UI remains a
  coordinator/workstream 06 validation step per the worker prompt.

## Acceptance

- All active Passport registry machines are available in the self-hosted Paseo
  UI after auth.
- Passport hosts are loaded after browser registry state and before local
  fallback/bootstrap behavior.
- Passport-loaded hosts are not written into browser local registry storage.
- Raw pairing offers and provider credentials are never exposed.
