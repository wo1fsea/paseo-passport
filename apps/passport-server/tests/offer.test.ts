import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";
import { generateTotp } from "../src/auth/totp";
import { parseRelayOffer } from "../src/machines/offer";

const OPERATOR_NAME = "operator";
const DATA_KEY = "0123456789abcdef0123456789abcdef";
const SESSION_SECRET = "test-session-secret-with-enough-entropy";

let server: FastifyInstance | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

function encodeOffer(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function fixtureOffer(serverId = "srv_fixture"): string {
  return `https://app.paseo.sh/#offer=${encodeOffer({
    v: 2,
    serverId,
    daemonPublicKeyB64: "daemon-key-fixture",
    relay: {
      endpoint: "relay.paseo.sh:443"
    }
  })}`;
}

function sessionCookie(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers["set-cookie"];
  const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0];

  if (!cookie) {
    throw new Error("Expected login cookie.");
  }

  return cookie;
}

async function buildAuthenticatedServer(): Promise<{ cookie: string }> {
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

  const start = await server.inject({
    method: "POST",
    url: "/api/auth/enrollment/start"
  });
  const secret = (start.json() as { manualSecret: string }).manualSecret;
  const complete = await server.inject({
    method: "POST",
    url: "/api/auth/enrollment/complete",
    payload: {
      totp: generateTotp(secret)
    }
  });

  expect(start.statusCode).toBe(200);
  expect(complete.statusCode).toBe(204);

  const login = await server.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      totp: generateTotp(secret)
    }
  });

  expect(login.statusCode).toBe(204);

  return { cookie: sessionCookie(login) };
}

describe("relay offer parsing", () => {
  it("parses the confirmed Paseo relay offer fragment", () => {
    expect(parseRelayOffer(fixtureOffer())).toEqual({
      serverId: "srv_fixture",
      daemonPublicKeyB64: "daemon-key-fixture",
      relayEndpoint: "relay.paseo.sh:443"
    });
  });

  it("parses a raw offer hash fragment using the confirmed upstream v2 shape", () => {
    const fragment = `#offer=${encodeOffer({
      v: 2,
      serverId: "srv_raw_fragment",
      daemonPublicKeyB64: "daemon-key-from-fragment",
      relay: {
        endpoint: "relay.paseo.sh:443"
      }
    })}`;

    expect(parseRelayOffer(fragment)).toEqual({
      serverId: "srv_raw_fragment",
      daemonPublicKeyB64: "daemon-key-from-fragment",
      relayEndpoint: "relay.paseo.sh:443"
    });
  });

  it("rejects malformed, unsupported, and non-relay offers", () => {
    expect(() => parseRelayOffer("not-an-offer")).toThrow();
    expect(() =>
      parseRelayOffer(`#offer=${encodeOffer({ v: 1, serverId: "old" })}`)
    ).toThrow();
    expect(() =>
      parseRelayOffer(`#offer=${encodeOffer({ v: 2, serverId: "srv", daemonPublicKeyB64: "key" })}`)
    ).toThrow();
  });
});

describe("machine registry API", () => {
  it("requires auth for admin machine routes", async () => {
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

    const response = await server.inject({
      method: "GET",
      url: "/api/admin/machines"
    });
    const importResponse = await server.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      payload: {
        label: "Development machine",
        offerUrl: fixtureOffer()
      }
    });
    const deleteResponse = await server.inject({
      method: "DELETE",
      url: "/api/admin/machines/machine-id"
    });

    expect(response.statusCode).toBe(401);
    expect(importResponse.statusCode).toBe(401);
    expect(deleteResponse.statusCode).toBe(401);
  });

  it("imports, updates, lists, and deletes a machine without exposing raw offers", async () => {
    const { cookie } = await buildAuthenticatedServer();
    const rawOffer = fixtureOffer("srv_fixture");

    const created = await server!.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      headers: { cookie },
      payload: {
        label: "Development machine",
        offerUrl: rawOffer
      }
    });
    const updated = await server!.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      headers: { cookie },
      payload: {
        label: "Renamed machine",
        offerUrl: rawOffer
      }
    });
    const listed = await server!.inject({
      method: "GET",
      url: "/api/admin/machines",
      headers: { cookie }
    });

    expect(created.statusCode).toBe(201);
    expect(updated.statusCode).toBe(201);
    expect(listed.statusCode).toBe(200);
    expect(created.body).not.toContain(rawOffer);
    expect(created.body).not.toContain("offer=");
    expect(updated.body).not.toContain(rawOffer);
    expect(updated.body).not.toContain("offer=");
    expect(listed.body).not.toContain("offer=");
    expect(listed.json().machines).toHaveLength(1);
    expect(listed.json().machines[0]).toMatchObject({
      label: "Renamed machine",
      serverId: "srv_fixture",
      relayEndpoint: "relay.paseo.sh:443",
      daemonPublicKeyB64: "daemon-key-fixture"
    });

    const deleted = await server!.inject({
      method: "DELETE",
      url: `/api/admin/machines/${listed.json().machines[0].id}`,
      headers: { cookie }
    });
    const afterDelete = await server!.inject({
      method: "GET",
      url: "/api/admin/machines",
      headers: { cookie }
    });

    expect(deleted.statusCode).toBe(204);
    expect(afterDelete.json().machines).toEqual([]);
  });

  it("rejects malformed imports", async () => {
    const { cookie } = await buildAuthenticatedServer();

    const response = await server!.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      headers: { cookie },
      payload: {
        label: "Broken machine",
        offerUrl: "#offer=not-json"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid_offer" });
  });
});
