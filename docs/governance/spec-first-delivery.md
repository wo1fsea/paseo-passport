---
language: en-US
audience: agent
doc_type: normative
---

# Spec-First Delivery

Project delivery is spec first by default. The main session owns intent, coordination, and acceptance. Subagents or worker sessions implement claimed workstreams and hand back evidence. Tiny mechanical changes and emergency fixes may use direct implementation only when the exception is explicitly recorded.

Use `docs/governance/compact-specs.md` for bug fixes and small tweaks that need a thin spec rather than a full feature spec.

## Fixed Flow

```text
main session intake
-> PRODUCT.md
-> TECH.md
-> STATUS.md and workstreams
-> subagent implementation
-> subagent validation and handoff
-> main session acceptance
-> review or done
```

## Main Session

The main session acts as coordinator and acceptor:

- Clarify the request.
- Produce or revise the spec before implementation.
- Confirm `PRODUCT.md` behavior and non-goals.
- Confirm `TECH.md` is grounded in the current repo.
- Split work into workstreams.
- Assign or launch subagents/worker sessions when implementation starts.
- Review changed files and workstream evidence.
- Run broad validation or verify that it was run.
- Move the overall spec to `ready-review` or `done`.

The main session should not quietly implement substantial spec work itself. If subagent execution is unavailable, record an exception and keep implementation and acceptance as separate passes.

## Subagent Or Worker Session

The subagent or worker session owns execution for a claimed workstream:

- Read `AGENTS.md`, the spec, and relevant governance docs.
- Claim exactly one workstream before editing.
- Implement only the assigned scope.
- Run narrow validation for the work.
- Update the workstream file first.
- Update only that row in `STATUS.md`.
- Report changed files, validation, blockers, conflicts, residual risk, and handoff notes.

The subagent does not mark the overall spec `done`.

## Spec Readiness Gate

Implementation cannot start until the spec has:

- `PRODUCT.md` with observable behavior and non-goals.
- `TECH.md` with current code context, proposed change shape, risks, and validation plan.
- `STATUS.md` with `status: ready` or an explicitly accepted `active` state.
- At least one workstream with owner, scope, dependencies, and validation expectations.
- A main-session handoff note naming the worker/subagent scope.

## Subagent Handoff

```markdown
## Subagent Handoff

- Spec:
- Workstream:
- Scope:
- Files or modules:
- Must preserve:
- Validation to run:
- Do not touch:
- Handoff back with:
```

## Worker Completion

```markdown
## Worker Completion

- Workstream:
- Status:
- Files changed:
- Validation run:
- Validation not run:
- Behavior/spec changes:
- Conflicts or blockers:
- Residual risk:
- Suggested acceptance checks:
```

## Main Session Acceptance

```markdown
## Main Session Acceptance

- Spec:
- Workstreams accepted:
- Diff reviewed:
- Validation run:
- Additional fixes required:
- Status update:
- Residual risk:
```

## Exceptions

Direct main-session implementation is allowed only for emergency fixes, unavailable subagent tooling with an explicit note, or tiny mechanical changes with no behavior, contract, or governance effect. Even then, run a separate acceptance pass before marking work complete.

Bug fixes and small tweaks are not direct-implementation exceptions by default. If they affect behavior, contracts, UI, data, configuration, permissions, tests, or governance, create a compact spec.
