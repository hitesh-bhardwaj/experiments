-- No migration tooling exists in this repo (see apps/docs/test/fixtures/
-- *.sql for the established pattern) - Supabase schema changes are hand-run
-- in the Supabase SQL editor. Run this once to add the table
-- getTemplateAccessDecision() / recordTemplatePurchase() (both in
-- apps/docs/src/lib/) depend on. See md/template-download-purchase-plan.md.

create table template_purchases (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  template_slug text not null,
  razorpay_payment_id text not null unique,
  razorpay_order_id text,
  amount integer,
  currency text default 'USD',
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create index template_purchases_clerk_user_id_idx
  on template_purchases (clerk_user_id);
