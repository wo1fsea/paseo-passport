---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 03
language: en-US
audience: agent
doc_type: workstream
status: draft
owner: unassigned
depends_on:
  - 01
updated: 2026-05-04
---

# Workstream 03: Access And Workspace History

## Goal

Persist and display both security access history and workspace usage history.

## Scope

- Add `access_events` persistence.
- Add `workspace_events` persistence.
- Record enrollment, login success/failure, logout, authenticated reset,
  emergency reset, and bypass access.
- Record workspace-open and host-load events.
- Reserve host/project open events for a later integration phase; do not
  implement them in the MVP.
- Add protected APIs and Paseo-styled pages for recent history.
- Retain the most recent 3,000 rows per history category.
- Default history API/page responses to 50 rows.

## Validation

- Tests prove each access event records raw source IP without TOTP codes,
  cookies, raw user agent, raw offers, or provider credentials.
- Tests prove workspace events record raw source IP when request context is
  available.
- Tests prove history APIs require auth.
- Tests prove workspace-open and host-load events are recorded.
- Tests do not require host-open or project-open workspace events in the MVP.
- Tests prove old history rows are pruned past the 3,000-row retention limit.
- Tests prove raw User-Agent values are not stored.

## Acceptance

- Operator can view recent access history.
- Operator can view recent workspace usage history.
- Operator can see raw source IP for history entries.
- Workspace usage history includes workspace-open and host-load events.
- Each history list defaults to a 50-row page and retains the newest 3,000 rows.
- History contains useful metadata without storing secrets.
