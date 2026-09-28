# Template QC Checklist

*Reference checklist - hyperiux-pro-components / apps/docs - companion to
[`sections-templates-plan.md`](./sections-templates-plan.md) §5. Not yet
wired into automated tooling; this is the full gate a human (and eventually
CI) runs before a Template is allowed to ship.*

Every item is tagged **[BLOCK]** (fails QC, cannot ship until fixed) or
**[WARN]** (flagged in the QC report, human judgment call, doesn't stop
shipping on its own). A template must clear every [BLOCK] item across every
section, not just check its own boxes - the composition itself is a gate,
since section-level QC alone can't catch cross-section conflicts.

---

## 1. Manifest & registry data

- [ ] **[BLOCK]** `template.json` present and valid JSON at
      `registry/templates/<category>/<slug>/template.json`.
- [ ] **[BLOCK]** `name`, `version`, `title`, `description`, `industry`,
      `layout` all present and non-empty.
- [ ] **[BLOCK]** `layout` is exactly `"single-page"` or `"multi-page"`,
      and matches what the scaffold actually contains (a `"single-page"`
      template with 3 real routes is a data-entry bug, not a style nit).
- [ ] **[BLOCK]** `sectionsUsed[]` is non-empty and every entry resolves to
      a real, existing Section or Effect registry slug.
- [ ] **[BLOCK]** If `layout: "multi-page"`, `pages[]` is non-empty and each
      entry has a valid `route` + `label`.
- [ ] **[BLOCK]** `pricing.standaloneOneTime` is set to a positive number -
      every template must be individually purchasable per the business
      model; a missing price is a shipping bug.
- [ ] **[BLOCK]** `pricing.includedInAnnualPro` is explicitly `true` or
      `false` (not omitted) - omission silently defaults ambiguously and
      must not reach production.
- [ ] **[BLOCK]** `scaffoldAsset` points to a real, uploaded zip artifact
      (not a placeholder/local path).
- [ ] **[BLOCK]** `previewUrl` resolves to a working `template-demo` route.
- [ ] **[BLOCK]** `changelog` has an entry for this version with a real
      summary (not "initial" boilerplate reused across versions).
- [ ] **[WARN]** `dependencies[]` lists every third-party package the
      scaffold actually imports (cheap drift-check against the scaffold's
      own `package.json`).

## 2. Composition & code integrity

- [ ] **[BLOCK]** Every section listed in `sectionsUsed[]` has itself
      already passed the Section QC checklist (plan §4) - no bundling an
      unvetted section into a template as a shortcut.
- [ ] **[BLOCK]** No duplicate top-level export names across bundled
      section files (extend `component-ship.mjs`'s import-scanner regex to
      catch this).
- [ ] **[BLOCK]** No CSS custom-property or class-name collisions across
      bundled sections' styles that would cause one section's styling to
      silently override another's.
- [ ] **[BLOCK]** No two sections both assume ownership of global state
      (`<html>`/`<body>` scroll-lock, a shared scroll-smoothing library
      instance, a shared cursor/canvas singleton) without an explicit
      coordinator - this is the class of bug that only a real build catches
      (see §3), but worth a manual pass too since it can pass a build and
      still misbehave at runtime.
- [ ] **[WARN]** No unused imports or dead code left over from assembling
      the scaffold out of registry sources.
- [ ] **[WARN]** Shared utilities (hooks, animation helpers) are imported
      from one canonical location, not copy-pasted per section with drift.

## 3. Build & runtime

- [ ] **[BLOCK]** The scaffold's own `next build` completes with zero
      errors, standalone, in a clean checkout (not "works on the author's
      machine").
- [ ] **[BLOCK]** `next build && next start` - the built output actually
      serves and every declared page/route loads without a 500/404.
- [ ] **[BLOCK]** Zero `console.error` / unhandled promise rejections in
      the browser console across every page, on load and after basic
      interaction (scroll, hover, click through primary CTAs).
- [ ] **[BLOCK]** No hardcoded secrets, API keys, or internal URLs left in
      the scaffold source (grep before packaging - this is a real leak
      risk once buyers download and inspect the code).
- [ ] **[WARN]** `npm install` (or the scaffold's declared package manager)
      completes cleanly with no peer-dependency errors on a fresh Node LTS.
- [ ] **[WARN]** TypeScript (if used) compiles with zero errors under the
      scaffold's own `tsconfig.json`.

## 4. Responsive & cross-device

- [ ] **[BLOCK]** No horizontal scroll, overlapping text, or clipped
      content at 375px (mobile), 768px (tablet), and 1280px (desktop) on
      every page in the template - not just the homepage.
- [ ] **[BLOCK]** Primary CTAs and nav remain reachable and usable at all
      three breakpoints (no CTA hidden behind an untested mobile menu).
- [ ] **[WARN]** Layout checked at an ultra-wide breakpoint (1920px+) for
      obvious stretching/whitespace issues.
- [ ] **[WARN]** Touch targets (buttons, nav links) are reasonably sized on
      mobile (no accidental tap-adjacent-element issues).

## 5. Accessibility

- [ ] **[BLOCK]** All copy (headings, CTAs, nav labels) is real HTML text,
      not baked into canvas/WebGL/image-only content.
- [ ] **[WARN]** Keyboard access and visible focus states work for every
      interactive element (nav, forms, carousels, modals) across all pages.
- [ ] **[WARN]** Images have meaningful `alt` text (or `alt=""` where
      correctly decorative).
- [ ] **[WARN]** Color contrast on default theme values passes a basic
      automated check (axe-core or equivalent) on primary text/background
      pairs - flagged, not blocking, to avoid false-positive noise on
      intentional design choices.
- [ ] **[WARN]** Forms (contact/waitlist sections) have associated labels,
      not placeholder-text-as-label.

## 6. Performance

- [ ] **[BLOCK]** LCP < 2.5s and CLS < 0.1 on the assembled preview route,
      measured against a realistic network throttle, not just local dev.
- [ ] **[BLOCK]** No more than one autoplaying WebGL/canvas/video surface
      active above the fold at once, on any single page.
- [ ] **[WARN]** Images are served in a modern format (WebP/AVIF) and
      appropriately sized, not raw multi-MB source assets.
- [ ] **[WARN]** Below-the-fold heavy effects (WebGL scenes, video
      backgrounds) use lazy-load or offscreen-pause rather than running
      continuously regardless of visibility.
- [ ] **[WARN]** Total JS bundle size for the largest page is sanity-
      checked against the template's own visual complexity (a mostly-static
      portfolio page shouldn't ship a multi-MB bundle).

## 7. Reduced motion

- [ ] **[BLOCK]** With `prefers-reduced-motion: reduce` set, every page is
      fully static and browsable - no autoplay, no looping motion, no
      cursor trails, no continuous WebGL movement.
- [ ] **[WARN]** Reduced-motion fallback still communicates the page's
      content/hierarchy clearly, not just "animation off with nothing to
      replace it."

## 8. Content & copy quality

- [ ] **[BLOCK]** No lorem ipsum or obviously-placeholder copy in the
      shipped scaffold - every section has real, on-brand sample content a
      buyer could plausibly ship as-is or lightly edit.
- [ ] **[BLOCK]** No broken image references or missing asset files.
- [ ] **[WARN]** Copy tone is consistent across bundled sections (a hero
      written in punchy startup voice next to a footer in generic
      boilerplate reads as stitched-together).
- [ ] **[WARN]** Industry-specific claims/copy (per `template.json`'s
      `industry` field) actually read as tailored to that industry, not
      generic SaaS copy with a label slapped on.

## 9. SEO & metadata

- [ ] **[BLOCK]** Every page has a unique `<title>` and meta description.
- [ ] **[WARN]** Open Graph / social preview image is set per page (or at
      minimum site-wide) and renders correctly when the URL is shared.
- [ ] **[WARN]** Semantic heading hierarchy (one `<h1>` per page, logical
      `<h2>`/`<h3>` nesting) rather than heading tags chosen purely for
      font-size convenience.

## 10. Multi-page navigation integrity

*(applies when `layout: "multi-page"`)*

- [ ] **[BLOCK]** Every internal link/nav item resolves to a real page
      declared in `pages[]` - no dead links.
- [ ] **[BLOCK]** Nav and footer are consistent across every page (same
      links, same active-state behavior) unless intentionally page-specific.
- [ ] **[WARN]** A 404 page exists and matches the template's own design
      language rather than falling back to Next's default.

## 11. Licensing & attribution

- [ ] **[BLOCK]** Every bundled file that originated from a registry
      Section/Effect still carries the `// Built using Hyperiux Vault`
      attribution header - nothing today re-checks this once files are
      recombined into a template export, so this must be verified per
      template, not assumed from the source components.
- [ ] **[BLOCK]** Any third-party asset (stock photo, font, icon set)
      bundled into the scaffold has a license compatible with resale/
      redistribution to buyers - flag and remove anything uncertain rather
      than assume fair use.
- [ ] **[WARN]** A license/readme file is included in the zip explaining
      what the buyer is allowed to do with the code (matches the site's
      published effect license language where applicable).

## 12. Packaging & delivery

- [ ] **[BLOCK]** The zip at `scaffoldAsset` extracts cleanly and contains
      a complete, runnable project (no missing `node_modules`-adjacent
      config, no absolute local file paths baked in).
- [ ] **[BLOCK]** A setup README is included with real install/run
      instructions specific to this template (not a generic placeholder).
- [ ] **[WARN]** Any required environment variables (analytics IDs, form
      endpoints) are documented with placeholder values and a comment
      explaining where to get real ones - not silently required with no
      guidance.

**Starting a brand-new template:** scaffold its folder before building
anything by hand:

```bash
npm run template:create -- <slug> ["Title Case Name"]
# e.g. npm run template:create -- aria-clinic "Aria Clinic"
```

`--` matters if the title has spaces - without it, npm forwards a quoted
arg as several separate words instead of one (the script now tolerates
either way by joining everything after `<slug>`, but `--` is the
unambiguous form). This runs `scripts/create-template.mjs`, which:

- Creates `template-demo/<slug>/` with a starter `page.tsx`, a scoped
  `<slug>.css`, an `assets/` folder, and a `README.md` already in the shape
  `fixReadme()` (used by `template:update` below) expects.
- Adds a `<slug>: null` placeholder to
  `apps/docs/src/lib/template-scaffolds.js` so `template:update` has
  somewhere to write the real URL once this template has one.
- Prints ready-to-paste manifest snippets for
  `scripts/package-template.mjs`'s `TEMPLATES` object and
  `apps/docs/src/lib/mock-templates.js`'s `TEMPLATES` array - deliberately
  **not** auto-inserted, since pricing, category, dependencies, and tagline
  are real decisions the script can't guess at.

Build the template's sections by hand from there (see
`template-demo/elenavoss/` for a fully-built reference), fill in the two
pasted manifest snippets with real values, and clear every [BLOCK] item in
this checklist before packaging it.

**Updating an already-shipped template:** after editing a template's source
under `template-demo/<slug>/`, run

```bash
npm run template:update <slug>
```

from the repo root (`scripts/package-template.mjs`). One command rebuilds
the zip from the latest source, uploads it to Vercel Blob, and rewrites the
matching entry in `apps/docs/src/lib/template-scaffolds.js` directly -
review and commit that file change like any other code change. Requires
`BLOB_READ_WRITE_TOKEN` (auto-loaded from `apps/docs/.env.local` if not
already set in the shell). Re-run the relevant [BLOCK] items above (§3 build,
§12 zip integrity, §15 preview parity) after any update before considering
the new version shipped.

## 13. Pricing & access control

- [ ] **[BLOCK]** `getTemplateAccessDecision` correctly grants access to
      an annual-Pro test account and correctly denies a monthly-Pro test
      account (must be manually verified per template release, since a
      template-specific pricing/tier misconfiguration is a real revenue
      leak, not just a display bug).
- [ ] **[BLOCK]** A completed standalone one-time purchase grants download
      access regardless of subscription plan.
- [ ] **[BLOCK]** The gated download route never serves the zip via a
      public/static path - access must be checked on every download
      request, not just hidden behind a UI button.

## 14. Cross-browser

- [ ] **[WARN]** Verified in at least Chrome and Safari (desktop + mobile
      Safari specifically, since WebGL/CSS quirks show up there most
      often for this kind of animated content).
- [ ] **[WARN]** Verified in Firefox if the template uses any
      WebGL/shader-heavy sections (rendering differences are most likely
      here).

## 15. Preview parity

- [ ] **[BLOCK]** The `template-demo` live preview a buyer sees before
      purchase actually matches what ships in the zip - no drift between
      "what convinced them to buy" and "what they received."
- [ ] **[WARN]** The device-size toggle (mobile/tablet/desktop) in the
      preview accurately reflects the real responsive behavior verified in
      §4, not just a visual scale trick that hides real layout breaks.

---

## Sign-off

A template ships only when every **[BLOCK]** item above is checked. Log the
result in `template.json`'s `qc` field (`status`, `lastRunAt`,
`gateVersion`) so drift is visible if the template is later modified
without re-running this checklist.
