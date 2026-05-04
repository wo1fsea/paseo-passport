---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 02R
language: en-US
audience: agent
doc_type: workstream
status: implemented_with_concerns
owner: worker-02r-paseo-visual-alignment
depends_on:
  - 02
  - 03
updated: 2026-05-04
---

# Workstream 02R: Paseo Visual Alignment Repair

## Goal

Repair Passport-owned page styling so enrollment, login, machine registry,
reset, and history surfaces read as part of the self-hosted Paseo app rather
than a separate dark security-admin console.

## Context

Workstream 02 implemented the required page behavior and supplied screenshots,
but visual review rejected the result. The previous UI used a saturated
green/amber security-console palette, gradient primary buttons, oversized admin
titles, and large bordered panels. That was not aligned with upstream Paseo's
minimal, spacious, quiet design language.

The repair uses these upstream references as the source of truth:

- `vendor/paseo/docs/design-system.md`
- `vendor/paseo/packages/app/src/styles/theme.ts`
- Existing settings/list/detail patterns under `vendor/paseo/packages/app/src`

## Scope

- Replace Passport-specific theme values with Paseo-derived neutral app
  surfaces, foreground, muted foreground, border, accent, destructive, radius,
  spacing, and typography values.
- Restyle login and first-run enrollment as compact modal/sheet-like panels
  inside a full-screen app surface.
- Restyle the QR/manual-secret enrollment block so it is neutral, readable, and
  stable on mobile.
- Restyle machine import, registry, navigation, and reset controls into a
  Paseo settings/list page model.
- Restyle access and workspace history as dense Paseo-style rows with primary
  and secondary text, subtle dividers, and restrained empty states.
- Preserve existing auth, history, workspace, and local-bypass behavior.
- Update UI assertions that previously allowed the rejected styling.

## Implementation Notes

- Updated `apps/passport-server/src/web/admin.ts` to use the upstream Paseo dark
  theme token values for surfaces, foreground, muted foreground, borders,
  accent, and destructive actions.
- Removed saturated gradients, `--amber`, uppercase transformed eyebrow text,
  oversized admin heading weights, heavy row cards, and danger-panel styling.
- Kept filled treatment for the single primary form action on a surface.
- Kept reset quiet by default and shows destructive styling only in the expanded
  reset confirmation flow.
- Converted machine and history entries to row/divider styling inside restrained
  Paseo-like sections.
- Updated `apps/passport-server/tests/admin-ui.test.ts` with visual-contract
  assertions for Paseo tokens and rejected styling.

## Validation

- `npm test -- --run admin-ui` passed.
- `npm test -- --run workspace-serving` passed.
- `npm run build` passed.

## Visual Evidence

- Enrollment desktop: `.out/screenshots/worker-02r-enrollment-desktop.png`
- Enrollment mobile: `.out/screenshots/worker-02r-enrollment-mobile.png`
- Login desktop: `.out/screenshots/worker-02r-login-desktop.png`
- Login mobile: `.out/screenshots/worker-02r-login-mobile.png`
- Machines desktop: `.out/screenshots/worker-02r-machines-desktop.png`
- Machines mobile: `.out/screenshots/worker-02r-machines-mobile.png`
- Machines reset desktop: `.out/screenshots/worker-02r-machines-reset-desktop.png`
- Machines reset mobile: `.out/screenshots/worker-02r-machines-reset-mobile.png`
- History desktop: `.out/screenshots/worker-02r-history-desktop.png`
- History mobile: `.out/screenshots/worker-02r-history-mobile.png`

## Concerns

- Machines and history screenshots were captured from a loopback-only local auth
  bypass evidence server with an isolated `.out` database.
- Reset confirmation screenshots use a static evidence copy of the same
  server-rendered machines page with the reset confirmation form expanded. The
  MCP browser was attached to its extension welcome tab and system
  `screencapture` could not create an image from the display, so direct
  click-then-capture evidence was not available in this environment.
