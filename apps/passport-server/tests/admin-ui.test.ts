import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";
import { hashPassword } from "../src/auth/password";
import { generateTotp } from "../src/auth/totp";

const ADMIN_USER = "admin";
const PASSWORD = "correct horse battery staple";
const TOTP_SECRET = "JYGSUSLDHDAYZHD4D4JHVYXFWL3H5K7V";
const SESSION_SECRET = "test-session-secret-with-enough-entropy";

let server: FastifyInstance | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function buildUiTestServer(): Promise<void> {
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
    staticDir: "./public",
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

function encodeOffer(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function fixtureOffer(): string {
  return `https://app.paseo.sh/#offer=${encodeOffer({
    v: 2,
    serverId: "srv_admin_ui",
    daemonPublicKeyB64: "daemon-key-admin-ui",
    relay: {
      endpoint: "relay.paseo.sh:443"
    }
  })}`;
}

describe("admin UI", () => {
  it("serves the login page", async () => {
    await buildUiTestServer();

    const response = await server!.inject({
      method: "GET",
      url: "/login"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Paseo Passport");
  });

  it("redirects unauthenticated machine page requests to login", async () => {
    await buildUiTestServer();

    const response = await server!.inject({
      method: "GET",
      url: "/admin/machines"
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/login");
  });

  it("serves the machine import UI to authenticated sessions", async () => {
    await buildUiTestServer();
    const cookie = await loginCookie();

    const response = await server!.inject({
      method: "GET",
      url: "/admin/machines",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("Import Offer");
    expect(response.body).toContain("Open Workspace");
    expect(response.body).toContain('href="/"');
    expect(response.body).toContain("/api/admin/machines/import-offer");
    expect(response.body).not.toContain("offer=");
  });

  it("supports the browser machine import, list, and delete workflow without exposing raw offers", async () => {
    await buildUiTestServer();
    const cookie = await loginCookie();
    const rawOffer = fixtureOffer();

    const page = await server!.inject({
      method: "GET",
      url: "/admin/machines",
      headers: { cookie }
    });
    const imported = await server!.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      headers: { cookie },
      payload: {
        label: "Admin UI machine",
        offerUrl: rawOffer
      }
    });
    const listed = await server!.inject({
      method: "GET",
      url: "/api/admin/machines",
      headers: { cookie }
    });
    const machineId = listed.json().machines[0]?.id;
    const deleted = await server!.inject({
      method: "DELETE",
      url: `/api/admin/machines/${machineId}`,
      headers: { cookie }
    });
    const afterDelete = await server!.inject({
      method: "GET",
      url: "/api/admin/machines",
      headers: { cookie }
    });

    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('href="/"');
    expect(page.body).toContain("/api/admin/machines/import-offer");
    expect(page.body).toContain("/api/admin/machines");
    expect(page.body).toContain("method: \"DELETE\"");
    expect(page.body).toContain("/api/auth/logout");
    expect(page.body).not.toContain(rawOffer);
    expect(page.body).not.toContain("srv_admin_ui");
    expect(imported.statusCode).toBe(201);
    expect(imported.body).not.toContain(rawOffer);
    expect(imported.body).not.toContain("offer=");
    expect(listed.json().machines).toHaveLength(1);
    expect(listed.json().machines[0]).toMatchObject({
      label: "Admin UI machine",
      serverId: "srv_admin_ui",
      relayEndpoint: "relay.paseo.sh:443"
    });
    expect(listed.body).not.toContain(rawOffer);
    expect(listed.body).not.toContain("offer=");
    expect(deleted.statusCode).toBe(204);
    expect(afterDelete.json().machines).toEqual([]);
  });
});
