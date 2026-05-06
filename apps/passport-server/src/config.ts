import os from "node:os";
import path from "node:path";

export interface PassportConfig {
  nodeEnv: string;
  host: string;
  port: number;
  localAuthBypass: boolean;
  cookieSecure: boolean;
  dataKey: string;
  dbPath: string;
  operatorName: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  staticDir: string;
  dispatchDashboardRepoRoots: string[];
  dispatchEngineCliPath: string;
}

const DEFAULT_OPERATOR_NAME = "operator";
const DEFAULT_PORT = 7317;
const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error("Expected boolean value to be true or false.");
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PASSPORT_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function parsePositiveInteger(
  name: string,
  value: string | undefined,
  fallback: number
): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function parsePathList(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function defaultDispatchEngineCliPath(): string {
  return path.join(os.homedir(), ".codex", "skills", "dispatch-engine", "scripts", "de.py");
}

function requiredSecret(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function resolveDataKey(dbPath: string, value: string | undefined): string {
  if (dbPath === ":memory:" && !value) {
    return "";
  }

  if (!value) {
    throw new Error("PASSPORT_DATA_KEY is required for persistent Passport data.");
  }

  if (value.length < 32) {
    throw new Error("PASSPORT_DATA_KEY must be at least 32 characters.");
  }

  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PassportConfig {
  const nodeEnv = env.NODE_ENV || "development";
  const dbPath = env.PASSPORT_DB_PATH || "./data/passport.sqlite";

  return {
    nodeEnv,
    host: env.PASSPORT_HOST || "127.0.0.1",
    port: parsePort(env.PASSPORT_PORT),
    localAuthBypass: parseBoolean(env.PASSPORT_LOCAL_AUTH_BYPASS, false),
    cookieSecure: parseBoolean(env.PASSPORT_COOKIE_SECURE, false),
    dataKey: resolveDataKey(dbPath, env.PASSPORT_DATA_KEY),
    dbPath,
    operatorName: DEFAULT_OPERATOR_NAME,
    sessionSecret: requiredSecret("PASSPORT_SESSION_SECRET", env.PASSPORT_SESSION_SECRET),
    sessionTtlSeconds: parsePositiveInteger(
      "PASSPORT_SESSION_TTL_SECONDS",
      env.PASSPORT_SESSION_TTL_SECONDS,
      DEFAULT_SESSION_TTL_SECONDS
    ),
    staticDir: env.PASSPORT_STATIC_DIR || "./public",
    dispatchDashboardRepoRoots: parsePathList(env.PASSPORT_DASHBOARD_REPO_ROOTS),
    dispatchEngineCliPath: env.PASSPORT_DISPATCH_ENGINE_CLI || defaultDispatchEngineCliPath()
  };
}
