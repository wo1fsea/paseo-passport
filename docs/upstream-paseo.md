---
language: en-US
audience: developer
doc_type: provenance
updated: 2026-05-04
---

# Upstream Paseo

This document is the source of truth for Paseo Passport's upstream web
provenance, build process, license handling, and host-registry patch contract.

Paseo Passport's rfc-0003 target uses upstream Paseo source from:

- Repository: `https://github.com/getpaseo/paseo`
- Integration strategy: git submodule at `vendor/paseo`
- Stable release tag: `v0.1.67`
- Release commit: `15a2e3bdcbefda97587f74e499d6b81a278d458c`
- License: AGPL-3.0-or-later as published by upstream Paseo.

This stable release was verified from GitHub Releases on 2026-05-04. Later
release-candidate tags, including `v0.2.0-rc.1`, are not the target for this
spec.

Phase-A patch evidence used an earlier public `main` commit:
`4338f5b46ca3f562c907fb5c4d8df31d7b485a72`. Treat that commit as phase-A
historical evidence only; rfc-0003 implementation must re-confirm build and
patch paths against the `v0.1.67` submodule.

## Agent Setup Layout

Use this repo layout for the rfc-0003 agent environment:

```text
vendor/
  paseo/                 # git submodule pinned to v0.1.67
patches/
  paseo-web-passport-hosts.patch
scripts/
  apply-paseo-patch.ts
  build-paseo-web.ts
docs/
  upstream-paseo.md
apps/passport-server/public/
  ...                    # generated built output
```

Agent setup should initialize `vendor/paseo`, check out `v0.1.67`, and verify
HEAD is `15a2e3bdcbefda97587f74e499d6b81a278d458c`. The annotated tag object
itself is `0b5345a70ee290fb3b58fdadec08a80b51405148`; use the peeled commit
for submodule HEAD checks. The rfc-0003 workstream 05 patch is regenerated
against this release and validated by `scripts/apply-paseo-patch.ts`.

## Passport Build Command

The repository build command for the self-hosted web app is:

```sh
npm run build:paseo-web
```

It verifies that `vendor/paseo` is checked out at `v0.1.67`
(`15a2e3bdcbefda97587f74e499d6b81a278d458c`), applies
`patches/paseo-web-passport-hosts.patch` when needed, runs the upstream web
build, and copies `vendor/paseo/packages/app/dist` into
`apps/passport-server/public/`. The copied public output includes
`upstream-paseo-LICENSE.txt` from the upstream repository.

The underlying upstream build command remains:

```sh
cd vendor/paseo
npm run build --workspace=@getpaseo/app
```

The build exports the web app to:

```text
vendor/paseo/packages/app/dist
```

The build completed successfully at `v0.1.67` and produced
`packages/app/dist/index.html`.

Dispatch evidence for the confirmed offer and host profile contracts is stored
under `.dispatch/runs/20260503T170721136859Z/artifacts/upstream-paseo-contract.json`.
The earlier dispatch evidence referenced
`a198a33ff525c6addc5e6fd2bd75b298ad6ce409`; the public upstream ref checked
for this workstream did not expose that object. The active reproducible patch
is based on the pinned `v0.1.67` commit
`15a2e3bdcbefda97587f74e499d6b81a278d458c`.

## Patch Contract

The MVP patch must only change the web host registry load path:

- Fetch `/api/passport/hosts` with `credentials: "include"`.
- Treat `401` as no Passport hosts.
- Merge Passport hosts into the existing host runtime store.
- Patch `packages/app/src/runtime/host-runtime.ts` by calling
  `await this.loadPassportHosts();` immediately after
  `HostRuntimeStore.runBoot()` calls `await this.loadFromStorage();`.
- Reuse `normalizeStoredHostProfile()` from
  `packages/app/src/types/host-connection.ts`.
- Add the loader in `packages/app/src/runtime/passport-hosts.ts`.
- Preserve browser-only local hosts and do not persist Passport-loaded hosts to
  AsyncStorage in the MVP.
- Do not change daemon protocol, provider credentials, agent session protocol,
  or permission behavior.

The reproducible patch lives at `patches/paseo-web-passport-hosts.patch`. It
records the only permitted upstream behavior change for the full Paseo web
integration: add a `loadPassportHostProfiles()` helper, fetch
`/api/passport/hosts` with included cookies, treat `401` as no server hosts,
normalize returned profiles through `normalizeStoredHostProfile()`, and merge
the returned `HostProfile[]` after the existing local host registry load.

When `vendor/paseo` is present at the confirmed commit, the patch can be
checked/applied directly with:

```sh
npx tsx scripts/apply-paseo-patch.ts
```

The patch script is idempotent: it applies the patch when missing and exits
successfully when the patch is already present. `npm run build:paseo-web` calls
the patch script before building so a clean clone can reproduce the Passport
host-registry build output.

Workstream 04 replaced the earlier local Passport workspace shell with the
copied upstream web build. Workstream 05 applied and validated the
host-registry patch against the pinned upstream source.

Validated on 2026-05-04:

- `npm run test --workspace=@getpaseo/app -- host-runtime` from
  `vendor/paseo`.
- `npx tsx scripts/apply-paseo-patch.ts`.
- `npm run build:paseo-web`.
- `npm run build`.

## Local Test Mode

Passport supports an explicit local-only auth bypass for operator test runs:

```sh
PASSPORT_HOST=127.0.0.1 PASSPORT_LOCAL_AUTH_BYPASS=true npm run dev
```

The bypass defaults to `false`. When it is `true`, startup must remain bound to
`127.0.0.1`, `localhost`, or `::1`; any other `PASSPORT_HOST` fails closed
before the service is built or starts accepting requests. This mode is only for
local upstream pairing validation and must not be used for development-machine
or production-like deployments.

Do not commit raw pairing offers, relay secrets, daemon credentials, local
provider credentials, or machine-specific upstream config. Use placeholders in
notes and keep operator-only values outside git.

## Verified Local CLI Pairing Flow

The local test pairing flow was verified on 2026-05-04 with
`@getpaseo/cli@0.1.67`. The CLI package includes the daemon through
`@getpaseo/server@0.1.67`, so this is the verified headless path for registering
a real local Paseo daemon with Passport.

```sh
# Install or update the local CLI.
npm install -g @getpaseo/cli@0.1.67

# Start an isolated local daemon for Passport testing.
paseo daemon start --home .out/paseo-local-test --port 6767

# Confirm the daemon is running.
paseo daemon status --home .out/paseo-local-test --json

# Generate the pairing offer. Do not commit or paste the raw URL into git.
paseo daemon pair --home .out/paseo-local-test --json
```

After generating a local offer, import it into Passport through the admin UI or
`POST /api/admin/machines/import-offer` during the local bypass session, then
confirm `/api/passport/hosts` returns the imported host profile. The verified
local registration produced server id `srv_cxpKpFRXo1T0` and relay endpoint
`relay.paseo.sh:443`. The raw offer, daemon keypair, and local daemon state must
stay out of this repository.

## License Handling

Paseo is AGPL-3.0-or-later. Any modified Paseo web source, reproducible patch,
or built artifact distributed from this project must keep the upstream license
notice and make the corresponding source plus Passport patch available under
the applicable AGPL terms. The phase-A shell in this repository is Passport
source, but the patch placeholder remains public so the future upstream
modification is reproducible.
