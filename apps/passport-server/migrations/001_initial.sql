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
