import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";

export interface SessionRecord {
  id: string;
  sessionHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface PassportDatabase {
  createSession(record: SessionRecord): void;
  findSessionByHash(sessionHash: string): SessionRecord | null;
  revokeSessionByHash(sessionHash: string, revokedAt: Date): void;
  revokeAllSessions(revokedAt: Date): number;
  getTotpEnrollment(): TotpEnrollmentRecord | null;
  saveTotpEnrollment(record: TotpEnrollmentRecord): void;
  clearTotpEnrollment(options?: { recordEmergencyReset?: boolean }): boolean;
  recordAccessEvent(input: RecordAccessEventInput): void;
  listAccessEvents(limit?: number): AccessEventRecord[];
  recordWorkspaceEvent(input: RecordWorkspaceEventInput): void;
  listWorkspaceEvents(limit?: number): WorkspaceEventRecord[];
  upsertMachine(input: UpsertMachineInput): MachineRecord;
  listActiveMachines(): MachineRecord[];
  deleteMachine(id: string, deletedAt: Date): boolean;
  close(): void;
}

export interface TotpEnrollmentRecord {
  totpSecretEncrypted: string;
  totpSecretNonce: string;
  totpSecretTag: string;
  enrolledAt: Date;
  updatedAt: Date;
}

export interface MachineRecord {
  id: string;
  label: string;
  serverId: string;
  relayEndpoint: string;
  daemonPublicKeyB64: string;
  status: "active" | "deleted";
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertMachineInput {
  label: string;
  serverId: string;
  relayEndpoint: string;
  daemonPublicKeyB64: string;
  now: Date;
}

export type AccessEventType =
  | "totp_enrollment_started"
  | "totp_enrollment_succeeded"
  | "totp_login_succeeded"
  | "totp_login_failed"
  | "logout"
  | "totp_reset_succeeded"
  | "totp_emergency_reset_succeeded"
  | "local_auth_bypass_access";

export type AccessEventOutcome = "success" | "failure";

export interface RecordAccessEventInput {
  eventType: AccessEventType;
  outcome: AccessEventOutcome;
  occurredAt: Date;
  sourceIp?: string | null;
  userAgentHash?: string | null;
  details?: Record<string, unknown> | null;
}

export interface AccessEventRecord extends RecordAccessEventInput {
  id: string;
  sourceIp: string | null;
  userAgentHash: string | null;
  details: Record<string, unknown> | null;
}

export type WorkspaceEventType =
  | "workspace_opened"
  | "host_profile_loaded";

export interface RecordWorkspaceEventInput {
  eventType: WorkspaceEventType;
  occurredAt: Date;
  sourceIp?: string | null;
  serverId?: string | null;
  projectKey?: string | null;
  details?: Record<string, unknown> | null;
}

export interface WorkspaceEventRecord extends RecordWorkspaceEventInput {
  id: string;
  sourceIp: string | null;
  serverId: string | null;
  projectKey: string | null;
  details: Record<string, unknown> | null;
}

interface PassportDbOptions {
  path: string;
}

const INITIAL_MIGRATION = `
create table if not exists sessions (
  id text primary key,
  session_hash text not null unique,
  created_at text not null,
  expires_at text not null,
  revoked_at text
);

create table if not exists machines (
  id text primary key,
  label text not null,
  server_id text not null unique,
  relay_endpoint text not null,
  daemon_public_key_b64 text not null,
  status text not null default 'active',
  created_at text not null,
  updated_at text not null
);

create table if not exists machine_secrets (
  machine_id text primary key references machines(id) on delete cascade,
  encrypted_offer_url text,
  encryption_nonce text,
  encryption_tag text,
  version integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table if not exists auth_enrollment (
  id integer primary key check (id = 1),
  totp_secret_encrypted text not null,
  totp_secret_nonce text not null,
  totp_secret_tag text not null,
  enrolled_at text not null,
  updated_at text not null
);

create table if not exists access_events (
  id text primary key,
  event_type text not null,
  outcome text not null,
  occurred_at text not null,
  source_ip text,
  user_agent_hash text,
  details_json text
);

create index if not exists access_events_recent_idx
on access_events (occurred_at desc);

create table if not exists workspace_events (
  id text primary key,
  event_type text not null,
  occurred_at text not null,
  source_ip text,
  server_id text,
  project_key text,
  details_json text
);

create index if not exists workspace_events_recent_idx
on workspace_events (occurred_at desc);
`;

export function createPassportDb(options: PassportDbOptions): PassportDatabase {
  if (options.path !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(options.path)), {
      recursive: true
    });
  }

  const database = new Database(options.path);
  database.exec("pragma foreign_keys = on;");
  database.exec(INITIAL_MIGRATION);

  return new SqlitePassportDatabase(database);
}

class SqlitePassportDatabase implements PassportDatabase {
  constructor(private readonly database: Database.Database) {}

  createSession(record: SessionRecord): void {
    this.database
      .prepare(
        `insert into sessions (id, session_hash, created_at, expires_at, revoked_at)
         values (?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.sessionHash,
        record.createdAt.toISOString(),
        record.expiresAt.toISOString(),
        record.revokedAt?.toISOString() ?? null
      );
  }

  findSessionByHash(sessionHash: string): SessionRecord | null {
    const row = this.database
      .prepare(
        `select id, session_hash, created_at, expires_at, revoked_at
         from sessions
         where session_hash = ?`
      )
      .get(sessionHash) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      sessionHash: String(row.session_hash),
      createdAt: new Date(String(row.created_at)),
      expiresAt: new Date(String(row.expires_at)),
      revokedAt: row.revoked_at ? new Date(String(row.revoked_at)) : null
    };
  }

  revokeSessionByHash(sessionHash: string, revokedAt: Date): void {
    this.database
      .prepare(
        `update sessions
         set revoked_at = ?
         where session_hash = ? and revoked_at is null`
      )
      .run(revokedAt.toISOString(), sessionHash);
  }

  revokeAllSessions(revokedAt: Date): number {
    const result = this.database
      .prepare(
        `update sessions
         set revoked_at = ?
         where revoked_at is null`
      )
      .run(revokedAt.toISOString());

    return result.changes;
  }

  getTotpEnrollment(): TotpEnrollmentRecord | null {
    const row = this.database
      .prepare(
        `select totp_secret_encrypted, totp_secret_nonce, totp_secret_tag,
                enrolled_at, updated_at
         from auth_enrollment
         where id = 1`
      )
      .get() as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return rowToTotpEnrollment(row);
  }

  saveTotpEnrollment(record: TotpEnrollmentRecord): void {
    this.database
      .prepare(
        `insert into auth_enrollment (
           id, totp_secret_encrypted, totp_secret_nonce, totp_secret_tag,
           enrolled_at, updated_at
         ) values (1, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           totp_secret_encrypted = excluded.totp_secret_encrypted,
           totp_secret_nonce = excluded.totp_secret_nonce,
           totp_secret_tag = excluded.totp_secret_tag,
           enrolled_at = excluded.enrolled_at,
           updated_at = excluded.updated_at`
      )
      .run(
        record.totpSecretEncrypted,
        record.totpSecretNonce,
        record.totpSecretTag,
        record.enrolledAt.toISOString(),
        record.updatedAt.toISOString()
      );
  }

  clearTotpEnrollment(options: { recordEmergencyReset?: boolean } = {}): boolean {
    const result = this.database.prepare(`delete from auth_enrollment where id = 1`).run();
    if (options.recordEmergencyReset ?? true) {
      this.recordAccessEvent({
        eventType: "totp_emergency_reset_succeeded",
        outcome: "success",
        occurredAt: new Date(),
        sourceIp: null,
        userAgentHash: null,
        details: null
      });
    }
    return result.changes > 0;
  }

  recordAccessEvent(input: RecordAccessEventInput): void {
    this.database
      .prepare(
        `insert into access_events (
           id, event_type, outcome, occurred_at, source_ip, user_agent_hash, details_json
         ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        crypto.randomUUID(),
        input.eventType,
        input.outcome,
        input.occurredAt.toISOString(),
        input.sourceIp ?? null,
        input.userAgentHash ?? null,
        serializeDetails(input.details)
      );
    pruneNewestRows(this.database, "access_events", 3000);
  }

  listAccessEvents(limit = 50): AccessEventRecord[] {
    const rows = this.database
      .prepare(
        `select id, event_type, outcome, occurred_at, source_ip, user_agent_hash, details_json
         from access_events
         order by occurred_at desc, rowid desc
         limit ?`
      )
      .all(limit) as Record<string, unknown>[];

    return rows.map(rowToAccessEvent);
  }

  recordWorkspaceEvent(input: RecordWorkspaceEventInput): void {
    this.database
      .prepare(
        `insert into workspace_events (
           id, event_type, occurred_at, source_ip, server_id, project_key, details_json
         ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        crypto.randomUUID(),
        input.eventType,
        input.occurredAt.toISOString(),
        input.sourceIp ?? null,
        input.serverId ?? null,
        input.projectKey ?? null,
        serializeDetails(input.details)
      );
    pruneNewestRows(this.database, "workspace_events", 3000);
  }

  listWorkspaceEvents(limit = 50): WorkspaceEventRecord[] {
    const rows = this.database
      .prepare(
        `select id, event_type, occurred_at, source_ip, server_id, project_key, details_json
         from workspace_events
         order by occurred_at desc, rowid desc
         limit ?`
      )
      .all(limit) as Record<string, unknown>[];

    return rows.map(rowToWorkspaceEvent);
  }

  upsertMachine(input: UpsertMachineInput): MachineRecord {
    const existing = this.database
      .prepare(
        `select id, label, server_id, relay_endpoint, daemon_public_key_b64,
                status, created_at, updated_at
         from machines
         where server_id = ?`
      )
      .get(input.serverId) as Record<string, unknown> | undefined;

    const nowIso = input.now.toISOString();
    if (existing) {
      this.database
        .prepare(
          `update machines
           set label = ?,
               relay_endpoint = ?,
               daemon_public_key_b64 = ?,
               status = 'active',
               updated_at = ?
           where server_id = ?`
        )
        .run(
          input.label,
          input.relayEndpoint,
          input.daemonPublicKeyB64,
          nowIso,
          input.serverId
        );

      return {
        ...rowToMachine(existing),
        label: input.label,
        relayEndpoint: input.relayEndpoint,
        daemonPublicKeyB64: input.daemonPublicKeyB64,
        status: "active",
        updatedAt: input.now
      };
    }

    const record: MachineRecord = {
      id: crypto.randomUUID(),
      label: input.label,
      serverId: input.serverId,
      relayEndpoint: input.relayEndpoint,
      daemonPublicKeyB64: input.daemonPublicKeyB64,
      status: "active",
      createdAt: input.now,
      updatedAt: input.now
    };

    this.database
      .prepare(
        `insert into machines (
           id, label, server_id, relay_endpoint, daemon_public_key_b64,
           status, created_at, updated_at
         ) values (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.label,
        record.serverId,
        record.relayEndpoint,
        record.daemonPublicKeyB64,
        record.status,
        nowIso,
        nowIso
      );

    this.database
      .prepare(
        `insert into machine_secrets (
           machine_id, encrypted_offer_url, encryption_nonce, encryption_tag,
           version, created_at, updated_at
         ) values (?, null, null, null, 1, ?, ?)`
      )
      .run(record.id, nowIso, nowIso);

    return record;
  }

  listActiveMachines(): MachineRecord[] {
    const rows = this.database
      .prepare(
        `select id, label, server_id, relay_endpoint, daemon_public_key_b64,
                status, created_at, updated_at
         from machines
         where status = 'active'
         order by label collate nocase asc, created_at asc`
      )
      .all() as Record<string, unknown>[];

    return rows.map(rowToMachine);
  }

  deleteMachine(id: string, deletedAt: Date): boolean {
    const result = this.database
      .prepare(
        `update machines
         set status = 'deleted', updated_at = ?
         where id = ? and status = 'active'`
      )
      .run(deletedAt.toISOString(), id);

    return result.changes > 0;
  }

  close(): void {
    this.database.close();
  }
}

function rowToTotpEnrollment(row: Record<string, unknown>): TotpEnrollmentRecord {
  return {
    totpSecretEncrypted: String(row.totp_secret_encrypted),
    totpSecretNonce: String(row.totp_secret_nonce),
    totpSecretTag: String(row.totp_secret_tag),
    enrolledAt: new Date(String(row.enrolled_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

function rowToMachine(row: Record<string, unknown>): MachineRecord {
  return {
    id: String(row.id),
    label: String(row.label),
    serverId: String(row.server_id),
    relayEndpoint: String(row.relay_endpoint),
    daemonPublicKeyB64: String(row.daemon_public_key_b64),
    status: row.status === "deleted" ? "deleted" : "active",
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at))
  };
}

function rowToAccessEvent(row: Record<string, unknown>): AccessEventRecord {
  return {
    id: String(row.id),
    eventType: String(row.event_type) as AccessEventType,
    outcome: row.outcome === "failure" ? "failure" : "success",
    occurredAt: new Date(String(row.occurred_at)),
    sourceIp: row.source_ip ? String(row.source_ip) : null,
    userAgentHash: row.user_agent_hash ? String(row.user_agent_hash) : null,
    details: parseDetails(row.details_json)
  };
}

function rowToWorkspaceEvent(row: Record<string, unknown>): WorkspaceEventRecord {
  return {
    id: String(row.id),
    eventType: String(row.event_type) as WorkspaceEventType,
    occurredAt: new Date(String(row.occurred_at)),
    sourceIp: row.source_ip ? String(row.source_ip) : null,
    serverId: row.server_id ? String(row.server_id) : null,
    projectKey: row.project_key ? String(row.project_key) : null,
    details: parseDetails(row.details_json)
  };
}

function serializeDetails(details: Record<string, unknown> | null | undefined): string | null {
  if (!details) {
    return null;
  }

  return JSON.stringify(details);
}

function parseDetails(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  const parsed = JSON.parse(String(value)) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

function pruneNewestRows(
  database: Database.Database,
  tableName: "access_events" | "workspace_events",
  retain: number
): void {
  database
    .prepare(
      `delete from ${tableName}
       where rowid in (
         select rowid
         from ${tableName}
         order by occurred_at desc, rowid desc
         limit -1 offset ?
       )`
    )
    .run(retain);
}
