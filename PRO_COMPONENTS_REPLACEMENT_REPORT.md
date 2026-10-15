# Design and Development Sync Report: STYLE_GUIDE.md compliance

**Date:** 2026-10-15 · **Project:** `vault-main` · **Reference:** `vault-main/STYLE_GUIDE.md`
**Companion to:** `PRODUCTION_READINESS_AUDIT.md`, `BROWSER_TEST_REPORT.md`

## 1. Verdict

**The site is not in sync with its own style guide.** The guide's design system exists in code (type scale, layout utilities, colour tokens), and the newer pages use it well. But the older pages, the dashboard/admin area, and a few shared components still use the patterns the guide forbids. The three documents that define the rules also contradict each other.

| Area | Status |
|---|---|
| Design system exists in `globals.css` (type scale, `site-container`, `section-x`, tokens) | ✅ Present and used (248 `type-*` uses in 66 files) |
| Site code follows the guide | ❌ Large drift (sections 3 and 4) |
| Documentation is consistent | ❌ Three docs conflict (section 2) |
| Visual design matches the original design file | ⚪ **Not verifiable.** No Figma file was available (the Figma connector needs authorization), so "design vs code" could only be checked against the written guide |

## 2. Documentation conflicts (fix first: they cause the code drift)

| # | Conflict | Detail |
|---|---|---|
| D-01 | **Mobile breakpoint is defined three different ways** | `STYLE_GUIDE.md`: tablet `max-lg` (<1025px), mobile `max-md` (<768px), `max-sm` forbidden on site pages. `CLAUDE.md`: `max-sm` allowed for small mobile. `src/CODING_STANDARDS.md` lines 160–180 and 525: "tablet uses `max-md`, mobile uses `max-sm`", which is a different mapping. Following the wrong document produces wrong breakpoints. |
| D-02 | **`CODING_STANDARDS.md` also contradicts the guide on units and files** | It shows `text-[2vw]` as "preferred", uses `rem`/`px` in examples, and says "No CSS files" while the guide's detail pages depend on `blog.css`. It should be updated or retired. |
| D-03 | **`CLAUDE.md` is git-ignored** (`.gitignore` line 28) | The file claims to be shared project instructions, but teammates never receive it. |
| D-04 | **`CLAUDE.md` lists a colour token that does not exist** | `dark-surface` is named in `CLAUDE.md` but is not defined in `globals.css` and is not used anywhere in `src`. The guide's own tokens `light`, `ink`, `black-20`, `white-20` are missing from `CLAUDE.md`. |
| D-05 | **Different text-shade rules** | `CLAUDE.md` example: `text-foreground/60`. Guide: the only allowed greys are `/80` and `white/20` on dark, `black/60`, `/40`, `/20` on light. |
| D-06 | **Guide says `vw` is unsafe, `CLAUDE.md` says `vw` is the default** | Guide: use `calc(var(--cvw)*N)`, never plain `vw`, inside the 1536px container. `CLAUDE.md`: "`vw` is the default unit". |
| D-07 | **Guide value out of date vs code** | Guide table gives `type-h1` line-height **1.05**. `globals.css` line ~1111 sets **1.15**. One of them is wrong. |
| D-08 | **`section-y` is promoted but never used** | The guide tells developers to use `section-y` (or `py-[7%]`). `section-y` has **0** uses; 18 files use `py-[7%]` and others hand-write padding (e.g. `Footer.jsx:254`). |
| D-09 | **Two light-theme mechanisms** | The guide says light content uses `blog-theme-light` + `blog.css`. Docs, legal, llm-info and effect-detail also use `.docs-sheet`, defined in `globals.css` (16 lines) with **hard-coded hex** (`#F4F4F4`, `#3a3a3a`, `rgba(29,29,29,.1)`) and a redefined `--foreground`. This is the exact "per-page copy" the guide forbids. |
| D-10 | **Dead tokens** | `--radius-sm … --radius-full` (7 variables) are defined, but the guide says "square corners everywhere" and there are 0 uses in site code. The guide says to delete unused variables. |

## 3. Code vs. guide: measured violations

Scope used: the guide's own scope: `src/homepage`, `src/app/(app)`, `src/app/(marketing)/blog` and home/loader, and site components (`WebsiteComps`, `layout`, `ui`, `Community`, `Pricing`, `Dashboard`, `admin`, `auth`, `blog`, `DocsContent`, `Animations`, …). **Excluded** (as the guide requires): demos, template demos, the registry and effect components. Counts come from pattern search, so a few hits may be exempt (see caveats).

| # | Rule in guide | Violations | Files | Worst offenders |
|---|---|---|---|---|
| V-01 | Hard-coded **hex** in classes (`text-[#…]`, `bg-[#…]`) | **333** (272 outside email templates) | 63 | `InstallationProcess.jsx` 24, `Footer.jsx` 20, `CodeBlock.jsx` 20, `SpotTheJank.jsx` 14 |
| V-02 | Brand-orange hexes (`#ff5f00`, `#FF6B00`, `#FFB27A` …) instead of `primary` | **101** | 50 | `WorkWithHyperiuxModal.jsx` 7, `ExitIntentInviteModal.jsx` 6, `dashboard/settings/page.js` 6 |
| V-03 | `bg-white` instead of `bg-foreground` | **163** | 45 | `dashboard/admin/page.js` 20, `admin/emails` 14, `admin/activity/*` 14 each |
| V-04 | Tailwind fixed sizes (`text-sm`, `text-base` …) instead of `type-*` | **330** | 48 | `dashboard/admin/page.js` 50, `InstallActivityTab.js` 25, `activity/[userSlug]` 24, `settings` 20 |
| V-05 | **Bold / semibold / medium / light** weights | **249** | 60 | `docs/mcp/DocsMcp.jsx` 62, `admin/activity/[userSlug]` 19, `admin/page.js` 15, `invoicing` 14 |
| V-06 | `!` important overrides | **100** | 39 | `WorkWithHyperiuxModal.jsx` 10, `TemplateCard.jsx` 7, `TemplatePreviewDrawer.jsx` 7, `PreviewDrawer.jsx` 6 |
| V-07 | `max-sm:` on site pages (forbidden) | **64** | 15 | `Footer.jsx` 21, `TemplateCard.jsx` 12, `EffectCardNew.jsx` 8 |
| V-08 | Arbitrary `max-[…px]:` breakpoints | **3** | 2 | `SiteNotFound.jsx` 2, `DemoSubpageLoader.jsx` 1 |
| V-09 | Min-width prefixes (`sm:`, `md:`, `lg:` …) | **53** | 19 | `NavbarMobile.jsx` 20, admin activity pages 12 |
| V-10 | One-off `text-[…]` sizes instead of `type-*` | **144** | 48 | `VaultHeader.jsx` 11, `InstallationProcess.jsx` 9 (`templates/tokens.js` 10 is the approved listing exception) |
| V-11 | Overriding scale line-height (`leading-[…]`) | **33** | 26 | `InstallationProcess.jsx` 6 |
| V-12 | Old `.text18…text140` / `.t96` classes (being removed) | **34** | 14 | `SiteNotFound.jsx` 6, `vault-door/index.jsx` 6, `TemplateCard.jsx` 5 |
| V-13 | Hand-written gutters instead of `section-x` | **11** | 7 | `Footer.jsx`, `CommunityHero.jsx`, `LlmInfoBody.jsx`, `EffectsListing.jsx` |
| V-14 | Hand-written `max-w-[1536px]` instead of `site-container` | **6** | 3 | `PricingPlansHome.jsx` 3, `FAQ.jsx` 2 (also `max-w-384` in `Footer.jsx:276`) |
| V-15 | Plain desktop `vw` in site sections (should be `cvw`/`hx-vw`) | **282** | many | `VaultHeader.jsx` 31, `NavbarMobile.jsx` 22, `dashboard/page.js` 15 |
| V-16 | Margins between siblings | **291** | 76 | `dashboard/settings` 16, `dashboard/admin` 14 |
| V-17 | Negative margins | **16** | 12 | `WhyJoinPanels.jsx` 3, `TuneCard.jsx` 2 |
| V-18 | Single-side padding (`pt-*`, `pb-*` …) | **175** | 84 | `Footer.jsx` 9, `EffectsListing.jsx` 9 |
| V-19 | `rem` units | **19** | 18 | `dashboard/page.js` 2 |
| V-20 | Two-or-more-decimal values | **256** | 72 | `theremin-ribbons.js` 29 and `sound.js` 29 (audio math, likely exempt), `InstallationProcess.jsx` 10 |
| V-21 | `backdrop-blur` other than `-lg` | **30** | 21 | `Navbar.jsx` 4 |
| V-22 | One-off `shadow-[…]` | **35** | 20 | `SpotTheJank.jsx` 8, `CodeBlock.jsx` 3 |
| V-23 | Fixed screen widths (`w-screen`, `w-[Nvw]`) | **76** | 44 | `VaultHeader.jsx` 7, `Loader.jsx` 6 (overlays are exempt) |
| V-24 | Off-shade text colours (`text-white/…` or `/90 /70 /60 /50`) | **236** | many | admin and dashboard pages |
| V-25 | `<section>` without an `id` | **17** | 5 | `effect-detail.jsx` (8), `dashboard/page.js` (2) |
| V-26 | Hex colours inside JS (should read the CSS variable) | **108** | 39 | `InstallationProcess.jsx` 10, `ChartTheme.js` 8, `Icons.jsx` 8 |
| V-27 | Hard-coded `matchMedia` / `innerWidth` instead of `@/lib/breakpoints` | **8** | 3 | `Loader.jsx` 5, `theremin-ribbons.js` 1, `SiteBackground.jsx` 1 |
| V-28 | Reading `prefers-reduced-motion` directly instead of `prefersReducedMotion()` | **5** | 5 | `Sidebar.jsx`, `LineReveal.jsx`, `theremin-ribbons.js`, `fell-over.js` |
| V-29 | `useFadeUp()` called without a ref (scans whole page) | **7** | 7 | `Hero.jsx`, `ExplainVault.jsx`, `BlogHero.jsx`, `not-found-content.jsx` |
| V-30 | `data-lenis-prevent` outside modals/drawers | **15** | 14 | `NavbarMobile.jsx`, `TutorialVideoButton.jsx`, `SpotTheJank.jsx` |
| V-31 | `<br />` inside headings | **6** | 6 | `PricingHero.jsx`, `PricingProCompare.jsx`, `PricingCredits.jsx`, `WhyJoinPanels.jsx` |
| V-32 | Redundant `font-aeonik` on `<h2>` | **7** | 6 | `dashboard/page.js` 2 |
| V-33 | Other font names referenced | **1** | 1 | `CustomAnimationFormModal.jsx` |
| V-34 | **Placeholder text on a live page** (`[To confirm: …]`) | **4** | 1 | `src/app/(app)/community/page.js` lines 25, 29, 34, 36. Also present in the built `/community` HTML |
| V-35 | `console.log` left in code | **1** | 1 | `effect-detail.jsx` |

**Rules that are fully followed (zero violations found):** `font-avenir` on headings (0), separate `*-data.js` files in site scope (0), redeclared `T11…T28` listing constants (0), `min-[…px]:` (0), and `rounded-*` on site UI (the 20 hits are mostly email templates, which need inline styles).

## 4. Where the drift is concentrated

| Area | What is wrong | Share of the problem |
|---|---|---|
| **Dashboard + admin** (`dashboard/admin/*`, `dashboard/settings`, `invoicing`, `components/admin`) | Built with raw Tailwind: `bg-white`, `text-sm`, `font-semibold`, margins, off-shade greys. Almost no `type-*` classes. | The largest single source of V-03, V-04, V-05, V-16, V-24 |
| **Homepage**: `Footer.jsx`, `InstallationProcess.jsx`, `NavbarMobile.jsx` | Hex colours, hand-written gutters and padding, `max-sm`, `max-w-384`, `leading-[…]`, `data-lenis-prevent` | Top offender in 8 of the tables above |
| **Shared cards/drawers** (`TemplateCard`, `EffectCardNew`, `PreviewDrawer`, `TemplatePreviewDrawer`, `WorkWithHyperiuxModal`) | `!` overrides, `max-sm`, old `.textNN` classes | V-06, V-07, V-12 |
| **Docs MCP page** (`DocsMcp.jsx`) | 62 bold/semibold weights on a page that the guide says must take all styling from `blog.css` | V-05 |
| **Effect detail** (`effect-detail.jsx`) | 8 `<section>` without `id`, `console.log`, `docs-sheet` plus `bg-[#141414]` | V-25, V-35, D-09 |

## 5. Does the site follow its own design system? (summary)

- **Good:** the type scale and layout utilities are real and widely used, the 1025px tablet breakpoint is wired consistently in both CSS and `src/lib/breakpoints.js`, and the colour variables are defined once in `globals.css`.
- **Not good:** colours are still hard-coded in about 270 class strings and 108 JS strings, so changing the brand colour would miss most of the site. The dashboard and admin were built outside the system entirely. The guide's own "only `max-lg` / `max-md`" rule is broken 67 times.
- **Net:** 66 files use the new type scale, while many others (V-04, V-10, V-12) still bypass it. The site is partway through a migration, not finished.

## 6. Recommended fix order

| Priority | Action | Why first |
|---|---|---|
| 1 | **Replace the `[To confirm …]` text on `/community`** (V-34) | Visible to every visitor, launch-facing |
| 2 | **Pick one breakpoint doc.** Update `CODING_STANDARDS.md` and `CLAUDE.md` to match `STYLE_GUIDE.md`; fix the `type-h1` 1.05 vs 1.15 mismatch (D-01, D-02, D-07) | Stops new drift at the source |
| 3 | Remove `dark-surface` from `CLAUDE.md`; un-ignore or move `CLAUDE.md` (D-03, D-04) | Cheap, avoids confusion |
| 4 | Replace orange hexes and `bg-white` with tokens (V-02, V-03) | Mechanical, find-and-replace safe, biggest visual-consistency win |
| 5 | Convert dashboard/admin to `type-*` and tokens (V-04, V-05, V-24) | Largest block of drift; internal-facing so lower launch risk |
| 6 | Fix `Footer.jsx`, `InstallationProcess.jsx`, `NavbarMobile.jsx` | Highest-visibility homepage files |
| 7 | Remove `max-sm:` and `!` from shared cards/drawers (V-06, V-07) | Needs visual testing |
| 8 | Remove dead `--radius-*` variables and unused `section-y` or start using it (D-08, D-10) | Housekeeping |

**Launch relevance:** only item 1 is worth doing before release. Items 2–8 are quality and maintainability work and do not break anything for users today.

## 7. Caveats

- Counts come from pattern matching, not a full parse, and are measured on the current working tree. Treat them as accurate to roughly ±10%.
- Some hits are legitimately exempt: audio and physics math (two-plus decimals), email templates (inline styles required), fixed overlays (screen widths), and the approved listing sizes in `templates/tokens.js`. These were counted but flagged where obvious.
- Not checked: exact padding and spacing against a design file, hover states, and per-page consistency of the same role (the guide's "same role, same class"). Those need a visual review with the design file.
- Whether the site visually matches the original Figma design could not be checked because the Figma connector requires authorization in an interactive session.
