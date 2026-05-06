---
language: en-US
audience: agent
doc_type: normative
---

# Spec-First Delivery

Project delivery is spec first by default. The main session owns intent, coordination, and acceptance. Implementation is parallel-first: before work starts, the main session must run a Parallelization Gate and prefer independent workstreams delegated to subagents or worker sessions. Tiny mechanical changes and emergency fixes may use direct implementation only when the exception is explicitly recorded.

Run `docs/governance/spec-decision-gate.md` before this workflow to decide whether the task needs a new spec, an existing spec update, a compact spec, or a direct implementation exception.

Use `docs/governance/compact-specs.md` for bug fixes and small tweaks that need a thin spec rather than a full feature spec.

## Fixed Flow

```text
main session intake
-> Spec Decision Gate
-> PRODUCT.md
-> TECH.md
-> Parallelization Gate
-> STATUS.md and workstreams
-> subagent implementation
-> subagent validation and handoff
-> main session acceptance
-> review or done
```

## Parallelization Gate

Before implementation starts, record this gate in `STATUS.md`. The handoff may repeat the relevant decision, but it does not replace the status record:

```markdown
## Parallelization Gate

- Can run in parallel: yes/no
- Reason:
- Shared contract needed first: yes/no
- Workstream split:
- Sequential dependencies:
- Conflict risk:
- Implementation agents to launch:
- Main-session acceptance checks:
```

Default to parallel workstreams for non-trivial specs. Use one serial workstream only when the scope is atomic, the same files would be edited by multiple agents, a shared contract must be resolved first, the change is a recorded direct-implementation exception, or coordination cost is higher than the work itself.

## Main Session

The main session acts as coordinator and acceptor:

- Clarify the request.
- Produce or revise the spec before implementation.
- Confirm `PRODUCT.md` behavior and non-goals.
- Confirm `TECH.md` is grounded in the current repo.
- Run the Parallelization Gate and record why any serial path is acceptable.
- Split work into independent workstreams with clear ownership, dependencies, and validation expectations.
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
- A recorded Parallelization Gate.
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

Direct main-session implementation is allowed only for emergency fixes, unavailable subagent tooling with an explicit note, or tiny mechanical changes with no behavior, contract, data, UI, configuration, permissions, security, test, docs, or governance impact. Even then, run a separate acceptance pass before marking work complete.

Bug fixes and small tweaks are not direct-implementation exceptions by default. If they affect behavior, contracts, UI, data, configuration, permissions, security, tests, docs, or governance, create a compact spec.
