---
language: en-US
audience: operator
doc_type: runbook
updated: 2026-05-04
---

# Security Notes

## Authentication

Passport uses single-user pure TOTP authentication:

- no username/password login;
- first visit enrolls one authenticator secret;
- later visits require only the current TOTP code;
- reset requires an authenticated session or local server-side emergency reset;
- session cookies are `HttpOnly`, and public deployments must use
  `PASSPORT_COOKIE_SECURE=true`.

Login and enrollment completion failures are rate-limited in memory. The current
default is 5 failed attempts per 60 seconds per `request.ip`; the sixth failure
in the active window is rejected with the same generic authentication failure.
Successful authentication clears the failure bucket. Service restart clears all
in-memory buckets.

## Reverse Proxy Caveat

When Passport runs behind Caddy or another reverse proxy, configure trusted
proxy handling before treating recorded source IPs as authoritative. Without
that follow-up, Fastify may see the proxy address as `request.ip`, so access
history and rate-limit buckets can collapse to `127.0.0.1`.

## Secure Context Requirement

The self-hosted upstream Paseo web app needs browser WebCrypto for relay E2EE.
Use HTTPS for public access. Localhost remains acceptable for local testing, but
public `http://` origins are not valid workspace entry points.

## Secret Handling

Do not commit:

- raw pairing offers;
- daemon keypairs;
- TOTP secrets or QR payloads;
- session secrets;
- `PASSPORT_DATA_KEY`;
- provider credentials from daemon machines.

Pairing offers are machine-control credentials. Treat them like passwords even
when they are used only for relay registration.
