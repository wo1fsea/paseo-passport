---
language: en-US
audience: agent
doc_type: normative
---

# Spec Production

Use this workflow after the Spec Decision Gate chooses a new or revised repo-native spec.

Use `docs/governance/compact-specs.md` when the request is a bug fix or small tweak.

## Flow

```text
spec decision gate -> intake -> clarify -> classify -> assign spec id -> PRODUCT -> behavior review -> code inspection -> TECH -> parallelization gate -> STATUS/workstreams -> validation plan -> draft or ready
```

## Clarify Before Writing

Ask concise questions when answers would change the spec:

- Who is the user or caller?
- What behavior changes?
- What must not change?
- What are the success criteria?
- What failure, empty, loading, permission, cancellation, or rollback paths matter?
- Which repo pattern and validation weight apply?
- What can be implemented independently?
- What must be serial, and why?

Do not invent product intent when the answer would affect implementation.

## PRODUCT First

`PRODUCT.md` describes testable behavior, not implementation.

Required sections:

- Summary.
- Goals and non-goals.
- Behavior invariants as a numbered list.
- States and edge cases.
- Open questions.

If product intent is not stable, keep the spec `draft`.

For bug fixes, write restored behavior: observed, expected, regression invariant, reproduction, and non-goals.

For small tweaks, write current behavior, desired behavior, acceptance, affected surface, and non-goals.

## Inspect Code Before TECH

`TECH.md` must be grounded in the actual repo.

Inspect existing files, commands, tests, contracts, ownership boundaries, risks, and validation paths before proposing implementation.

Apply `docs/governance/change-gate.md` before adding new surface.

## STATUS And Workstreams

Before implementation, run the Parallelization Gate and record the result in `STATUS.md`. Default to independent workstreams for non-trivial specs. Use a single workstream only when the task is atomic, highly conflict-prone, blocked on unresolved shared contracts, an explicit tiny or emergency exception, or cheaper to complete directly than to coordinate.

For incomplete specs:

```yaml
status: draft
implementation: not_started
validation: not_started
```

For accepted specs ready to implement:

```yaml
status: ready
implementation: not_started
validation: not_started
```

Small specs can use `workstreams/01-implementation.md`.

Parallel specs should split by ownership or dependency boundary, for example:

```text
workstreams/01-contract.md
workstreams/02-core.md
workstreams/03-ui.md
workstreams/04-tests.md
workstreams/05-docs.md
workstreams/06-validation.md
```

Use `docs/governance/multi-agent-spec-flow.md` when more than one agent may implement work in parallel.

Use `docs/governance/compact-specs.md` for compact bug fix and small tweak templates.

## Handoff

```markdown
## Spec Handoff

- Spec path:
- Status:
- Spec type:
- Open questions:
- Workstreams:
- Next owner:
- Validation expectation:
- Ready to implement: yes/no
- Subagent handoff required: yes/no
```
