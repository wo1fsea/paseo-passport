---
language: en-US
audience: mixed
doc_type: spec
---

# Initial Governance Product Spec

## Summary

Initialize Paseo Passport with repo-local governance so future human and agent
work has a stable entry point, documented decision gates, and a spec-first
delivery path before application code is added.

Historical note: this bootstrap spec described the repository before
application code landed. The current implementation status is tracked by
`../rfc-0003-self-hosted-paseo-web-totp/` and the root `README.md`.

## Goals / Non-goals

- Goals:
  - Provide a canonical `AGENTS.md` router for coding agents.
  - Install Code & Order governance docs under `docs/governance/`.
  - Establish strict TDD expectations for future behavior changes.
  - Create a starter spec structure under `specs/`.
  - Make repository status and validation commands discoverable from `README.md`.
- Non-goals:
  - Implement the Paseo Passport application MVP.
  - Choose the final web framework, datastore, deployment shape, or Paseo
    integration boundary.
  - Modify or fork Paseo daemon code.

## Behavior

1. Agents can open `AGENTS.md` and route themselves to the workflow document
   that matches the requested task.
2. Governance rules live in `docs/governance/` instead of being duplicated
   across agent adapter files.
3. Thin adapter files for Claude, Gemini, Copilot, and GitHub PRs point back to
   the canonical governance entry point.
4. Specs live under `specs/<spec-id>/` with separate product, technical, status,
   and workstream files.
5. At bootstrap time, the README stated that the repository was
   pre-implementation and exposed the current governance audit command. Later
   feature specs own application status updates.

## Open Questions

- None for the governance bootstrap.
- The next MVP spec must resolve the application architecture, TOTP enrollment
  flow, machine registry schema, deployment target, and validation commands.
