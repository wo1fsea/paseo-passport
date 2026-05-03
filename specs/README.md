---
language: en-US
audience: agent
doc_type: router
---

# Specs

Use `docs/governance/spec-first-delivery.md` for the fixed coordinator -> worker -> acceptance flow, `docs/governance/compact-specs.md` for bug fix and small tweak specs, `docs/governance/spec-production.md` for creating specs, `docs/governance/spec-workflow.md` for the spec lifecycle, `docs/governance/spec-id-policy.md` for id format, `docs/governance/spec-execution-status.md` for execution status, and `docs/governance/multi-agent-spec-flow.md` for parallel implementation.

Each substantial spec should live under:

```text
specs/<source>-<id>-<short-slug>/
  PRODUCT.md
  TECH.md
  STATUS.md
  workstreams/
    01-implementation.md
```
