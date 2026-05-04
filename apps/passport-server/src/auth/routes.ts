import type { FastifyInstance } from "fastify";
import type { PassportDatabase } from "../db";
import { createAuthMiddleware, readCookie } from "./middleware";
import { verifyPassword } from "./password";
import {
  createSession,
  DEFAULT_SESSION_TTL_SECONDS,
  revokeSession,
  SESSION_COOKIE_NAME
} from "./sessions";
import { verifyTotp } from "./totp";

export interface AuthRoutesOptions {
  adminUser: string;
  cookieSecure: boolean;
  db: PassportDatabase;
  passwordHash: string;
  sessionSecret: string;
  sessionTtlSeconds?: number;
  totpSecret: string;
  now?: () => Date;
  loginRateLimit?: {
    maxAttempts: number;
    windowSeconds: number;
  };
  localAuthBypass?: boolean;
}

interface LoginBody {
  username: string;
  password: string;
  totp: string;
}

interface RateLimitBucket {
  resetAt: number;
  failures: number;
}

const GENERIC_AUTH_FAILURE = { error: "authentication_failed" } as const;

export async function registerAuthRoutes(
  server: FastifyInstance,
  options: AuthRoutesOptions
): Promise<void> {
  const now = options.now ?? (() => new Date());
  const requireAuth = createAuthMiddleware({
    adminUser: options.adminUser,
    db: options.db,
    localAuthBypass: options.localAuthBypass,
    now,
    sessionSecret: options.sessionSecret
  });
  const rateLimit = options.loginRateLimit ?? {
    maxAttempts: 5,
    windowSeconds: 60
  };
  const failures = new Map<string, RateLimitBucket>();

  server.post("/api/auth/login", async (request, reply) => {
    const body = parseLoginBody(request.body);
    const rateLimitKey = request.ip || "unknown";

    if (!body || isRateLimited(failures, rateLimitKey, rateLimit, now())) {
      reply.code(401).send(GENERIC_AUTH_FAILURE);
      return;
    }

    const passwordOk = await verifyPassword(body.password, options.passwordHash);
    const totpOk = verifyTotp(body.totp, options.totpSecret, now());

    if (body.username !== options.adminUser || !passwordOk || !totpOk) {
      recordLoginFailure(failures, rateLimitKey, rateLimit, now());
      reply.code(401).send(GENERIC_AUTH_FAILURE);
      return;
    }

    failures.delete(rateLimitKey);
    const session = createSession({
      db: options.db,
      now: now(),
      sessionSecret: options.sessionSecret,
      ttlSeconds: options.sessionTtlSeconds
    });

    reply
      .header(
        "Set-Cookie",
        serializeSessionCookie({
          token: session.token,
          secure: options.cookieSecure,
          maxAgeSeconds: options.sessionTtlSeconds ?? DEFAULT_SESSION_TTL_SECONDS
        })
      )
      .code(204)
      .send();
  });

  server.get("/api/auth/me", { preHandler: requireAuth }, async (request) => {
    return {
      authenticated: true,
      username: request.passportUser?.username
    };
  });

  server.post("/api/auth/logout", { preHandler: requireAuth }, async (request, reply) => {
    const token = readCookie(request.headers.cookie, SESSION_COOKIE_NAME);

    if (token) {
      revokeSession({
        db: options.db,
        now: now(),
        sessionSecret: options.sessionSecret,
        token
      });
    }

    reply
      .header(
        "Set-Cookie",
        serializeSessionCookie({
          token: "",
          secure: options.cookieSecure,
          maxAgeSeconds: 0
        })
      )
      .code(204)
      .send();
  });
}

function parseLoginBody(value: unknown): LoginBody | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Record<keyof LoginBody, unknown>>;
  if (
    typeof candidate.username !== "string" ||
    typeof candidate.password !== "string" ||
    typeof candidate.totp !== "string"
  ) {
    return null;
  }

  return {
    username: candidate.username,
    password: candidate.password,
    totp: candidate.totp
  };
}

function serializeSessionCookie(options: {
  token: string;
  secure: boolean;
  maxAgeSeconds: number;
}): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${options.token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${options.maxAgeSeconds}`
  ];

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function isRateLimited(
  failures: Map<string, RateLimitBucket>,
  key: string,
  limit: { maxAttempts: number; windowSeconds: number },
  now: Date
): boolean {
  const bucket = failures.get(key);
  if (!bucket || bucket.resetAt <= now.getTime()) {
    failures.delete(key);
    return false;
  }

  return bucket.failures >= limit.maxAttempts;
}

function recordLoginFailure(
  failures: Map<string, RateLimitBucket>,
  key: string,
  limit: { maxAttempts: number; windowSeconds: number },
  now: Date
): void {
  const existing = failures.get(key);
  const resetAt = now.getTime() + limit.windowSeconds * 1000;

  if (!existing || existing.resetAt <= now.getTime()) {
    failures.set(key, {
      failures: 1,
      resetAt
    });
    return;
  }

  existing.failures += 1;
}
