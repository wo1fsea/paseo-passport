import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";
import { generateTotp } from "../src/auth/totp";

const OPERATOR_NAME = "operator";
const DATA_KEY = "0123456789abcdef0123456789abcdef";
const SESSION_SECRET = "test-session-secret-with-enough-entropy";
const repoRoot = path.resolve(__dirname, "..", "..", "..");

let server: FastifyInstance | undefined;
let staticDir: string;

beforeEach(() => {
  staticDir = fs.mkdtempSync(path.join(os.tmpdir(), "passport-static-"));
  fs.mkdirSync(path.join(staticDir, "_expo", "static", "js", "web"), {
    recursive: true
  });
  fs.writeFileSync(
    path.join(staticDir, "index.html"),
    '<!doctype html><html><head><title>Paseo</title></head><body><div id="root"></div><script src="/_expo/static/js/web/index-test.js" defer></script></body></html>'
  );
  fs.writeFileSync(path.join(staticDir, "_expo", "static", "js", "web", "index-test.js"), "window.__paseoApp = true;");
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
    staticDir
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

describe("workspace static serving", () => {
  it("builds the pinned upstream Paseo web app into Passport public output", () => {
    execFileSync("npm", ["run", "build:paseo-web"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 180_000
    });

    const publicDir = path.join(repoRoot, "apps", "passport-server", "public");
    const indexHtml = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");

    expect(indexHtml).toContain("<title>Paseo</title>");
    expect(indexHtml).toContain('id="root"');
    expect(indexHtml).not.toContain("Paseo Passport Workspace");
    expect(fs.existsSync(path.join(publicDir, "metadata.json"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "upstream-paseo-LICENSE.txt"))).toBe(true);
  }, 180_000);

  it("redirects unauthenticated root requests to login", async () => {
    await buildWorkspaceServer();

    const response = await server!.inject({
      method: "GET",
      url: "/"
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/login");
  });

  it("serves the upstream workspace and generated assets to authenticated sessions", async () => {
    await buildWorkspaceServer();
    const cookie = await loginCookie();

    const shell = await server!.inject({
      method: "GET",
      url: "/",
      headers: { cookie }
    });
    const asset = await server!.inject({
      method: "GET",
      url: "/_expo/static/js/web/index-test.js",
      headers: { cookie }
    });

    expect(shell.statusCode).toBe(200);
    expect(shell.body).toContain("<title>Paseo</title>");
    expect(asset.statusCode).toBe(200);
    expect(asset.body).toContain("__paseoApp");
  });

  it("records sanitized workspace-open history for authenticated workspace documents", async () => {
    await buildWorkspaceServer();
    const cookie = await loginCookie();

    const shell = await server!.inject({
      method: "GET",
      url: "/workspace/sessions/session-123",
      headers: {
        cookie,
        "user-agent": "raw workspace browser"
      },
      remoteAddress: "198.51.100.30"
    });
    const history = await server!.inject({
      method: "GET",
      url: "/api/admin/history/workspace",
      headers: { cookie }
    });

    expect(shell.statusCode).toBe(200);
    expect(history.statusCode).toBe(200);
    expect(history.json().events).toEqual([
      expect.objectContaining({
        eventType: "workspace_opened",
        sourceIp: "198.51.100.30"
      })
    ]);
    expect(history.body).not.toContain("raw workspace browser");
    expect(history.body).not.toContain(SESSION_SECRET);
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
    expect(response.body).toContain("<title>Paseo</title>");
  });

  it("returns not found for missing generated static assets", async () => {
    await buildWorkspaceServer();
    const cookie = await loginCookie();

    const response = await server!.inject({
      method: "GET",
      url: "/_expo/static/js/web/missing.js",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "not_found" });
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
