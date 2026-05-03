---
id: 09-development-machine-deployment
language: en-US
audience: agent
doc_type: spec
status: ready
owner: unassigned
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
about unrelated services.

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

## Acceptance

- Deployment docs are generic and contain no machine-specific infrastructure
  details.
- App binds locally to `127.0.0.1:7317` by default.
- Secrets are documented as external to git.
- Health endpoint works on the development deployment machine.
- HTTPS requirement is stated before real browser use.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined with generic development-machine deployment
  scope only.
