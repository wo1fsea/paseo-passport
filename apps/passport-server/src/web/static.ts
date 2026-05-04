import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { readCookie } from "../auth/middleware";
import { authenticateSession, SESSION_COOKIE_NAME } from "../auth/sessions";
import type { PassportConfig } from "../config";
import type { PassportDatabase } from "../db";

export interface WorkspaceStaticOptions {
  config: PassportConfig;
  db: PassportDatabase;
  now?: () => Date;
}

export async function registerWorkspaceStaticRoutes(
  server: FastifyInstance,
  options: WorkspaceStaticOptions
): Promise<void> {
  const now = options.now ?? (() => new Date());

  server.get("/", async (request, reply) => {
    if (!isAuthenticated(request, options, now())) {
      reply.redirect("/login");
      return;
    }

    reply.type("text/html").send(readStaticFile(options.config.staticDir, "index.html"));
  });

  server.get("/passport-hosts.js", async (request, reply) => {
    if (!isAuthenticated(request, options, now())) {
      reply.code(401).send({ error: "authentication_failed" });
      return;
    }

    reply.type("application/javascript").send(readStaticFile(options.config.staticDir, "passport-hosts.js"));
  });

  server.get("/*", async (request, reply) => {
    if (isApiPath(request.url)) {
      reply.code(404).send({ error: "not_found" });
      return;
    }

    if (!isAuthenticated(request, options, now())) {
      reply.redirect("/login");
      return;
    }

    const staticPath = getStaticRequestPath(request.url);
    const fileName = findStaticFile(options.config.staticDir, staticPath);

    reply.type(contentTypeFor(fileName)).send(readStaticFile(options.config.staticDir, fileName));
  });
}

function isAuthenticated(
  request: FastifyRequest,
  options: WorkspaceStaticOptions,
  now: Date
): boolean {
  if (options.config.localAuthBypass) {
    return true;
  }

  const session = authenticateSession({
    db: options.db,
    now,
    sessionSecret: options.config.sessionSecret,
    token: readCookie(request.headers.cookie, SESSION_COOKIE_NAME)
  });

  return Boolean(session);
}

function readStaticFile(staticDir: string, fileName: string): string {
  const filePath = path.resolve(staticDir, fileName);
  const root = path.resolve(staticDir);

  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    throw new Error("Invalid static file path.");
  }

  return fs.readFileSync(filePath, "utf8");
}

function isApiPath(url: string): boolean {
  const pathname = getStaticRequestPath(url);
  return pathname === "api" || pathname.startsWith("api/");
}

function getStaticRequestPath(url: string): string {
  const pathname = new URL(url, "http://passport.local").pathname;
  return decodeURIComponent(pathname).replace(/^\/+/, "");
}

function findStaticFile(staticDir: string, requestPath: string): string {
  if (requestPath && isReadableStaticFile(staticDir, requestPath)) {
    return requestPath;
  }

  return "index.html";
}

function isReadableStaticFile(staticDir: string, fileName: string): boolean {
  const filePath = path.resolve(staticDir, fileName);
  const root = path.resolve(staticDir);

  if (!filePath.startsWith(root + path.sep)) {
    return false;
  }

  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function contentTypeFor(fileName: string): string {
  switch (path.extname(fileName)) {
    case ".css":
      return "text/css";
    case ".html":
      return "text/html";
    case ".js":
      return "application/javascript";
    case ".json":
      return "application/json";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
