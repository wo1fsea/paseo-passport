---
spec_id: rfc-0003-self-hosted-paseo-web-totp
workstream: 06
language: en-US
audience: agent
doc_type: workstream
status: validated
owner: worker-06-e2e-smoke
depends_on:
  - 02R
  - 03
  - 05
updated: 2026-05-04
---

# Workstream 06: End-To-End Browser And Local Daemon Smoke

## Goal

Prove the full corrected product loop in a browser with a real local Paseo
daemon.

## Scope

- Start Passport locally.
- Complete first-run TOTP enrollment.
- Confirm later visits show TOTP login only, not QR.
- Import or reuse a real local Paseo daemon registration.
- Open the self-hosted Paseo interactive UI through Passport.
- Confirm the registered daemon is available in the UI.
- Exercise the deepest feasible project/agent interaction without committing
  secrets.
- Confirm access and workspace history lists contain expected events.

## Validation

- Browser screenshots or DOM assertions for enrollment, login, self-hosted Paseo
  UI, host availability, and history lists.
- API checks for `/api/passport/hosts`, access history, and workspace history.
- No raw offers or daemon secrets in tracked files.

## Acceptance

- User can open the Passport URL, authenticate with TOTP, reach the real Paseo
  interactive UI, and see registered machines.
- Access history and workspace history both show useful recent entries.

## Implementation Notes

- Updated `apps/passport-server/tests/local-smoke.test.ts` from the phase-A
  password-plus-TOTP shell smoke to the current MVP TOTP-only flow.
- The smoke now covers first-run enrollment, post-enrollment TOTP-only login,
  rejection of username/password login payloads, synthetic fixture host import,
  sanitized `/api/passport/hosts`, upstream Paseo web shell loading,
  credentialed Passport host fetch in the upstream bundle, and access/workspace
  history evidence.
- A real local Paseo daemon registration was not available in this worker
  environment. The local fixture equivalent used the current v2 relay offer
  shape with synthetic server IDs and fixture daemon public-key material.
- Browser evidence used a local Passport server on `127.0.0.1:17317` because
  `127.0.0.1:7317` was already in use.
- Follow-up coordinator validation used the HK HTTPS deployment and a real
  `PC-WIN11` daemon registration, closing the real-daemon smoke gap for the
  MVP.

## Validation Evidence

- `npm run build`: passed.
- `npm run build:paseo-web`: passed; rebuilt upstream Paseo `v0.1.67` into
  `apps/passport-server/public`.
- `npm run test:e2e`: passed after the smoke update; 1 test passed.
- `npm test -- --run local-auth-bypass offer`: passed after targeted stale-test
  repair; 9 tests passed.
- `npm test -- --run`: passed after targeted stale-test repair; 47 tests passed
  across 9 files.
- Browser screenshots:
  - `.out/screenshots/06-login-totp-only.png`
  - `.out/screenshots/06-machines-fixture-host.png`
  - `.out/screenshots/06-self-hosted-paseo-ui.png`
  - `.out/screenshots/06-history-access-workspace.png`
- Sanitized browser/API setup summary:
  `.out/logs/06-browser-setup-summary.json`.
- HK HTTPS real-daemon smoke:
  - `https://paseo.codexy.fun:6868/api/health` returned healthy over a valid
    certificate.
  - Browser secure-context checks passed from the HTTPS origin.
  - Registered host `PC-WIN11` / `srv_gjx4oQjUBW00` appeared in the self-hosted
    Paseo workspace.
  - Relay WebSocket traffic to `relay.paseo.sh` was observed from the HTTPS
    origin.
  - Direct daemon probe returned `WO1FSEA-PC-WIN11`, daemon `0.1.62`, and about
    `35ms` ping.

## Concerns

- The worker environment did not exercise a real local daemon, but the
  coordinator subsequently verified a real registered daemon through the HK
  HTTPS deployment.
- The Browser plugin Node REPL surface was unavailable and the exposed
  Playwright MCP browser context was closed, so browser evidence used local
  `npx playwright screenshot` commands instead.
- Dispatch Engine run `20260504T055050436139Z` could not recover after
  validation repair because worker-06 recorded protocol/capability overreach
  alerts. The run was cancelled with evidence preserved, and this is tracked as
  a Dispatch Engine framework issue draft under this spec's `issues/`
  directory.

## Activity Log

- 2026-05-04: Claimed and validated workstream 06 with updated local smoke test,
  required build/e2e ladder, fixture-host browser evidence, and documented
  full-suite concerns.
- 2026-05-04: Repaired stale full-suite tests outside the original worker-06
  scope and confirmed `npm test -- --run` passes 47/47 tests.
