---
language: en-US
audience: operator
doc_type: runbook
updated: 2026-10-02
---

# Development-Machine Deployment

This runbook describes the verified development deployment shape without
recording machine credentials or secret values.

## HK Retirement (2026-10-02)

The operator requested removal of Passport from HK Tencent, with no database
retention. The previously stopped deployment was removed on 2026-10-02:

- Deleted `/home/ubuntu/Projects/paseo-passport`, including dependencies,
  generated builds, `data/passport.sqlite`, the startup script, `.env`, and
  `.env` backups. No database or secret recovery copy was retained.
- Deleted `/etc/systemd/system/paseo-passport.service` and reloaded systemd.
- Confirmed the unit is `not-found` and ports `6867` and `6868` have no listener.
- Preserved the active subscription Caddy service, Xray, Traffic Panel,
  Clash Sub Hub, and LibreSpeed. Shared Caddy configuration was not changed.
- Recovered approximately 2.91 GiB; no shared npm or download cache was removed.

Before deletion, the deployed outer repository matched remote `main` commit
`02ac5400f37bb4dabbc8bb68fa55647a88f2e2e0`. The 15 modified or untracked
upstream source files matched, byte for byte, a clean checkout of
`15a2e3bdcbefda97587f74e499d6b81a278d458c` with both committed patches applied:
`paseo-web-passport-hosts.patch` and `paseo-web-dispatch-dashboard-tab.patch`.
There were no additional uncommitted source changes to save. Database,
environment values, logs, and dependencies were not exported to Git.

Validation: clean-checkout patch application, all 15 source-file comparisons,
`git diff --check`, remote commit verification, filesystem absence, systemd
state, listeners, and retained service states. Application build, tests, and
browser smoke were not rerun because no application code or UI changed and
the deployment was being removed, not released.

The sections below describe the historical deployment and are reference only;
they do not authorize redeployment or recreation of the discarded database.

## Layout

Use a normal checkout on the deployment host:

```text
/home/ubuntu/Projects/paseo-passport/
  apps/passport-server/public/
  data/passport.sqlite
  .env
```

Keep `.env` and `data/` out of git.

## Environment

The verified HTTPS deployment runs Passport behind Caddy:

```sh
PASSPORT_HOST=127.0.0.1
PASSPORT_PORT=6867
PASSPORT_COOKIE_SECURE=true
PASSPORT_DB_PATH=/home/ubuntu/Projects/paseo-passport/data/passport.sqlite
PASSPORT_STATIC_DIR=/home/ubuntu/Projects/paseo-passport/apps/passport-server/public
PASSPORT_LOCAL_AUTH_BYPASS=false
```

Also provide strong `PASSPORT_SESSION_SECRET` and `PASSPORT_DATA_KEY` values
outside git. `PASSPORT_DATA_KEY` protects the enrolled TOTP secret at rest.

## Build And Start

```sh
npm ci
npm run build:paseo-web
npm run build
sudo systemctl restart paseo-passport.service
sudo systemctl status paseo-passport.service --no-pager
```

The service should listen only on loopback:

```sh
ss -tulpn | grep -E '6867|6868|:80|:443'
curl http://127.0.0.1:6867/api/health
```

## Caddy HTTPS

The verified Caddy shape is:

```text
paseo.codexy.fun {
  redir https://paseo.codexy.fun:6868{uri}
}

paseo.codexy.fun:6868 {
  reverse_proxy 127.0.0.1:6867
}
```

Caddy obtains and renews the Let's Encrypt certificate automatically when DNS
points at the host and port `80` is reachable. In the verified HK deployment,
public `443` is reserved by an existing Xray service, so Passport uses public
HTTPS port `6868`.

## Smoke

After deployment:

```sh
curl https://paseo.codexy.fun:6868/api/health
```

Then verify in a browser:

- first-run TOTP enrollment or TOTP-only login works;
- `/admin/machines` lists the expected active machines;
- `/h/<server-id>/open-project` opens the self-hosted upstream Paseo UI;
- the registered host appears without manual browser pairing;
- access and workspace history record the visit.

Public HTTP is not acceptable for workspace use because upstream Paseo relay
encryption requires browser WebCrypto, which is unavailable in non-secure
public origins.

## Known Follow-ups

- Configure trusted proxy handling before relying on raw client IP in access
  history or rate-limit buckets behind Caddy.
- Decide backup and restore handling for `data/passport.sqlite` together with
  the separate `PASSPORT_DATA_KEY`.
- Replace ad hoc Windows hidden-console daemon startup with a proper service
  wrapper where long-running Windows hosts are needed.
