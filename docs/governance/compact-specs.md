---
language: en-US
audience: agent
doc_type: normative
---

# Compact Specs

Use compact specs for bug fixes and small behavior tweaks. They keep spec-first delivery lightweight while preserving intent, boundaries, and validation evidence.

## Rule

Bug fixes and small tweaks still use spec-first when they affect behavior, contracts, UI, data, configuration, permissions, tests, or governance.

Use a direct implementation exception only for purely mechanical changes with no behavior, contract, data, UI, test, or governance effect.

## Shape

Keep the normal spec directory, but make the content short:

```text
specs/<spec-id>/
  PRODUCT.md
  TECH.md
  STATUS.md
  workstreams/
    01-fix.md
```

For small tweaks, use `workstreams/01-tweak.md` when clearer.

## Bug Fix PRODUCT.md

Write bug fix specs as restored behavior, not as new functionality:

```markdown
# Bugfix Behavior Spec

## Observed

What currently fails.

## Expected

What behavior should be restored.

## Regression Invariant

The condition that must not break again.

## Reproduction

1. Step.
2. Step.

## Non-Goals

- Do not redesign unrelated behavior.
- Do not change public contracts unless explicitly required.
```

## Bug Fix TECH.md

```markdown
# Bugfix Tech Spec

## Suspected Area

- Files, modules, commands, or contracts likely involved.

## Change Shape

- Smallest intended fix.
- Regression test to add or update.
- Public API, data, UI, and config surfaces that must stay unchanged.

## Validation

- Narrow command:
- Regression command:
- Manual or visual check:

## Risk

- Why this fix could break adjacent behavior.
```

## Small Tweak PRODUCT.md

Use for copy, default values, narrow UI states, sorting, labels, small interaction changes, and other intentional but limited behavior changes.

```markdown
# Small Tweak Behavior Spec

## Current

Existing behavior.

## Desired

New narrow behavior.

## Acceptance

- Observable result.
- Existing behavior to preserve.

## Affected Surface

- UI, API, config, docs, or command surface affected.

## Non-Goals

- Do not expand scope.
- Do not redesign or refactor unrelated areas.
```

## Small Tweak TECH.md

```markdown
# Small Tweak Tech Spec

## Files Or Modules

- Expected touch points.

## Change Shape

- Smallest change.
- Surfaces that must remain unchanged.

## Validation

- Automated check:
- Manual check:
- Visual evidence when UI-visible:
```

## Direct Implementation Exception

Do not create a full spec only when the change is purely mechanical. Record the exception in the handoff, PR, or implementation log:

```markdown
## Direct Implementation Exception

- Reason: tiny mechanical change
- Behavior impact: none
- Contract impact: none
- Data/UI/test/governance impact: none
- Files:
- Validation:
- Main-session acceptance:
```

If any impact field is not `none`, use a compact spec.

## Acceptance

The main session accepts compact spec work by checking:

- The fix or tweak matches `PRODUCT.md`.
- The implementation stayed within `TECH.md` and non-goals.
- Regression or acceptance evidence was recorded.
- No extra surface, refactor, or behavior expansion slipped in.
