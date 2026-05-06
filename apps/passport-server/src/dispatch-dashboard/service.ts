import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const DASHBOARD_LABEL = "Dispatch Dashboard";
const STATUS_TIMEOUT_MS = 3_000;

export type DashboardAvailability =
  | {
      available: false;
      reason: "unavailable";
    }
  | {
      available: true;
      label: typeof DASHBOARD_LABEL;
      runId: string;
      url: string;
    };

export interface DashboardProxyRequest {
  runId: string;
  requestPath: string;
}

export interface DashboardActiveSessionRequest {
  clientSessionKey: string;
  runId: string;
}

export interface DashboardActiveProxyRequest {
  clientSessionKey: string;
  requestPath: string;
}

export interface DashboardProxyResponse {
  body: Buffer;
  contentType?: string;
  statusCode: number;
}

export interface DispatchDashboardService {
  checkAvailability(input: { cwd: string | undefined }): Promise<DashboardAvailability>;
  proxyActive(input: DashboardActiveProxyRequest): Promise<DashboardProxyResponse | null>;
  proxy(input: DashboardProxyRequest): Promise<DashboardProxyResponse | null>;
  rememberActiveSession(input: DashboardActiveSessionRequest): void;
}

export interface DispatchDashboardServiceOptions {
  allowedRepoRoots?: string[];
  cliPath?: string;
  execStatus?: (repoRoot: string) => Promise<{ stdout: string }>;
  fetchDashboard?: typeof fetch;
}

interface DashboardSession {
  baseUrl: string;
  runId: string;
}

interface DashboardStatusPayload {
  alive?: unknown;
  run_id?: unknown;
  url?: unknown;
}

export function createDispatchDashboardService(
  options: DispatchDashboardServiceOptions
): DispatchDashboardService {
  const allowedRepoRoots = options.allowedRepoRoots ?? [];
  const cliPath = options.cliPath ?? "";
  const sessions = new Map<string, DashboardSession>();
  const activeSessions = new Map<string, string>();
  const execStatus =
    options.execStatus ??
    ((repoRoot: string) =>
      execFile("python3", [cliPath, "dashboard", repoRoot, "--status", "--json"], {
        maxBuffer: 1024 * 1024,
        timeout: STATUS_TIMEOUT_MS
      }));
  const fetchDashboard = options.fetchDashboard ?? fetch;

  return {
    async checkAvailability(input) {
      const repoRoot = await resolveAllowedRepoRoot({
        allowedRepoRoots,
        requestedPath: input.cwd
      });

      if (!repoRoot || !(await hasDispatchState(repoRoot))) {
        return unavailable();
      }

      let stdout: string;
      try {
        stdout = (await execStatus(repoRoot)).stdout;
      } catch {
        return unavailable();
      }

      const status = parseDashboardStatus(stdout);
      if (!status) {
        return unavailable();
      }

      sessions.set(status.runId, {
        baseUrl: status.url,
        runId: status.runId
      });

      return {
        available: true,
        label: DASHBOARD_LABEL,
        runId: status.runId,
        url: `/dispatch-dashboard/${status.runId}/`
      };
    },

    async proxyActive(input) {
      const runId = activeSessions.get(input.clientSessionKey);
      if (!runId) {
        return null;
      }

      return this.proxy({
        requestPath: input.requestPath,
        runId
      });
    },

    async proxy(input) {
      const session = sessions.get(input.runId);
      if (!session) {
        return null;
      }

      const targetUrl = dashboardRequestUrl(session.baseUrl, input.requestPath);
      if (!targetUrl) {
        return null;
      }

      let response: Response;
      let body: Buffer;
      try {
        response = await fetchDashboard(targetUrl, {
          method: "GET",
          redirect: "manual"
        });
        body = Buffer.from(await response.arrayBuffer());
      } catch {
        return null;
      }

      return {
        body,
        contentType: response.headers.get("content-type") ?? undefined,
        statusCode: response.status
      };
    },

    rememberActiveSession(input) {
      if (!sessions.has(input.runId)) {
        return;
      }

      activeSessions.set(input.clientSessionKey, input.runId);
    }
  };
}

async function resolveAllowedRepoRoot(input: {
  allowedRepoRoots: string[];
  requestedPath: string | undefined;
}): Promise<string | null> {
  if (!input.requestedPath || input.allowedRepoRoots.length === 0) {
    return null;
  }

  let requestedRealPath: string;
  try {
    requestedRealPath = await fs.realpath(path.resolve(input.requestedPath));
  } catch {
    return null;
  }

  for (const root of input.allowedRepoRoots) {
    let rootRealPath: string;
    try {
      rootRealPath = await fs.realpath(path.resolve(root));
    } catch {
      continue;
    }

    const relative = path.relative(rootRealPath, requestedRealPath);
    if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
      return requestedRealPath;
    }
  }

  return null;
}

async function hasDispatchState(repoRoot: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path.join(repoRoot, ".dispatch"));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function parseDashboardStatus(stdout: string): { runId: string; url: string } | null {
  let payload: DashboardStatusPayload;
  try {
    payload = JSON.parse(stdout) as DashboardStatusPayload;
  } catch {
    return null;
  }

  if (payload.alive !== true || typeof payload.run_id !== "string") {
    return null;
  }

  if (typeof payload.url !== "string" || !isLoopbackDashboardUrl(payload.url)) {
    return null;
  }

  return {
    runId: payload.run_id,
    url: payload.url
  };
}

function isLoopbackDashboardUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname) &&
    url.port !== ""
  );
}

function dashboardRequestUrl(baseUrl: string, requestPath: string): string | null {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  if (!isLoopbackDashboardUrl(base.toString())) {
    return null;
  }

  const parsedPath = new URL(requestPath.startsWith("/") ? requestPath : `/${requestPath}`, "http://passport.local");
  const basePath = base.pathname.endsWith("/") ? base.pathname.slice(0, -1) : base.pathname;
  base.pathname = `${basePath}${parsedPath.pathname}`;
  base.search = parsedPath.search;
  base.hash = "";

  return base.toString();
}

function unavailable(): DashboardAvailability {
  return {
    available: false,
    reason: "unavailable"
  };
}
