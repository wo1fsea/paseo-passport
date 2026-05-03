---
language: en-US
audience: agent
doc_type: spec
---

# Single-User MVP Tech Spec

Product spec: `./PRODUCT.md`

## Current Repo Context

The repository currently contains governance, README, and spec files only. There
is no application code, package metadata, test runner, server, database, vendor
directory, or deployment artifact yet.

Existing durable project context:

- `README.md` defines Paseo Passport as a single-user control plane for a
  self-hosted Paseo workspace.
- `specs/rfc-0001-initial-governance/` records Code & Order bootstrap.
- `AGENTS.md` requires spec-first delivery, strict TDD evidence for behavior
  changes, and workstream-based agent execution.

## Change Gate

- Problem: the repo needs its first application surface for a single-user
  authenticated Passport service.
- Existing path considered: use only upstream Paseo web storage and pairing
  flows.
- Why existing path is insufficient: opening a self-hosted URL must show
  pre-registered machines without per-browser manual pairing, which requires a
  server-side registry and a small web runtime patch.
- Smallest new surface: one Node/Fastify service, SQLite persistence, a minimal
  admin UI, authenticated machine registry APIs, a patched Paseo web host-loader,
  and development-machine deployment docs.
- What will be deleted or replaced: no existing application surface exists.
- Owner: MVP implementation agents under this spec.
- Validation: unit tests, API tests, local smoke tests, patched web build, and
  development-machine deployment smoke.
- Temporary or permanent: permanent MVP surface; some manual smoke steps can be
  replaced by automated e2e in follow-up work.
- Removal condition: superseded only by a later architecture spec that replaces
  the sidecar design or adds a backend daemon gateway.

## Proposed Repository Shape

```text
paseo-passport/
  package.json
  package-lock.json
  tsconfig.base.json
  .env.example

  apps/
    passport-server/
      package.json
      tsconfig.json
      src/
        index.ts
        config.ts
        db.ts
        auth/
          middleware.ts
          password.ts
          routes.ts
          sessions.ts
          totp.ts
        machines/
          host-profile.ts
          offer.ts
          repository.ts
          routes.ts
        web/
          static.ts
      migrations/
        001_initial.sql
      tests/
        auth.test.ts
        health.test.ts
        hosts-api.test.ts
        offer.test.ts

  scripts/
    init-auth.ts
    apply-paseo-patch.ts
    build-paseo-web.ts

  vendor/
    paseo/

  patches/
    paseo-web-passport-hosts.patch

  docs/
    deployment-development-machine.md
    mvp.md
    security.md
    upstream-paseo.md
```

## Fixed Technical Choices

| Area | Choice |
|---|---|
| Runtime | Node.js 20+ |
| Package manager | `npm` |
| Server | Fastify |
| Language | TypeScript |
| Database | SQLite |
| SQLite driver | `better-sqlite3` |
| Password hash | Argon2id through `argon2` |
| TOTP | `otplib` |
| Session | DB-backed random session id cookie |
| Validation | `zod` |
| Unit/API tests | `vitest` |
| Browser smoke | Playwright or documented manual smoke until automation lands |
| Workspace UI | Patched built Paseo web app served by Passport |

Rationale:

- A single-user MVP does not need a distributed database or identity provider.
- DB-backed sessions make revocation and expiry explicit.
- Serving a patched Paseo web build keeps the workspace close to
  `app.paseo.sh` while adding only the host registry hook.

## Environment Contract

`.env.example` must document:

```text
NODE_ENV=development
PASSPORT_HOST=127.0.0.1
PASSPORT_PORT=7317

PASSPORT_ADMIN_USER=admin
PASSPORT_PASSWORD_HASH=
PASSPORT_TOTP_SECRET=
PASSPORT_SESSION_SECRET=
PASSPORT_DATA_KEY=

PASSPORT_COOKIE_SECURE=false
PASSPORT_DB_PATH=./data/passport.sqlite
PASSPORT_STATIC_DIR=./public
```

Production-like deployments must set `PASSPORT_COOKIE_SECURE=true` and expose
the service only through HTTPS. Secrets must be injected outside git.

## Database Contract

Initial migration:

```sql
create table if not exists sessions (
  id text primary key,
  session_hash text not null unique,
  created_at text not null,
  expires_at text not null,
  revoked_at text
);

create table if not exists machines (
  id text primary key,
  label text not null,
  server_id text not null unique,
  relay_endpoint text not null,
  daemon_public_key_b64 text not null,
  status text not null default 'active',
  created_at text not null,
  updated_at text not null
);

create table if not exists machine_secrets (
  machine_id text primary key references machines(id) on delete cascade,
  encrypted_offer_url text,
  encryption_nonce text,
  encryption_tag text,
  version integer not null default 1,
  created_at text not null,
  updated_at text not null
);
```

If the raw offer URL is stored, encrypt it with `PASSPORT_DATA_KEY` using
AES-256-GCM. The MVP may leave `encrypted_offer_url` null when parsed fields are
sufficient for workspace loading.

## API Contract

### Health

```http
GET /api/health
```

Success:

```json
{"ok":true}
```

### Auth

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "...",
  "totp": "123456"
}
```

Success:

```http
204 No Content
Set-Cookie: pp_session=<random>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

Other auth endpoints:

```text
GET  /api/auth/me
POST /api/auth/logout
```

Failure:

```http
401 Unauthorized
```

### Machine Import

```http
POST /api/admin/machines/import-offer
Content-Type: application/json

{
  "label": "Development machine",
  "offerUrl": "https://app.paseo.sh/#offer=..."
}
```

Rules:

- Require auth.
- Accept a full URL or raw `#offer=...` fragment.
- Decode base64url JSON from `offer`.
- Validate only the current confirmed Paseo relay offer shape.
- Upsert by `serverId`.
- Do not log raw offers.

Admin machine endpoints:

```text
GET    /api/admin/machines
DELETE /api/admin/machines/:id
```

### Passport Host Profiles

```http
GET /api/passport/hosts
```

Rules:

- Require auth.
- Return only active machines.
- Return an array shaped as upstream Paseo `HostProfile[]`.
- Include no raw offer URL and no provider credentials.

Expected MVP shape after upstream confirmation:

```json
[
  {
    "serverId": "srv_example",
    "label": "Development machine",
    "lifecycle": {},
    "connections": [
      {
        "id": "relay:relay.paseo.sh:443",
        "type": "relay",
        "relayEndpoint": "relay.paseo.sh:443",
        "daemonPublicKeyB64": "..."
      }
    ],
    "preferredConnectionId": "relay:relay.paseo.sh:443",
    "createdAt": "2026-05-04T00:00:00.000Z",
    "updatedAt": "2026-05-04T00:00:00.000Z"
  }
]
```

## Paseo Web Patch Contract

Patch only the host registry load path. Do not modify daemon protocol, provider
integration, agent session protocol, or permission model.

Target behavior:

1. The app boots and loads existing local host registry data.
2. The app fetches `/api/passport/hosts` with `credentials: "include"`.
3. `401` returns no server hosts.
4. A successful array response is normalized through existing upstream host
   profile normalization where possible.
5. Server hosts are merged into `HostRuntimeStore` without breaking local stored
   hosts.

Implementation must record upstream Paseo source and license handling in
`docs/upstream-paseo.md`. Paseo is AGPL-3.0-or-later, so modified web source or
reproducible patches must remain public with license notices.

## Development-Machine Deployment

Deployment docs must stay generic and avoid machine-specific hostnames,
addresses, SSH users, credentials, or unrelated service details.

Required shape:

- Clone the repo on a development deployment machine.
- Store runtime data under a local project-owned directory.
- Keep `.env` and all secrets outside git.
- Bind Passport to `127.0.0.1:7317` by default.
- Check current port listeners before choosing any public or local port.
- Expose the app through an explicit HTTPS entry point before real use.
- Do not bind directly to privileged or shared public ports unless a later
  deployment decision owns that change.

## Security Requirements

- Password hashes only; never store plaintext passwords.
- TOTP secret must never be committed.
- Session cookie must be `HttpOnly`; production-like HTTPS deployments must use
  `Secure`.
- Login attempts must be rate-limited.
- Admin APIs and workspace APIs must require auth.
- Pairing offers are treated as machine-control credentials.
- Raw offers must not appear in access logs, error logs, or API responses.
- Provider credentials remain on each daemon machine.
- Development bypasses such as `DEV_SKIP_AUTH` are forbidden for production-like
  runs and should be avoided entirely unless a separate spec approves them.

## Validation Plan

Before accepting the MVP:

```powershell
npm install
npm run build
npm test
npm run test:e2e
python C:/Users/wo1fsea/.codex/skills/code-and-order/scripts/init_governance.py . --audit
```

Additional checks:

- Confirm `/api/health` returns `{"ok":true}`.
- Confirm invalid login combinations fail.
- Confirm valid password plus TOTP creates a session cookie.
- Confirm logout revokes the session.
- Confirm malformed offers return `400`.
- Confirm duplicate `serverId` import updates an existing machine.
- Confirm `/api/passport/hosts` contains no raw offer URL.
- Confirm the patched Paseo web build completes.
- Confirm an authenticated workspace shows at least one imported machine.
- Confirm a real daemon can run at least one agent session through the workspace.
- Confirm the development-machine deployment uses a local high port and HTTPS
  entry point for real use.

## Risks And Follow-ups

- Upstream Paseo internal host profile shape may change. Mitigation: confirm
  schema before parser and patch work, and isolate conversion in
  `host-profile.ts`.
- Patching Paseo web may be heavier than expected. Mitigation: spike that
  workstream before serving the workspace.
- Browser receives machine connection material after login. This is accepted for
  the single-user MVP and must be revisited before any multi-user design.
- Development-machine deployment remains intentionally generic. Concrete
  infrastructure details belong in private operator notes, not this public repo.
- Future specs should cover enrollment sidecar, rotation, audit events, and
  multi-user authorization only after this MVP loop works.
