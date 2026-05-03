---
language: en-US
audience: agent
doc_type: normative
---

# Agent Context

## Canonical Rule

`AGENTS.md` is the canonical routing file for all coding agents.

## Thin Adapters

- `CLAUDE.md` imports `AGENTS.md`.
- `GEMINI.md` imports `AGENTS.md`.
- `.github/copilot-instructions.md` points to `AGENTS.md`.

Adapter files must not duplicate detailed workflow rules. Add tool-specific notes only when the tool truly requires them.

## Maintenance

When an adapter is added, removed, renamed, or moved, update this file and `AGENTS.md` in the same change.
