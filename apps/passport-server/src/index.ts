import fastify, { type FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth/routes";
import { loadConfig, type PassportConfig } from "./config";
import { createPassportDb } from "./db";
import { registerMachineRoutes } from "./machines/routes";
import { registerAdminUiRoutes } from "./web/admin";
import { registerWorkspaceStaticRoutes } from "./web/static";

export function buildServer(config: PassportConfig = loadConfig()): FastifyInstance {
  assertLocalAuthBypassHost(config);

  const server = fastify({
    logger: config.nodeEnv !== "test"
  });
  const db = createPassportDb({
    path: config.dbPath
  });

  server.addHook("onClose", async () => {
    db.close();
  });

  server.get("/api/health", async () => {
    return { ok: true };
  });

  void registerAuthRoutes(server, {
    adminUser: config.adminUser,
    cookieSecure: config.cookieSecure,
    db,
    localAuthBypass: config.localAuthBypass,
    passwordHash: config.passwordHash,
    sessionSecret: config.sessionSecret,
    sessionTtlSeconds: config.sessionTtlSeconds,
    totpSecret: config.totpSecret
  });
  void registerMachineRoutes(server, {
    adminUser: config.adminUser,
    db,
    localAuthBypass: config.localAuthBypass,
    sessionSecret: config.sessionSecret
  });
  void registerAdminUiRoutes(server, {
    adminUser: config.adminUser,
    db,
    localAuthBypass: config.localAuthBypass,
    sessionSecret: config.sessionSecret
  });
  void registerWorkspaceStaticRoutes(server, {
    config,
    db
  });

  return server;
}

export async function startServer(config: PassportConfig = loadConfig()): Promise<FastifyInstance> {
  const server = buildServer(config);
  await server.listen({
    host: config.host,
    port: config.port
  });
  return server;
}

if (require.main === module) {
  startServer().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

function assertLocalAuthBypassHost(config: PassportConfig): void {
  if (!config.localAuthBypass) {
    return;
  }

  if (!["127.0.0.1", "localhost", "::1"].includes(config.host)) {
    throw new Error(
      "PASSPORT_LOCAL_AUTH_BYPASS=true is only allowed when PASSPORT_HOST is 127.0.0.1, localhost, or ::1."
    );
  }
}
