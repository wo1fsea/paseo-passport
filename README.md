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

The single-user MVP is implemented and locally validated. Passport now serves a
self-hosted upstream Paseo web build behind pure TOTP authentication, keeps a
server-side machine registry, and injects active registered hosts into the
upstream Paseo workspace.

Deployment evidence from 2026-05-04:

- Local build/test validation is green.
- HK development deployment is running behind Caddy at
  `https://paseo.codexy.fun:6868`.
- Passport itself listens only on `127.0.0.1:6867` in that deployment; Caddy
  terminates HTTPS on public port `6868` and redirects public HTTP from port
  `80`.
- A real `PC-WIN11` Paseo daemon registration was verified through the relay in
  the self-hosted workspace. Public plain HTTP was rejected as an operational
  path because browser WebCrypto is unavailable outside secure contexts, which
  prevents the Paseo relay E2EE client from starting.

## Governance

Read `AGENTS.md` first. Detailed workflow docs live under `docs/governance/`.
Specs live under `specs/`.

Current accepted spec:

- `specs/rfc-0001-initial-governance/`: repository governance bootstrap.
- `specs/rfc-0002-single-user-mvp/`: sidecar web service, TOTP login, machine
  registry model, patched Paseo workspace, and generic development-machine
  deployment plan. This is now phase-A historical validation.
- `specs/rfc-0003-self-hosted-paseo-web-totp/`: current target product spec for
  pure TOTP auth plus self-hosted upstream Paseo web.

## Local Validation

Run the app validation ladder:

```sh
npm run build
npm run build:paseo-web
npm run test:e2e
npm test -- --run
```

Run the Code & Order audit when governance files change:

```sh
python3 /Users/huangquanyong/.codex/skills/code-and-order/scripts/init_governance.py . --audit
```
