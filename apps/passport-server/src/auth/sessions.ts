import crypto from "node:crypto";
import type { PassportDatabase, SessionRecord } from "../db";

export const SESSION_COOKIE_NAME = "pp_session";
export const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface CreateSessionOptions {
  db: PassportDatabase;
  sessionSecret: string;
  now: Date;
  ttlSeconds?: number;
}

export interface AuthenticatedSession {
  record: SessionRecord;
  sessionHash: string;
}

export function createSession(options: CreateSessionOptions): {
  token: string;
  record: SessionRecord;
} {
  const token = crypto.randomBytes(32).toString("base64url");
  const record: SessionRecord = {
    id: crypto.randomUUID(),
    sessionHash: hashSessionToken(token, options.sessionSecret),
    createdAt: options.now,
    expiresAt: new Date(
      options.now.getTime() + (options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS) * 1000
    ),
    revokedAt: null
  };

  options.db.createSession(record);

  return { token, record };
}

export function authenticateSession(options: {
  db: PassportDatabase;
  sessionSecret: string;
  token: string | undefined;
  now: Date;
}): AuthenticatedSession | null {
  if (!options.token) {
    return null;
  }

  const sessionHash = hashSessionToken(options.token, options.sessionSecret);
  const record = options.db.findSessionByHash(sessionHash);

  if (!record || record.revokedAt || record.expiresAt <= options.now) {
    return null;
  }

  return { record, sessionHash };
}

export function revokeSession(options: {
  db: PassportDatabase;
  sessionSecret: string;
  token: string;
  now: Date;
}): void {
  options.db.revokeSessionByHash(
    hashSessionToken(options.token, options.sessionSecret),
    options.now
  );
}

export function hashSessionToken(token: string, sessionSecret: string): string {
  return crypto.createHmac("sha256", sessionSecret).update(token).digest("base64url");
}
