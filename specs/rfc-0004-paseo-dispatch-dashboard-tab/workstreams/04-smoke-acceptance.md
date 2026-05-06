---
spec_id: rfc-0004-paseo-dispatch-dashboard-tab
workstream: 04
language: en-US
audience: agent
doc_type: workstream
status: ready
owner: unassigned
depends_on:
  - 01
  - 02
  - 03
updated: 2026-05-06
---

# Workstream 04: Browser Smoke And Acceptance

## Goal

Validate the completed dashboard tab feature in a browser against the
self-hosted Paseo UI and record acceptance evidence.

## Scope

- Start Passport locally with a test-auth path or TOTP session.
- Run or fixture an alive Dispatch Engine dashboard for an allowlisted local
  repo.
- Open the self-hosted Paseo workspace.
- Confirm the dashboard action appears for the available state.
- Click the action and confirm a new browser tab opens with dashboard content.
- Confirm the action is hidden when dashboard availability is false.
- Capture screenshots for available and unavailable states.
- Record validation in this spec's `STATUS.md`.

## Validation

- `npm run build`
- `npm test -- --run`
- `npm run build:paseo-web`
- Browser smoke with screenshots.

## Acceptance

- The dashboard can be opened from the Paseo workspace tab row.
- The dashboard appears in a Paseo browser tab.
- No-dashboard state stays quiet.
- Evidence is sufficient for main-session acceptance.
