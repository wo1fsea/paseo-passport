---
id: 09-development-machine-deployment
language: en-US
audience: agent
doc_type: spec
status: validated_by_rfc_0003_hk_deployment
owner: Codex
branch:
pr:
files:
  - docs/deployment-development-machine.md
  - Dockerfile
  - docker-compose.yml
depends_on:
  - 08-local-end-to-end-smoke
claimed_at:
lease_expires_at:
updated: 2026-05-04
---

# Development-Machine Deployment Workstream

## Scope

Document and implement a generic development-machine deployment path. Do not
include machine-specific hostnames, addresses, SSH users, credentials, or details
about unrelated services. This workstream is not part of the first automated
Dispatch Engine run; run it only after local smoke passes and the operator
approves a deployment target.

## Plan

- Add `docs/deployment-development-machine.md`.
- Add `Dockerfile` or a documented systemd path; prefer Docker Compose if it
  keeps setup smaller.
- Add `docker-compose.yml` that binds Passport to `127.0.0.1:7317` by default.
- Document `.env` creation outside git.
- Document data directory and SQLite backup considerations.
- Document checking current listeners before choosing ports.
- Document that real use requires an HTTPS entry point.
- Document startup, restart, log, and rollback commands generically.
- Treat live development-machine deployment as a gated validation step, not as
  mandatory automated work.

## Validation

```powershell
npm run build
npm test -- --run
docker compose config
```

On a development deployment machine:

```bash
ss -tulpn
docker compose up -d
curl http://127.0.0.1:7317/api/health
docker compose logs --tail=100
```

Only run the development-machine commands after operator approval. If no target
is approved, record this validation as skipped with the reason:

```text
Skipped live development-machine validation; no operator-approved deployment
target was provided.
```

## Acceptance

- Deployment docs are generic and contain no machine-specific infrastructure
  details.
- App binds locally to `127.0.0.1:7317` by default.
- Secrets are documented as external to git.
- Health endpoint works on the development deployment machine, or live
  deployment validation is explicitly recorded as skipped until the operator
  approves a target.
- HTTPS requirement is stated before real browser use.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined with generic development-machine deployment
  scope only.
- 2026-05-04: clarified that live development-machine validation is
  operator-gated and should not run in the first automated Dispatch Engine pass.
- 2026-05-04: operator approved HK development deployment during rfc-0003. The
  validated shape is documented in `docs/deployment-development-machine.md`:
  Passport on `127.0.0.1:6867`, Caddy HTTPS on public `6868`, HTTP redirect on
  `80`, and existing `443` reserved for Xray.
