import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";
import type { PassportConfig } from "../src/config";

const OPERATOR_NAME = "operator";
const DATA_KEY = "0123456789abcdef0123456789abcdef";
const SESSION_SECRET = "test-session-secret-with-enough-entropy";

let server: FastifyInstance | undefined;
let staticDir: string;

beforeEach(() => {
  staticDir = fs.mkdtempSync(path.join(os.tmpdir(), "passport-bypass-static-"));
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

function testConfig(overrides: Partial<PassportConfig> = {}): PassportConfig {
  return {
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
    staticDir,
    ...overrides
  };
}

describe("local auth bypass", () => {
  it("allows cookie-free access to protected routes when enabled on a loopback host", async () => {
    server = buildServer(testConfig({ localAuthBypass: true }));

    const me = await server.inject({
      method: "GET",
      url: "/api/auth/me"
    });
    const hosts = await server.inject({
      method: "GET",
      url: "/api/passport/hosts"
    });
    const admin = await server.inject({
      method: "GET",
      url: "/admin/machines"
    });
    const workspace = await server.inject({
      method: "GET",
      url: "/"
    });

    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({
      authenticated: true,
      operator: OPERATOR_NAME
    });
    expect(hosts.statusCode).toBe(200);
    expect(hosts.json()).toEqual([]);
    expect(admin.statusCode).toBe(200);
    expect(admin.body).toContain("Import offer");
    expect(admin.body).toContain("Open workspace");
    expect(workspace.statusCode).toBe(200);
    expect(workspace.body).toContain("Paseo Passport Workspace");
  });

  it("keeps protected routes locked without cookies when disabled", async () => {
    server = buildServer(testConfig({ localAuthBypass: false }));

    const me = await server.inject({
      method: "GET",
      url: "/api/auth/me"
    });
    const hosts = await server.inject({
      method: "GET",
      url: "/api/passport/hosts"
    });
    const admin = await server.inject({
      method: "GET",
      url: "/admin/machines"
    });
    const workspace = await server.inject({
      method: "GET",
      url: "/"
    });

    expect(me.statusCode).toBe(401);
    expect(hosts.statusCode).toBe(401);
    expect(admin.statusCode).toBe(302);
    expect(admin.headers.location).toBe("/login");
    expect(workspace.statusCode).toBe(302);
    expect(workspace.headers.location).toBe("/login");
  });

  it("fails closed before building the service when bypass is enabled on a non-local host", async () => {
    const config = testConfig({
      host: "0.0.0.0",
      localAuthBypass: true
    });

    expect(() => buildServer(config)).toThrow(/PASSPORT_LOCAL_AUTH_BYPASS/);
  });
});
