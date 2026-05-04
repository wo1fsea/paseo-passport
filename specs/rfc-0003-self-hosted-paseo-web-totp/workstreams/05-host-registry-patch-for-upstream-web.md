---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 05
language: en-US
audience: agent
doc_type: workstream
status: draft
owner: unassigned
depends_on:
  - 04
updated: 2026-05-04
---

# Workstream 05: Host Registry Patch For Upstream Web

## Goal

Patch the upstream Paseo web app so it loads Passport-registered machines at
boot and merges them into the app's host runtime.

## Scope

- Confirm upstream host profile type and normalization function.
- Confirm host runtime boot path.
- Add a narrow `/api/passport/hosts` loader using `credentials: "include"`.
- Treat `401` as no Passport hosts.
- Merge Passport hosts without deleting local browser-only hosts.
- Avoid daemon protocol, provider, permissions, and agent-session changes.

## Validation

- Unit or integration tests for loader and merge behavior where upstream test
  harness allows it.
- Browser smoke confirms Passport hosts appear in the real Paseo UI.

## Acceptance

- All active Passport registry machines are available in the self-hosted Paseo
  UI after auth.
- Raw pairing offers and provider credentials are never exposed.
