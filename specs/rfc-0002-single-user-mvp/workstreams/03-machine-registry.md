---
id: 03-machine-registry
language: en-US
audience: agent
doc_type: spec
status: validated
owner: worker-004
branch:
pr:
files:
  - apps/passport-server/src/db.ts
  - apps/passport-server/src/machines/offer.ts
  - apps/passport-server/src/machines/routes.ts
  - apps/passport-server/tests/offer.test.ts
depends_on:
  - 01-project-skeleton
  - 02-auth-and-sessions
claimed_at: 2026-05-04T02:08:23+08:00
lease_expires_at: 2026-05-04T04:09:38+08:00
updated: 2026-05-04
---

# Machine Registry Workstream

## Scope

Implement persistent machine import and admin registry APIs for relay pairing
offers.

## Plan

- Add `machines` and `machine_secrets` migration tables.
- Implement repository helpers for create/update/list/delete.
- Implement offer parser for full URLs and raw `#offer=...` fragments.
- Confirm upstream Paseo relay offer schema before final parser behavior.
- Reject unsupported versions, non-relay offers, missing public keys, and
  malformed payloads.
- Implement `POST /api/admin/machines/import-offer`.
- Implement `GET /api/admin/machines`.
- Implement `DELETE /api/admin/machines/:id`.
- Ensure raw offers are not logged.
- Encrypt raw offer URL when stored, or leave encrypted fields null when parsed
  fields are enough.

## Validation

```powershell
npm run build
npm test -- --run offer
```

API checks:

```powershell
curl -i -X POST http://127.0.0.1:7317/api/admin/machines/import-offer
curl -i http://127.0.0.1:7317/api/admin/machines
curl -i -X DELETE http://127.0.0.1:7317/api/admin/machines/<id>
```

## Acceptance

- Unauthenticated admin registry calls return `401`.
- Valid relay offer imports successfully.
- Duplicate `serverId` updates the existing row.
- Malformed offer returns `400`.
- Deleting a machine removes it from active admin results.
- No raw offer URL appears in normal logs or API responses.

## Worker Completion

- Status: validated.
- Files changed: `apps/passport-server/tests/offer.test.ts`,
  `specs/rfc-0002-single-user-mvp/workstreams/03-machine-registry.md`, and
  `specs/rfc-0002-single-user-mvp/STATUS.md`.
- Validation run: `npm test -- --run offer`; `npm run build`.
- Validation not run: broader `npm test`, UI smoke, Paseo patch/build, and
  deployment smoke are outside this workstream.
- Residual risk: no log-capture assertion was added; code inspection found no
  registry route logging of raw offers.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined.
- 2026-05-04: worker-004 claimed the workstream for persistent machine import
  and admin registry API validation.
- 2026-05-04: worker-004 validated parser/API acceptance coverage and required
  build/test commands.
