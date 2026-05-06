---
language: en-US
audience: agent
doc_type: normative
---

# Development Workflow

## Outer Loop

Use this loop for all non-trivial engineering work:

```text
Plan -> Develop -> Verify -> Fix
```

1. Plan: read the relevant governance docs, run the Spec Decision Gate, create or update the spec when required, identify risk, and choose the smallest coherent task shape.
2. Develop: run the Parallelization Gate, then hand implementation to subagents or worker sessions through `docs/governance/spec-first-delivery.md`. When TDD applies, use `docs/governance/tdd-workflow.md` inside this phase.
3. Verify: the worker runs narrow validation, then the main session verifies and broadens when behavior or shared contracts changed. When TDD applies, the broaden/validate/record steps come from `docs/governance/tdd-workflow.md`.
4. Fix: respond to failing tests, review feedback, or validation gaps. If reality changed, update specs or governance docs before repeating Develop/Verify.

TDD is not a competing workflow. It is the inner loop used inside Develop and Verify when behavior changes call for it.

## Default Steps

1. Read `AGENTS.md`.
2. Read the workflow file that matches the task.
3. Run `docs/governance/spec-decision-gate.md` before code-changing work.
4. Create or update the relevant spec before implementation, unless an explicit tiny or emergency exception applies.
5. Run the Parallelization Gate, split work into independent workstreams when practical, and hand implementation to subagents or worker sessions.
6. If adding or expanding project surface, apply `docs/governance/change-gate.md`.
7. For code changes, apply `docs/governance/code-quality.md`.
8. For docs, examples, generated docs, specs, contributor guidance, or agent instructions, apply `docs/governance/documentation-standards.md`.
9. If producing temporary artifacts, apply `docs/governance/temp-artifacts.md`.
10. Make the smallest coherent change in the worker/subagent pass.
11. Run the narrowest meaningful validation first.
12. Return a worker completion report.
13. Main session reviews, validates, and accepts before marking the spec ready-review or done.
14. Record tests run, docs checked, tests skipped, and residual risk.

## Direct Implementation Exceptions

Direct main-session implementation is an exception. Use it only for emergency fixes, unavailable subagent tooling with an explicit note, or tiny mechanical changes with no behavior, contract, data, UI, configuration, permissions, security, test, docs, or governance impact.

## Spec-Driven Implementation

Use `docs/governance/spec-workflow.md` when behavior is ambiguous, user-visible, cross-module, or high risk.

Use `docs/governance/spec-decision-gate.md` before deciding that implementation can begin without a spec update.

Use `docs/governance/spec-first-delivery.md` for the fixed coordinator -> worker -> acceptance flow.
