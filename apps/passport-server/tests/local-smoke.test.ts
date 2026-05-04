import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";
import { hashPassword } from "../src/auth/password";
import { generateTotp } from "../src/auth/totp";

const ADMIN_USER = "admin";
const PASSWORD = "correct horse battery staple";
const TOTP_SECRET = "JYGSUSLDHDAYZHD4D4JHVYXFWL3H5K7V";
const SESSION_SECRET = "test-session-secret-with-enough-entropy";
const STATIC_DIR = path.resolve(__dirname, "../public");

let server: FastifyInstance | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

function encodeOffer(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

describe("local MVP smoke", () => {
  it("logs in, imports a fixture machine, exposes hosts, and loads the workspace", async () => {
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
      staticDir: STATIC_DIR,
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
    const setCookie = login.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];
    const offerUrl = `https://app.paseo.sh/#offer=${encodeOffer({
      v: 2,
      serverId: "srv_smoke",
      daemonPublicKeyB64: "fixture-daemon-public-key",
      relay: {
        endpoint: "relay.paseo.sh:443"
      }
    })}`;

    expect(login.statusCode).toBe(204);
    expect(cookie).toBeTruthy();

    const imported = await server.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      headers: { cookie },
      payload: {
        label: "Smoke fixture",
        offerUrl
      }
    });
    const hosts = await server.inject({
      method: "GET",
      url: "/api/passport/hosts",
      headers: { cookie }
    });
    const machines = await server.inject({
      method: "GET",
      url: "/api/admin/machines",
      headers: { cookie }
    });
    const workspace = await server.inject({
      method: "GET",
      url: "/",
      headers: { cookie }
    });
    const workspaceHostLoader = await server.inject({
      method: "GET",
      url: "/passport-hosts.js",
      headers: { cookie }
    });

    expect(imported.statusCode).toBe(201);
    expect(machines.statusCode).toBe(200);
    expect(machines.json()).toMatchObject({
      machines: [
        {
          label: "Smoke fixture",
          serverId: "srv_smoke",
          relayEndpoint: "relay.paseo.sh:443"
        }
      ]
    });
    expect(hosts.statusCode).toBe(200);
    expect(hosts.body).not.toContain("offer=");
    expect(hosts.body).not.toContain(PASSWORD);
    expect(hosts.body).not.toContain(TOTP_SECRET);
    expect(hosts.body).not.toContain(SESSION_SECRET);
    expect(hosts.json()[0]).toMatchObject({
      serverId: "srv_smoke",
      label: "Smoke fixture",
      preferredConnectionId: "relay:relay.paseo.sh:443"
    });
    expect(workspace.statusCode).toBe(200);
    expect(workspace.body).toContain("Paseo Passport Workspace");
    expect(workspace.body).toContain("/passport-hosts.js");
    expect(workspaceHostLoader.statusCode).toBe(200);
    expect(workspaceHostLoader.body).toContain('fetch("/api/passport/hosts", { credentials: "include" })');
    expect(workspaceHostLoader.body).toContain("renderHosts");
  });
});
