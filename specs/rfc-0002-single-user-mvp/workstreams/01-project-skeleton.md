---
id: 01-project-skeleton
language: en-US
audience: agent
doc_type: spec
status: ready
owner: unassigned
branch:
pr:
files:
  - package.json
  - package-lock.json
  - tsconfig.base.json
  - .env.example
  - apps/passport-server/package.json
  - apps/passport-server/tsconfig.json
  - apps/passport-server/src/index.ts
  - apps/passport-server/src/config.ts
  - apps/passport-server/tests/health.test.ts
depends_on: []
claimed_at:
lease_expires_at:
updated: 2026-05-04
---

# Project Skeleton Workstream

## Scope

Create the Node 20 + TypeScript + Fastify workspace skeleton and the first
health endpoint. Do not implement auth, machine registry, or Paseo web patching.

## Plan

- Initialize root `package.json` with npm workspaces.
- Add TypeScript baseline config.
- Add `apps/passport-server` package.
- Add Fastify server bootstrap.
- Add config loader for non-secret defaults.
- Add `GET /api/health`.
- Add `.env.example`.
- Add `npm run build`, `npm test`, and `npm run dev`.
- Add Vitest health test.

## Validation

```powershell
npm install
npm run build
npm test -- --run
npm run dev
```

Manual check:

```powershell
curl http://127.0.0.1:7317/api/health
```

Expected response:

```json
{"ok":true}
```

## Acceptance

- Clean checkout can install, build, and test.
- Health endpoint works locally.
- No auth, DB, or machine registry behavior is introduced in this workstream.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined.
