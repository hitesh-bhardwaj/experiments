# Design and Development Sync Report: STYLE_GUIDE.md compliance (v2)

**Date:** 2026-10-15 · **Project:** `vault-main` · **Reference:** `vault-main/STYLE_GUIDE.md` (declared correct)
**Replaces:** the first version of this report. This version is stricter about scope: **no demo, template-demo, registry or effect-component files are counted.**

## 1. Scope (what was and was not scanned)

| | Count | What |
|---|---|---|
| **Scanned** | **451 files** (`.js .jsx .ts .tsx`) | Site pages and shared site UI only: `src/app/(app)/**`, `src/app/(marketing)/` (home, blog, loader), `src/homepage/**`, `src/lib`, and the site component folders `Animations`, `Audio`, `Community`, `Dashboard`, `DocsContent`, `Footer.jsx`, `Metadata`, `PageTransition`, `Payments`, `Pricing`, `SmoothScroll`, `WebsiteComps`, `admin`, `auth`, `blog`, `grid-dots`, `layout`, `ui` |
| Excluded: demo routes | `src/app/(marketing)/demo/**` | All `/demo/*` pages |
| Excluded: template demo sites | `src/app/(marketing)/template-demo/**` | elenavoss, kyntra, lumera, oris-dental |
| Excluded: registry effect components | **154 folders** under `src/components/` | Every folder whose name matches a registry effect slug (150) or a `/demo/*` page name (158), for example `pixel-transition`, `blur-text`, `elevate-navbar`, `book-flip` |
| Excluded: effect-like or unused folders | 8 folders | `InertiaScrollEffect`, `InfiniteCarousel`, `Slider`, `WaveMediaPipe`, `clip-path-slider`, `effects`, `hooks`, `HyperiuxLogo` |
| Excluded: demo chrome | 3 folders | `preview-chrome`, `remixer-panel`, `local-remixer` (used by demo pages) |
| Excluded: other | | `registry/`, `public/r/`, email templates (`WebsiteComps/emailTemplate`, `lib/emails`: inline styles are required), tests, `.css`, `.md`, `.json` |

One site-folder file is named for demos (`WebsiteComps/DemoSubpageLoader.jsx`); its single hit is noted but not counted below.

## 2. Verdict

**The site code is still not in sync with the style guide.** The design system exists and the newer pages use it (248 `type-*` uses in 66 files, `site-container` in 21 files, `section-x` in 25). But about 40% of the scanned site files still bypass it, and dashboard/admin was built outside it entirely.

| Area | Status |
|---|---|
| Design system defined in `globals.css` (type scale, `site-container`, `section-x`, tokens) | ✅ Present |
| Site code follows the guide | ❌ Large drift (section 4) |
| Documentation consistent with the guide | ✅ **Fixed today** (`CLAUDE.md`, `CODING_STANDARDS.md`, `AGENTS.md`) |
| One mismatch left between guide and CSS | ⚠️ `type-h1` line-height (D-01) |
| Visual design vs Figma | ⚪ Not verifiable (Figma connector not authorized) |

## 3. Documentation and token sync

| # | Item | Status |
|---|---|---|
| ~~D-old~~ | `CLAUDE.md` contradicted the guide (`max-sm`, `vw`, `dark-surface`, shades) | ✅ Rewritten from the guide |
| ~~D-old~~ | `CODING_STANDARDS.md` mapped `max-md`/`max-sm` differently | ✅ Scope note added: it covers effects and demos only; site pages follow the guide |
| ~~D-old~~ | Root `AGENTS.md` had no styling pointer | ✅ Added |
| **D-01** | **`type-h1` line-height:** guide says **1.05**, `globals.css` has **1.15** | ❌ Open. One-line CSS change; nothing outside the site uses `type-h1`. Visible change on every section heading |
| **D-02** | **`section-y` is defined and promoted but used 0 times.** 18 files use `py-[7%]`; others hand-write padding (`Footer.jsx:254`) | ❌ Open |
| **D-03** | **Second light-theme mechanism:** `.docs-sheet` in `globals.css` (16 lines) with hard-coded hex (`#F4F4F4`, `#3a3a3a`) and a redefined `--foreground`, used by docs, legal, llm-info, effect-detail. The guide says light content uses `blog-theme-light` + `blog.css` | ❌ Open |
| **D-04** | **Dead variables:** 7 `--radius-*` variables are defined, 0 uses on the site; the guide says remove unused colour/radius variables | ❌ Open |
| **D-05** | **`CLAUDE.md` is git-ignored** (`.gitignore` line 28), so the synced rules reach only your machine | ⚠️ Decision for you |

## 4. Code vs. guide: measured violations (scoped to section 1)

Counts are **matching source lines** in the 451 scanned files.

### Colour

| # | Rule | Lines | Files | Worst offenders |
|---|---|---|---|---|
| V-01 | Hex in classes (`text-[#…]`, `bg-[#…]`) | **278** | 58 | `InstallationProcess.jsx` 24, `CodeBlock.jsx` 20, `Footer.jsx` 20, `SpotTheJank.jsx` 14 |
| V-02 | Brand-orange hexes instead of `primary` | **95** | 46 | `WorkWithHyperiuxModal.jsx` 7, `dashboard/settings` 6, `ExitIntentInviteModal.jsx` 6, `jank-scenes.js` 6 |
| V-03 | `bg-white` instead of `bg-foreground` | **159** | 41 | `dashboard/admin/page.js` 20, `InstallActivityTab.js` 14, `activity/[userSlug]` 14, `admin/emails` 14 |
| V-04 | Off-shade text greys (`/90 /70 /50` …) | **315** | 70 | `dashboard/admin/page.js` 40, `admin/invoicing` 17, `InstallActivityTab.js` 16, `admin/emails` 16 |
| V-05 | rgba/hsl in classes | **6** | 3 | `InstallationProcess.jsx` 3 |
| V-06 | Hex colour strings in JS (should read the CSS variable) | **107** | 37 | `InstallationProcess.jsx` 10, `Icons.jsx` 8, `ChartTheme.js` 8, `jank-scenes.js` 7 |

### Typography

| # | Rule | Lines | Files | Worst offenders |
|---|---|---|---|---|
| V-07 | Tailwind fixed sizes (`text-sm`, `text-base` …) instead of `type-*` | **336** | 49 | `dashboard/admin/page.js` 50, `InstallActivityTab.js` 25, `activity/[userSlug]` 24, `admin/emails` 20 |
| V-08 | Bold, semibold, medium, light weights | **246** | 56 | `docs/mcp/DocsMcp.jsx` 62, `activity/[userSlug]` 19, `admin/page.js` 15, `invoicing` 14 |
| V-09 | One-off `text-[…]` sizes | **106** | 43 | `VaultHeader.jsx` 11, `InstallationProcess.jsx` 9, `TemplateCard.jsx` 7 (`templates/tokens.js` 10 is the approved listing exception) |
| V-10 | Old `.text18…text140` / `.t96` classes | **34** | 14 | `vault-door/index.jsx` 6, `SiteNotFound.jsx` 6, `TemplateCard.jsx` 5 |
| V-11 | `leading-[…]` overriding the scale | **28** | 21 | `InstallationProcess.jsx` 6 |
| V-12 | Redundant `font-aeonik` on `<h2>` | **7** | 6 | `dashboard/page.js` 2 |
| V-13 | `<br />` inside headings | **6** | 6 | `TemplatesListing.jsx`, `PricingCredits.jsx`, `WhyJoinPanels.jsx` |

### Breakpoints and units

| # | Rule | Lines | Files | Worst offenders |
|---|---|---|---|---|
| V-14 | `max-sm:` on site pages (forbidden) | **65** | 16 | `Footer.jsx` 21, `TemplateCard.jsx` 12, `EffectCardNew.jsx` 8, `InstallationProcess.jsx` 5 |
| V-15 | Min-width prefixes (`sm:` `md:` `lg:` …) | **55** | 20 | `NavbarMobile.jsx` 20, `InstallActivityTab.js` 5, `activity/page.js` 4 |
| V-16 | Arbitrary `max-[…px]:` breakpoints | **2** | 1 | `SiteNotFound.jsx` 2 |
| V-17 | Plain desktop `vw` in a class (should be `cvw` / `hx-vw`) | **371** | 83 | `VaultHeader.jsx` 31, `NavbarMobile.jsx` 22, `dashboard/page.js` 15, `TemplatesListing.jsx` 12 |
| V-18 | `rem` units | **19** | 18 | `dashboard/page.js` 2 |
| V-19 | Values with 2+ decimals | **50** | 29 | `templates/tokens.js` 7, `VaultHeader.jsx` 5, `NavDropdownItem.jsx` 3 |
| V-20 | `w-screen` | **6** | 4 | `WebsiteComps/Loader.jsx` 3 (overlays are exempt) |
| V-21 | Hard-coded `matchMedia` width / `innerWidth` checks | **9** | 5 | `Loader.jsx` 5, `SiteBackground.jsx`, `theremin-ribbons.js`, `app/layout.js` |

### Layout and spacing

| # | Rule | Lines | Files | Worst offenders |
|---|---|---|---|---|
| V-22 | Hand-written `max-w-[1536px]` instead of `site-container` | **6** | 3 | `PricingPlansHome.jsx` 3, `FAQ.jsx` 2, `vault-door/index.jsx` 1 |
| V-23 | Hand-written gutters instead of `section-x` | **11** | 7 | `EffectsListing.jsx` 2, `LlmInfoBody.jsx` 2, `CommunityHero.jsx` 2, `Footer.jsx` 2 |
| V-24 | `<section>` without an `id` | **16** | 8 | `effect-detail.jsx` 8, `dashboard/page.js` 2 |
| V-25 | Margins between siblings | **235** | 70 | `dashboard/settings` 16, `dashboard/admin/page.js` 14, `Sidebar.jsx` 10 |
| V-26 | Negative margins | **16** | 12 | `WhyJoinPanels.jsx` 3, `TemplatesListing.jsx` 2, `TuneCard.jsx` 2 |
| V-27 | Single-side padding (`pt-*`, `pb-*` …) | **165** | 79 | `EffectsListing.jsx` 9, `Footer.jsx` 9, `InstallationProcess.jsx` 7 |

### Shape, effects and behaviour

| # | Rule | Lines | Files | Worst offenders |
|---|---|---|---|---|
| V-28 | `!` important overrides | **100** | 39 | `WorkWithHyperiuxModal.jsx` 10, `TemplatePreviewDrawer.jsx` 7, `TemplateCard.jsx` 7, `PreviewDrawer.jsx` 6 |
| V-29 | `rounded-*` other than `rounded-full` | **8** | 5 | `DocsContent/Image.jsx` 2, `Footer.jsx` 2, `CustomAnimationFormModal.jsx` 2 |
| V-30 | `backdrop-blur` other than `-lg` | **30** | 21 | `Navbar.jsx` 4 |
| V-31 | One-off `shadow-[…]` | **35** | 20 | `SpotTheJank.jsx` 8, `TemplatePreviewDrawer.jsx` 3, `CodeBlock.jsx` 3 |
| V-32 | Inline `style={{…}}` (some are JS-computed values and allowed) | **85** | 58 | `GetTemplateModal.jsx` 3, `WhyJoinPanels.jsx` 3, `PageTransition.jsx` 3 |
| V-33 | Direct `prefers-reduced-motion` `matchMedia` (use `prefersReducedMotion()`) | **5** | 5 | `Sidebar.jsx`, `LineReveal.jsx`, `fell-over.js`, `DocsDependencies.jsx` |
| V-34 | `useFadeUp()` without a ref | **7** | 7 | `DocsCli.jsx`, `DocsMcp.jsx`, `effect-detail.jsx`, `BlogHero.jsx` |
| V-35 | `data-lenis-prevent` outside modals/drawers | **15** | 14 | `PreviewDrawer.jsx` 2, `effects/layout.js` 1 |

### Content and hygiene

| # | Rule | Lines | Files | Where |
|---|---|---|---|---|
| V-36 | **Placeholder text on a live page** (`[To confirm: …]`) | **4** | 1 | `src/app/(app)/community/page.js` lines 25, 29, 34, 36. Rendered on `/community` |
| V-37 | `console.log` left in code | **8** | 4 | `2dCanvasTracker.js` 4, `razorpay/verify-payment/route.js` 2, `effect-detail.jsx` 1, `SoundContext.jsx` 1 |

### Compliant patterns (for comparison)

| Pattern | Lines | Files |
|---|---|---|
| `type-*` scale classes | 248 | 66 |
| `section-x` | 39 | 25 |
| `site-container` | 25 | 21 |
| `section-y` | **0** | 0 |

## 5. Where the drift is concentrated

| Area | What is wrong | Rules it drives |
|---|---|---|
| **Dashboard + admin** (`dashboard/admin/*`, `dashboard/settings`, `invoicing`, `components/admin`) | Raw Tailwind: `bg-white`, `text-sm`, `font-semibold`, margins, off-shade greys, almost no `type-*` | V-03, V-04, V-07, V-08, V-25 |
| **Homepage:** `Footer.jsx`, `InstallationProcess.jsx`, `NavbarMobile.jsx`, `SpotTheJank.jsx` | Hex colours, hand-written gutters and padding, `max-sm`, `leading-[…]`, shadows | V-01, V-14, V-15, V-23, V-31 |
| **Shared cards and drawers:** `TemplateCard`, `EffectCardNew`, `PreviewDrawer`, `TemplatePreviewDrawer`, `WorkWithHyperiuxModal` | `!` overrides, `max-sm`, old `.textNN` classes | V-10, V-14, V-28 |
| **Header and listings:** `VaultHeader.jsx`, `TemplatesListing.jsx`, `EffectsListing.jsx` | Plain `vw`, one-off text sizes, single-side padding | V-09, V-17, V-27 |
| **Docs MCP page** (`DocsMcp.jsx`) | 62 bold weights on a page that must take all styling from `blog.css` | V-08 |
| **Effect detail** (`effect-detail.jsx`) | 8 sections without `id`, `console.log`, `docs-sheet` plus `bg-[#141414]` | V-24, V-37, D-03 |

## 6. Changes versus the first report

| Item | v1 | v2 | Why |
|---|---|---|---|
| Hex in classes | 333 | 278 | Email templates and demo chrome removed |
| `rounded-*` | 20 | 8 | Email templates removed |
| `max-sm` | 64 | 65 | Counted by line; same files |
| Placeholder text | 4 | 4 | Unchanged, still live on `/community` |
| Documentation conflicts | 10 open | 5 open (3 conflicts fixed today; `type-h1`, `section-y`, `.docs-sheet`, `--radius-*` and the git-ignored `CLAUDE.md` remain) | `CLAUDE.md`, `CODING_STANDARDS.md`, `AGENTS.md` synced |

## 7. Recommended fix order

| Priority | Action | Why |
|---|---|---|
| 1 | Replace the four `[To confirm …]` FAQ answers on `/community` (V-36) | Visible to every visitor |
| 2 | Decide `type-h1` line-height (D-01) and whether to use or remove `section-y` (D-02) | Removes the last guide ↔ CSS mismatches |
| 3 | Replace orange hexes and `bg-white` with tokens (V-02, V-03) | Mechanical, biggest consistency win |
| 4 | Convert dashboard/admin to `type-*` and tokens (V-04, V-07, V-08) | Largest block of drift; internal-facing |
| 5 | Fix `Footer.jsx`, `InstallationProcess.jsx`, `NavbarMobile.jsx` (V-01, V-14, V-15, V-23) | Highest-visibility homepage files |
| 6 | Remove `max-sm:` and `!` from shared cards and drawers (V-14, V-28) | Needs visual testing |
| 7 | Move `.docs-sheet` into `blog.css` (D-03), remove dead `--radius-*` (D-04) | Housekeeping |

**Launch relevance:** only item 1 is worth doing before release. The rest is quality and maintainability work and does not break anything for users.

## 8. Caveats

- Counts are **matching source lines** from pattern search over 451 files, not a full parse. Treat them as accurate to about ±10%.
- Some hits may still be legitimately exempt: fixed overlays (screen widths), audio and canvas math (decimals), values computed in JS (`style`), and the approved listing sizes in `templates/tokens.js`. These are called out where obvious.
- The scan excludes demo-related folders by name. A site file that is only used by demo pages would still be counted; `DemoSubpageLoader.jsx` is the one I found.
- Not checked: spacing and sizes against a design file, hover states, or whether the same role always gets the same `type-*` class across pages. Those need a visual review.
