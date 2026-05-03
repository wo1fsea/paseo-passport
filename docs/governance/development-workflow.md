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

1. Plan: read the relevant governance docs, create or update the spec, identify risk, and choose the smallest coherent task shape.
2. Develop: hand implementation to a subagent or worker session through `docs/governance/spec-first-delivery.md`. When TDD applies, use `docs/governance/tdd-workflow.md` inside this phase.
3. Verify: the worker runs narrow validation, then the main session verifies and broadens when behavior or shared contracts changed. When TDD applies, the broaden/validate/record steps come from `docs/governance/tdd-workflow.md`.
4. Fix: respond to failing tests, review feedback, or validation gaps. If reality changed, update specs or governance docs before repeating Develop/Verify.

TDD is not a competing workflow. It is the inner loop used inside Develop and Verify when behavior changes call for it.

## Default Steps

1. Read `AGENTS.md`.
2. Read the workflow file that matches the task.
3. Create or update the relevant spec before implementation, unless an explicit tiny or emergency exception applies.
4. Split work into workstreams and hand implementation to a subagent or worker session.
5. If adding or expanding project surface, apply `docs/governance/change-gate.md`.
6. For code changes, apply `docs/governance/code-quality.md`.
7. For docs, examples, generated docs, specs, contributor guidance, or agent instructions, apply `docs/governance/documentation-standards.md`.
8. If producing temporary artifacts, apply `docs/governance/temp-artifacts.md`.
9. Make the smallest coherent change in the worker/subagent pass.
10. Run the narrowest meaningful validation first.
11. Return a worker completion report.
12. Main session reviews, validates, and accepts before marking the spec ready-review or done.
13. Record tests run, docs checked, tests skipped, and residual risk.

## Direct Implementation Exceptions

Direct main-session implementation is an exception. Use it only for emergency fixes, unavailable subagent tooling with an explicit note, or tiny mechanical changes with no behavior, contract, or governance effect.

## Spec-Driven Implementation

Use `docs/governance/spec-workflow.md` when behavior is ambiguous, user-visible, cross-module, or high risk.

Use `docs/governance/spec-first-delivery.md` for the fixed coordinator -> worker -> acceptance flow.
