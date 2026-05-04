---
language: en-US
audience: operator
doc_type: runbook
updated: 2026-05-04
---

# Paseo Passport MVP

This MVP proves the single-user self-hosted Paseo loop with Passport-managed
TOTP enrollment and Passport-registered hosts.

1. Configure local secrets outside git:

   ```sh
   PASSPORT_SESSION_SECRET=<at least 32 random characters>
   PASSPORT_DATA_KEY=<at least 32 random characters>
   PASSPORT_DB_PATH=./data/passport.sqlite
   PASSPORT_STATIC_DIR=./apps/passport-server/public
   PASSPORT_HOST=127.0.0.1
   PASSPORT_PORT=7317
   PASSPORT_COOKIE_SECURE=false
   ```

2. Build the self-hosted upstream Paseo web app:

   ```sh
   npm run build:paseo-web
   ```

3. Start Passport on the local loopback interface:

   ```sh
   npm run dev
   ```

4. Open `http://127.0.0.1:7317/login`.
5. On first run, scan the QR code or enter the displayed manual secret in a
   TOTP app, then submit the current TOTP code.
6. Import a local machine offer from the Passport machines page. The current
   automated smoke uses this synthetic fixture offer instead of a real daemon:

   ```text
   https://app.paseo.sh/#offer=eyJ2IjoyLCJzZXJ2ZXJJZCI6InNydl9zbW9rZSIsImRhZW1vblB1YmxpY0tleUI2NCI6ImZpeHR1cmUtZGFlbW9uLXB1YmxpYy1rZXkiLCJyZWxheSI6eyJlbmRwb2ludCI6InJlbGF5LnBhc2VvLnNoOjQ0MyJ9fQ
   ```

7. Confirm `/api/passport/hosts` returns registered `HostProfile[]` data after
   login and does not include raw offers, TOTP secrets, or session tokens.
8. Confirm `/` loads the self-hosted upstream Paseo UI through Passport.
9. Confirm `/admin/history` shows access and workspace events.

Automated local smoke:

```sh
npm run build
npm run build:paseo-web
npm run test:e2e
```

`npm run test:e2e` runs `apps/passport-server/tests/local-smoke.test.ts`. The
smoke uses an in-memory database and synthetic fixture data to prove first-run
TOTP enrollment, later TOTP-only login, rejection of username/password login
payloads, fixture import, `/api/passport/hosts` sanitization, authenticated
upstream Paseo web serving, credentialed host loading in the upstream bundle,
and access/workspace history records.

Validation evidence from 2026-05-04:

- `npm run build`: passed.
- `npm run build:paseo-web`: passed; rebuilt upstream Paseo `v0.1.67` into
  `apps/passport-server/public`.
- `npm run test:e2e`: passed; 1 local MVP smoke test passed.
- `npm test -- --run local-auth-bypass offer`: passed after stale-test repair;
  9 tests passed.
- `npm test -- --run`: passed after stale-test repair; 47 tests passed across
  9 files.
- Browser evidence captured against `http://127.0.0.1:17317` because port
  `7317` was already in use:
  - `.out/screenshots/06-login-totp-only.png`
  - `.out/screenshots/06-machines-fixture-host.png`
  - `.out/screenshots/06-self-hosted-paseo-ui.png`
  - `.out/screenshots/06-history-access-workspace.png`
  - `.out/logs/06-browser-setup-summary.json`

Full-suite status:

- Green as of 2026-05-04. The stale tests outside the final smoke scope were
  updated for the current TOTP-only auth and upstream-web MVP.

Live HK deployment evidence from 2026-05-04:

- Public entry point: `https://paseo.codexy.fun:6868`.
- Caddy terminates HTTPS on `*:6868`, redirects `http://paseo.codexy.fun/` from
  port `80`, and reverse proxies to Passport on `127.0.0.1:6867`.
- Existing `*:443` service on the HK server remains reserved for Xray and was
  not reused.
- `/api/health` was verified externally over HTTPS with a valid certificate.
- The real registered host `PC-WIN11` (`srv_gjx4oQjUBW00`) was visible in the
  self-hosted Paseo workspace, and the relay WebSocket to
  `wss://relay.paseo.sh/ws?...` exchanged frames from the HTTPS origin.
- A direct daemon client probe to the same host returned hostname
  `WO1FSEA-PC-WIN11`, daemon version `0.1.62`, and about `35ms` relay ping.

Operational caveats:

- Public plain HTTP is not a valid workspace entry point. The browser reports
  `isSecureContext=false` and `crypto.subtle=false`, so the upstream Paseo relay
  E2EE client cannot start. Use HTTPS or localhost.
- Login and enrollment failures are rate-limited in memory at 5 failed attempts
  per 60 seconds per `request.ip`; success clears the bucket and service restart
  clears all buckets.
- Behind Caddy, Fastify proxy trust is not yet configured. Until that follow-up
  lands, rate-limit and history source-IP values may collapse to the reverse
  proxy address instead of the raw client IP.

The fixture offer above is synthetic. It contains no real daemon credential and
must not be used as a real machine pairing secret.
