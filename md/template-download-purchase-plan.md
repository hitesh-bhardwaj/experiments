# Downloadable Template Projects + Purchase/Access Gating

## Context

`/templates` today (`apps/docs/src/app/(app)/(workspace)/templates/`) is explicitly
"design-only" - mock data (`apps/docs/src/lib/mock-templates.js`), a detail page
(`[slug]/template-detail.jsx`) that iframes the live preview at
`/template-demo/<slug>`, and **no purchase flow, no access control, no download
of any kind.** `md/sections-templates-plan.md` already lays out the intended
business model (approved, never started): templates are bundled free for
**annual** Pro subscribers only (monthly Pro does not get them), or purchasable
standalone as a one-time payment by anyone. The QC checklist
(`md/template-qc-checklist.md`) is the shipping gate for each template scaffold
itself (§12: zip must "extract cleanly and contain a complete, runnable
project"; §13: gated download must never serve the zip via a public/static
path).

Research this session found the plan doc is right about the *shape* of the
feature but wrong about two concrete things: the payment provider is
**Razorpay**, not Stripe (already fully wired for subscriptions, with a
one-time-order primitive that exists but is unused), and there's no migration
tooling - Supabase schema changes are hand-run in the SQL editor by convention
(see `apps/docs/test/fixtures/*.sql` for the pattern to match).

The best possible news: `template-demo/elenavoss/` (the actual live
implementation) is **already almost fully self-contained** - zero `@/`
app-infra imports, zero API calls, all its own fonts/assets/effects live
inside its own folder. Turning it into a standalone npm-installable project is
mostly a matter of adding the *outer* scaffolding (package.json, next.config,
root layout, Tailwind entry) around a folder that barely needs to change
internally. Lumera and Oris Dental need the same treatment plus 1-3 extra
shared files each (confirmed via research, listed below).

**Decisions locked in with the user before this plan:** zip storage is Vercel
Blob (no new credentials needed - reuses `BLOB_READ_WRITE_TOKEN`, which Vercel
provisions automatically once Blob is enabled on the project); pricing is
tiered by complexity ($29 Elena Voss / $39 Lumera / $49 Oris Dental); this pass
fully builds and validates the pipeline on **Elena Voss only**, then replicates
the proven pattern to Lumera and Oris Dental as a fast follow-up within the
same pass (not a separate future task - see Phase F).

---

## Phase A - Elena Voss: standalone project scaffold + packaging script

**Goal:** a reusable script that takes `template-demo/<slug>/` and produces a
real, `npm i`-able Next.js project zip. Built once, generic over slug, so
Phase F (Lumera, Oris Dental) is "run it again with a small per-template
extras list," not a rewrite.

**New: `scripts/template-scaffold/`** - the boilerplate files every exported
template needs, as templates with `__SLUG__`/`__TITLE__` placeholders:
- `package.json` - `next@16.3.1`, `react@19.2.7`, `react-dom@19.2.7` (pinned
  to match `apps/docs/package.json` exactly - this app's `AGENTS.md` warns
  these are intentionally non-default versions), plus only the deps a given
  template actually uses (`gsap`, `@gsap/react`, `lenis`, `lucide-react`,
  `zod` for Elena Voss; `@react-three/fiber`/`@react-three/drei`/`three` added
  for Oris Dental in Phase F). Dev deps: `typescript`, `@types/{react,node,react-dom}`,
  `tailwindcss@^4`, `@tailwindcss/postcss@^4.3.0`, `postcss`.
- `tsconfig.json` - standard Next App Router config, no `@/*` alias needed
  (every template file uses relative imports only).
- `next.config.mjs` - minimal: no bundle analyzer, no Sentry, no redirects, no
  CSP headers, no broad remote-image allowlist (Elena Voss uses zero remote
  images).
- `postcss.config.mjs` - copy of `apps/docs/postcss.config.mjs` verbatim (5 lines).
- `app/layout.tsx` - html/body with the same dark bg/fg pairing as the real
  site (`#050505`/`#fff`), imports `./globals.css`, per-template `<title>`.
  Explicitly **excludes** everything research confirmed Elena Voss doesn't
  use: ClerkProvider, analytics/GTM, recaptcha, JSON-LD, PageTransition,
  Lenis-at-layout-level (Elena Voss self-wraps with `<ReactLenis root>` inside
  its own `page.tsx` already).
- `app/globals.css` - `@import "tailwindcss";` plus **only** the 7-line
  `@theme` radius override block copied from `apps/docs/src/app/globals.css`
  (`--radius-sm` through `--radius-full`) - confirmed this is the one real
  visual dependency (`rounded-md/lg/xl/2xl` usage) on the shared theme; no
  color/font tokens are used.
- `.gitignore` - standard Next.js one.
- `README.md.template` - real install/run instructions (`npm i`, `npm run
  dev`), fixing the stale path reference the existing `elenavoss/README.md`
  has (it currently points at `apps/docs/src/app/(marketing)/templates/elenavoss/`,
  which doesn't exist - the real source is `template-demo/elenavoss/`).
- `LICENSE.template` - short license note per QC §11 (what a buyer may do
  with the code); match the site's published effect-license language if one
  exists (check `md/` or the site's `/legal` pages for existing wording to
  reuse rather than invent new terms).

**New: `scripts/package-template.mjs`** (Node, run via `node
scripts/package-template.mjs <slug>`):
1. Reads a small per-slug manifest (inline in the script) of: source folder
   (`apps/docs/src/app/(marketing)/template-demo/<slug>`), extra shared files
   to copy in (empty array for Elena Voss; `["components/SmoothScroll/LenisScroll.jsx",
   "lib/motion.js"]`-style entries for Lumera/Oris Dental in Phase F), and
   extra npm deps beyond the common set.
2. Copies the source folder's contents into `app/` in a temp build dir (its
   internal relative-import structure needs zero changes - only its
   *location* changes, from a nested route to the project root).
3. Copies in any extra shared files, rewriting their `@/...` imports to
   relative paths (there are at most 1-3 of these per template, per research -
   hand-write the rewrite per file in the manifest rather than building a
   generic import-rewriter).
4. Writes out the boilerplate files from `scripts/template-scaffold/` with
   placeholders substituted.
5. Zips the temp dir (`archiver` - new devDependency) to
   `dist/template-zips/<slug>.zip`.
6. If `BLOB_READ_WRITE_TOKEN` is set, uploads via `@vercel/blob`'s `put()`
   (new dependency) and prints the resulting URL; otherwise just leaves the
   zip on disk and prints a reminder to upload it manually and paste the URL
   into `mock-templates.js`.

**Verification (done in this pass, not deferred):** run the script for
`elenavoss`, then in the generated temp dir actually run `npm install && npm
run build` (and spot-check `npm start` serves the page) - this directly
satisfies QC §3's [BLOCK] items ("scaffold's own `next build` completes with
zero errors, standalone, in a clean checkout") rather than assuming it works.

---

## Phase B - Access control + purchase record

**New: `apps/docs/sql/template_purchases.sql`** (hand-run reference, matching
the existing fixture convention in `apps/docs/test/fixtures/*.sql` - no
migration tooling exists in this repo, confirmed):
```sql
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
create index template_purchases_clerk_user_id_idx on template_purchases (clerk_user_id);
```
(User needs to run this by hand in the Supabase SQL editor - same as every
other schema change in this repo.)

**New: `apps/docs/src/lib/template-access.js`** - sibling to
`apps/docs/src/lib/effect-access.js`, same `decision()`/reason-string shape.
`getTemplateAccessDecision({ clerkUserId, templateSlug, includedInAnnualPro })`:
- No `clerkUserId` → `decision("anonymous")`.
- Query `subscriptions` with `.select("plan, status, current_period_end,
  billing_interval")` (the extra column `getEffectAccessDecision` doesn't
  select today - this is the one real gap the plan doc's "open item" flagged,
  and it's a one-line fix since the column is already populated by
  `pro-access.js`'s `markUserProFromSubscription`). Reuse the exact same
  active/expired/revoked checks as `evaluateSubscriptionRow`, plus: if
  `includedInAnnualPro && row.billing_interval === "yearly"` → allowed,
  reason `"annual-pro-included"`.
- Otherwise (or in parallel), query `template_purchases` for a row matching
  `(clerk_user_id, template_slug)` → allowed, reason `"standalone-purchase"`
  if found.
- No CLI-token branch (templates aren't CLI-installable per the plan doc).

**New: `apps/docs/src/lib/template-purchases.js`** - `recordTemplatePurchase({
clerkUserId, templateSlug, razorpayPaymentId, razorpayOrderId, amount,
currency })`, mirroring `recordInvoice()`'s upsert pattern in
`apps/docs/src/lib/pro-access.js` (`onConflict: "razorpay_payment_id"`, same
service-role Supabase client from `@/lib/supabase`).

---

## Phase C - One-time purchase flow (extend existing Razorpay routes)

**Modify `apps/docs/src/app/api/razorpay/create-order/route.js`:** accept an
optional `templateSlug` in the request body. When present, look up the price
**server-side** from `mock-templates.js`'s new `pricing.standaloneOneTime`
field (never trust a client-supplied amount for real money - the current
test-only route does trust `body.amount`, which is fine for its "test
payment" purpose but must not carry over here). Add `template_slug` to
`order.notes` alongside the existing `clerk_user_id`, so `verify-payment` can
read back which template was being bought.

**Modify `apps/docs/src/app/api/razorpay/verify-payment/route.js`:** in the
order branch (currently just logs and returns `{ verified: true }` - no
Supabase write happens for one-time orders today), after signature
verification: `razorpay.orders.fetch(razorpay_order_id)`, confirm
`order.notes.clerk_user_id === userId`, and if `order.notes.template_slug`
is present call `recordTemplatePurchase(...)` from Phase B.

**No changes needed to `RazorpayCheckoutButton.jsx`** - it's already dual-mode
(`amount` prop → one-time order flow) and exactly fits: `<RazorpayCheckoutButton
amount={template.pricing.standaloneOneTime} currency="USD" onSuccess={...}>`.
Extend its request body to also pass `templateSlug` through to
`create-order` (small addition - currently it only sends `{ amount }` in the
non-`plan` branch).

**Modify `apps/docs/src/lib/mock-templates.js`:** add to each of the 3
template objects:
```js
pricing: { standaloneOneTime: 29, includedInAnnualPro: true }, // 39 / 49 for lumera/oris-dental
```
(Registry-driven `template.json` per the original plan doc is intentionally
skipped for now - `registry/templates/` doesn't exist and building the whole
registry-backed system is out of scope here; `mock-templates.js` stays the
source of truth, consistent with the feature's current "design-only, mock
data" state everywhere else.)

---

## Phase D - Gated download route

**New: `apps/docs/src/app/api/templates/[slug]/download/route.js`** (GET):
1. `auth()` from `@clerk/nextjs/server` → 401 if no `userId`.
2. Look up the template via `getTemplateBySlug(slug)` from `mock-templates.js`
   → 404 if not found.
3. `getTemplateAccessDecision({ clerkUserId: userId, templateSlug: slug,
   includedInAnnualPro: template.pricing.includedInAnnualPro })` → 403 if not
   allowed.
4. Server-side `fetch()` the template's Vercel Blob URL (stored in a new
   `scaffoldBlobUrl` field on the mock template object, kept server-only -
   never sent to the client) and stream the response back with
   `Content-Disposition: attachment; filename="<slug>.zip"` and
   `Content-Type: application/zip`.

This satisfies QC §13's [BLOCK] item directly: the consumer-facing URL is
always this authenticated route, never the raw blob URL, and access is
re-checked on every request rather than hidden behind a UI button.

---

## Phase E - UI: Download Zip button + paywall

**Modify `apps/docs/src/app/(app)/(workspace)/templates/[slug]/page.js`**
(confirmed: already an `async` server component doing
`getTemplateBySlug`/`getRelatedTemplates` and rendering `<TemplateDetail
template={template} relatedTemplates={...} />` - lines 33-45). Add `const
{ userId } = await auth()` (`@clerk/nextjs/server`) and `const templateAccess
= await getTemplateAccessDecision({ clerkUserId: userId, templateSlug: slug,
includedInAnnualPro: template.pricing.includedInAnnualPro })`, then pass
`templateAccess={templateAccess}` as a new prop into `<TemplateDetail>` -
avoids a client-side fetch/loading-flicker and matches how
`isLoaded/isSignedIn/user` are already passed into `VaultHeader` elsewhere.

**Modify `template-detail.jsx`:** add a "Download Zip" button immediately to
the left of the existing "Open in New Tab" `ButtonV3` (lines ~152-160,
inside the same `flex flex-wrap items-center justify-between` row):
- If `templateAccess.allowed`: a button that does `window.location.href =
  `/api/templates/${template.slug}/download`` on click (deliberately a plain
  browser navigation via `window.location`, not `ButtonV3`'s Next `<Link>` -
  a `<Link>` to a Route Handler risks Next's client-router prefetch
  machinery interfering with what needs to be a real file-download
  response).
- If not allowed: opens a paywall modal instead of navigating.

**New: `apps/docs/src/components/ui/TemplatePaywallModal.jsx`** - same visual
language as `LockedCodePlaceholder` (`effect-detail.jsx:1258-1325`: blurred
code teaser, `LockKeyhole` icon, "This is a Pro Effect."-style heading) but
templated for "Buy this template" with an inline `<RazorpayCheckoutButton
amount={template.pricing.standaloneOneTime} currency="USD" onSuccess={() => {
router.refresh(); /* then trigger the download */ }}>Buy Template - $
{template.pricing.standaloneOneTime}</RazorpayCheckoutButton>` - reuses the
existing button component as-is (Phase C only extended its request body, not
its API), no subscription-upsell copy since this is a one-time purchase, not
a plan upgrade.

---

## Phase F - Replicate for Lumera and Oris Dental

Once Elena Voss's full pipeline (script → zip → `npm i && npm run build` →
purchase → gated download) is verified end-to-end, repeat Phase A's script
run for `lumera` and `oris-dental` with their small per-template extras
(already identified by research, so no new investigation needed):
- **Lumera**: copy in `LenisScroll.jsx` (from
  `components/SmoothScroll/LenisScroll.jsx`) and `lib/motion.js`
  (`prefersReducedMotion`), rewriting their `@/lib/motion` import to a
  relative path.
- **Oris Dental**: copy in `ScrollTopOnLoad.jsx` (from
  `homepage-v3/components/ScrollTopOnLoad.jsx`); also add
  `@react-three/fiber`, `@react-three/drei`, `three` to that template's
  `package.json` deps (confirmed used for its 3D tooth visualizer), and keep
  the existing `.glb`/`.gltf` webpack rule in its `next.config.mjs` (the only
  one of the three templates that needs it).

Add `pricing: { standaloneOneTime: 39, includedInAnnualPro: true }` (Lumera)
and `{ standaloneOneTime: 49, includedInAnnualPro: true }` (Oris Dental) to
`mock-templates.js`. Run the same `npm i && npm run build` verification for
both before considering them shippable.

---

## Verification

- **Phase A**: generated Elena Voss project - `npm install` clean, `npm run
  build` zero errors, `npm start` serves `/` and matches the live
  `/template-demo/elenavoss` preview visually (QC §15 preview-parity check).
- **Phase B/C**: with Razorpay test-mode keys, complete a real one-time
  checkout end-to-end (`create-order` → Razorpay checkout modal →
  `verify-payment`) and confirm a `template_purchases` row is written.
- **Phase D**: as a monthly-Pro (or free) test account, confirm the download
  route 403s before purchase and 200s-with-zip-attachment after; as an
  annual-Pro test account, confirm it 200s immediately with no purchase
  needed (QC §13's two [BLOCK] items, verified per-template as the checklist
  requires).
- **Phase E**: click through both button states in the browser - unpurchased
  monthly-Pro/free user sees the paywall modal and can complete a purchase
  inline; annual-Pro/already-purchased user's click downloads immediately.
- Re-run `npm run lint` (`apps/docs`) across all new/changed files before
  calling this done, matching this session's established convention.
