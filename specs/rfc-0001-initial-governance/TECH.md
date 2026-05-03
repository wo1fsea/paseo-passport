---
language: en-US
audience: agent
doc_type: spec
---

# Initial Governance Tech Spec

Product spec: `./PRODUCT.md`

## Context

The repository started as a minimal public project for Paseo Passport, with only
the README present. The user asked to update local Codex skills and initialize
the project with Code & Order. This spec records that repository governance
bootstrap only; application implementation belongs in a later spec.

## Proposed Changes

- Sync the local Codex skill workbench before applying repository governance.
- Run the Code & Order initializer with the universal suite, strict TDD mode,
  and spec id `rfc-0001-initial-governance`.
- Keep `AGENTS.md` as the canonical agent router.
- Add thin adapter files for Claude, Gemini, Copilot, and GitHub pull requests.
- Add governance docs under `docs/governance/`.
- Add a starter `specs/` workflow and replace placeholder starter content with
  project-specific governance bootstrap notes.
- Add `.gitattributes` to keep repository text files on LF line endings, which
  keeps governance hashing stable across Windows and Unix checkouts.
- Update the README with project context, current status, governance entry
  points, and the governance audit command.

## Testing and Validation

- Run:

  ```powershell
  python C:/Users/wo1fsea/.codex/skills/code-and-order/scripts/init_governance.py . --audit
  ```

- Confirm `README.md`, `AGENTS.md`, `docs/governance/`, and
  `specs/rfc-0001-initial-governance/` are present.
- No application test command exists yet because no application code exists.

## Risks and Follow-ups

- The repo has more process surface than code until the MVP starts. This is
  acceptable because the next changes will affect auth, persistence, deployment,
  and agent handoff.
- Code & Order audits may report project-specific files as customized relative
  to upstream starter templates. That is expected after replacing placeholders.
- Follow-up: create `rfc-0002-single-user-mvp` before implementing the sidecar
  web service, TOTP login, machine registry, and deployment path.
