---
id: 07-workspace-serving
language: en-US
audience: agent
doc_type: spec
status: validated
owner: worker-008
branch:
pr:
files:
  - apps/passport-server/src/web/static.ts
  - scripts/build-paseo-web.ts
  - apps/passport-server/tests/
depends_on:
  - 02-auth-and-sessions
  - 06-paseo-vendor-and-patch
claimed_at: 2026-05-04T02:31:02+08:00
lease_expires_at: 2026-05-04T04:31:02+08:00
updated: 2026-05-04
---

# Workspace Serving Workstream

## Scope

Serve the patched Paseo web workspace from the Passport server behind the same
auth boundary as the admin UI.

## Plan

- Build patched Paseo web output into a known static directory.
- Serve workspace static files from Passport.
- Route non-API workspace paths to `index.html`.
- Keep `/api/*` routes separate from static fallback.
- Require authentication before serving workspace shell or workspace route.
- Redirect unauthenticated browser requests to login where appropriate.
- Preserve API `401` behavior for API requests.

## Validation

```powershell
npm run build:paseo-web
npm run build
npm test -- --run
npm run dev
```

Manual browser checks:

- Unauthenticated `/` requires login.
- Authenticated `/` loads the patched Paseo workspace.
- `/api/health` still returns JSON and is not swallowed by static fallback.

## Acceptance

- Passport serves both APIs and workspace assets.
- Protected workspace route cannot be opened without login.
- Authenticated workspace loads from the Passport origin.
- Static fallback does not break API routes.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined.
- 2026-05-04: worker-008 claimed workspace serving workstream.
- 2026-05-04: worker-008 added authenticated non-API workspace fallback coverage and validated required commands.
