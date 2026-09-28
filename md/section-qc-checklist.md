# Section QC Checklist

*Reference checklist - hyperiux-pro-components / apps/docs - companion to
[`sections-templates-plan.md`](./sections-templates-plan.md) §4 and
[`template-qc-checklist.md`](./template-qc-checklist.md) (every item here is
also a prerequisite gate a Section must clear before it's eligible to be
bundled into any Template). Not yet wired into automated tooling; this is
the full gate a human (and eventually CI) runs before a Section is allowed
to ship.

A Section is registry-shaped exactly like an effect (same `registry.json`,
same tier/access model, same CLI path - see the plan §1), so this checklist
reuses the site's own already-published effect quality bar
(`apps/docs/src/lib/categories.js`, `effectsOverviewContent.faqs`) as its
floor, and adds what's new because a Section is meant to be dropped into a
real page layout rather than stand alone as a self-contained interaction.*

Every item is tagged **[BLOCK]** (fails QC, cannot ship until fixed) or
**[WARN]** (flagged in the QC report, human judgment call, doesn't stop
shipping on its own).

---

## 1. Manifest & registry data

- [ ] **[BLOCK]** `registry.json` present and valid JSON at
      `registry/effects/<category>/<slug>/registry.json`.
- [ ] **[BLOCK]** `name`, `title`, `description`, `category`, `tier`,
      `main`, `exportName`, `exportKind` all present and non-empty
      (extends the existing `build-registry.js` validation that already
      throws on missing `tier`).
- [ ] **[BLOCK]** `type` is set to `"registry:block"` (not left as the
      default `"registry:component"`), so downstream consumers can
      correctly discriminate a Section from a plain effect.
- [ ] **[BLOCK]** `category` matches one of the defined `sectionCategories`
      (plan §1) - not a stray/misspelled category id that would silently
      drop the section from every category listing.
- [ ] **[BLOCK]** If `registryDependencies[]` is non-empty, every entry
      resolves to a real, existing registry slug (first real consumer of a
      field that's been `[]` in every prior entry - worth double-checking
      by hand until the automated check in `build-registry.js` exists).
- [ ] **[BLOCK]** `changelog` has an entry for this version with a real,
      specific summary (not boilerplate reused across every section).
- [ ] **[WARN]** `dependencies[]` lists every third-party package the
      section actually imports (drift-check against real `import`
      statements in the source).
- [ ] **[WARN]** `previewAspectRatio` (if set) matches the section's actual
      shape - a tall About/Team section shouldn't inherit the default
      hero-tuned ratio and get cropped in listings.

## 2. Code integrity

- [ ] **[BLOCK]** Main file (`index.tsx`) has exactly one detectable
      default/named export matching `exportName`/`exportKind`.
- [ ] **[BLOCK]** No hardcoded secrets, API keys, or internal/staging URLs
      in the source.
- [ ] **[BLOCK]** All subcomponents/styles the main file imports are
      declared in `files[]` - nothing the component needs is missing from
      the installable file list (a section that renders fine in docs but
      is missing a file from `registry.json` will break on real install).
- [ ] **[WARN]** No unused imports or leftover dead code from authoring.
- [ ] **[WARN]** Component doesn't reach for a docs-app-only helper (e.g.
      `@/lib/motion`) that doesn't exist outside `apps/docs` - this exact
      class of bug has shipped before across 5 transition effects; grep for
      `@/lib/` imports in the registry copy specifically, not just the docs
      mirror.

## 3. Build & runtime

- [ ] **[BLOCK]** Renders without throwing in the jsdom render harness
      (`getRegistrySections()`, plan §1) - mount and unmount cleanly.
- [ ] **[BLOCK]** Zero `console.error` / unhandled promise rejection during
      mount, unmount, and prop changes (exercise the Remixer Panel's full
      control range if `remixer.enabled`, not just defaults).
- [ ] **[WARN]** No TypeScript errors when type-checked in isolation.

## 4. Responsive & cross-device

- [ ] **[BLOCK]** No horizontal scroll, overlapping text, or clipped
      content at 375px (mobile), 768px (tablet), and 1280px (desktop) -
      new relative to a standalone effect's bar, since a Section is
      explicitly meant to survive an arbitrary container width, not just
      its own demo page.
- [ ] **[WARN]** Layout checked at an ultra-wide breakpoint (1920px+) for
      obvious stretching or awkward whitespace.
- [ ] **[WARN]** Touch targets (buttons, links, form fields) are reasonably
      sized on mobile.

## 5. Accessibility

- [ ] **[BLOCK]** All copy (headings, CTAs, labels) is real HTML text -
      carry-over from the published FAQ bar, direct block since this has
      SEO and screen-reader implications, not just style.
- [ ] **[WARN]** Keyboard access and visible focus states work for every
      interactive element the section has (nav, forms, carousels) - carry-
      over from the FAQ bar, downgraded to warn since a pure-visual hero
      section may legitimately have nothing focusable.
- [ ] **[WARN]** Images have meaningful `alt` text (or `alt=""` where
      correctly decorative).
- [ ] **[WARN]** Color contrast on default theme values passes a basic
      automated check (axe-core pass in the same jsdom harness) - warn, not
      block, to avoid false-positive noise on intentional design choices.
- [ ] **[WARN]** Forms (contact sections) have associated labels, not
      placeholder-text-as-label.

## 6. Performance

- [ ] **[WARN]** Heavy preview cost (WebGL/canvas/video) uses lazy-load or
      offscreen-pause rather than always running - direct carry-over from
      the published FAQ bar ("avoid running many WebGL, canvas, video...
      previews at once").
- [ ] **[WARN]** Images are served in a modern format and reasonably sized,
      not raw multi-MB source assets.

## 7. Reduced motion

- [ ] **[BLOCK]** `prefers-reduced-motion: reduce` fallback exists and is
      fully static/browsable - no autoplay, no looping motion, no cursor
      trails, no continuous WebGL movement. Direct carry-over from the
      published FAQ bar, kept as a hard block (not downgraded) since it's
      already a site-wide stated commitment, not a new bar being invented
      here.
- [ ] **[WARN]** The reduced-motion fallback still communicates the
      section's content/hierarchy clearly, not just "animation off with
      nothing to replace it."

## 8. Content & copy quality

- [ ] **[BLOCK]** No lorem ipsum or obviously-placeholder copy in default
      props - the shipped default should read as real, on-brand sample
      content, since this is what buyers see first in the catalog and in
      the live preview.
- [ ] **[BLOCK]** No broken image references or missing default asset
      paths.
- [ ] **[WARN]** Default copy tone matches the Hyperiux brand voice
      (per the `hyperiux-writing-skill` convention already used elsewhere
      in this codebase).

## 9. Props & Remixer schema

*(Section-specific - this is what makes the detail-page live preview from
plan §3 actually work; an effect with no props here just isn't remixable,
which is a real degraded experience for a Section browsed on the buy page.)*

- [ ] **[BLOCK]** If the component accepts meaningfully customizable props
      (colors, text, layout variants), they're declared in `props[]` with
      `name`, `type`, `default`, `description`.
- [ ] **[BLOCK]** Every prop with a `remixer` control declared actually
      exists and works on the real installable component - no remixer
      control that edits a prop the component silently ignores.
- [ ] **[WARN]** Docs-only preview controls (if any) are marked
      `docsOnly: true` so generated copy-code never includes a prop the
      installed component can't accept.
- [ ] **[WARN]** `remixer.enabled` is `true` for any section with 2+
      meaningfully customizable props - a section that could be remixable
      but ships with the panel off is a missed conversion opportunity, not
      a technical defect, hence warn not block.

## 10. SEO & metadata (detail/demo page)

- [ ] **[BLOCK]** The Sanity `effectContent` entry for this section
      (`categorySlug`/`effectSlug`-keyed, per plan §1) has a title and
      meta description set - the detail page must not ship with fallback/
      generic SEO copy.
- [ ] **[WARN]** Cover image / OG image is set and renders correctly when
      the detail page URL is shared.

## 11. Licensing & attribution

- [ ] **[BLOCK]** Registry copy carries the
      `// Built using Hyperiux Vault: https://vault.hyperiux.com`
      attribution header (existing convention - verify on the registry
      copy specifically; docs mirrors never carry it, so checking the
      wrong copy gives a false pass).
- [ ] **[BLOCK]** Any third-party asset (stock photo, icon, font) bundled
      with the section has a license compatible with redistribution to
      installers - flag and remove anything uncertain.

## 12. Tier & access correctness

- [ ] **[BLOCK]** `tier` (`free`/`pro`) matches the intended pricing -
      verify against `effect-access.js`'s `getEffectAccessDecision` gating
      the actual installed source correctly for both a free and a Pro test
      account, not just trusting the field value at rest.
- [ ] **[WARN]** If `free`, the section is genuinely commercial-friendly
      per license terms stated elsewhere on the site (matches the existing
      "free effects are commercial-friendly where marked" FAQ commitment).

## 13. Cross-browser

- [ ] **[WARN]** Verified in Chrome and Safari (desktop + mobile Safari)
      at minimum - WebGL/CSS quirks show up there most often.
- [ ] **[WARN]** Verified in Firefox if the section uses WebGL/shader
      effects.

## 14. Preview parity

- [ ] **[BLOCK]** The docs-mirror component used for the live `/demo/<slug>`
      preview (and the detail-page iframe embed per plan §3) matches the
      registry copy that actually installs - no drift where the preview
      shown on the buy page looks different from what a buyer receives
      (this exact bug class has shipped before: a fix landing in the docs
      mirror but never reaching the registry copy).
- [ ] **[BLOCK]** CLI install actually works: `npx hyperiux add <slug>`
      into a scratch Next.js app installs cleanly and the component renders
      with its declared default props, matching the live preview.

## 15. Versioning

- [ ] **[BLOCK]** `registry/index.json` (root aggregate) reflects this
      section's current version - stale root-index entries have caused
      real "cannot find module" failures before (orphaned/mismatched
      entries left over from incomplete edits).
- [ ] **[WARN]** Version bump follows the existing semver convention
      (breaking prop changes → major, new optional props → minor).

---

## Sign-off

A section ships only when every **[BLOCK]** item above is checked. Sections
that will be bundled into a Template must pass this checklist *before*
being referenced in that template's `sectionsUsed[]` - a template QC pass
assumes this is already true and does not re-derive it (see
`template-qc-checklist.md` §2, item 1).
