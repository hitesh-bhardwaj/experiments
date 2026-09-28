-- Portable subset of the founding-slot schema for the concurrency test
-- (apps/docs/src/lib/founding-slots.concurrency.test.js), run against a
-- disposable local Postgres. No GRANT/REVOKE/RLS here - those reference
-- Supabase-specific roles (service_role, anon, authenticated) that don't
-- exist on a vanilla Postgres image, and RLS has no bearing on the
-- atomicity guarantees this test actually checks.
--
-- This must be kept in sync BY HAND with the source-of-truth SQL run in
-- the Supabase SQL editor (see /Users/hiteshbhardwaj/.claude/plans/concurrent-squishing-emerson.md,
-- section 1) - there is no migration tooling in this repo to do it for you.

create extension if not exists pgcrypto;

create table if not exists founding_slot_counter (
  id smallint primary key default 1,
  claimed integer not null default 0,
  constraint founding_slot_counter_single_row check (id = 1),
  constraint founding_slot_counter_cap check (claimed >= 0 and claimed <= 100)
);
insert into founding_slot_counter (id, claimed) values (1, 0) on conflict (id) do nothing;

create table if not exists founding_slot_reservations (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  idempotency_key text not null,
  status text not null default 'reserved' check (status in ('reserved', 'confirmed', 'released')),
  currency text,
  razorpay_subscription_id text,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founding_slot_reservations_idempotency_key_key unique (idempotency_key),
  constraint founding_slot_reservations_razorpay_sub_id_key unique (razorpay_subscription_id)
);

create unique index if not exists founding_slot_reservations_one_active_per_user
  on founding_slot_reservations (clerk_user_id) where status in ('reserved', 'confirmed');
create index if not exists founding_slot_reservations_status_expires_idx
  on founding_slot_reservations (status, expires_at) where status = 'reserved';

create or replace function claim_founding_slot(
  p_clerk_user_id text, p_idempotency_key text, p_currency text, p_ttl_seconds integer default 900
) returns setof founding_slot_reservations language plpgsql as $$
declare
  v_reservation founding_slot_reservations;
  v_stale founding_slot_reservations;
begin
  if p_clerk_user_id is null or p_clerk_user_id = '' or p_idempotency_key is null or p_idempotency_key = '' then
    raise exception 'clerk_user_id and idempotency_key are required';
  end if;

  for v_stale in
    select * from founding_slot_reservations
    where status = 'reserved' and expires_at < now()
    order by expires_at limit 20 for update skip locked
  loop
    update founding_slot_counter set claimed = greatest(claimed - 1, 0) where id = 1;
    update founding_slot_reservations
      set status = 'released', released_at = now(), release_reason = 'expired', updated_at = now()
      where id = v_stale.id;
  end loop;

  select * into v_reservation from founding_slot_reservations where idempotency_key = p_idempotency_key;
  if found then return next v_reservation; return; end if;

  select * into v_reservation from founding_slot_reservations
    where clerk_user_id = p_clerk_user_id and status in ('reserved', 'confirmed');
  if found then return next v_reservation; return; end if;

  begin
    update founding_slot_counter set claimed = claimed + 1 where id = 1;
    insert into founding_slot_reservations (clerk_user_id, idempotency_key, currency, status, expires_at)
      values (p_clerk_user_id, p_idempotency_key, p_currency, 'reserved', now() + make_interval(secs => p_ttl_seconds))
      returning * into v_reservation;
    return next v_reservation; return;
  exception
    when check_violation then
      return;
    when unique_violation then
      select * into v_reservation from founding_slot_reservations
        where idempotency_key = p_idempotency_key
           or (clerk_user_id = p_clerk_user_id and status in ('reserved', 'confirmed')) limit 1;
      if found then return next v_reservation; end if;
      return;
  end;
end;
$$;

create or replace function confirm_founding_slot(p_reservation_id uuid, p_razorpay_subscription_id text)
returns setof founding_slot_reservations language plpgsql as $$
declare v_reservation founding_slot_reservations;
begin
  update founding_slot_reservations
    set status = 'confirmed', confirmed_at = now(), razorpay_subscription_id = p_razorpay_subscription_id, updated_at = now()
    where id = p_reservation_id and status = 'reserved' returning * into v_reservation;
  if found then return next v_reservation; return; end if;
  select * into v_reservation from founding_slot_reservations where id = p_reservation_id;
  if found then return next v_reservation; end if;
  return;
end;
$$;

create or replace function release_founding_slot(p_reservation_id uuid, p_reason text)
returns setof founding_slot_reservations language plpgsql as $$
declare v_reservation founding_slot_reservations;
begin
  update founding_slot_reservations
    set status = 'released', released_at = now(), release_reason = p_reason, updated_at = now()
    where id = p_reservation_id and status = 'reserved' returning * into v_reservation;
  if found then
    update founding_slot_counter set claimed = greatest(claimed - 1, 0) where id = 1;
    return next v_reservation; return;
  end if;
  select * into v_reservation from founding_slot_reservations where id = p_reservation_id;
  if found then return next v_reservation; end if;
  return;
end;
$$;
