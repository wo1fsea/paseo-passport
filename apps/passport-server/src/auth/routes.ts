import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AccessEventRecord, PassportDatabase, WorkspaceEventRecord } from "../db";
import { createAuthMiddleware, readCookie } from "./middleware";
import {
  createSession,
  DEFAULT_SESSION_TTL_SECONDS,
  authenticateSession,
  revokeSession,
  SESSION_COOKIE_NAME
} from "./sessions";
import {
  createTotpUri,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  verifyTotp
} from "./totp";

export interface AuthRoutesOptions {
  cookieSecure: boolean;
  dataKey: string;
  db: PassportDatabase;
  operatorName: string;
  sessionSecret: string;
  sessionTtlSeconds?: number;
  now?: () => Date;
  loginRateLimit?: {
    maxAttempts: number;
    windowSeconds: number;
  };
  localAuthBypass?: boolean;
}

interface TotpBody {
  totp: string;
}

interface ResetBody {
  confirm: string;
}

interface RateLimitBucket {
  resetAt: number;
  failures: number;
}

const GENERIC_AUTH_FAILURE = { error: "authentication_failed" } as const;
const INVALID_REQUEST = { error: "invalid_request" } as const;
const RESET_CONFIRMATION = "reset-totp-enrollment";

export async function registerAuthRoutes(
  server: FastifyInstance,
  options: AuthRoutesOptions
): Promise<void> {
  const now = options.now ?? (() => new Date());
  const requireAuth = createAuthMiddleware({
    db: options.db,
    localAuthBypass: options.localAuthBypass,
    now,
    operatorName: options.operatorName,
    sessionSecret: options.sessionSecret
  });
  const rateLimit = options.loginRateLimit ?? {
    maxAttempts: 5,
    windowSeconds: 60
  };
  const failures = new Map<string, RateLimitBucket>();
  let pendingEnrollmentSecret: string | null = null;

  server.get("/api/auth/state", async (request) => {
    return {
      enrolled: Boolean(options.db.getTotpEnrollment()),
      authenticated: Boolean(
        authenticateSession({
          db: options.db,
          now: now(),
          sessionSecret: options.sessionSecret,
          token: readCookie(request.headers.cookie, SESSION_COOKIE_NAME)
        })
      )
    };
  });

  server.post("/api/auth/enrollment/start", async (request, reply) => {
    if (options.db.getTotpEnrollment()) {
      reply.code(409).send({ error: "already_enrolled" });
      return;
    }

    pendingEnrollmentSecret = generateTotpSecret();
    recordAccessEvent(options.db, request, {
      eventType: "totp_enrollment_started",
      outcome: "success",
      occurredAt: now()
    });
    const otpauthUrl = createTotpUri({
      issuer: "Paseo Passport",
      secret: pendingEnrollmentSecret,
      username: options.operatorName
    });

    reply.send({
      otpauthUrl,
      qrPayload: otpauthUrl,
      manualSecret: pendingEnrollmentSecret
    });
  });

  server.post("/api/auth/enrollment/complete", async (request, reply) => {
    const body = parseTotpBody(request.body);
    const rateLimitKey = request.ip || "unknown";

    if (!body) {
      reply.code(400).send(INVALID_REQUEST);
      return;
    }

    if (options.db.getTotpEnrollment()) {
      reply.code(409).send({ error: "already_enrolled" });
      return;
    }

    if (
      !pendingEnrollmentSecret ||
      isRateLimited(failures, rateLimitKey, rateLimit, now()) ||
      !verifyTotp(body.totp, pendingEnrollmentSecret, now())
    ) {
      recordLoginFailure(failures, rateLimitKey, rateLimit, now());
      reply.code(401).send(GENERIC_AUTH_FAILURE);
      return;
    }

    const encrypted = encryptTotpSecret(pendingEnrollmentSecret, options.dataKey);
    options.db.saveTotpEnrollment({
      totpSecretEncrypted: encrypted.encrypted,
      totpSecretNonce: encrypted.nonce,
      totpSecretTag: encrypted.tag,
      enrolledAt: now(),
      updatedAt: now()
    });
    pendingEnrollmentSecret = null;
    failures.delete(rateLimitKey);
    recordAccessEvent(options.db, request, {
      eventType: "totp_enrollment_succeeded",
      outcome: "success",
      occurredAt: now()
    });
    createSessionCookie(reply, options, now()).code(204).send();
  });

  server.post("/api/auth/login", async (request, reply) => {
    const body = parseTotpBody(request.body);
    const rateLimitKey = request.ip || "unknown";

    if (!body) {
      reply.code(400).send(INVALID_REQUEST);
      return;
    }

    const enrollment = options.db.getTotpEnrollment();
    if (!enrollment) {
      reply.code(409).send({ error: "not_enrolled" });
      return;
    }

    const secret = decryptTotpSecret(
      {
        encrypted: enrollment.totpSecretEncrypted,
        nonce: enrollment.totpSecretNonce,
        tag: enrollment.totpSecretTag
      },
      options.dataKey
    );
    const totpOk =
      !isRateLimited(failures, rateLimitKey, rateLimit, now()) &&
      verifyTotp(body.totp, secret, now());

    if (!totpOk) {
      recordLoginFailure(failures, rateLimitKey, rateLimit, now());
      recordAccessEvent(options.db, request, {
        eventType: "totp_login_failed",
        outcome: "failure",
        occurredAt: now()
      });
      reply.code(401).send(GENERIC_AUTH_FAILURE);
      return;
    }

    failures.delete(rateLimitKey);
    recordAccessEvent(options.db, request, {
      eventType: "totp_login_succeeded",
      outcome: "success",
      occurredAt: now()
    });
    createSessionCookie(reply, options, now()).code(204).send();
  });

  server.get("/api/auth/me", { preHandler: requireAuth }, async (request) => {
    if (options.localAuthBypass) {
      recordAccessEvent(options.db, request, {
        eventType: "local_auth_bypass_access",
        outcome: "success",
        occurredAt: now()
      });
    }

    return {
      authenticated: true,
      operator: request.passportUser?.operator
    };
  });

  server.post("/api/auth/enrollment/reset", { preHandler: requireAuth }, async (request, reply) => {
    const body = parseResetBody(request.body);

    if (!body || body.confirm !== RESET_CONFIRMATION) {
      reply.code(400).send(INVALID_REQUEST);
      return;
    }

    pendingEnrollmentSecret = null;
    options.db.clearTotpEnrollment({ recordEmergencyReset: false });
    options.db.revokeAllSessions(now());
    recordAccessEvent(options.db, request, {
      eventType: "totp_reset_succeeded",
      outcome: "success",
      occurredAt: now()
    });
    clearSessionCookie(reply, options.cookieSecure).code(204).send();
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

    recordAccessEvent(options.db, request, {
      eventType: "logout",
      outcome: "success",
      occurredAt: now()
    });
    clearSessionCookie(reply, options.cookieSecure).code(204).send();
  });

  server.get("/api/admin/history/access", { preHandler: requireAuth }, async () => {
    return {
      events: options.db.listAccessEvents(50).map(serializeAccessEvent)
    };
  });

  server.get("/api/admin/history/workspace", { preHandler: requireAuth }, async () => {
    return {
      events: options.db.listWorkspaceEvents(50).map(serializeWorkspaceEvent)
    };
  });
}

function parseTotpBody(value: unknown): TotpBody | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== "totp")) {
    return null;
  }

  if (typeof candidate.totp !== "string") {
    return null;
  }

  return {
    totp: candidate.totp
  };
}

function parseResetBody(value: unknown): ResetBody | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Record<keyof ResetBody, unknown>>;
  if (typeof candidate.confirm !== "string") {
    return null;
  }

  return {
    confirm: candidate.confirm
  };
}

function createSessionCookie(
  reply: FastifyReply,
  options: AuthRoutesOptions,
  now: Date
) {
  const session = createSession({
    db: options.db,
    now,
    sessionSecret: options.sessionSecret,
    ttlSeconds: options.sessionTtlSeconds
  });

  return reply.header(
    "Set-Cookie",
    serializeSessionCookie({
      token: session.token,
      secure: options.cookieSecure,
      maxAgeSeconds: options.sessionTtlSeconds ?? DEFAULT_SESSION_TTL_SECONDS
    })
  );
}

function clearSessionCookie(
  reply: FastifyReply,
  secure: boolean
) {
  return reply.header(
    "Set-Cookie",
    serializeSessionCookie({
      token: "",
      secure,
      maxAgeSeconds: 0
    })
  );
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

function recordAccessEvent(
  db: PassportDatabase,
  request: FastifyRequest,
  input: {
    eventType: Parameters<PassportDatabase["recordAccessEvent"]>[0]["eventType"];
    outcome: Parameters<PassportDatabase["recordAccessEvent"]>[0]["outcome"];
    occurredAt: Date;
  }
): void {
  db.recordAccessEvent({
    ...input,
    sourceIp: request.ip || null,
    userAgentHash: hashUserAgent(request.headers["user-agent"])
  });
}

function hashUserAgent(value: string | string[] | undefined): string | null {
  const userAgent = Array.isArray(value) ? value.join(" ") : value;
  if (!userAgent) {
    return null;
  }

  return crypto.createHash("sha256").update(userAgent).digest("hex");
}

function serializeAccessEvent(event: AccessEventRecord) {
  return {
    id: event.id,
    eventType: event.eventType,
    outcome: event.outcome,
    occurredAt: event.occurredAt.toISOString(),
    sourceIp: event.sourceIp,
    userAgentHash: event.userAgentHash,
    details: event.details
  };
}

function serializeWorkspaceEvent(event: WorkspaceEventRecord) {
  return {
    id: event.id,
    eventType: event.eventType,
    occurredAt: event.occurredAt.toISOString(),
    sourceIp: event.sourceIp,
    serverId: event.serverId,
    projectKey: event.projectKey,
    details: event.details
  };
}
