---
spec_id: rfc-0002-single-user-mvp
language: en-US
audience: agent
doc_type: spec
status: ready
implementation: not_started
validation: not_started
coordinator: Codex
updated: 2026-05-04
---

# Status

## Summary

MVP implementation is ready to begin. The repo currently has no application
code, so workstreams start from project skeleton and move through auth,
registry, host profile API, patched Paseo web integration, smoke tests, and
generic development-machine deployment.

## Workstreams

| ID | Scope | Status | Owner | Branch / PR | Depends on | Updated |
|---|---|---|---|---|---|---|
| 01 | Project skeleton | ready | unassigned | | | 2026-05-04 |
| 02 | Auth and sessions | ready | unassigned | | 01 | 2026-05-04 |
| 03 | Machine registry | ready | unassigned | | 01, 02 | 2026-05-04 |
| 04 | Host profile API | ready | unassigned | | 03 | 2026-05-04 |
| 05 | Admin UI | ready | unassigned | | 02, 03 | 2026-05-04 |
| 06 | Paseo vendor and patch | ready | unassigned | | 04 | 2026-05-04 |
| 07 | Workspace serving | ready | unassigned | | 02, 06 | 2026-05-04 |
| 08 | Local end-to-end smoke | ready | unassigned | | 05, 07 | 2026-05-04 |
| 09 | Development-machine deployment | ready | unassigned | | 08 | 2026-05-04 |
| 10 | Real daemon smoke | ready | unassigned | | 08, 09 | 2026-05-04 |

## Activity Log

- 2026-05-04: MVP spec created from accepted single-user TOTP sidecar plan.
- 2026-05-04: Deployment scope constrained to generic development-machine
  deployment; no machine-specific server details belong in this public repo.

## Spec Handoff

- Spec path: `specs/rfc-0002-single-user-mvp/`
- Status: ready
- Spec type: feature / architecture implementation
- Open questions: upstream Paseo offer schema and `HostProfile` shape must be
  confirmed before parser and patch work.
- Workstreams: 10
- Next owner: implementation agent should start with `workstreams/01-project-skeleton.md`
- Validation expectation: each workstream records narrow validation; full MVP
  acceptance requires build, unit/API tests, e2e or documented smoke, patched
  web build, and real daemon smoke.
- Ready to implement: yes
- Subagent handoff required: yes for implementation workstreams; this spec
  creation was coordinator work only.

## Main Session Acceptance

- Accepted by:
- Diff reviewed:
- Validation run:
- Residual risk:
