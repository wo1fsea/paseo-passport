---
language: en-US
audience: agent
doc_type: normative
---

# Spec Workflow

## When To Write A Spec

Run `docs/governance/spec-decision-gate.md` before any task that may change code.

Write a spec before implementation when at least one is true:

- Behavior is ambiguous or user-visible.
- The change spans multiple modules or ownership boundaries.
- The change affects persistence, permissions, security, billing, migration, or public APIs.
- A coding agent needs stable product intent before implementation.
- Reviewers need to approve direction before code churn begins.

Use `docs/governance/compact-specs.md` for bug fixes and small behavior tweaks. Skip full specs only for direct implementation exceptions: purely mechanical changes with no behavior, contract, data, UI, configuration, permissions, security, test, docs, or governance impact.

Before implementation, run the Parallelization Gate. Prefer independent workstreams and implementation agents for non-trivial specs. Use one serial workstream only when the task is atomic, highly conflict-prone, blocked on unresolved shared contracts, an explicit tiny or emergency exception, or cheaper to complete directly than to coordinate.

## Required Files

```text
specs/<spec-id>/
  PRODUCT.md
  TECH.md
  STATUS.md
  workstreams/
    01-implementation.md
```

`PRODUCT.md` describes user/API-visible behavior as testable invariants.

`TECH.md` describes current code context, proposed changes, validation, risks, and follow-ups.

Use `docs/governance/spec-first-delivery.md` for coordinator handoff, subagent implementation, and main-session acceptance.

Use `docs/governance/compact-specs.md` for bug fix and small tweak specs.

Use `docs/governance/spec-production.md` when creating or revising spec files.

## Keep Specs Current

If implementation changes user-visible behavior, update `PRODUCT.md`.

If implementation changes module boundaries, sequencing, validation, or risks, update `TECH.md`.

Use `docs/governance/spec-execution-status.md` to manage not-started, partial, blocked, ready-review, and completed execution states.

Use `docs/governance/multi-agent-spec-flow.md` when multiple agents or branches implement the same spec in parallel.
