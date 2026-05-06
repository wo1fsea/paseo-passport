import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createAuthMiddleware } from "../auth/middleware";
import type { PassportDatabase } from "../db";
import type { DispatchDashboardService } from "./service";

export interface DispatchDashboardRoutesOptions {
  db: PassportDatabase;
  localAuthBypass?: boolean;
  operatorName: string;
  service: DispatchDashboardService;
  sessionSecret: string;
  now?: () => Date;
}

interface CurrentDashboardQuery {
  cwd?: string;
}

interface DashboardProxyParams {
  runId?: string;
  "*"?: string;
}

const DASHBOARD_API_PROXY_PATHS = [
  "/api/status",
  "/api/events",
  "/api/alerts",
  "/api/tail",
  "/api/plan",
  "/api/host-heartbeat",
  "/api/history",
  "/api/logs/coordinator"
] as const;

export async function registerDispatchDashboardRoutes(
  server: FastifyInstance,
  options: DispatchDashboardRoutesOptions
): Promise<void> {
  const now = options.now ?? (() => new Date());
  const requireAuth = createAuthMiddleware({
    db: options.db,
    localAuthBypass: options.localAuthBypass,
    now,
    operatorName: options.operatorName,
    sessionSecret: options.sessionSecret
  });

  server.get<{ Querystring: CurrentDashboardQuery }>(
    "/api/dispatch/dashboard/current",
    { preHandler: requireAuth },
    async (request) => {
      return options.service.checkAvailability({
        cwd: typeof request.query.cwd === "string" ? request.query.cwd : undefined
      });
    }
  );

  server.get<{ Params: DashboardProxyParams }>(
    "/dispatch-dashboard/:runId/*",
    { preHandler: requireAuth },
    async (request, reply) => {
      const runId = request.params.runId;
      if (!runId) {
        reply.code(404).send({ error: "dashboard_unavailable" });
        return;
      }

      options.service.rememberActiveSession({
        clientSessionKey: dashboardClientSessionKey(request),
        runId
      });

      const proxyResponse = await options.service.proxy({
        requestPath: proxyRequestPath(request),
        runId
      });

      if (!proxyResponse) {
        reply.code(404).send({ error: "dashboard_unavailable" });
        return;
      }

      if (proxyResponse.contentType) {
        reply.header("content-type", proxyResponse.contentType);
      }
      reply.code(proxyResponse.statusCode).send(proxyResponse.body);
    }
  );

  for (const routePath of DASHBOARD_API_PROXY_PATHS) {
    server.get(routePath, { preHandler: requireAuth }, async (request, reply) => {
      await proxyActiveDashboardApi({
        request,
        reply,
        service: options.service
      });
    });
  }

  server.get<{ Params: { "*": string } }>(
    "/api/logs/agent/*",
    { preHandler: requireAuth },
    async (request, reply) => {
      await proxyActiveDashboardApi({
        request,
        reply,
        service: options.service
      });
    }
  );
}

function proxyRequestPath(request: FastifyRequest<{ Params: DashboardProxyParams }>): string {
  const wildcard = request.params["*"] ?? "";
  const search = new URL(request.url, "http://passport.local").search;
  return `/${wildcard}${search}`;
}

async function proxyActiveDashboardApi(input: {
  request: FastifyRequest;
  reply: FastifyReply;
  service: DispatchDashboardService;
}): Promise<void> {
  const proxyResponse = await input.service.proxyActive({
    clientSessionKey: dashboardClientSessionKey(input.request),
    requestPath: requestPathWithSearch(input.request)
  });

  if (!proxyResponse) {
    input.reply.code(404).send({ error: "dashboard_unavailable" });
    return;
  }

  if (proxyResponse.contentType) {
    input.reply.header("content-type", proxyResponse.contentType);
  }
  input.reply.code(proxyResponse.statusCode).send(proxyResponse.body);
}

function requestPathWithSearch(request: FastifyRequest): string {
  const url = new URL(request.url, "http://passport.local");
  return `${url.pathname}${url.search}`;
}

function dashboardClientSessionKey(request: FastifyRequest): string {
  return request.passportUser?.sessionHash ?? "unknown-session";
}
