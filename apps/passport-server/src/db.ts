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
  upsertMachine(input: UpsertMachineInput): MachineRecord;
  listActiveMachines(): MachineRecord[];
  deleteMachine(id: string, deletedAt: Date): boolean;
  close(): void;
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
