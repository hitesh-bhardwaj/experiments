-- Portable subset of the install-limit schema for the concurrency test
-- (vault-main/src/lib/install-limit.concurrency.test.js), run against a
-- disposable local Postgres. No GRANT/REVOKE/RLS here - those reference
-- Supabase-specific roles (service_role, anon, authenticated) that don't
-- exist on a vanilla Postgres image, and RLS has no bearing on the
-- atomicity guarantees this test actually checks.
--
-- This must be kept in sync BY HAND with the source-of-truth SQL run in
-- the Supabase SQL editor - there is no migration tooling in this repo to
-- do it for you. See Installation-SyncUp.md section 4.

create table if not exists install_unlocks (
  id bigint generated always as identity primary key,
  identity_key text not null,
  clerk_user_id text,
  usage_date date not null,
  effect_slug text not null,
  source text not null check (source in ('web', 'cli', 'mcp')),
  first_unlocked_at timestamptz not null default now(),
  unique (identity_key, usage_date, effect_slug)
);

create index if not exists install_unlocks_identity_date_idx
  on install_unlocks (identity_key, usage_date);
create index if not exists install_unlocks_clerk_user_id_idx
  on install_unlocks (clerk_user_id) where clerk_user_id is not null;

create table if not exists install_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  identity_key text not null,
  clerk_user_id text,
  device_id text,
  ip_hash text,
  effect_slug text not null,
  effect_tier text,
  source text not null check (source in ('web', 'cli', 'mcp')),
  plan text,
  decision text not null check (decision in ('allowed', 'denied', 'already-unlocked')),
  reason text,
  enforced boolean not null default false,
  would_have_denied boolean not null default false,
  cli_version text,
  mcp_version text,
  user_agent text,
  anonymous_project_id text
);

create index if not exists install_events_identity_idx
  on install_events (identity_key, occurred_at desc);
create index if not exists install_events_effect_idx
  on install_events (effect_slug, occurred_at desc);
create index if not exists install_events_clerk_user_id_idx
  on install_events (clerk_user_id) where clerk_user_id is not null;

-- Serializes concurrent claims for the same (identity_key, usage_date) via
-- an advisory lock instead of a dedicated counter row (unlike
-- founding_slot_counter, there's no single shared row to lock here - the
-- "count" is derived from distinct effect rows per identity per day).
-- pg_advisory_xact_lock auto-releases at transaction end.
create or replace function claim_install_slot(
  p_identity_key text,
  p_usage_date date,
  p_effect_slug text,
  p_source text,
  p_limit integer,
  p_clerk_user_id text default null
) returns table (
  allowed boolean,
  already_unlocked boolean,
  claim_count integer,
  remaining integer
) language plpgsql as $$
declare
  v_already boolean;
  v_count integer;
begin
  if p_identity_key is null or p_identity_key = '' then
    raise exception 'identity_key is required';
  end if;
  if p_effect_slug is null or p_effect_slug = '' then
    raise exception 'effect_slug is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_identity_key || '|' || p_usage_date::text, 0));

  select exists(
    select 1 from install_unlocks
    where identity_key = p_identity_key
      and usage_date = p_usage_date
      and effect_slug = p_effect_slug
  ) into v_already;

  if v_already then
    select count(*) into v_count from install_unlocks
      where identity_key = p_identity_key and usage_date = p_usage_date;

    return query select true, true, v_count, case when p_limit is null then null else greatest(p_limit - v_count, 0) end;
    return;
  end if;

  select count(*) into v_count from install_unlocks
    where identity_key = p_identity_key and usage_date = p_usage_date;

  if p_limit is not null and v_count >= p_limit then
    return query select false, false, v_count, 0;
    return;
  end if;

  insert into install_unlocks (identity_key, clerk_user_id, usage_date, effect_slug, source)
    values (p_identity_key, p_clerk_user_id, p_usage_date, p_effect_slug, p_source)
    on conflict (identity_key, usage_date, effect_slug) do nothing;

  select count(*) into v_count from install_unlocks
    where identity_key = p_identity_key and usage_date = p_usage_date;

  return query select true, false, v_count, case when p_limit is null then null else greatest(p_limit - v_count, 0) end;
end;
$$;
