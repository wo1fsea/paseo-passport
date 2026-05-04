---
spec_id: rfc-0003-self-hosted-paseo-web-totp
language: en-US
audience: agent
doc_type: spec
status: draft
implementation: not_started
validation: not_started
coordinator: Codex
updated: 2026-05-04
---

# Status

## Summary

This draft spec corrects the target product direction after phase-A validation:
Passport should serve the real self-hosted Paseo interactive web UI behind
single-user pure TOTP authentication. The current phase-A shell remains useful
evidence for the host registry contract, but it is not the final workspace.

The spec is draft because the upstream Paseo host-runtime patch point must be
re-confirmed before implementation starts.

## Workstreams

| ID | Scope | Status | Owner | Branch / PR | Depends on | Updated |
|---|---|---|---|---|---|---|
| 01 | TOTP-only enrollment and session auth | draft | unassigned | | | 2026-05-04 |
| 02 | Paseo-styled Passport pages | draft | unassigned | | 01 | 2026-05-04 |
| 03 | Access and workspace history | draft | unassigned | | 01 | 2026-05-04 |
| 04 | Self-hosted upstream Paseo web build | draft | unassigned | | 01 | 2026-05-04 |
| 05 | Host registry patch for upstream web | draft | unassigned | | 04 | 2026-05-04 |
| 06 | End-to-end browser and local daemon smoke | draft | unassigned | | 02, 03, 05 | 2026-05-04 |

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

## Spec Handoff

- Spec path: `specs/rfc-0003-self-hosted-paseo-web-totp/`
- Status: draft
- Spec type: feature / architecture correction
- Open questions: upstream Paseo host-runtime patch point must be confirmed.
- Workstreams: 6
- Next owner: coordinator should inspect pinned upstream Paseo web source before
  marking workstreams 04-06 ready.
- Validation expectation: TDD for auth/history, build and unit/API tests,
  upstream web build validation, and in-app browser smoke against real
  self-hosted Paseo UI.
- Ready to implement: no. After user review, workstreams 01-03 can move to
  ready; 04-06 need upstream code confirmation first.
- Subagent handoff required: yes for implementation workstreams.
