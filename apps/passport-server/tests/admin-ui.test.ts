import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";
import { generateTotp } from "../src/auth/totp";

const OPERATOR_NAME = "operator";
const DATA_KEY = "0123456789abcdef0123456789abcdef";
const SESSION_SECRET = "test-session-secret-with-enough-entropy";

let server: FastifyInstance | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function buildUiTestServer(): Promise<void> {
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
}

async function loginCookie(): Promise<string> {
  const start = await server!.inject({
    method: "POST",
    url: "/api/auth/enrollment/start"
  });
  const secret = start.json<{ manualSecret: string }>().manualSecret;
  const login = await server!.inject({
    method: "POST",
    url: "/api/auth/enrollment/complete",
    payload: {
      totp: generateTotp(secret)
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
    expect(response.body).toContain('data-surface="passport-auth"');
    expect(response.body).toContain("/api/auth/state");
    expect(response.body).toContain("/api/auth/enrollment/start");
    expect(response.body).toContain("/api/auth/enrollment/complete");
    expect(response.body).toContain("/api/auth/login");
    expect(response.body).toContain("manualSecret");
    expect(response.body).toContain("data.qrImageDataUrl");
    expect(response.body).not.toContain("renderQrMatrix");
    expect(response.body).not.toContain("reedSolomonRemainder");
    expect(response.body).not.toContain("QR_DATA_CODEWORDS");
    expect(response.body).toContain("--surface0: #181B1A");
    expect(response.body).toContain("--foreground: #fafafa");
    expect(response.body).toContain("--foreground-muted: #A1A5A4");
    expect(response.body).toContain("--border: #252B2A");
    expect(response.body).toContain("--border-accent: #2F3534");
    expect(response.body).toContain("--accent: #20744A");
    expect(response.body).toContain("--destructive: #c64f43");
    expect(response.body).toContain('class="primary"');
    expect(response.body).not.toContain("function renderQrPattern");
    expect(response.body).toContain("[hidden] { display: none !important; }");
    expect(response.body).toContain("calc(100vw - 2rem)");
    expect(response.body).toContain("17rem");
    expect(response.body).not.toContain("linear-gradient");
    expect(response.body).not.toContain("--amber");
    expect(response.body).not.toContain("text-transform: uppercase");
    expect(response.body).not.toContain('name="username"');
    expect(response.body).not.toContain('name="password"');
    expect(response.body).not.toContain("Username");
    expect(response.body).not.toContain("Password");
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
    expect(response.body).toContain('data-surface="passport-app"');
    expect(response.body).toContain("Import offer");
    expect(response.body).toContain("Open workspace");
    expect(response.body).toContain("History");
    expect(response.body).toContain("Reset TOTP enrollment");
    expect(response.body).toContain("reset-totp-enrollment");
    expect(response.body).toContain("/api/auth/enrollment/reset");
    expect(response.body).toContain('class="button outline" href="/"');
    expect(response.body).toContain('id="import-status"');
    expect(response.body).toContain('aria-live="polite"');
    expect(response.body).toContain('data-empty-label="No machines imported."');
    expect(response.body).toContain("refreshMachinesAfterImport");
    expect(response.body).toContain('setImportStatus("success"');
    expect(response.body).toContain("Imported ");
    expect(response.body).toContain("Active hosts refreshed.");
    expect(response.body).toContain("importButton.disabled = true");
    expect(response.body).toContain("importButton.textContent = \"Importing\"");
    expect(response.body).toContain('id="reset-confirmation" hidden');
    expect(response.body).toContain("resetConfirmation.hidden = false");
    expect(response.body).toContain('button.className = "small outline"');
    expect(response.body).not.toContain("danger-panel");
    expect(response.body).not.toContain("Machine control");
    expect(response.body).toContain('href="/"');
    expect(response.body).toContain("/api/admin/machines/import-offer");
    expect(response.body).not.toContain("offer=");
  });

  it("serves authenticated access and workspace history pages", async () => {
    await buildUiTestServer();
    const cookie = await loginCookie();

    const response = await server!.inject({
      method: "GET",
      url: "/admin/history",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain('data-surface="passport-app"');
    expect(response.body).toContain("Access history");
    expect(response.body).toContain("Workspace history");
    expect(response.body).toContain("/api/admin/history/access");
    expect(response.body).toContain("/api/admin/history/workspace");
    expect(response.body).toContain('class="button outline" href="/admin/machines"');
    expect(response.body).toContain('href="/admin/machines"');
    expect(response.body).toContain('href="/"');
  });

  it("redirects unauthenticated history page requests to login", async () => {
    await buildUiTestServer();

    const response = await server!.inject({
      method: "GET",
      url: "/admin/history"
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/login");
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
    expect(page.body).toContain('href="/admin/history"');
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
