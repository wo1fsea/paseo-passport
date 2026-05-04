import { afterEach, describe, expect, it } from "vitest";
import fastify, { type FastifyInstance } from "fastify";
import { generateSync as generateOtplibTotp } from "otplib";
import { createPassportDb, type PassportDatabase } from "../src/db";
import { buildServer } from "../src/index";
import { registerAuthRoutes } from "../src/auth/routes";
import { hashPassword } from "../src/auth/password";
import { generateTotp } from "../src/auth/totp";

const ADMIN_USER = "admin";
const PASSWORD = "correct horse battery staple";
const TOTP_SECRET = "JYGSUSLDHDAYZHD4D4JHVYXFWL3H5K7V";
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
  options: { now?: Date; sessionTtlSeconds?: number; db?: PassportDatabase } = {}
) {
  const passwordHash = await hashPassword(PASSWORD, {
    salt: Buffer.from("auth-test-salt")
  });
  db =
    options.db ??
    createPassportDb({
      path: ":memory:"
    });

  server = fastify({
    logger: false
  });

  await registerAuthRoutes(server, {
    adminUser: ADMIN_USER,
    cookieSecure: false,
    db,
    passwordHash,
    sessionSecret: SESSION_SECRET,
    sessionTtlSeconds: options.sessionTtlSeconds,
    totpSecret: TOTP_SECRET,
    now: () => options.now ?? NOW
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

describe("auth routes", () => {
  it("generates TOTP codes with otplib epoch seconds", () => {
    const expected = generateOtplibTotp({
      secret: TOTP_SECRET,
      digits: 6,
      epoch: Math.floor(NOW.getTime() / 1000),
      period: 30
    });

    expect(generateTotp(TOTP_SECRET, NOW)).toBe(expected);
  });

  it("wires auth routes through the production buildServer path", async () => {
    const passwordHash = await hashPassword(PASSWORD, {
      salt: Buffer.from("build-server-salt")
    });
    server = buildServer({
      adminUser: ADMIN_USER,
      cookieSecure: false,
      dbPath: ":memory:",
      host: "127.0.0.1",
      nodeEnv: "test",
      passwordHash,
      port: 7317,
      sessionSecret: SESSION_SECRET,
      sessionTtlSeconds: 60,
      staticDir: "./public",
      totpSecret: TOTP_SECRET
    });

    const login = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: ADMIN_USER,
        password: PASSWORD,
        totp: generateTotp(TOTP_SECRET)
      }
    });

    expect(login.statusCode).toBe(204);

    const me = await server.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        cookie: sessionCookie(login)
      }
    });

    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({
      authenticated: true,
      username: ADMIN_USER
    });
  });

  it("rejects bad password and bad totp with the same generic failure", async () => {
    const app = await buildAuthTestServer();
    const validTotp = generateTotp(TOTP_SECRET, NOW);

    const badPassword = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: ADMIN_USER,
        password: "wrong",
        totp: validTotp
      }
    });
    const badTotp = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: ADMIN_USER,
        password: PASSWORD,
        totp: "000000"
      }
    });

    expect(badPassword.statusCode).toBe(401);
    expect(badTotp.statusCode).toBe(401);
    expect(badPassword.json()).toEqual({ error: "authentication_failed" });
    expect(badTotp.json()).toEqual({ error: "authentication_failed" });
  });

  it("creates an HttpOnly session cookie and authenticates /me", async () => {
    const app = await buildAuthTestServer();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: ADMIN_USER,
        password: PASSWORD,
        totp: generateTotp(TOTP_SECRET, NOW)
      }
    });

    expect(login.statusCode).toBe(204);
    expect(login.headers["set-cookie"]).toContain("HttpOnly");
    expect(login.headers["set-cookie"]).toContain("SameSite=Lax");

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: {
        cookie: sessionCookie(login)
      }
    });

    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({
      authenticated: true,
      username: ADMIN_USER
    });
  });

  it("rejects missing, expired, and revoked sessions", async () => {
    const app = await buildAuthTestServer({
      sessionTtlSeconds: 1
    });

    const missing = await app.inject({
      method: "GET",
      url: "/api/auth/me"
    });

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: ADMIN_USER,
        password: PASSWORD,
        totp: generateTotp(TOTP_SECRET, NOW)
      }
    });
    const expiredCookie = sessionCookie(login);

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
        username: ADMIN_USER,
        password: PASSWORD,
        totp: generateTotp(TOTP_SECRET, new Date("2026-05-04T00:00:02.000Z"))
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
});
