---
language: en-US
audience: mixed
doc_type: spec
---

# Single-User MVP Product Spec

## Summary

Paseo Passport MVP is a single-user, self-hosted workspace that protects access
with password plus authenticator-app TOTP, stores a server-side registry of
pre-registered Paseo machines, and serves a patched Paseo web workspace that
loads those machines automatically after login.

The first release proves one complete loop:

1. The operator opens the Passport URL.
2. The operator logs in with username, password, and TOTP.
3. The operator imports a Paseo pairing offer.
4. Passport stores the machine.
5. The workspace opens and shows the pre-registered machine without manual
   pairing in the browser.
6. The operator starts or resumes one real Paseo agent session on that machine.

## Goals / Non-goals

Goals:

- Provide a usable single-user web entry point for the operator.
- Require password plus TOTP for admin and workspace access.
- Store machine registration server-side, not only in browser local storage.
- Support manual import of Paseo relay pairing offers.
- Expose authenticated host profiles to a patched Paseo web runtime.
- Preserve local provider credentials on each daemon machine.
- Ship a repeatable local and development-machine deployment path.

Non-goals:

- No multi-user accounts, team model, RBAC, SSO, or organization admin.
- No fork or modification of the Paseo daemon for the MVP.
- No backend WebSocket gateway for all daemon traffic.
- No direct TCP password host support in the first release.
- No automatic machine installer or enrollment sidecar in the first release.
- No storage of Claude, Codex, OpenCode, Pi, or other provider credentials in
  Passport.
- No production-grade audit dashboard, billing, or compliance reporting.

## Behavior Invariants

1. Unauthenticated users cannot access admin pages, workspace pages, or protected
   API routes.
2. Login requires a configured username, password hash, and TOTP secret.
3. Invalid username, password, TOTP, or expired/revoked session returns a generic
   authentication failure without revealing which factor failed.
4. Successful login creates an `HttpOnly` session cookie and allows access to
   admin APIs and the workspace.
5. Logout revokes the current session so the same cookie no longer authenticates.
6. The machine import path accepts a full Paseo pairing URL or raw offer fragment
   and rejects malformed or unsupported offers.
7. Duplicate imports for the same Paseo `serverId` update the existing machine
   instead of creating duplicates.
8. `/api/passport/hosts` returns only active machines, shaped as Paseo
   `HostProfile[]`, after authentication.
9. Host profile responses do not include raw pairing offer URLs, provider
   credentials, password hashes, TOTP secrets, session secrets, or data keys.
10. The patched workspace preserves existing local host registry behavior while
    merging authenticated Passport hosts at boot.
11. The workspace route redirects unauthenticated users to login or returns an
    equivalent protected access response.
12. The MVP can be run locally from a clean checkout with documented commands.
13. The development-machine deployment binds the app to a local high port first;
    public exposure requires an explicit HTTPS entry point.

## States And Edge Cases

- Not configured: the server must fail closed when required secrets are missing
  outside development setup commands.
- Unauthenticated: protected APIs return `401`; protected pages redirect to
  login or show a login requirement.
- Bad login: failure response is generic and rate-limited.
- Expired session: protected APIs return `401`; pages require re-login.
- Empty registry: workspace loads and `/api/passport/hosts` returns `[]`.
- Malformed pairing offer: import returns `400` with a safe validation message.
- Unsupported offer type: first release rejects non-relay or unknown-version
  offers.
- Duplicate machine: import updates label and timestamp for the existing
  `serverId`.
- Removed machine: deleted or inactive machines disappear from
  `/api/passport/hosts`.
- Paseo web patch fetch failure: local hosts still load; Passport host loading
  surfaces a safe error path without exposing secrets.

## Open Questions

- Exact current Paseo relay offer schema must be confirmed against upstream code
  before implementing the parser.
- Exact current `HostProfile` TypeScript shape must be confirmed before
  finalizing `/api/passport/hosts`.
- The final HTTPS exposure mechanism for a development machine is intentionally
  deferred to deployment configuration, not encoded in the MVP product behavior.
