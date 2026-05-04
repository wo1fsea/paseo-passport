---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 02
language: en-US
audience: agent
doc_type: workstream
status: draft
owner: unassigned
depends_on:
  - 01
updated: 2026-05-04
---

# Workstream 02: Paseo-Styled Passport Pages

## Goal

Restyle Passport-owned pages so auth, enrollment, pairing, reset, and history
surfaces feel consistent with the upstream Paseo application.

## Scope

- Full-screen TOTP enrollment surface with a centered QR panel.
- TOTP-only login page.
- Machine import and registry page.
- Reset confirmation UI.
- Access history list.
- Workspace usage history list.
- Navigation between Passport-owned pages and the self-hosted workspace.

## Validation

- UI tests or HTML assertions for required controls and states.
- Browser screenshots for enrollment, login, registry, reset, and history pages.
- Responsive checks for narrow viewport.

## Acceptance

- No generic phase-A light admin look remains on Passport-owned pages.
- First-run QR enrollment looks modal-like inside the full-screen surface, not
  like an overlay on top of the workspace.
- Auth and reset controls are clear and do not overlap on mobile or desktop.
- Reset is not one-click destructive.
