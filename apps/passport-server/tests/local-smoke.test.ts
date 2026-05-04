import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";
import { generateTotp } from "../src/auth/totp";

const OPERATOR_NAME = "operator";
const DATA_KEY = "0123456789abcdef0123456789abcdef";
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

function sessionCookie(response: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const header = response.headers["set-cookie"];
  const cookie = (Array.isArray(header) ? header[0] : header)?.split(";")[0];

  if (!cookie) {
    throw new Error("Expected Set-Cookie header.");
  }

  return cookie;
}

async function startEnrollment(): Promise<string> {
  const start = await server!.inject({
    method: "POST",
    url: "/api/auth/enrollment/start"
  });
  const body = start.json<{
    manualSecret: string;
    otpauthUrl: string;
    qrImageDataUrl: string;
    qrPayload: string;
  }>();

  expect(start.statusCode).toBe(200);
  expect(body.manualSecret).toMatch(/^[A-Z2-7]+$/);
  expect(body.otpauthUrl).toContain("otpauth://totp/");
  expect(body.qrPayload).toBe(body.otpauthUrl);
  expect(body.qrImageDataUrl).toMatch(/^data:image\/png;base64,/);

  return body.manualSecret;
}

async function completeEnrollment(secret: string): Promise<string> {
  const complete = await server!.inject({
    method: "POST",
    url: "/api/auth/enrollment/complete",
    payload: {
      totp: generateTotp(secret)
    }
  });

  expect(complete.statusCode).toBe(204);
  return sessionCookie(complete);
}

async function login(secret: string): Promise<string> {
  const response = await server!.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      totp: generateTotp(secret)
    }
  });

  expect(response.statusCode).toBe(204);
  return sessionCookie(response);
}

function expectBodyToExcludeSecrets(body: string, secrets: string[]): void {
  for (const secret of secrets) {
    expect(body).not.toContain(secret);
  }
  expect(body).not.toContain("offer=");
  expect(body).not.toContain("otpauth://");
  expect(body).not.toContain("passport_session=");
  expect(body).not.toContain("pp_session=");
}

describe("local MVP smoke", () => {
  it("enrolls TOTP, logs in, exposes fixture hosts, serves upstream Paseo, and records history", async () => {
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
      staticDir: STATIC_DIR
    });

    const initialState = await server.inject({
      method: "GET",
      url: "/api/auth/state"
    });
    const enrollmentPage = await server.inject({
      method: "GET",
      url: "/login"
    });

    expect(initialState.statusCode).toBe(200);
    expect(initialState.json()).toEqual({
      enrolled: false,
      authenticated: false
    });
    expect(enrollmentPage.statusCode).toBe(200);
    expect(enrollmentPage.body).toContain("enrollment-panel");
    expect(enrollmentPage.body).toContain("TOTP QR code");
    expect(enrollmentPage.body).toContain("/api/auth/enrollment/start");

    const secret = await startEnrollment();
    const enrollmentCookie = await completeEnrollment(secret);
    const postEnrollmentState = await server.inject({
      method: "GET",
      url: "/api/auth/state",
      headers: { cookie: enrollmentCookie }
    });
    const secondEnrollmentStart = await server.inject({
      method: "POST",
      url: "/api/auth/enrollment/start",
      headers: { cookie: enrollmentCookie }
    });

    expect(postEnrollmentState.statusCode).toBe(200);
    expect(postEnrollmentState.json()).toEqual({
      enrolled: true,
      authenticated: true
    });
    expect(secondEnrollmentStart.statusCode).toBe(409);

    const loggedInCookie = await login(secret);
    const passwordPayloadRejected = await server.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: OPERATOR_NAME,
        password: "not accepted",
        totp: generateTotp(secret)
      }
    });

    expect(passwordPayloadRejected.statusCode).toBe(400);

    const offerUrl = `https://app.paseo.sh/#offer=${encodeOffer({
      v: 2,
      serverId: "srv_smoke",
      daemonPublicKeyB64: "fixture-daemon-public-key",
      relay: {
        endpoint: "relay.paseo.sh:443"
      }
    })}`;
    const imported = await server.inject({
      method: "POST",
      url: "/api/admin/machines/import-offer",
      headers: { cookie: loggedInCookie },
      payload: {
        label: "Smoke fixture",
        offerUrl
      }
    });
    const hosts = await server.inject({
      method: "GET",
      url: "/api/passport/hosts",
      headers: { cookie: loggedInCookie }
    });
    const machines = await server.inject({
      method: "GET",
      url: "/api/admin/machines",
      headers: { cookie: loggedInCookie }
    });
    const workspace = await server.inject({
      method: "GET",
      url: "/",
      headers: { cookie: loggedInCookie }
    });
    expect(workspace.statusCode).toBe(200);
    expect(workspace.body).toContain("<title>Paseo</title>");
    expect(workspace.body).not.toContain("Paseo Passport Workspace");

    const workspaceScriptPath = workspace.body.match(
      /<script[^>]+src="(\/_expo\/static\/js\/web\/[^"]+\.js)"/
    )?.[1];
    expect(workspaceScriptPath).toBeTruthy();

    const workspaceAsset = await server.inject({
      method: "GET",
      url: workspaceScriptPath!,
      headers: { cookie: loggedInCookie }
    });
    const accessHistory = await server.inject({
      method: "GET",
      url: "/api/admin/history/access",
      headers: { cookie: loggedInCookie }
    });
    const workspaceHistory = await server.inject({
      method: "GET",
      url: "/api/admin/history/workspace",
      headers: { cookie: loggedInCookie }
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
    expectBodyToExcludeSecrets(hosts.body, [secret, SESSION_SECRET, offerUrl]);
    expect(hosts.json()[0]).toMatchObject({
      serverId: "srv_smoke",
      label: "Smoke fixture",
      preferredConnectionId: "relay:relay.paseo.sh:443"
    });
    expect(workspaceAsset.statusCode).toBe(200);
    expect(workspaceAsset.body).toContain("/api/passport/hosts");
    expect(workspaceAsset.body).toContain('credentials:"include"');

    expect(accessHistory.statusCode).toBe(200);
    expect(accessHistory.json().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: "totp_enrollment_started" }),
        expect.objectContaining({ eventType: "totp_enrollment_succeeded" }),
        expect.objectContaining({ eventType: "totp_login_succeeded" })
      ])
    );
    expectBodyToExcludeSecrets(accessHistory.body, [secret, SESSION_SECRET, offerUrl]);

    expect(workspaceHistory.statusCode).toBe(200);
    expect(workspaceHistory.json().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "workspace_opened"
        }),
        expect.objectContaining({
          eventType: "host_profile_loaded",
          details: {
            hostCount: 1
          }
        })
      ])
    );
    expectBodyToExcludeSecrets(workspaceHistory.body, [secret, SESSION_SECRET, offerUrl]);
  });
});
