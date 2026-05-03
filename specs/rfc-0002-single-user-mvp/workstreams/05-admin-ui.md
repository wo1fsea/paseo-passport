---
id: 05-admin-ui
language: en-US
audience: agent
doc_type: spec
status: ready
owner: unassigned
branch:
pr:
files:
  - apps/passport-server/src/web/
  - apps/passport-server/tests/
depends_on:
  - 02-auth-and-sessions
  - 03-machine-registry
claimed_at:
lease_expires_at:
updated: 2026-05-04
---

# Admin UI Workstream

## Scope

Add the minimum usable browser UI for login, logout, machine import, machine
list, and delete.

## Plan

- Add `/login` page.
- Add `/admin/machines` page.
- Add username/password/TOTP login form.
- Add pairing offer import form with label.
- Add machine list.
- Add delete action.
- Protect all admin pages except login.
- Keep UI minimal and functional; no marketing page.

## Validation

```powershell
npm run build
npm test -- --run
npm run dev
```

Manual browser checks:

- Unauthenticated `/admin/machines` redirects to `/login` or shows login
  requirement.
- Login succeeds with valid credentials and TOTP.
- Machine import creates a visible row.
- Delete removes a row and removes it from `/api/passport/hosts`.

## Acceptance

- Admin UI supports the MVP machine import workflow end to end.
- Login and logout are usable from the browser.
- UI does not display raw pairing offers after import.
- Protected pages cannot be opened without an authenticated session.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined.
