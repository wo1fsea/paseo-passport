---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
language: en-US
audience: agent
doc_type: spec
status: ready
implementation: not_started
validation: not_started
coordinator: Codex
updated: 2026-05-06
---

# Status

## Summary

This spec defines a Passport-authenticated way to open an already-running
Dispatch Engine dashboard from the self-hosted Paseo workspace tab row. The
MVP reuses Paseo's existing browser tab target and records upstream Paseo UI
changes as parent-repo patches without changing the pinned `vendor/paseo`
submodule version.

## Spec Decision Gate

- Request: add a Paseo workspace tab-row entry that opens a running Dispatch
  Engine dashboard in a new tab.
- Code change expected: yes.
- Existing spec: none.
- Decision: new-full-spec.
- Reason: user-visible, cross-module, security/proxy-sensitive, and touches
  upstream Paseo patching plus Passport APIs.
- Behavior, contract, data, UI, configuration, permissions, security, test,
  docs, or governance impact: UI, API, proxy/security, configuration, build
  patch, tests, docs, and agent workflow.
- Next workflow: spec-first delivery with independent workstreams.
- Recorded in: this file.

## Parallelization Gate

- Can split: yes.
- Strategy: split by Passport backend/proxy, upstream Paseo UI patch, build
  patch integration, and smoke/acceptance validation.
- Serial dependencies: UI open behavior depends on the API response contract;
  browser smoke depends on backend and patch integration.
- Serial exception: none.

## Workstreams

| ID | Scope | Status | Owner | Branch / PR | Depends on | Updated |
|---|---|---|---|---|---|---|
| 01 | Passport dashboard availability API and same-origin proxy | ready | unassigned | | | 2026-05-06 |
| 02 | Upstream Paseo tab-row action patch | ready | unassigned | | 01 | 2026-05-06 |
| 03 | Patch/build integration and docs | ready | unassigned | | 02 | 2026-05-06 |
| 04 | Browser smoke and acceptance validation | ready | unassigned | | 01, 02, 03 | 2026-05-06 |

## Activity Log

- 2026-05-06: Spec created from product discussion: the entry belongs in the
  Paseo workspace tab row, appears only when a corresponding Dispatch Engine
  dashboard is already running, and opens a new Paseo browser tab.
- 2026-05-06: Accepted upstream patch rule: do not change the pinned
  `vendor/paseo` submodule version; record upstream Paseo changes as
  reproducible parent-repo patches.
- 2026-05-06: Accepted MVP limit: no remote relay-machine dashboard aggregation
  until a later spec defines machine-side or Passport-to-daemon status
  reporting.

## Spec Handoff

- Spec path: `specs/rfc-0004-paseo-dispatch-dashboard-tab/`
- Status: ready.
- Spec type: feature / upstream Paseo integration.
- Open questions: none blocking MVP implementation.
- Workstreams: 4.
- Next owner: Dispatch Engine coordinator or implementation workers.
- Validation expectation: backend tests, upstream app tests, patch apply,
  upstream build, Passport build/test, and browser smoke with screenshots.
- Ready to implement: yes.
- Subagent handoff required: yes.
