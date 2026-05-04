import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";
import { hashPassword } from "../src/auth/password";
import { generateTotp } from "../src/auth/totp";

const ADMIN_USER = "admin";
const PASSWORD = "correct horse battery staple";
const TOTP_SECRET = "JYGSUSLDHDAYZHD4D4JHVYXFWL3H5K7V";
const SESSION_SECRET = "test-session-secret-with-enough-entropy";

let server: FastifyInstance | undefined;
let staticDir: string;

beforeEach(() => {
  staticDir = fs.mkdtempSync(path.join(os.tmpdir(), "passport-static-"));
  fs.writeFileSync(path.join(staticDir, "index.html"), "<h1>Paseo Passport Workspace</h1>");
  fs.writeFileSync(path.join(staticDir, "passport-hosts.js"), "window.__passportHosts = true;");
});

afterEach(async () => {
  await server?.close();
  fs.rmSync(staticDir, {
    recursive: true,
    force: true
  });
  server = undefined;
});

async function buildWorkspaceServer(): Promise<void> {
  server = buildServer({
    adminUser: ADMIN_USER,
    cookieSecure: false,
    dbPath: ":memory:",
    host: "127.0.0.1",
    nodeEnv: "test",
    passwordHash: await hashPassword(PASSWORD),
    port: 7317,
    sessionSecret: SESSION_SECRET,
    sessionTtlSeconds: 60,
    staticDir,
    totpSecret: TOTP_SECRET
  });
}

async function loginCookie(): Promise<string> {
  const login = await server!.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      username: ADMIN_USER,
      password: PASSWORD,
      totp: generateTotp(TOTP_SECRET)
    }
  });
  const setCookie = login.headers["set-cookie"];
  const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];

  if (!cookie) {
    throw new Error("Expected login cookie.");
  }

  return cookie;
}

describe("workspace static serving", () => {
  it("redirects unauthenticated root requests to login", async () => {
    await buildWorkspaceServer();

    const response = await server!.inject({
      method: "GET",
      url: "/"
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/login");
  });

  it("serves the workspace and assets to authenticated sessions", async () => {
    await buildWorkspaceServer();
    const cookie = await loginCookie();

    const shell = await server!.inject({
      method: "GET",
      url: "/",
      headers: { cookie }
    });
    const asset = await server!.inject({
      method: "GET",
      url: "/passport-hosts.js",
      headers: { cookie }
    });

    expect(shell.statusCode).toBe(200);
    expect(shell.body).toContain("Paseo Passport Workspace");
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toContain("__passportHosts");
  });

  it("requires authentication for non-API workspace fallback paths", async () => {
    await buildWorkspaceServer();

    const response = await server!.inject({
      method: "GET",
      url: "/workspace/sessions/session-123"
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/login");
  });

  it("falls back to the workspace shell for authenticated non-API paths", async () => {
    await buildWorkspaceServer();
    const cookie = await loginCookie();

    const response = await server!.inject({
      method: "GET",
      url: "/workspace/sessions/session-123",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Paseo Passport Workspace");
  });

  it("does not swallow API routes", async () => {
    await buildWorkspaceServer();

    const response = await server!.inject({
      method: "GET",
      url: "/api/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
