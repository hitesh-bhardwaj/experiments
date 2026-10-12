-- Pro / Pro+ plans and template credits. No migration tooling exists in this
-- repo (see sql/template_purchases.sql) - run this once in the Supabase SQL
-- editor, before deploying the code that reads it (src/lib/plans.js,
-- src/lib/template-credits.js).

-- 1. Which paid tier a subscriber is on. subscriptions.plan stays "pro" for
--    every paid subscriber (that's what access checks gate on); tier is
--    null for rows from before Pro+ existed, which the code treats as Pro+.
alter table subscriptions
  add column if not exists tier text check (tier in ('pro', 'pro_plus'));

-- billing_interval gains 'quarterly'. If subscriptions has a check
-- constraint on billing_interval, widen it to include 'quarterly' first:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'subscriptions'::regclass and contype = 'c';

-- 2. Template credits ledger: +N per qualifying subscription charge, -1 per
--    redemption. Balance = sum(delta). A charge can only add credits once
--    (unique razorpay_payment_id), so webhook retries and verify-payment
--    racing the webhook never double-grant.
create table if not exists template_credits (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('grant', 'redeem', 'adjust')),
  razorpay_payment_id text,
  razorpay_subscription_id text,
  template_slug text,
  created_at timestamptz not null default now()
);

-- A plain unique constraint, not a partial index: the app's upsert
-- (on conflict (razorpay_payment_id)) can only target a full one. Postgres
-- treats NULLs as distinct, so redemption rows (no payment ID) still fit.
alter table template_credits
  add constraint template_credits_razorpay_payment_id_key unique (razorpay_payment_id);
create index if not exists template_credits_clerk_user_id_idx
  on template_credits (clerk_user_id);

-- 3. A template redeemed with a credit is recorded as a template purchase
--    with no Razorpay payment behind it.
alter table template_purchases alter column razorpay_payment_id drop not null;
alter table template_purchases
  add column if not exists source text not null default 'purchase'
  check (source in ('purchase', 'credit'));

-- 4. Spend one credit on a template, atomically. The advisory lock
--    serialises redemptions per user, so two clicks at once can't spend the
--    same credit or redeem the same template twice. Plan/catalogue checks
--    happen in the API route before this is called.
--    Returns one row: status = 'redeemed' | 'already-owned' | 'no-credits',
--    balance = credits left afterwards.
create or replace function redeem_template_credit(p_clerk_user_id text, p_template_slug text)
returns table (status text, balance integer) language plpgsql as $$
declare
  v_balance integer;
begin
  if p_clerk_user_id is null or p_clerk_user_id = '' or p_template_slug is null or p_template_slug = '' then
    raise exception 'clerk_user_id and template_slug are required';
  end if;

  perform pg_advisory_xact_lock(hashtext('template_credits:' || p_clerk_user_id));

  select coalesce(sum(delta), 0)::integer into v_balance
    from template_credits where clerk_user_id = p_clerk_user_id;

  if exists (
    select 1 from template_purchases
    where clerk_user_id = p_clerk_user_id and template_slug = p_template_slug
  ) then
    return query select 'already-owned'::text, v_balance;
    return;
  end if;

  if v_balance < 1 then
    return query select 'no-credits'::text, v_balance;
    return;
  end if;

  insert into template_credits (clerk_user_id, delta, reason, template_slug)
    values (p_clerk_user_id, -1, 'redeem', p_template_slug);

  insert into template_purchases (clerk_user_id, template_slug, amount, currency, status, source)
    values (p_clerk_user_id, p_template_slug, 0, null, 'paid', 'credit');

  return query select 'redeemed'::text, v_balance - 1;
end;
$$;

-- Server-only, like the other RPCs: the app calls it with the service role key.
revoke all on function redeem_template_credit(text, text) from public, anon, authenticated;
alter table template_credits enable row level security;
