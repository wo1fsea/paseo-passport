---
language: en-US
audience: mixed
doc_type: overview
---

# Paseo Passport

Paseo Passport is a single-user control plane for a self-hosted Paseo workspace.
The target MVP is a small web service that opens a workspace shaped like
`app.paseo.sh`, protects access with authenticator-app TOTP, and pre-registers
known Paseo machines server-side so the user does not manually enroll each one
from the public app.

## Current Status

This repository is pre-implementation. Code & Order governance is initialized so
agents can work from specs before application code is added.

## Governance

Read `AGENTS.md` first. Detailed workflow docs live under `docs/governance/`.
Specs live under `specs/`.

Current accepted spec:

- `specs/rfc-0001-initial-governance/`: repository governance bootstrap.

Planned next spec:

- `rfc-0002-single-user-mvp`: sidecar web service, TOTP login, machine registry
  model, and deployment plan.

## Local Validation

Run the Code & Order audit:

```powershell
python C:/Users/wo1fsea/.codex/skills/code-and-order/scripts/init_governance.py . --audit
```

No application test command exists yet. The next implementation spec must add
one before app code lands.
