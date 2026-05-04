---
language: en-US
audience: operator
doc_type: runbook
updated: 2026-05-04
---

# Paseo Passport MVP

This local first-phase MVP proves the single-user loop without real machine
credentials:

1. Generate local auth secrets:

   ```sh
   npx tsx scripts/init-auth.ts --username admin
   ```

2. Put the generated `PASSPORT_*` values in a local `.env` file outside git.
3. Build the workspace shell:

   ```sh
   npm run build:paseo-web
   ```

4. Start Passport on the local loopback interface:

   ```sh
   npm run dev
   ```

5. Open `http://127.0.0.1:7317/login`, log in, and import a fixture offer:

   ```text
   https://app.paseo.sh/#offer=eyJ2IjoyLCJzZXJ2ZXJJZCI6InNydl9zbW9rZSIsImRhZW1vblB1YmxpY0tleUI2NCI6ImZpeHR1cmUtZGFlbW9uLXB1YmxpYy1rZXkiLCJyZWxheSI6eyJlbmRwb2ludCI6InJlbGF5LnBhc2VvLnNoOjQ0MyJ9fQ
   ```

6. Confirm `/api/passport/hosts` returns the fixture host after login.
7. Confirm `/` loads the Passport workspace shell and lists imported hosts.

Automated local smoke:

```sh
npm run build:paseo-web
npm run test:e2e
npm run build
npm test -- --run
```

`npm run test:e2e` runs `apps/passport-server/tests/local-smoke.test.ts`.
The smoke uses synthetic credentials and an in-memory database to prove login,
fixture import, the admin registry API, `/api/passport/hosts`, authenticated
workspace shell loading, and authenticated loading of `/passport-hosts.js`.
The host-loader asset is checked for the credentialed `/api/passport/hosts`
fetch path used to render Passport hosts in the workspace.

Validation evidence from 2026-05-04:

- `npm run build:paseo-web`: passed; rebuilt `apps/passport-server/public`.
- `npm run test:e2e`: passed; 1 local smoke test passed.
- `npm run build`: passed; TypeScript build completed.
- `npm test -- --run`: passed; 7 test files and 26 tests passed.

Manual/browser gap:

- A headless browser smoke was attempted against `http://127.0.0.1:7317/login`
  with the same synthetic credentials. The Playwright browser opened the login
  page, then the local browser backend closed before form interaction, so no
  retained screenshot or full browser import/render evidence was produced.
- Until a stable browser runner is added, use the manual steps above to confirm
  the imported host appears in the workspace UI after login.

The fixture offer above is synthetic. It contains no real daemon credential and
must not be used as a real machine pairing secret.
