---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 02
language: en-US
audience: agent
doc_type: workstream
status: implemented_with_repair
owner: worker-02-paseo-pages / worker-02r-paseo-visual-alignment
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
- No standalone green/amber security-admin aesthetic remains on Passport-owned
  pages.
- Pages follow upstream Paseo visual guidance from
  `vendor/paseo/docs/design-system.md`: minimal, spacious, quiet, neutral app
  surfaces, compact typography, restrained controls, and section/card row
  rhythm.
- Filled primary buttons are limited to the single primary action for a surface;
  secondary, row, navigation, and reset entry actions are outline or ghost style.
- Reset uses a quiet row-level entry point and shows destructive treatment only
  after explicit confirmation intent.
- Machine registry and history render as Paseo-style rows with primary and
  secondary text, subtle dividers, and trailing actions rather than large
  dashboard cards.
- First-run QR enrollment looks modal-like inside the full-screen surface, not
  like an overlay on top of the workspace.
- Auth and reset controls are clear and do not overlap on mobile or desktop.
- Reset is not one-click destructive.
- Desktop and mobile screenshots exist for enrollment, login, registry/reset,
  and history. Mobile evidence must include a 390px-class viewport for every
  page, not only login.

## Repair

The first implementation satisfied the functional auth/history/page-surface
requirements, but visual review found it still reads as a separate dark
security admin console. The saturated green/amber palette, large admin titles,
gradient buttons, oversized panels, and dashboard-card composition do not meet
the upstream Paseo design contract.

Workstream 02R preserved behavior and tests while replacing the Passport-owned
page shell with a closer Paseo settings/shell visual model. The upstream
design-system document and theme tokens are now the style source of truth.

## Implementation Notes

- Replaced the Passport-owned page shell with a dark operational surface for
  enrollment, login, machine registry, reset, and history pages.
- `/login` now uses `/api/auth/state` to segment first-run enrollment from
  returning TOTP login and renders no username/password fields.
- First-run enrollment starts through `/api/auth/enrollment/start`, shows a
  centered standards-encoded Version 5 / ECC-L byte-mode QR setup panel plus
  manual secret fallback, and completes through
  `/api/auth/enrollment/complete`.
- Machine registry includes workspace/history navigation and an authenticated
  reset form that requires typing `reset-totp-enrollment` before the reset
  button is enabled.
- History keeps separate access and workspace lists inside the same restrained
  Passport app surface.
- Added explicit `[hidden]` CSS handling after visual evidence exposed hidden
  auth panels rendering at the same time.
- Added a narrow-screen compact auth panel rule after visual evidence exposed
  right-edge clipping in a 390px viewport.
- Replaced the initial QR-like seed pattern with an in-page QR encoder that
  writes mode/length/data bits, Reed-Solomon parity, function patterns, a mask,
  and QR format bits without adding a dependency.

## TDD Evidence

- Red: `npm test -- --run admin-ui` failed before implementation because the
  login, machines, and history pages did not include the new Passport surface
  markers, enrollment/auth endpoints, or reset confirmation UI.
- Review fix red: `npm test -- --run admin-ui` failed when assertions required
  QR encoder primitives and rejected the previous `renderQrPattern` function.
- Green: `npm test -- --run admin-ui` passed after the UI implementation and
  QR/responsive hidden-state fixes.
- Broader validation: `npm test -- --run workspace-serving` and
  `npm run build` passed.
- Tests not run: full `npm test -- --run` was not run; this worker ran the
  required narrow suites for workstream 02.

## Visual Evidence

- Enrollment: `.out/screenshots/worker-02-enrollment.png`
- Login: `.out/screenshots/worker-02-login.png`
- Machine registry and reset: `.out/screenshots/worker-02-machines-reset.png`
- History: `.out/screenshots/worker-02-history.png`
- Narrow viewport: `.out/screenshots/worker-02-login-mobile.png`
- Repair enrollment desktop: `.out/screenshots/worker-02r-enrollment-desktop.png`
- Repair enrollment mobile: `.out/screenshots/worker-02r-enrollment-mobile.png`
- Repair login desktop: `.out/screenshots/worker-02r-login-desktop.png`
- Repair login mobile: `.out/screenshots/worker-02r-login-mobile.png`
- Repair machines desktop: `.out/screenshots/worker-02r-machines-desktop.png`
- Repair machines mobile: `.out/screenshots/worker-02r-machines-mobile.png`
- Repair machines reset desktop:
  `.out/screenshots/worker-02r-machines-reset-desktop.png`
- Repair machines reset mobile:
  `.out/screenshots/worker-02r-machines-reset-mobile.png`
- Repair history desktop: `.out/screenshots/worker-02r-history-desktop.png`
- Repair history mobile: `.out/screenshots/worker-02r-history-mobile.png`

Headless Chrome captured the screenshots. The Playwright MCP browser closed
after navigation in this environment, so authenticated machines/history
screenshots were captured through a loopback-only local auth bypass evidence
server against an isolated `.out` database.

Repair reset screenshots use a static evidence copy of the same server-rendered
machines page with the reset confirmation form expanded because direct
click-then-capture through MCP was unavailable in this environment.
