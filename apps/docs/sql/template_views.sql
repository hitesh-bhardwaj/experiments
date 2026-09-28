-- No migration tooling exists in this repo (see apps/docs/test/fixtures/
-- *.sql for the established pattern) - Supabase schema changes are hand-run
-- in the Supabase SQL editor. Run this once to add the table
-- recordTemplateView() / getTemplateViewCounts() (both in
-- apps/docs/src/lib/template-views.js) depend on.
--
-- One row per (template_slug, identity_key, view_date) - a reload or repeat
-- visit by the same viewer on the same UTC day doesn't inflate the count,
-- the same day-bucketed dedup convention install_events/install_unlocks
-- already use (see lib/install-limit.js). identity_key is
-- `user:<clerk_user_id>` for a signed-in viewer, `ip:<hashed ip>` otherwise
-- (same hashIp() salt as install-limit.js, so a raw IP is never stored).

create table template_views (
  id uuid primary key default gen_random_uuid(),
  template_slug text not null,
  identity_key text not null,
  view_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  unique (template_slug, identity_key, view_date)
);

create index template_views_slug_idx on template_views (template_slug);
