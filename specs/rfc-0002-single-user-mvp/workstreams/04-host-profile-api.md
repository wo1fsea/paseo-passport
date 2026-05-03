---
id: 04-host-profile-api
language: en-US
audience: agent
doc_type: spec
status: ready
owner: unassigned
branch:
pr:
files:
  - apps/passport-server/src/machines/host-profile.ts
  - apps/passport-server/src/machines/routes.ts
  - apps/passport-server/tests/hosts-api.test.ts
depends_on:
  - 03-machine-registry
claimed_at:
lease_expires_at:
updated: 2026-05-04
---

# Host Profile API Workstream

## Scope

Convert active registered machines into authenticated Paseo `HostProfile[]`
responses for the patched web runtime.

## Plan

- Confirm upstream Paseo `HostProfile` shape before implementation.
- Implement `host-profile.ts` as the only conversion layer.
- Use stable relay connection id `relay:${relayEndpoint}`.
- Set `preferredConnectionId` to the relay connection id.
- Implement `GET /api/passport/hosts`.
- Ensure inactive or deleted machines are excluded.
- Add exact-shape tests for the response.

## Validation

```powershell
npm run build
npm test -- --run hosts-api
```

Manual check:

```powershell
curl -i http://127.0.0.1:7317/api/passport/hosts --cookie "pp_session=..."
```

## Acceptance

- Unauthenticated request returns `401`.
- Empty registry returns `[]`.
- Active machines return valid `HostProfile[]`.
- Response contains no raw offer URL.
- Response contains no provider credentials or server-side auth secrets.

## Blocked

Reason: None.
Unblock when: Not applicable.
Owner to unblock: Not applicable.

## Activity Log

- 2026-05-04: workstream defined.
