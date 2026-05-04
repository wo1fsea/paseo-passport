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
