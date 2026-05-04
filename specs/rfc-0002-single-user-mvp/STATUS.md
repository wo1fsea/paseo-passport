---
spec_id: rfc-0002-single-user-mvp
language: en-US
audience: agent
doc_type: spec
status: phase_a_validated
implementation: phase_a_complete
validation: phase_a_passed
coordinator: Codex
updated: 2026-05-04
---

# Status

## Summary

Phase A local MVP implementation is validated for workstreams 01-08. The repo
now includes the Passport server skeleton, auth/session flow, machine registry,
host profile API, protected admin UI, generated Paseo workspace shell, protected
workspace serving, and local smoke coverage.

This spec is historical phase-A evidence. The current product target is
`specs/rfc-0003-self-hosted-paseo-web-totp/`, which replaces username/password
auth with pure TOTP and replaces the generated shell with a self-hosted upstream
Paseo web build.

Workstreams 09 and 10 remain operator-gated after local smoke because they
require deployment-target selection and real-machine credentials outside the
public repo. Workstream 11 records the follow-up decision for loopback-only
local auth bypass and local upstream Paseo pairing validation.

## Workstreams

| ID | Scope | Status | Owner | Branch / PR | Depends on | Updated |
|---|---|---|---|---|---|---|
| 01 | Project skeleton | validated | worker-001 | | | 2026-05-04 |
| 02 | Auth and sessions | validated | worker-003 | | 01 | 2026-05-04 |
| 03 | Machine registry | validated | worker-004 | | 01, 02 | 2026-05-04 |
| 04 | Host profile API | validated | worker-005 | | 03 | 2026-05-04 |
| 05 | Admin UI | validated | worker-006 | | 02, 03 | 2026-05-04 |
| 06 | Paseo vendor and patch | validated | worker-007 | | 04 | 2026-05-04 |
| 07 | Workspace serving | validated | worker-008 | | 02, 06 | 2026-05-04 |
| 08 | Local end-to-end smoke | validated | worker-001 | | 05, 07 | 2026-05-04 |
| 09 | Development-machine deployment | ready | unassigned | | 08 | 2026-05-04 |
| 10 | Real daemon smoke | ready | unassigned | | 08, 09 | 2026-05-04 |
| 11 | Local test mode and upstream Paseo pairing | validated | worker-codex | automated and local pairing evidence in workstream | 08 | 2026-05-04 |

## Activity Log

- 2026-05-04: MVP spec created from accepted single-user TOTP sidecar plan.
- 2026-05-04: Deployment scope constrained to generic development-machine
  deployment; no machine-specific server details belong in this public repo.
- 2026-05-04: Auth and sessions workstream validated after approved scope
  expansion for dependency, config, and production server integration.
- 2026-05-04: Phase A workstreams 01-08 validated. Workstreams 09 and 10 remain
  operator-gated.
- 2026-05-04: Recorded follow-up decisions for loopback-only local auth bypass
  and local upstream Paseo pairing as workstream 11.
- 2026-05-04: Workstream 11 automated scope implemented and validated by
  worker-codex; local upstream Paseo pairing commands remain operator-gated.
- 2026-05-04: Main session accepted workstream 11 automated scope after tests,
  build, and local HTTP smoke. Real upstream Paseo daemon pairing remains
  pending operator validation.
- 2026-05-04: Workstream 11 local upstream Paseo validation completed with
  `@getpaseo/cli@0.1.67`, isolated daemon home `.out/paseo-local-test`, and
  Passport test registry import for `srv_cxpKpFRXo1T0`.
- 2026-05-04: Target UX corrected in
  `specs/rfc-0003-self-hosted-paseo-web-totp/`: phase-A shell remains validated
  evidence but is not the final workspace target.
- 2026-05-04: rfc-0003 completed and superseded the phase-A password-plus-TOTP
  shell target. HK HTTPS deployment and real `PC-WIN11` smoke evidence now live
  in rfc-0003 status and docs.

## Spec Handoff

- Spec path: `specs/rfc-0002-single-user-mvp/`
- Status: phase_a_validated
- Spec type: feature / architecture implementation
- Open questions: deployment target and real daemon credentials are required
  before workstreams 09 and 10.
- Workstreams: 11
- Next owner: operator should approve deployment validation before workstreams
  09 and 10, or local upstream Paseo validation before workstream 11.
- Validation expectation: each workstream records narrow validation; full MVP
  acceptance requires build, unit/API tests, e2e or documented smoke, patched
  web build, and real daemon smoke.
- Ready to implement: no for phase A; yes for operator-gated workstreams 09,
  10, and 11 after approval.
- Subagent handoff required: yes for deployment and real-daemon validation after
  operator approval.

## Main Session Acceptance

- Accepted by: interactive Codex
- Diff reviewed: phase A workstreams 01-08
- Validation run: `npm run build:paseo-web`; `npm run test:e2e`; `npm run build`;
  `npm test -- --run`
- Residual risk: browser UI evidence remains manual/documented until a stable
  browser runner is added; workstreams 09 and 10 are intentionally not run.
