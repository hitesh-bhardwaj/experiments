-- No migration tooling exists in this repo (see vault-main/test/fixtures/
-- *.sql for the established pattern) - Supabase schema changes are hand-run
-- in the Supabase SQL editor. Run this once to add the table
-- /api/wishlist-templates (used by useTemplateWishlist.js) depends on.
--
-- Sibling to wishlisted_effects, scoped down: templates are already fully
-- described by mock-templates.js (title/category/cover/etc.), so unlike
-- wishlisted_effects this doesn't duplicate that display data - just the
-- (user, template) pairing itself.

create table wishlisted_templates (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  template_slug text not null,
  created_at timestamptz not null default now(),
  unique (clerk_user_id, template_slug)
);

create index wishlisted_templates_clerk_user_id_idx
  on wishlisted_templates (clerk_user_id);
