---
language: en-US
audience: mixed
doc_type: spec
---

# Self-Hosted Paseo Web With TOTP Product Spec

## Summary

Paseo Passport must become a self-hosted entry point for the real Paseo
interactive web application. The operator opens a Passport URL, completes a
single-user TOTP challenge, and lands in a self-hosted build of upstream Paseo
web that automatically loads every active machine registered in Passport.

This spec supersedes the phase-A workspace shell as the target user experience.
The shell proved the host registry contract, but it is not the final workspace.

## Goals / Non-goals

Goals:

- Use pure TOTP authentication for the single operator.
- Enroll TOTP on first access by showing a QR code in a full-screen
  Paseo-styled enrollment surface with a centered QR panel.
- Stop showing the QR code after the first successful TOTP enrollment.
- Provide a reset action that intentionally clears TOTP enrollment and returns
  the next visit to first-enrollment mode.
- Provide a local emergency reset command for the operator when the current TOTP
  device is unavailable.
- Serve the real upstream Paseo interactive web UI from Passport, not the
  phase-A shell and not `https://app.paseo.sh`.
- Load all active Passport-registered machines into the self-hosted Paseo web UI
  without manual browser pairing.
- Keep new Passport auth, enrollment, pairing, history, and reset pages visually
  consistent with upstream Paseo.
- Show both security access history and workspace usage history.

Non-goals:

- No username/password login.
- No Google Auth, SSO, team accounts, RBAC, or multi-user model.
- No storage of provider credentials in Passport.
- No daemon protocol rewrite or backend gateway in this spec.
- No public exposure without a later HTTPS deployment decision.
- No secret-bearing raw pairing offers in logs, docs, API responses, or git.

## Behavior Invariants

1. If no TOTP enrollment exists, visiting any protected Passport route shows the
   first-enrollment surface instead of the normal login challenge.
2. First enrollment uses a full-screen Paseo-styled surface with a centered QR
   panel. It is not a modal over the workspace because no authenticated
   workspace context exists yet.
3. First enrollment displays a QR code and a manual TOTP secret entry fallback.
4. Enrollment completes only after the operator submits a valid TOTP code for
   the generated secret.
5. After successful enrollment, Passport persists only encrypted TOTP secret
   material needed for verification and does not show the QR code again.
6. If TOTP enrollment exists, visiting protected routes shows a TOTP-only login
   challenge when no valid session exists.
7. Successful TOTP verification creates an `HttpOnly` session cookie.
8. Invalid TOTP, expired session, revoked session, or missing session returns a
   generic authentication failure or redirects to the TOTP challenge.
9. Login and enrollment attempts are rate-limited.
10. Reset requires an authenticated session and an explicit confirmation action.
11. After reset, existing sessions are revoked and the next protected visit
    returns to first-enrollment mode.
12. If the operator cannot authenticate because the current TOTP device is
    unavailable, recovery is only through a local server-side emergency reset
    command. There is no public web-based account recovery flow.
13. Protected admin, registry, history, reset, self-hosted workspace, and
    `/api/passport/hosts` routes require a valid session unless loopback-only
    local auth bypass is explicitly enabled.
14. The self-hosted workspace route serves a patched upstream Paseo web build.
15. The self-hosted Paseo web app fetches `/api/passport/hosts` with
    credentials included.
16. `/api/passport/hosts` returns all active registered machines in the current
    upstream `HostProfile[]` shape and excludes raw offers and secrets.
17. Passport-provided hosts are merged with any existing local web app registry
    data without deleting local browser-only hosts.
18. The operator can reach the real Paseo interactive UI where projects and
    agents can be opened and operated.
19. Security access history records TOTP enrollment, login success, login
    failure, logout, authenticated reset, emergency reset, and bypass-mode access
    events.
20. Workspace usage history MVP records opening the self-hosted workspace and
    loading registered host profiles.
21. Workspace host-open and project-open history events are deferred until a
    later integration phase.
22. History entries store the raw source IP needed for operator audit.
23. History entries never store TOTP codes, raw pairing offers, provider
    credentials, daemon keypairs, session tokens, raw user agents, or full
    sensitive headers.
24. Passport-styled pages must visually align with upstream Paseo: dark
    application surface, restrained controls, compact centered enrollment/login
    flow, and no separate generic admin aesthetic.
25. Access history and workspace usage history each retain the most recent
    3,000 events by default.

## States And Edge Cases

- Not configured: missing session secret or required data storage configuration
  fails closed.
- Missing data key: because TOTP secret storage is encrypted, startup fails
  closed when `PASSPORT_DATA_KEY` is missing or invalid outside explicitly
  in-memory tests.
- Not enrolled: protected routes show the full-screen enrollment surface with
  the centered QR panel.
- Enrollment QR generated but not verified: no session is created and protected
  APIs remain inaccessible.
- Enrollment success: session is created, QR no longer appears, and access
  history records enrollment success. The TOTP secret is stored encrypted.
- Bad enrollment code: generic failure, rate limit accounting, QR remains
  available for the same pending enrollment.
- Enrolled but unauthenticated: show TOTP-only challenge.
- Bad login code: generic failure and access-history event with no submitted
  code stored.
- Reset requested: show a confirmation affordance before clearing enrollment.
- Reset complete: revoke sessions, clear enrollment, record reset event, and
  redirect to enrollment.
- Emergency reset: local server command clears enrollment, revokes sessions,
  records an emergency reset event, and prints no TOTP secret.
- Lost TOTP device: no web recovery is available; the operator must use local
  server access.
- Empty registry: real Paseo web app still opens and reports no Passport hosts.
- Multiple machines: all active Passport machines are available to the
  self-hosted Paseo app.
- Removed machine: removed or inactive machines disappear from
  `/api/passport/hosts` and future workspace loads.
- Upstream web build unavailable: deployment fails validation instead of falling
  back silently to the phase-A shell.
- Upstream web patch load failure: the app must not expose secrets; failure is
  visible enough for local debugging.
- Public HTTP origin: the workspace must not rely on public plain HTTP because
  upstream Paseo relay encryption requires browser WebCrypto, which is only
  available in secure contexts such as HTTPS or localhost.
- Local test bypass: only allowed on loopback/local-only binds and must still
  record bypass access events as local-test events.
- History retention: after the 3,000-event limit is exceeded for either history
  category, oldest rows are pruned without affecting current sessions or machine
  registry data.

## Open Questions

- Upstream Paseo web build command is confirmed as
  `npm run build --workspace=@getpaseo/app` inside `vendor/paseo`, producing
  `vendor/paseo/packages/app/dist`.
- Upstream host registry patch point is confirmed as
  `packages/app/src/runtime/host-runtime.ts`,
  `HostRuntimeStore.runBoot()` immediately after `loadFromStorage()`, using
  `normalizeStoredHostProfile()` from
  `packages/app/src/types/host-connection.ts`.
- Host-open and project-open workspace history events are deferred until after
  the MVP.
- Whether history export is needed is deferred until after the MVP.
- The verified public MVP entry point is `https://paseo.codexy.fun:6868`, with
  Caddy reverse proxying to Passport on `127.0.0.1:6867`.
- Trusted reverse-proxy handling for authoritative raw client IPs is a
  follow-up, not a blocker for the single-user MVP.
