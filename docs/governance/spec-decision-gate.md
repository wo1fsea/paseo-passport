---
language: en-US
audience: agent
doc_type: normative
---

# Spec Decision Gate

Use this gate before any task that may change code.

## Rule

Code changes must not start until the main session explicitly chooses one spec path:

- Create a new full spec.
- Update an existing spec.
- Create or update a compact spec.
- Record a direct implementation exception.
- Confirm no code change is needed.

## Gate

Record the decision in `STATUS.md` when a spec exists. For a direct implementation exception, record it in the handoff, PR, or implementation log.

```markdown
## Spec Decision Gate

- Request:
- Code change expected: yes/no
- Existing spec:
- Decision: new-full-spec / update-existing-spec / compact-spec / direct-exception / no-code-change
- Reason:
- Behavior, contract, data, UI, configuration, permissions, security, test, docs, or governance impact:
- Next workflow:
- Recorded in:
```

## Decision Rules

Create a new full spec when behavior is new, ambiguous, user-visible, cross-module, high-risk, or affects public contracts, persistence, permissions, security, billing, migration, or agent workflows.

Update an existing spec when the request changes, extends, narrows, or corrects accepted product or technical intent. If implementation reveals that the spec no longer matches reality, stop and update the spec before continuing.

Create or update a compact spec for bug fixes and small tweaks that affect behavior, contracts, UI, data, configuration, permissions, security, tests, docs, or governance.

Use a direct implementation exception only for purely mechanical changes with no behavior, contract, data, UI, configuration, permissions, security, test, docs, or governance impact. Record the exception before editing.

Confirm `no-code-change` when the request is explanation, research, triage, or planning only.

## Ordering

Run this gate before `spec-production`, `compact-specs`, `spec-first-delivery`, `tdd-workflow`, and implementation handoff.
