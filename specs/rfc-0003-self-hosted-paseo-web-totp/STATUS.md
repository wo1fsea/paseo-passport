---
spec_id: rfc-0003-self-hosted-paseo-web-totp
language: en-US
audience: agent
doc_type: spec
status: active
implementation: complete
validation: complete
deployment: hk_https_smoke_passed
coordinator: Codex
updated: 2026-05-04
---

# Status

## Summary

This spec corrects the target product direction after phase-A validation:
Passport should serve the real self-hosted Paseo interactive web UI behind
single-user pure TOTP authentication. The current phase-A shell remains useful
evidence for the host registry contract, but it is not the final workspace.

Implementation evidence exists for all MVP workstreams, and workstream 06 has
final smoke evidence. The stale full-suite tests called out by the final smoke
worker were repaired on 2026-05-04, and the full Passport server test suite is
now green.

## Workstreams

| ID | Scope | Status | Owner | Branch / PR | Depends on | Updated |
|---|---|---|---|---|---|---|
| 01 | TOTP-only enrollment and session auth | implemented_with_concerns | worker-01-totp-auth | | | 2026-05-04 |
| 02 | Paseo-styled Passport pages | implemented_with_repair | worker-02-paseo-pages / worker-02r-paseo-visual-alignment | | 01 | 2026-05-04 |
| 02R | Paseo visual alignment repair | implemented_with_concerns | worker-02r-paseo-visual-alignment | | 02, 03 | 2026-05-04 |
| 03 | Access and workspace history | implemented | worker-03-history | | 01 | 2026-05-04 |
| 04 | Self-hosted upstream Paseo web build | implemented | worker-04-upstream-build | | 01 | 2026-05-04 |
| 05 | Host registry patch for upstream web | implemented_with_concerns | worker-05-host-registry-patch | | 04 | 2026-05-04 |
| 06 | End-to-end browser and local daemon smoke | validated | worker-06-e2e-smoke + Codex repair | | 02R, 03, 05 | 2026-05-04 |

## Activity Log

- 2026-05-04: Draft spec created after correcting target UX from Passport shell
  to self-hosted upstream Paseo interactive web app with pure TOTP auth.
- 2026-05-04: Accepted reset/recovery model: authenticated page reset plus
  local server-side emergency reset command; no public web recovery flow.
- 2026-05-04: Accepted encrypted-at-rest TOTP secret storage using
  `PASSPORT_DATA_KEY`; persistent startup fails closed without a valid key.
- 2026-05-04: Accepted history retention of 3,000 rows per category with
  50-row default pages, raw source IP storage, and no raw User-Agent storage.
- 2026-05-04: Accepted first-run QR enrollment as a full-screen Paseo-styled
  surface with a centered QR panel, not a workspace-overlay modal.
- 2026-05-04: Accepted workspace usage history MVP scope:
  `workspace_opened` and `host_profile_loaded` only; host/project open events
  are deferred.
- 2026-05-04: Accepted upstream source strategy: git submodule at
  `vendor/paseo`, pinned to latest verified stable release `v0.1.67`
  (`15a2e3bdcbefda97587f74e499d6b81a278d458c`).
- 2026-05-04: Agent setup initialized `vendor/paseo`, installed upstream npm
  dependencies, and verified the upstream app build command:
  `npm run build --workspace=@getpaseo/app`, producing
  `vendor/paseo/packages/app/dist`.
- 2026-05-04: Accepted upstream host registry patch point:
  `packages/app/src/runtime/host-runtime.ts`, directly after
  `HostRuntimeStore.runBoot()` calls `loadFromStorage()`, with host
  normalization through `packages/app/src/types/host-connection.ts`.
- 2026-05-04: Visual review rejected the first Passport page styling as a
  separate green/amber dark security-admin console rather than an upstream
  Paseo-aligned shell. Added and implemented workstream 02R before final smoke.
- 2026-05-04: Workstream 06 validated the TOTP-only MVP smoke, upstream Paseo
  serving, fixture host availability, sanitized host API, and access/workspace
  history with browser screenshots. The initial full-suite run was blocked by
  stale non-assigned tests that still targeted the phase-A login/shell.
- 2026-05-04: Repaired the stale full-suite tests:
  `apps/passport-server/tests/local-auth-bypass.test.ts` now asserts the
  current Paseo-aligned machines page, and
  `apps/passport-server/tests/offer.test.ts` now authenticates through
  first-run TOTP enrollment plus TOTP-only login instead of the removed
  password helper.
- 2026-05-04: Final validation passed:
  `npm test -- --run local-auth-bypass offer` passed 9/9 tests, and
  `npm test -- --run` passed 47/47 tests across 9 files.
- 2026-05-04: Dispatch Engine run `20260504T055050436139Z` could not recover
  from framework protocol-violation alerts after validation was repaired, so it
  was cancelled with evidence preserved. Upstream Dispatch Engine issue
  https://github.com/wo1fsea/dispatch-engine/issues/19 was filed, with the
  local issue record at
  `specs/rfc-0003-self-hosted-paseo-web-totp/issues/dispatch-engine-blocked-run-after-protocol-violations.md`;
  the first `gh` attempt failed only because `/opt/homebrew/bin` was absent
  from Codex's shell `PATH`.
- 2026-05-04: HK development deployment verified at
  `https://paseo.codexy.fun:6868`. Passport listens on `127.0.0.1:6867`, Caddy
  terminates HTTPS on public `6868`, public `80` redirects to HTTPS, and
  existing `443` remains reserved for Xray.
- 2026-05-04: Real `PC-WIN11` registration verified in the self-hosted
  workspace from the HTTPS origin. The host appeared in the project picker, the
  relay WebSocket to `relay.paseo.sh` exchanged frames, and a direct daemon
  probe returned hostname `WO1FSEA-PC-WIN11`, daemon version `0.1.62`, and
  about `35ms` ping.
- 2026-05-04: Documented the public HTTP failure mode: non-local HTTP origins
  are not browser secure contexts, so `crypto.subtle` is unavailable and the
  upstream Paseo relay E2EE client does not start. Public deployments must use
  HTTPS.
- 2026-05-04: Documented the current auth throttling behavior: login and
  enrollment completion failures are limited to 5 attempts per 60 seconds per
  `request.ip`, in memory, with generic failure responses. Trusted proxy
  handling behind Caddy remains a follow-up before raw client IP history and
  IP-based buckets are authoritative.

## Spec Handoff

- Spec path: `specs/rfc-0003-self-hosted-paseo-web-totp/`
- Status: active; implementation complete with full local validation.
- Spec type: feature / architecture correction
- Open questions: none blocking the MVP. Follow-ups are trusted proxy/raw-IP
  correctness behind Caddy, DB/secret backup policy, and cleaner Windows daemon
  service startup.
- Workstreams: 7
- Next owner: coordinator can review workstream evidence and the Dispatch
  Engine issue draft for the remaining DE run-state blocker.
- Validation expectation: TDD for auth/history, build and unit/API tests,
  upstream web build validation, and in-app browser smoke against real
  self-hosted Paseo UI.
- Ready to review: yes.
- Subagent handoff required: yes for implementation workstreams.
