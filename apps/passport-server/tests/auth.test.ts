import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import fastify, { type FastifyInstance } from "fastify";
import { generateSync as generateOtplibTotp } from "otplib";
import { createPassportDb, type PassportDatabase } from "../src/db";
import { buildServer } from "../src/index";
import { registerAuthRoutes } from "../src/auth/routes";
import { generateTotp } from "../src/auth/totp";
import { emergencyResetTotp } from "../../../scripts/init-auth";

const OPERATOR_NAME = "operator";
const DATA_KEY = "0123456789abcdef0123456789abcdef";
const SESSION_SECRET = "test-session-secret-with-enough-entropy";
const NOW = new Date("2026-05-04T00:00:00.000Z");

let server: FastifyInstance | undefined;
let db: PassportDatabase | undefined;

afterEach(async () => {
  await server?.close();
  db?.close();
  server = undefined;
  db = undefined;
});

async function buildAuthTestServer(
  options: {
    now?: Date;
    sessionTtlSeconds?: number;
    db?: PassportDatabase;
    localAuthBypass?: boolean;
  } = {}
) {
  db =
    options.db ??
    createPassportDb({
      path: ":memory:"
    });

  server = fastify({
    logger: false
  });

  await registerAuthRoutes(server, {
    cookieSecure: false,
    dataKey: DATA_KEY,
    db,
    operatorName: OPERATOR_NAME,
    sessionSecret: SESSION_SECRET,
    sessionTtlSeconds: options.sessionTtlSeconds,
    now: () => options.now ?? NOW,
    localAuthBypass: options.localAuthBypass
  });

  return server;
}

function sessionCookie(response: { headers: Record<string, string | string[] | undefined> }): string {
  const header = response.headers["set-cookie"];
  const cookie = Array.isArray(header) ? header[0] : header;

  if (!cookie) {
    throw new Error("Expected Set-Cookie header.");
  }

  return cookie.split(";")[0];
}

async function enroll(app: FastifyInstance, now = NOW): Promise<{ cookie: string; secret: string }> {
  const start = await app.inject({
    method: "POST",
    url: "/api/auth/enrollment/start"
  });
  const body = start.json() as { manualSecret: string };
  const complete = await app.inject({
    method: "POST",
    url: "/api/auth/enrollment/complete",
    payload: {
      totp: generateTotp(body.manualSecret, now)
    }
  });

  expect(start.statusCode).toBe(200);
  expect(complete.statusCode).toBe(204);

  return {
    cookie: sessionCookie(complete),
    secret: body.manualSecret
  };
}

async function accessEvents(app: FastifyInstance, cookie: string) {
  const response = await app.inject({
    method: "GET",
    url: "/api/admin/history/access",
    headers: {
      cookie
    }
  });

  expect(response.statusCode).toBe(200);
  return response.json<{ events: Array<Record<string, unknown>> }>().events;
}

describe("auth routes", () => {
  it("generates TOTP codes with otplib epoch seconds", () => {
    const secret = "JYGSUSLDHDAYZHD4D4JHVYXFWL3H5K7V";
    const expected = generateOtplibTotp({
      secret,
      digits: 6,
      epoch: Math.floor(NOW.getTime() / 1000),
      period: 30
    });

    expect(generateTotp(secret, NOW)).toBe(expected);
  });

  it("wires TOTP-only enrollment and login through the production buildServer path", async () => {
    server = buildServer({
      cookieSecure: false,
      dataKey: DATA_KEY,
      dbPath: ":memory:",
      host: "127.0.0.1",
      localAuthBypass: false,
      nodeEnv: "test",
      operatorName: OPERATOR_NAME,
      port: 7317,
      sessionSecret: SESSION_SECRET,
      sessionTtlSeconds: 60,
      staticDir: "./public"
    });

    const authNow = new Date();
    const { cookie, secret } = await enroll(server, authNow);

    const me = await server.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        cookie
      }
    });
    const login = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        totp: generateTotp(secret, authNow)
      }
    });

    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({
      authenticated: true,
      operator: OPERATOR_NAME
    });
    expect(login.statusCode).toBe(204);
  });

  it("starts first-run enrollment when no TOTP enrollment exists", async () => {
    const app = await buildAuthTestServer();

    const state = await app.inject({
      method: "GET",
      url: "/api/auth/state"
    });
    const start = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/start"
    });
    const body = start.json() as {
      otpauthUrl: string;
      qrPayload: string;
      manualSecret: string;
    };

    expect(state.statusCode).toBe(200);
    expect(state.json()).toEqual({
      enrolled: false,
      authenticated: false
    });
    expect(start.statusCode).toBe(200);
    expect(body.manualSecret).toMatch(/^[A-Z2-7]+$/);
    expect(body.otpauthUrl).toContain("otpauth://totp/");
    expect(body.otpauthUrl).toContain(encodeURIComponent(OPERATOR_NAME));
    expect(body.qrPayload).toBe(body.otpauthUrl);
  });

  it("completes enrollment only with a valid TOTP and stores the secret encrypted", async () => {
    const dbPath = path.join(os.tmpdir(), `passport-auth-${cryptoRandomSuffix()}.sqlite`);
    db = createPassportDb({ path: dbPath });
    const app = await buildAuthTestServer({ db });

    const start = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/start"
    });
    const secret = (start.json() as { manualSecret: string }).manualSecret;
    const bad = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/complete",
      payload: {
        totp: "000000"
      }
    });
    const complete = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/complete",
      payload: {
        totp: generateTotp(secret, NOW)
      }
    });
    const afterEnrollmentStart = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/start"
    });

    db.close();
    db = undefined;
    const rawDb = new Database(dbPath, { readonly: true });
    const enrollment = rawDb
      .prepare(
        `select totp_secret_encrypted, totp_secret_nonce, totp_secret_tag
         from auth_enrollment
         where id = 1`
      )
      .get() as Record<string, string>;
    rawDb.close();
    const dbBytes = fs.readFileSync(dbPath);
    fs.rmSync(dbPath, { force: true });

    expect(bad.statusCode).toBe(401);
    expect(complete.statusCode).toBe(204);
    expect(complete.headers["set-cookie"]).toContain("HttpOnly");
    expect(afterEnrollmentStart.statusCode).toBe(409);
    expect(enrollment.totp_secret_encrypted).not.toBe(secret);
    expect(enrollment.totp_secret_nonce).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(enrollment.totp_secret_tag).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(dbBytes.includes(Buffer.from(secret, "utf8"))).toBe(false);
  });

  it("logs in with only TOTP and rejects username or password payloads", async () => {
    const app = await buildAuthTestServer();
    const { secret } = await enroll(app);

    const withPassword = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        password: "unused",
        totp: generateTotp(secret, NOW)
      }
    });
    const withUsername = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "admin",
        totp: generateTotp(secret, NOW)
      }
    });
    const invalidTotp = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        totp: "000000"
      }
    });
    const valid = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        totp: generateTotp(secret, NOW)
      }
    });

    expect(withPassword.statusCode).toBe(400);
    expect(withUsername.statusCode).toBe(400);
    expect(invalidTotp.statusCode).toBe(401);
    expect(invalidTotp.json()).toEqual({ error: "authentication_failed" });
    expect(valid.statusCode).toBe(204);
  });

  it("records sanitized access history for enrollment, login, logout, reset, and emergency reset", async () => {
    const dbPath = path.join(os.tmpdir(), `passport-history-${cryptoRandomSuffix()}.sqlite`);
    db = createPassportDb({ path: dbPath });
    const app = await buildAuthTestServer({ db });

    const start = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/start",
      headers: {
        "user-agent": "raw browser value",
        cookie: "passport_session=secret-session-cookie"
      },
      remoteAddress: "203.0.113.10"
    });
    const secret = (start.json() as { manualSecret: string }).manualSecret;
    const complete = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/complete",
      headers: {
        "user-agent": "raw browser value"
      },
      remoteAddress: "203.0.113.10",
      payload: {
        totp: generateTotp(secret, NOW)
      }
    });
    const cookie = sessionCookie(complete);

    await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: "203.0.113.11",
      payload: {
        totp: "000000"
      }
    });
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: "203.0.113.12",
      payload: {
        totp: generateTotp(secret, NOW)
      }
    });
    const loginCookie = sessionCookie(login);
    await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: {
        cookie: loginCookie
      },
      remoteAddress: "203.0.113.13"
    });
    await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/reset",
      headers: {
        cookie
      },
      remoteAddress: "203.0.113.14",
      payload: {
        confirm: "reset-totp-enrollment"
      }
    });

    db.close();
    db = undefined;
    const emergency = emergencyResetTotp({
      dbPath,
      now: NOW
    });
    db = createPassportDb({ path: dbPath });
    const inspectionApp = await buildAuthTestServer({ db });
    const { cookie: inspectionCookie } = await enroll(inspectionApp);
    const events = await accessEvents(inspectionApp, inspectionCookie);
    fs.rmSync(dbPath, { force: true });

    expect(emergency.message).not.toContain(secret);
    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        "totp_enrollment_started",
        "totp_enrollment_succeeded",
        "totp_login_failed",
        "totp_login_succeeded",
        "logout",
        "totp_reset_succeeded",
        "totp_emergency_reset_succeeded"
      ])
    );
    expect(events.find((event) => event.sourceIp === "203.0.113.10")).toBeTruthy();
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("000000");
    expect(serialized).not.toContain("raw browser value");
    expect(serialized).not.toContain("secret-session-cookie");
  });

  it("requires auth for history APIs and returns the newest 50 retained rows by default", async () => {
    const app = await buildAuthTestServer();
    const unauthenticatedAccess = await app.inject({
      method: "GET",
      url: "/api/admin/history/access"
    });
    const unauthenticatedWorkspace = await app.inject({
      method: "GET",
      url: "/api/admin/history/workspace"
    });
    const { cookie } = await enroll(app);

    for (let index = 0; index < 3005; index += 1) {
      db!.recordAccessEvent({
        eventType: "totp_login_failed",
        outcome: "failure",
        occurredAt: new Date(NOW.getTime() + (index + 1) * 1000),
        sourceIp: `192.0.2.${index % 255}`,
        userAgentHash: null,
        details: {
          sequence: index
        }
      });
      db!.recordWorkspaceEvent({
        eventType: "workspace_opened",
        occurredAt: new Date(NOW.getTime() + (index + 1) * 1000),
        sourceIp: `198.51.100.${index % 255}`,
        details: {
          sequence: index
        }
      });
    }

    const access = await app.inject({
      method: "GET",
      url: "/api/admin/history/access",
      headers: { cookie }
    });
    const workspace = await app.inject({
      method: "GET",
      url: "/api/admin/history/workspace",
      headers: { cookie }
    });

    expect(unauthenticatedAccess.statusCode).toBe(401);
    expect(unauthenticatedWorkspace.statusCode).toBe(401);
    expect(db!.listAccessEvents(4000)).toHaveLength(3000);
    expect(db!.listWorkspaceEvents(4000)).toHaveLength(3000);
    expect(access.json().events).toHaveLength(50);
    expect(workspace.json().events).toHaveLength(50);
    expect(access.json().events[0].details.sequence).toBe(3004);
    expect(workspace.json().events[0].details.sequence).toBe(3004);
    expect(JSON.stringify(access.json().events)).not.toContain("sequence\":0");
    expect(JSON.stringify(workspace.json().events)).not.toContain("sequence\":0");
  });

  it("records local auth bypass access without cookies", async () => {
    const app = await buildAuthTestServer({ localAuthBypass: true });

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      remoteAddress: "127.0.0.1"
    });
    const history = await app.inject({
      method: "GET",
      url: "/api/admin/history/access"
    });

    expect(me.statusCode).toBe(200);
    expect(history.statusCode).toBe(200);
    expect(history.json().events).toEqual([
      expect.objectContaining({
        eventType: "local_auth_bypass_access",
        outcome: "success",
        sourceIp: "127.0.0.1"
      })
    ]);
  });

  it("rejects missing, expired, and revoked sessions", async () => {
    const app = await buildAuthTestServer({
      sessionTtlSeconds: 1
    });

    const missing = await app.inject({
      method: "GET",
      url: "/api/auth/me"
    });

    const { cookie: expiredCookie, secret } = await enroll(app);

    await server?.close();
    server = undefined;
    const expiredApp = await buildAuthTestServer({
      db,
      now: new Date("2026-05-04T00:00:02.000Z"),
      sessionTtlSeconds: 1
    });
    const expired = await expiredApp.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        cookie: expiredCookie
      }
    });

    const activeLogin = await expiredApp.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        totp: generateTotp(secret, new Date("2026-05-04T00:00:02.000Z"))
      }
    });
    const activeCookie = sessionCookie(activeLogin);
    const logout = await expiredApp.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: {
        cookie: activeCookie
      }
    });
    const revoked = await expiredApp.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        cookie: activeCookie
      }
    });

    expect(missing.statusCode).toBe(401);
    expect(expired.statusCode).toBe(401);
    expect(logout.statusCode).toBe(204);
    expect(revoked.statusCode).toBe(401);
  });

  it("authenticates reset, clears enrollment, and revokes existing sessions", async () => {
    const app = await buildAuthTestServer();
    const { cookie } = await enroll(app);

    const unauthenticated = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/reset",
      payload: {
        confirm: "reset-totp-enrollment"
      }
    });
    const wrongConfirmation = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/reset",
      headers: {
        cookie
      },
      payload: {
        confirm: "reset"
      }
    });
    const reset = await app.inject({
      method: "POST",
      url: "/api/auth/enrollment/reset",
      headers: {
        cookie
      },
      payload: {
        confirm: "reset-totp-enrollment"
      }
    });
    const revoked = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        cookie
      }
    });
    const state = await app.inject({
      method: "GET",
      url: "/api/auth/state"
    });

    expect(unauthenticated.statusCode).toBe(401);
    expect(wrongConfirmation.statusCode).toBe(400);
    expect(reset.statusCode).toBe(204);
    expect(revoked.statusCode).toBe(401);
    expect(state.json()).toEqual({
      enrolled: false,
      authenticated: false
    });
  });

  it("supports local emergency reset without printing or decrypting the TOTP secret", async () => {
    const dbPath = path.join(os.tmpdir(), `passport-reset-${cryptoRandomSuffix()}.sqlite`);
    server = buildServer({
      cookieSecure: false,
      dataKey: DATA_KEY,
      dbPath,
      host: "127.0.0.1",
      localAuthBypass: false,
      nodeEnv: "test",
      operatorName: OPERATOR_NAME,
      port: 7317,
      sessionSecret: SESSION_SECRET,
      sessionTtlSeconds: 60,
      staticDir: "./public"
    });
    const authNow = new Date();
    const { cookie, secret } = await enroll(server, authNow);

    await server.close();
    server = undefined;

    const result = emergencyResetTotp({
      dbPath,
      now: NOW
    });

    server = buildServer({
      cookieSecure: false,
      dataKey: DATA_KEY,
      dbPath,
      host: "127.0.0.1",
      localAuthBypass: false,
      nodeEnv: "test",
      operatorName: OPERATOR_NAME,
      port: 7317,
      sessionSecret: SESSION_SECRET,
      sessionTtlSeconds: 60,
      staticDir: "./public"
    });
    const state = await server.inject({
      method: "GET",
      url: "/api/auth/state"
    });
    const revoked = await server.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        cookie
      }
    });
    fs.rmSync(dbPath, { force: true });

    expect(result.message).not.toContain(secret);
    expect(result.sessionsRevoked).toBeGreaterThan(0);
    expect(state.json()).toEqual({
      enrolled: false,
      authenticated: false
    });
    expect(revoked.statusCode).toBe(401);
  });
});

function cryptoRandomSuffix(): string {
  return Math.random().toString(16).slice(2);
}
