import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAuthRoutes } from "../src/auth/routes";
import { generateTotp } from "../src/auth/totp";
import { loadConfig } from "../src/config";
import { createPassportDb, type PassportDatabase } from "../src/db";
import { registerDispatchDashboardRoutes } from "../src/dispatch-dashboard/routes";
import { createDispatchDashboardService } from "../src/dispatch-dashboard/service";

const OPERATOR_NAME = "operator";
const DATA_KEY = "0123456789abcdef0123456789abcdef";
const SESSION_SECRET = "test-session-secret-with-enough-entropy";

let server: FastifyInstance | undefined;
let db: PassportDatabase | undefined;
let tempDirs: string[] = [];

afterEach(async () => {
  await server?.close();
  db?.close();
  for (const directory of tempDirs) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  server = undefined;
  db = undefined;
  tempDirs = [];
});

async function buildAuthenticatedRoutes(
  service = createDispatchDashboardService({
    allowedRepoRoots: [],
    cliPath: "/missing/de.py"
  })
): Promise<{ cookie: string }> {
  db = createPassportDb({ path: ":memory:" });
  server = fastify({ logger: false });

  await registerAuthRoutes(server, {
    cookieSecure: false,
    dataKey: DATA_KEY,
    db,
    localAuthBypass: false,
    operatorName: OPERATOR_NAME,
    sessionSecret: SESSION_SECRET,
    sessionTtlSeconds: 60
  });
  await registerDispatchDashboardRoutes(server, {
    db,
    localAuthBypass: false,
    operatorName: OPERATOR_NAME,
    service,
    sessionSecret: SESSION_SECRET
  });

  const start = await server.inject({
    method: "POST",
    url: "/api/auth/enrollment/start"
  });
  const secret = start.json<{ manualSecret: string }>().manualSecret;
  const login = await server.inject({
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

  return { cookie };
}

function makeTempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "passport-dashboard-"));
  tempDirs.push(directory);
  return directory;
}

function makeRepo(root = makeTempDir()): string {
  const repo = path.join(root, "repo");
  fs.mkdirSync(path.join(repo, ".dispatch", "runs", "20260506T081555540696Z"), {
    recursive: true
  });
  return repo;
}

function makeCli(contents: string): string {
  const cliPath = path.join(makeTempDir(), "de.py");
  fs.writeFileSync(cliPath, contents, { mode: 0o755 });
  return cliPath;
}

describe("dispatch dashboard config", () => {
  it("parses allowlisted repo roots and Dispatch Engine CLI path", () => {
    const config = loadConfig({
      PASSPORT_DATA_KEY: DATA_KEY,
      PASSPORT_DASHBOARD_REPO_ROOTS: "/workspace/a,/workspace/b",
      PASSPORT_DISPATCH_ENGINE_CLI: "/tools/de.py",
      PASSPORT_SESSION_SECRET: SESSION_SECRET
    });

    expect(config.dispatchDashboardRepoRoots).toEqual(["/workspace/a", "/workspace/b"]);
    expect(config.dispatchEngineCliPath).toBe("/tools/de.py");
  });
});

describe("GET /api/dispatch/dashboard/current", () => {
  it("requires auth", async () => {
    await buildAuthenticatedRoutes();

    const response = await server!.inject({
      method: "GET",
      url: "/api/dispatch/dashboard/current?cwd=/repo"
    });

    expect(response.statusCode).toBe(401);
  });

  it("fails closed without exposing browser-provided paths when roots are not allowlisted", async () => {
    const { cookie } = await buildAuthenticatedRoutes();

    const response = await server!.inject({
      method: "GET",
      url: "/api/dispatch/dashboard/current?cwd=/secret/repo",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      available: false,
      reason: "unavailable"
    });
    expect(response.body).not.toContain("/secret/repo");
  });

  it("treats paths outside allowlisted roots as unavailable", async () => {
    const root = makeTempDir();
    const outside = makeTempDir();
    const service = createDispatchDashboardService({
      allowedRepoRoots: [root],
      cliPath: makeCli("print('should not be called')\n")
    });
    const { cookie } = await buildAuthenticatedRoutes(service);

    const response = await server!.inject({
      method: "GET",
      url: `/api/dispatch/dashboard/current?cwd=${encodeURIComponent(outside)}`,
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      available: false,
      reason: "unavailable"
    });
    expect(response.body).not.toContain(outside);
  });

  it("treats allowed repos without .dispatch as unavailable", async () => {
    const root = makeTempDir();
    const repo = path.join(root, "repo");
    fs.mkdirSync(repo, { recursive: true });
    const service = createDispatchDashboardService({
      allowedRepoRoots: [root],
      cliPath: makeCli("print('should not be called')\n")
    });
    const { cookie } = await buildAuthenticatedRoutes(service);

    const response = await server!.inject({
      method: "GET",
      url: `/api/dispatch/dashboard/current?cwd=${encodeURIComponent(repo)}`,
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      available: false,
      reason: "unavailable"
    });
  });

  it("treats malformed Dispatch Engine status JSON as unavailable", async () => {
    const root = makeTempDir();
    const repo = makeRepo(root);
    const service = createDispatchDashboardService({
      allowedRepoRoots: [root],
      cliPath: makeCli("print('not json')\n")
    });
    const { cookie } = await buildAuthenticatedRoutes(service);

    const response = await server!.inject({
      method: "GET",
      url: `/api/dispatch/dashboard/current?cwd=${encodeURIComponent(repo)}`,
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      available: false,
      reason: "unavailable"
    });
  });

  it("returns and proxies a same-origin dashboard URL tied to the reported run ID", async () => {
    const root = makeTempDir();
    const repo = makeRepo(root);
    const fetchDashboard = vi.fn(async () => new Response("<h1>run dashboard</h1>", {
      headers: { "content-type": "text/html; charset=utf-8" },
      status: 200
    }));
    const service = createDispatchDashboardService({
      allowedRepoRoots: [root],
      cliPath: makeCli(
        [
          "import json",
          "print(json.dumps({",
          "  'kind': 'dashboard_status',",
          "  'status': 'running',",
          "  'alive': True,",
          "  'run_id': '20260506T081555540696Z',",
          "  'url': 'http://127.0.0.1:44123/'",
          "}))"
        ].join("\n")
      ),
      fetchDashboard
    });
    const { cookie } = await buildAuthenticatedRoutes(service);

    const response = await server!.inject({
      method: "GET",
      url: `/api/dispatch/dashboard/current?cwd=${encodeURIComponent(repo)}`,
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      available: true,
      label: "Dispatch Dashboard",
      runId: "20260506T081555540696Z",
      url: "/dispatch-dashboard/20260506T081555540696Z/"
    });
    expect(response.body).not.toContain("127.0.0.1");
    expect(response.body).not.toContain(repo);

    const proxyResponse = await server!.inject({
      method: "GET",
      url: "/dispatch-dashboard/20260506T081555540696Z/",
      headers: { cookie }
    });

    expect(proxyResponse.statusCode).toBe(200);
    expect(proxyResponse.body).toContain("run dashboard");
    expect(fetchDashboard).toHaveBeenCalledWith("http://127.0.0.1:44123/", {
      method: "GET",
      redirect: "manual"
    });
  });
});

describe("GET /dispatch-dashboard/:runId/*", () => {
  it("requires auth before proxying dashboard requests", async () => {
    const service = {
      checkAvailability: vi.fn(),
      proxyActive: vi.fn(),
      proxy: vi.fn(),
      rememberActiveSession: vi.fn()
    };
    await buildAuthenticatedRoutes(service);

    const response = await server!.inject({
      method: "GET",
      url: "/dispatch-dashboard/session-id/"
    });

    expect(response.statusCode).toBe(401);
    expect(service.proxy).not.toHaveBeenCalled();
  });

  it("proxies an authenticated same-origin dashboard session", async () => {
    const service = {
      checkAvailability: vi.fn(),
      proxyActive: vi.fn(),
      proxy: vi.fn(async () => ({
        body: Buffer.from("<h1>dashboard fixture</h1>", "utf8"),
        contentType: "text/html; charset=utf-8",
        statusCode: 200
      })),
      rememberActiveSession: vi.fn()
    };
    const { cookie } = await buildAuthenticatedRoutes(service);

    const response = await server!.inject({
      method: "GET",
      url: "/dispatch-dashboard/session-id/assets/app.js?cache=1",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("dashboard fixture");
    expect(service.proxy).toHaveBeenCalledWith({
      requestPath: "/assets/app.js?cache=1",
      runId: "session-id"
    });
    expect(service.rememberActiveSession).toHaveBeenCalledWith({
      clientSessionKey: expect.any(String),
      runId: "session-id"
    });
  });

  it("proxies dashboard root API requests after a dashboard session is opened", async () => {
    const root = makeTempDir();
    const repo = makeRepo(root);
    const fetchDashboard = vi.fn(async (url: string) => {
      const pathname = new URL(url).pathname;
      if (pathname === "/api/status") {
        return new Response(JSON.stringify({ run_id: "20260506T081555540696Z", status: "running" }), {
          headers: { "content-type": "application/json" },
          status: 200
        });
      }

      return new Response("<h1>run dashboard</h1>", {
        headers: { "content-type": "text/html; charset=utf-8" },
        status: 200
      });
    });
    const service = createDispatchDashboardService({
      allowedRepoRoots: [root],
      cliPath: makeCli(
        [
          "import json",
          "print(json.dumps({",
          "  'alive': True,",
          "  'run_id': '20260506T081555540696Z',",
          "  'url': 'http://127.0.0.1:44123/'",
          "}))"
        ].join("\n")
      ),
      fetchDashboard
    });
    const { cookie } = await buildAuthenticatedRoutes(service);

    const inactiveApi = await server!.inject({
      method: "GET",
      url: "/api/status",
      headers: { cookie }
    });
    expect(inactiveApi.statusCode).toBe(404);
    expect(inactiveApi.json()).toEqual({ error: "dashboard_unavailable" });

    await server!.inject({
      method: "GET",
      url: `/api/dispatch/dashboard/current?cwd=${encodeURIComponent(repo)}`,
      headers: { cookie }
    });
    await server!.inject({
      method: "GET",
      url: "/dispatch-dashboard/20260506T081555540696Z/",
      headers: { cookie }
    });
    const response = await server!.inject({
      method: "GET",
      url: "/api/status?fresh=1",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toEqual({
      run_id: "20260506T081555540696Z",
      status: "running"
    });
    expect(fetchDashboard).toHaveBeenLastCalledWith("http://127.0.0.1:44123/api/status?fresh=1", {
      method: "GET",
      redirect: "manual"
    });
  });

  it("fails closed when the dashboard fetch fails during proxying", async () => {
    const root = makeTempDir();
    const repo = makeRepo(root);
    const service = createDispatchDashboardService({
      allowedRepoRoots: [root],
      cliPath: makeCli(
        [
          "import json",
          "print(json.dumps({",
          "  'alive': True,",
          "  'run_id': '20260506T081555540696Z',",
          "  'url': 'http://127.0.0.1:44123/'",
          "}))"
        ].join("\n")
      ),
      fetchDashboard: vi.fn(async () => {
        throw new Error("dashboard stopped");
      })
    });
    const { cookie } = await buildAuthenticatedRoutes(service);

    await server!.inject({
      method: "GET",
      url: `/api/dispatch/dashboard/current?cwd=${encodeURIComponent(repo)}`,
      headers: { cookie }
    });
    const response = await server!.inject({
      method: "GET",
      url: "/dispatch-dashboard/20260506T081555540696Z/",
      headers: { cookie }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "dashboard_unavailable" });
  });
});
