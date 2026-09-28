# Sections & Templates for Hyperiux Vault

*Planning memo - hyperiux-pro-components / apps/docs - approved plan, not yet started*

Adds two new content types to the Vault: composed page **Sections** (hero,
feature, testimonial, footer, etc.) and full multi-page **Templates**
(agency, studio, portfolio, industry-specific landing pages). Grounded in a
live audit of Aceternity, ReactBits, Magic UI, and OriginKit, plus direct
inspection of this repo's registry/CLI/Sanity pipeline. Nothing here is
built yet.

## Context

Today the Vault sells one thing: individual interaction effects (134
registry entries, one component each). Competitors sell three tiers of
granularity: individual effects, composed page Sections, and full
multi-page Templates. Hyperiux has no Sections or Templates concept
anywhere - not in the registry schema, not in Sanity, not in the CLI, not
in site nav. This plan adds both, reusing as much of the existing effect
pipeline as actually fits, and builds only what's genuinely new.

It also fixes a confirmed, real gap: the product/buy page
(`effects/[slug]/effect-detail.jsx`) currently shows a **pre-recorded video**
in its main preview slot, not a live interactive demo - even though a full
live-mount system (the Remixer Panel) already exists and is used on a
separate `/demo/<slug>` route reached only by an outbound link. The goal is
live interactivity on the detail page itself, not a click-away.

**Business model, as decided by the owner:** Templates are bundled free for
**annual** Pro subscribers only - monthly Pro subscribers do not get them.
Anyone (subscriber or not) can also buy a single template standalone,
one-time payment, direct download - exactly Aceternity's model. This means
Templates are a **downloadable scaffold product**, not a CLI-installable
bundle: `npx hyperiux add <template>` does not apply here, since the
deliverable is a whole standalone Next.js project a buyer unzips and runs
themselves, matching what "just like Aceternity" concretely means.

Sections, by contrast, stay exactly like effects - same CLI, same
`registry.json`, same access model - so they get built almost for free.

---

## 1. Sections - reuse the effect pipeline, don't invent one

Confirmed via `scripts/component-workflow.mjs:665-686` (`makeRegistryJson`)
and repo-wide grep: today's `registry.json` shape already has everything a
Section needs - `props`/`remixer` (the Remixer Panel already works on
anything with this schema, no new code), `tier`, `files[]`, `target`,
`registryDependencies` (present in every entry today but always `[]` -
finally gets used for real: a hero section legitimately depends on a Button
or text-reveal effect). `registryJson.type` (top-level) is confirmed **never
branched on anywhere** in either repo - pure passthrough - so setting it to
`"registry:block"` for Sections costs nothing and gives every future
consumer a free discriminator.

**Changes:**
- New Section entries live at `registry/effects/<category>/<slug>/` exactly
  like effects today, just `"type": "registry:block"` and a Section-specific
  `category`.
- `apps/docs/scripts/build-registry.js` - no functional change; `type`
  already passes through as-is (confirmed at the line reading
  `registryJson.type || "registry:component"`).
- `apps/docs/test/effect-harness.js` - add `getRegistrySections()` sibling
  to the existing `getRegistryEffects()`, filtering `registry/index.json` by
  `type === "registry:block"`. No new harness file.
- CLI (`hyperiux-components/packages/cli/src/commands/add.js`) - **zero
  change**. It already writes arbitrary `files[]` to arbitrary
  `targetPath`, and already recurses `registryDependencies`. `npx hyperiux
  add <section-slug>` works the moment a Section registry entry exists.
- MCP (`packages/mcp-server/src/`) - zero change, same reasoning.

**Sanity:** do not create a new `sectionContent` document type. Confirmed
`hyperiux-vault/schemaTypes/effectContent.js` has nothing effect-specific in
it - it's already generic display content keyed by `categorySlug`/
`effectSlug`. Extend the category list it's keyed against instead of
forking the schema.

**Category taxonomy:** add a new exported array `sectionCategories` in
`apps/docs/src/lib/categories.js`, structurally identical to today's
`effectCategories` (same shape, same helpers parameterized to accept which
list to search - don't hand-roll parallel `getSectionCategoryBySlug` copies
of every helper). Starting category set, following the **denser, folded**
taxonomy ReactBits uses rather than Aceternity's more granular one (our
catalog is small - 134 items total - so fewer, denser categories read
better than a long thin sidebar): **Hero, Feature, Social Proof
(testimonials + logo clouds folded together), Footer, Contact, About (team
folded in), Blog, CTA.** This is a content-strategy call made by default,
not a hard architecture constraint - easy to split later if a category
gets crowded.

**Site routes:** `/sections` as a new top-level route, sibling to
`/effects`, reusing the existing category-grid/listing UI
(`VaultContent`/`EffectCardNew` already work unchanged since a Section *is*
a `registryItem` shape). Detail pages reuse `effect-detail.jsx` largely
as-is (it's already generic over `effect`/`content`/`categorySlug` - nothing
assumes "small interaction effect"); the one real addition is a
`previewAspectRatio` field (default = today's `aspect-16/8.5`) since a tall
About/Team section would badly crop at the hero-tuned ratio.

---

## 2. Templates - new data model, scaffold delivery

No existing bundle/kit/collection primitive exists anywhere (confirmed:
every `registryDependencies` across all 134 entries is `[]`, no Sanity
schema, no CLI verb, no nav). This is genuinely new.

### 2a. `template.json` - new manifest, own top-level directory

`registry/templates/<category>/<slug>/template.json`, kept **outside**
`registry/effects/` since a template isn't itself an installable single
component - it's a manifest over a full standalone project plus references
to which Sections/Effects it's built from (for the "what's inside"
showcase list and for QC's coverage check, not for CLI install):

```json
{
  "name": "studio-portfolio",
  "version": "1.0.0",
  "type": "registry:template",
  "title": "Studio Portfolio",
  "description": "...",
  "industry": "creative-studio",
  "layout": "single-page | multi-page",
  "sectionsUsed": ["cinematic-hero", "studio-about-split", "minimal-footer"],
  "pages": [
    { "route": "/", "label": "Home" },
    { "route": "/work", "label": "Work" },
    { "route": "/contact", "label": "Contact" }
  ],
  "dependencies": ["gsap", "lenis"],
  "scaffoldAsset": "templates/studio-portfolio.zip",
  "pricing": { "standaloneOneTime": 79, "includedInAnnualPro": true },
  "previewUrl": "/template-demo/studio-portfolio",
  "qc": { "status": "passed", "lastRunAt": "2026-08-21", "gateVersion": "1.0" }
}
```

`sectionsUsed`/`pages` describe the assembly for display and QC purposes
only - the actual deliverable is the zip at `scaffoldAsset`, built and
uploaded separately (see §2c), not assembled by the CLI at install time.

### 2b. Sanity - new `templateContent` document

Templates need fields `effectContent` has no equivalent for (page/section
showcase lists, industry tag, layout type), so this one genuinely earns a
new schema, unlike Sections:

- `hyperiux-vault/schemaTypes/templateContent.js` (new) - `templateSlug`,
  `industry`, `layout`, `title`, `summary`, `tier`, `body` (reuse the
  existing `effectBody` portable-text type), `sectionShowcase` (string
  array, drives "what's inside"), `pageShowcase` (array of
  `{route, label, thumbnail}`, drives the multi-page preview switcher),
  `ctaBanner`/`seo` (reuse `effectCtaBanner`/`effectSeo` verbatim).
- `hyperiux-vault/schemaTypes/index.js` - register the new type.
- `apps/docs/src/lib/sanity.js` - add `getAllSanityTemplateEntries`/
  `getSanityTemplateContent`, same query pattern as the existing
  `getAllSanityEffectEntries`, filtered on `_type == "templateContent"`.

### 2c. Delivery - zip scaffold, not CLI install

Each template is authored as its own standalone Next.js project (own
`app/` tree, own config, assembled from Section/Effect source but not
required to stay in sync with the registry copies after the fact - it's a
point-in-time export). Build tooling zips it and uploads to the same blob
storage already used for other Vault assets (Vercel Blob, per the
`public-blob-vercel-storage` URLs already seen in `categories.js`).

**New access-control layer needed** - this is the part that doesn't exist
today and needs verifying, not assuming, before implementation starts:

- Confirm whether `apps/docs/src/lib/subscription.js`'s `getUserPlan()`
  currently distinguishes billing **interval** (monthly vs annual) at all,
  or only plan tier (free/pro). If Stripe subscription data isn't already
  surfaced with interval, that's the first real unknown to close - the
  "annual only" rule is unenforceable without it.
- New `getTemplateAccessDecision({ clerkUserId, templateSlug })` sibling to
  `getEffectAccessDecision()` (`apps/docs/src/lib/effect-access.js`),
  returning `allowed` if (a) user is on an **annual** Pro plan, OR (b) user
  has a recorded standalone purchase for that specific template slug.
- New table, e.g. `template_purchases` (`clerk_user_id`, `template_slug`,
  `purchased_at`, `stripe_payment_intent_id`) - a one-time Stripe Checkout
  (Payment mode, not Subscription mode) per template, webhook-recorded.
  This is a new checkout flow distinct from the existing subscription
  checkout - needs its own Stripe Price per template (or a single
  metered/line-item product parameterized by template slug, whichever
  matches how Stripe products are already modeled here).
- New gated download route, e.g. `api/templates/[slug]/download/route.js`
  - checks `getTemplateAccessDecision`, then returns a short-lived signed
  URL to the blob zip (never a public static path - same "gate the actual
  bytes, not just the button" principle already used for Pro effect
  source).

**CLI/MCP implications: minimal.** No `add` command changes - templates
aren't installed via CLI at all. At most, a read-only `list-templates`/
`get-template` MCP tool for discovery (mirrors `get-effect.ts`'s shape,
returns metadata + a link to the website purchase/download page, no
install action) - genuinely optional, not required for v1.

### 2d. Site routes

- `/templates` - new top-level route, sibling to `/effects` and
  `/sections`. Card layout shows "N sections / M pages," industry tag,
  and pricing (annual-Pro-included vs one-time price) instead of a single
  preview video thumbnail.
- `/templates/[slug]` - new detail page
  (`apps/docs/src/app/(app)/templates/[slug]/template-detail.jsx` +
  `page.js` wrapper, mirroring the access-decision-then-render pattern of
  today's `effects/[slug]/[effectSlug]/page.js` but against
  `getTemplateAccessDecision` instead).

---

## 3. Interactive live preview on the detail page

**Constraint that shapes this** (confirmed): Next.js serializes every prop
passed into a `"use client"` component regardless of whether it renders, so
Pro source can never be passed as a string into a generic preview mount -
confirmed `stripFileContent` exists in
`effects/[slug]/[effectSlug]/page.js` specifically to prevent this. The
existing `/demo/<slug>` routes avoid the problem entirely by **statically
importing the compiled component module** at build time - never serialized,
never tier-gated as text.

**Recommended mechanism (Sections & Effects):** embed the existing
`/demo/<slug>` route in an `<iframe loading="lazy">` inside
`effect-detail.jsx`'s current preview slot, replacing the `<video>` block
(today at roughly lines 514-559), same aspect-ratio container, poster image
as the lazy-load placeholder so there's no visual regression during load.
This reuses 100% of the existing Remixer Panel system with zero new build
tooling - the panel already renders correctly at that route today. Needs:
a `?boxed=1` param the iframe route reads to pass tighter
`layoutConfig`/`buttonClassName` overrides into `RegistryRemixerDemo` (the
panel's floating-launcher position is tuned for fullscreen, not a boxed
iframe); no postMessage bridge needed since clipboard "Copy Code" writes
happen inside the iframe's own document.

Ship this first. A build-time import-manifest alternative (avoiding the
iframe's extra route round-trip, giving the panel native fullscreen layout)
is real but strictly an optimization - only worth it if the iframe's extra
render is measured as an actual problem after shipping.

**Templates:** given multi-page, whole-project scope, an iframe is the only
sound option - an in-page live-mount of an entire second Next.js app isn't
a "dynamic import." New route
`apps/docs/src/app/(marketing)/template-demo/[slug]/page.tsx` assembles the
template's sections client-side per `template.json`'s `pages[]`/
`sectionsUsed` list (statically importing each section's compiled module,
same technique as the effect demo routes), with a client-side page switcher
standing in for real multi-page routing since the whole thing renders
inside one iframe-able surface. The template detail page embeds this with a
device-size toggle (mobile/tablet/desktop: fixed iframe widths +
`transform: scale()` to fit the container).

Since this is the pre-purchase convincer for a paid, no-refund-friendly
download product, this preview matters more here than anywhere else in the
plan - Aceternity's own template pages lead with exactly this kind of live
preview before the buy button.

---

## 4. QC checklist - Sections

Grounded in the site's own already-published quality bar
(`apps/docs/src/lib/categories.js`, `effectsOverviewContent.faqs`) plus
what's new because a Section must survive being dropped into a real page
layout, which a standalone effect never had to prove.

**MUST-BLOCK:**
1. `registry.json` validates - `tier`, `category`, `main`,
   `exportName`/`exportKind` present (extend the existing
   `build-registry.js` validation that already throws on missing `tier`).
2. Renders without throwing in the jsdom render harness
   (`getRegistrySections()`, §1).
3. **Responsive at 375 / 768 / 1280px** - no horizontal scroll, no
   overlapping text, no clipped content. New relative to today's effect
   bar, since a standalone effect never had to prove it survives an
   arbitrary container width.
4. `prefers-reduced-motion` fallback is fully static/browsable - direct
   carry-over from the published FAQ bar.
5. Real HTML content for all copy (headings/CTAs), not canvas/WebGL-only -
   carry-over.
6. No `console.error`/unhandled rejection during mount+unmount.
7. Any `registryDependencies` entry resolves to a real existing registry
   slug (cheap new validation - first real consumer of a field that's been
   `[]` everywhere).

**SHOULD-WARN:**
1. Keyboard access / visible focus states where interactive elements exist
   - carry-over, downgraded to warn since a pure visual hero section may
   legitimately have nothing focusable.
2. Heavy preview cost (WebGL/canvas/video) without lazy-load/offscreen-pause
   - carry-over.
3. Color-contrast check on default theme values (axe-core pass in the same
   harness) - warn, not block, to avoid false-positive noise.

---

## 5. QC checklist - Templates

Superset of §4 - every bundled section already had to pass §4 individually.

**MUST-BLOCK:**
1. Every `sectionsUsed[]` entry resolves to a real Section/Effect that has
   itself already passed §4.
2. No duplicate/conflicting exports or CSS-class collisions across bundled
   sections (extend `component-ship.mjs`'s existing import-scanner regex).
3. **The scaffold's own `next build && next start` passes in CI**, full
   stop - the single most important gate here, since it's the only thing
   that catches "two sections both assume they own scroll-lock" class
   failures that no per-section gate ever catches.
4. Full-page Lighthouse/perf budget on the assembled `template-demo`
   preview: LCP < 2.5s, CLS < 0.1, at most one autoplaying WebGL/video
   surface active above the fold (numeric, page-scoped version of the
   existing catalog-scoped "don't run too many heavy previews at once"
   rule).
5. Multi-page nav integrity if `layout: "multi-page"` - every internal
   link resolves to a real `pages[].route`.
6. Every bundled file carries the `// Built using Hyperiux Vault`
   attribution header (existing convention; nothing today re-checks it once
   files are recombined into a template export).
7. `pricing.standaloneOneTime` is set (a template must be individually
   purchasable per the business model - missing price is a shipping bug,
   not a style nit).

**SHOULD-WARN:**
1. Cross-section design-token consistency (diff CSS custom property names
   used across bundled sections' styles; some intentional hero/footer
   contrast is legitimate, so warn not block).
2. Redundant overlapping dependencies across sections.
3. Section/page count outliers (a one-section "template" is really a
   mis-tagged Section).

---

## 6. Verification

- Unit/jsdom: extend the existing registry render-harness pattern
  (`apps/docs/test/`) with `getRegistrySections()` and a
  `registry-sections.render.test.jsx` sibling to whatever the effect one is
  named today.
- Templates: new fast unit checks for §5's static-analysis gates
  (duplicate-export scan, `sectionsUsed[]`-resolves check, attribution-
  header check) plus a separate, slower CI job for the real `next build`
  gate (§5 MUST-BLOCK #3) - not part of the fast suite, mirrors how
  `component:sync` is already its own explicit command rather than
  something that runs on every test invocation.
- Manual: build one real Section end-to-end through
  `scripts/component-workflow.mjs` and confirm `npx hyperiux add
  <section-slug>` installs cleanly into a scratch Next.js app (proves §1's
  "zero CLI change" claim for real, not just by inspection).
- Manual: build one real Template, confirm the zip downloads and
  `next build && next start` passes standalone; confirm
  `getTemplateAccessDecision` correctly gates an annual-Pro test account
  (allowed) vs a monthly-Pro test account (denied, must hit the standalone
  purchase flow) vs a completed one-time purchase (allowed regardless of
  plan).
- Manual: confirm the new iframe-embedded live preview on
  `effect-detail.jsx` renders, the Remixer Panel's controls work inside the
  boxed layout, and "Copy Code" still works from inside the iframe.

---

## Open items to close during implementation, not before

- **Billing-interval visibility**: verify `lib/subscription.js` actually
  exposes monthly-vs-annual today; if it doesn't, that's a small
  prerequisite fix before `getTemplateAccessDecision` can work at all.
- **Stripe product modeling** for one-time per-template purchases - confirm
  whether existing Stripe integration already has a Payment-mode checkout
  pattern to copy, or whether this is the first one-time (non-subscription)
  charge in the codebase.
- **Section category taxonomy** (§1's folded 8-category starting list) is a
  default, not a locked decision - cheap to adjust before the first
  Section ships, expensive after content/Sanity entries exist against it.
