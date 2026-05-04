import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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

    sendStaticFile(request, reply, options.config.staticDir, "index.html");
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
    if (!fileName) {
      reply.code(404).send({ error: "not_found" });
      return;
    }

    sendStaticFile(request, reply, options.config.staticDir, fileName);
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

function readStaticFile(staticDir: string, fileName: string): Buffer {
  const filePath = path.resolve(staticDir, fileName);
  const root = path.resolve(staticDir);

  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    throw new Error("Invalid static file path.");
  }

  return fs.readFileSync(filePath);
}

function sendStaticFile(
  request: FastifyRequest,
  reply: FastifyReply,
  staticDir: string,
  fileName: string
): void {
  const body = readStaticFile(staticDir, fileName);
  reply.type(contentTypeFor(fileName));
  reply.header("Cache-Control", cacheControlFor(fileName));
  if (isGzipCandidate(fileName)) {
    reply.header("Vary", "Accept-Encoding");
  }

  if (shouldGzip(request, fileName)) {
    reply.header("Content-Encoding", "gzip");
    reply.send(zlib.gzipSync(body));
    return;
  }

  reply.send(body);
}

function shouldGzip(request: FastifyRequest, fileName: string): boolean {
  const acceptEncoding = request.headers["accept-encoding"];
  if (typeof acceptEncoding !== "string" || !/\bgzip\b/i.test(acceptEncoding)) {
    return false;
  }

  return isGzipCandidate(fileName);
}

function isGzipCandidate(fileName: string): boolean {
  switch (path.extname(fileName)) {
    case ".css":
    case ".html":
    case ".js":
    case ".json":
    case ".svg":
      return true;
    default:
      return false;
  }
}

function cacheControlFor(fileName: string): string {
  if (path.basename(fileName) === "index.html") {
    return "no-cache";
  }

  return "public, max-age=31536000, immutable";
}

function isApiPath(url: string): boolean {
  const pathname = getStaticRequestPath(url);
  return pathname === "api" || pathname.startsWith("api/");
}

function getStaticRequestPath(url: string): string {
  const pathname = new URL(url, "http://passport.local").pathname;
  return decodeURIComponent(pathname).replace(/^\/+/, "");
}

function findStaticFile(staticDir: string, requestPath: string): string | undefined {
  if (requestPath && isReadableStaticFile(staticDir, requestPath)) {
    return requestPath;
  }

  if (path.extname(requestPath)) {
    return undefined;
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
    case ".ico":
      return "image/x-icon";
    case ".js":
      return "application/javascript";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
