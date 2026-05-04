import type { FastifyReply, FastifyRequest } from "fastify";
import type { PassportDatabase } from "../db";
import { authenticateSession, SESSION_COOKIE_NAME } from "./sessions";

export interface AuthenticatedPassportUser {
  username: string;
  sessionHash: string;
}

declare module "fastify" {
  interface FastifyRequest {
    passportUser?: AuthenticatedPassportUser;
  }
}

export interface AuthMiddlewareOptions {
  adminUser: string;
  db: PassportDatabase;
  localAuthBypass?: boolean;
  sessionSecret: string;
  now: () => Date;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (options.localAuthBypass) {
      request.passportUser = {
        username: options.adminUser,
        sessionHash: "local-auth-bypass"
      };
      return;
    }

    const session = authenticateSession({
      db: options.db,
      now: options.now(),
      sessionSecret: options.sessionSecret,
      token: readCookie(request.headers.cookie, SESSION_COOKIE_NAME)
    });

    if (!session) {
      reply.code(401).send({ error: "authentication_failed" });
      return;
    }

    request.passportUser = {
      username: options.adminUser,
      sessionHash: session.sessionHash
    };
  };
}

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) {
      return rawValue.join("=");
    }
  }

  return undefined;
}
