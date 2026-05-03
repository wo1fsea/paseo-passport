---
id: 10-real-daemon-smoke
language: en-US
audience: agent
doc_type: spec
status: ready
owner: unassigned
branch:
pr:
files:
  - docs/mvp.md
  - docs/security.md
depends_on:
  - 08-local-end-to-end-smoke
  - 09-development-machine-deployment
claimed_at:
lease_expires_at:
updated: 2026-05-04
---

# Real Daemon Smoke Workstream

## Scope

Verify the MVP against one real Paseo daemon using a real pairing offer handled
outside git.

## Plan

- Start or use one Paseo daemon on a machine controlled by the operator.
- Generate a pairing offer outside git.
- Import the offer through Passport.
- Open the authenticated workspace.
- Confirm the daemon appears automatically.
- Start or resume one agent session.
- Confirm logs or stream output are visible.
- Trigger a permission request if feasible and confirm it can be approved.
- Record smoke results in `docs/mvp.md` without storing raw offer material.
- Update `docs/security.md` with any discovered operational caveats.

## Validation

```powershell
npm run build
npm test -- --run
npm run test:e2e
```

Manual real-daemon smoke:

```text
Generate real offer outside git -> import -> open workspace -> start agent
```

## Acceptance

- A real daemon can be imported without committing secrets.
- The workspace shows the daemon without manual browser pairing.
- At least one agent session can be started or resumed.
- Raw pairing offer is not committed, logged in durable docs, or returned by API.
- Any manual verification gaps are recorded.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined.
