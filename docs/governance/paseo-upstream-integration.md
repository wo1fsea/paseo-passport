---
language: en-US
audience: agent
doc_type: normative
---

# Paseo Upstream Integration

Use this workflow for any change that touches the self-hosted upstream Paseo
web app, Passport-to-Paseo integration, workspace tab behavior, registered host
loading, or Dispatch Engine visibility inside Paseo.

## Scope

This workflow applies when a change affects any of these surfaces:

- `vendor/paseo` source, build output, submodule pin, or upstream patches.
- `patches/paseo-*.patch`, `scripts/apply-paseo-patch.ts`, or
  `scripts/build-paseo-web.ts`.
- Passport APIs consumed by the upstream Paseo web app.
- Workspace tab creation, tab-row actions, embedded browser tabs, or service
  links inside upstream Paseo.
- Dispatch Engine dashboard discovery, launch, proxying, or display from a
  Paseo workspace.
- Host registry loading, registered machine visibility, or project-open flows.

## Required Gates

1. Run `docs/governance/spec-decision-gate.md` before code changes.
2. Use a full spec for new user-visible upstream Paseo behavior, new Passport
   APIs, security-sensitive proxying, machine/workspace integration, or
   cross-module changes.
3. Use `docs/governance/change-gate.md` for every new route, API, patch point,
   tab action, configuration value, proxy, or long-lived adapter.
4. Use `docs/governance/spec-first-delivery.md` for implementation: the main
   session owns intent and acceptance; workers implement scoped workstreams.
5. Use `docs/governance/validation-workflow.md` and require browser evidence
   for UI-visible behavior.

Direct implementation is allowed only for tiny mechanical fixes to comments,
tests, or docs that do not change upstream behavior, Passport contracts,
security, UI, routing, build output, or deployment behavior.

## Upstream Patch Rules

- Keep upstream Paseo pinned through the `vendor/paseo` submodule.
- Do not commit modified upstream files directly inside the submodule as the
  durable integration mechanism.
- Keep Passport-owned upstream changes as reproducible patches in `patches/`
  and apply them through repo scripts.
- Reconfirm patch points against the pinned upstream release before expanding
  or regenerating a patch.
- Update `docs/upstream-paseo.md` when the upstream release, patch contract,
  build command, license handling, or validation evidence changes.
- Preserve upstream local behavior unless the spec explicitly accepts a
  replacement.

## Passport Proxy Rules

- Browser-facing upstream integrations should use Passport same-origin routes
  when authenticated browser access is required.
- Do not expose raw local dashboard or service URLs such as
  `127.0.0.1:<port>` as public or remote browser entry points.
- Do not expose arbitrary repo paths through browser-controlled API input.
  Resolve workspaces through registered Passport or Paseo workspace mappings.
- Keep machine-control credentials, raw pairing offers, daemon keypairs,
  session cookies, provider credentials, and TOTP material out of logs, docs,
  API responses, and dashboard URLs.
- Read-only observer surfaces must remain read-only unless a spec explicitly
  introduces a mutating control with security review and validation.

## Dispatch Engine Dashboard In Paseo

Opening a Dispatch Engine dashboard from Paseo is a full-spec change because it
adds user-visible workspace UI, Passport API/proxy surface, and agent workflow
visibility.

The preferred first implementation shape is:

- Detect an already-running dashboard for the current workspace/repo on the
  Passport/server side.
- Show a compact workspace tab-row action only when a dashboard is available.
- On click, open a new existing Paseo `browser` tab rather than introducing a
  new tab kind.
- Load a Passport same-origin dashboard URL, such as a proxied
  `/dispatch-dashboard/<session-id>/` path.
- Keep the dashboard as a read-only observer; it does not replace heartbeat
  monitoring, `de status --json`, `de events`, or `de alerts`.

Do not rely on upstream Paseo service-link open URLs for relay-connected
machines until a spec proves the service URL is reachable and authenticated in
that connection mode.

## Validation Expectations

For upstream Paseo integration changes, record:

- Spec Decision Gate result and Change Gate result.
- Patch apply validation, when a patch changes.
- Upstream app build validation.
- Passport server build/test validation.
- Browser smoke against the self-hosted Paseo UI.
- Screenshots for desktop and mobile when UI is visible.
- Evidence that registered hosts or dashboard entry points appear only when the
  expected server-side condition is true.
- Security notes for same-origin proxying, auth requirements, and secret
  exclusion.
