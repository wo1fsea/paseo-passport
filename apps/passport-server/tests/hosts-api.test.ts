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

function encodeOffer(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

async function buildAuthenticatedServer(): Promise<{ cookie: string }> {
  const passwordHash = await hashPassword(PASSWORD);
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
  const setCookie = login.headers["set-cookie"];
  const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];

  if (!cookie) {
    throw new Error("Expected login cookie.");
  }

  return { cookie };
}

describe("GET /api/passport/hosts", () => {
  it("requires auth", async () => {
    const passwordHash = await hashPassword(PASSWORD);
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

    const response = await server.inject({
      method: "GET",
      url: "/api/passport/hosts"
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns an empty host profile array for an empty registry", async () => {
    const { cookie } = await buildAuthenticatedServer();

    const response = await server!.inject({
      method: "GET",
      url: "/api/passport/hosts",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("returns active machines as upstream-shaped HostProfile objects", async () => {
    const { cookie } = await buildAuthenticatedServer();
    const offerUrl = `https://app.paseo.sh/#offer=${encodeOffer({
      v: 2,
      serverId: "srv_profile",
      daemonPublicKeyB64: "daemon-key-fixture",
      relay: {
        endpoint: "relay.paseo.sh:443"
      }
    })}`;

    await server!.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      headers: { cookie },
      payload: {
        label: "Workspace machine",
        offerUrl
      }
    });
    const response = await server!.inject({
      method: "GET",
      url: "/api/passport/hosts",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("offer=");
    expect(response.json()).toEqual([
      {
        serverId: "srv_profile",
        label: "Workspace machine",
        lifecycle: {},
        connections: [
          {
            id: "relay:relay.paseo.sh:443",
            type: "relay",
            relayEndpoint: "relay.paseo.sh:443",
            daemonPublicKeyB64: "daemon-key-fixture"
          }
        ],
        preferredConnectionId: "relay:relay.paseo.sh:443",
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    ]);
  });

  it("excludes deleted machines and server-side secret fields from host profiles", async () => {
    const { cookie } = await buildAuthenticatedServer();
    const keptOfferUrl = `https://app.paseo.sh/#offer=${encodeOffer({
      v: 2,
      serverId: "srv_kept",
      daemonPublicKeyB64: "kept-daemon-public-key",
      relay: {
        endpoint: "relay-kept.paseo.sh:443"
      }
    })}`;
    const deletedOfferUrl = `https://app.paseo.sh/#offer=${encodeOffer({
      v: 2,
      serverId: "srv_deleted",
      daemonPublicKeyB64: "deleted-daemon-public-key",
      relay: {
        endpoint: "relay-deleted.paseo.sh:443"
      }
    })}`;

    await server!.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      headers: { cookie },
      payload: {
        label: "Kept machine",
        offerUrl: keptOfferUrl
      }
    });
    const deletedImport = await server!.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      headers: { cookie },
      payload: {
        label: "Deleted machine",
        offerUrl: deletedOfferUrl
      }
    });
    const deletedMachineId = deletedImport.json<{ machine: { id: string } }>().machine.id;

    await server!.inject({
      method: "DELETE",
      url: `/api/admin/machines/${deletedMachineId}`,
      headers: { cookie }
    });
    const response = await server!.inject({
      method: "GET",
      url: "/api/passport/hosts",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    const body = response.body;
    expect(body).not.toContain("srv_deleted");
    expect(body).not.toContain("relay-deleted.paseo.sh:443");
    expect(body).not.toContain("deleted-daemon-public-key");
    expect(body).not.toContain("offer=");
    expect(body).not.toContain(PASSWORD);
    expect(body).not.toContain(TOTP_SECRET);
    expect(body).not.toContain(SESSION_SECRET);
    expect(response.json()).toEqual([
      {
        serverId: "srv_kept",
        label: "Kept machine",
        lifecycle: {},
        connections: [
          {
            id: "relay:relay-kept.paseo.sh:443",
            type: "relay",
            relayEndpoint: "relay-kept.paseo.sh:443",
            daemonPublicKeyB64: "kept-daemon-public-key"
          }
        ],
        preferredConnectionId: "relay:relay-kept.paseo.sh:443",
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    ]);
  });
});
