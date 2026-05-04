---
id: 01-project-skeleton
language: en-US
audience: agent
doc_type: spec
status: validated
owner: worker-001
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
claimed_at: 2026-05-04T01:13:24+08:00
lease_expires_at: 2026-05-04T03:13:24+08:00
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
- 2026-05-04: claimed by worker-001 for Dispatch Engine run 20260503T170721136859Z.
- 2026-05-04: moved to in_progress after dependency install and red health test evidence.
- 2026-05-04: moved to implemented after adding npm workspace, TypeScript baseline, Fastify bootstrap, config defaults, and health endpoint.
- 2026-05-04: moved to validating for build, test, dev server, and curl checks.
- 2026-05-04: moved to validated after listed workstream validation completed.
