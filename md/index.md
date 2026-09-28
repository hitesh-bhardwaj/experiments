# Docs index

Every markdown doc in this repo other than the root `README.md`, with what it actually
covers and how much you should trust it. Last reconciled against the codebase
2026-08-12 - see each file's own "Audit status" callout for specifics.

Four docs stay at repo root because tooling or contributors expect to find them there
on sight; everything else lives in this folder.

## At repo root

| File | What it is |
|---|---|
| [`README.md`](../README.md) | Public-facing overview. Fixed 2026-08-12: Architecture and Contributing sections now describe this repo's actual npm/Next.js layout instead of the sibling `hyperiux-components` repo's pnpm/Turborepo structure; effect counts corrected (32 free / 89 pro); CLI command table now lists `outdated`/`versions`/`diff` with a note that they're currently non-functional (see `versioning.md`). |
| [`AGENTS.md`](../AGENTS.md) | One-paragraph warning for AI coding agents that this repo's pinned Next.js version has breaking changes vs. training data. Kept at root - this is a convention AI tools look for by exact filename. |
| [`CHANGE_GUIDELINES.md`](../CHANGE_GUIDELINES.md) | Four hard constraints for any change (don't touch UI, responsiveness, registry functionality, or unrelated code without asking first). Prescriptive, not descriptive - worth knowing the "don't change the registry" rule has been outpaced by real work (TypeScript migration, remixer panel, Sanity-source-of-truth changes) with no evidence it gated any of it. |
| [`CODING_STANDARDS.md`](../CODING_STANDARDS.md) | Code style rules (naming, file structure, GLSL conventions, CSS, React patterns). Was accidentally duplicated top-to-bottom in the same file - trimmed back to one copy. Still written entirely in JS/JSX syntax against a now-100%-TypeScript registry, and two of its most specific rules (single `useEffect` for WebGL lifecycles, `max-sm:`/`max-md:`-only responsive breakpoints) are contradicted by how the code is actually written today. Due a real pass, not just the dedupe done here. |

## In `md/`

| File | What it is |
|---|---|
| [`developer-new-component.md`](./developer-new-component.md) | Step-by-step guide for building and shipping a brand-new effect, source-through-CLI. Verified accurate. |
| [`versioning.md`](./versioning.md) | Merged: how effect versioning works today + the original plan that shipped it. The data model (`registry.json` version/changelog, hand-rolled semver) is solid, but `outdated`/`versions`/`diff` are dead code against real installs - `add` never writes the lockfile they all read from. |
| [`typescript-migration-plan.md`](./typescript-migration-plan.md) | Execution plan for converting all registry effects to TypeScript. Migration is complete (121/121, 0 remaining `.js`/`.jsx`); the doc's own status table still shows most categories "pending" and its "final cleanup" follow-ups haven't been done. |
| [`phase-2-plan.md`](./phase-2-plan.md) | The team's master Phase 2 roadmap and status tracker. Several rows were marked "built, not yet merged" or in-progress when they're actually fully shipped (props schema, remixer panel, TypeScript migration) - corrected inline. |
| [`remixer-panel.md`](./remixer-panel.md) | Architecture/implementation plan for the Remixer Panel (live prop controls on effect pages). The `registry.json` shape it defines is confirmed accurate; the file-layout section and its `spider-particles` worked example are stale. |
| [`remixer-effect-props.md`](./remixer-effect-props.md) | Generated inventory of every effect's remixer-relevant props, meant to be regenerated from source. Currently stale - 6 recent effects missing entirely, ~14 more have undocumented new props. Referenced by the `props-remixer-audit` subagent. |
| [`component-workflow-tooling.md`](./component-workflow-tooling.md) | Merged: the `component-workflow.mjs` plan (new/sync/rename/move/delete/diff/revert/verify) + the `sanity-code-sync.mjs` plan. Both scripts are built and match their plans closely; real gap is the `main` file default still hardcoding `index.jsx` against an all-TypeScript registry. |
| [`mcp-documentation.md`](./mcp-documentation.md) | Reference doc for the published `hyperiux-mcp-server` npm package (tools, params, auth, client setup). Accurate except the auth-precedence order (env var vs. saved session) is stated backwards from the actual code. |
| [`effect-audit-reports.md`](./effect-audit-reports.md) | Merged: the Remixer Panel prop-wiring audit + the reduced-motion disclaimer audit, both point-in-time QA sweeps from late July 2026. A 2026-08-12 follow-up (prepended) found the TypeScript migration silently reintroduced several bugs both reports had marked fixed. |
| [`dashboard-analytics-plan.md`](./dashboard-analytics-plan.md) | Proposal for adding activity charts to the admin/user dashboards, grounded in what's actually in Supabase today. Not yet started. |
| [`admin-dashboard-audit.md`](./admin-dashboard-audit.md) | Engineering audit of the user/admin/super-admin dashboards as of 2026-09-10: the role/data flow between tiers, a per-page status table, what's already solid, a 12-item baseline checklist against a senior-engineer bar (audit logging and impersonation are the two real gaps), six use-case walkthroughs, and prioritized recommendations. |
| [`auto-invite-csv-plan.md`](./auto-invite-csv-plan.md) | Plan for a daily automated CSV invite sender (uploads a CSV, cron sends 70/day at 11:00 IST, shares the existing 100/day Resend-driven cap with manual invites). Grounded in the actual `InviteModal`/`waitlist/invite` route code. Not yet started. |
| [`sections-templates-plan.md`](./sections-templates-plan.md) | Approved plan for adding Sections (hero/feature/testimonial/footer, etc.) and Templates (full multi-page site assemblies, sold as a downloadable scaffold) to the Vault, plus fixing the effect detail page's video-only preview. Grounded in a live audit of Aceternity, ReactBits, Magic UI, and OriginKit. Not yet started. |
| [`template-qc-checklist.md`](./template-qc-checklist.md) | Full BLOCK/WARN gate checklist a Template must clear before shipping - manifest data, cross-section integrity, build/runtime, responsive, accessibility, performance, licensing, packaging, pricing/access, preview parity. Companion to `sections-templates-plan.md` §5. Not yet wired into automated tooling. |
| [`template-download-purchase-plan.md`](./template-download-purchase-plan.md) | Concrete implementation plan for turning `template-demo/<slug>` into standalone `npm i`-able project zips, gated behind annual-Pro-included / one-time-purchase access control (Razorpay, not Stripe - corrects `sections-templates-plan.md`'s assumption). In progress, starting with Elena Voss. |
| [`section-qc-checklist.md`](./section-qc-checklist.md) | Full BLOCK/WARN gate checklist a Section must clear before shipping - manifest data, code integrity, responsive, accessibility, reduced motion, props/remixer schema, tier correctness, preview parity, versioning. Companion to `sections-templates-plan.md` §4; every item is also a prerequisite gate for a section to be eligible for template bundling. Not yet wired into automated tooling. |

## Deleted in this cleanup

- **`PUBLISHING.md`** - described publishing `packages/cli`, a package that has never existed in this repo (it lives in the sibling `hyperiux-components` repo, copy-pasted in here by commit `7214a5e2`). Zero applicable content; use `hyperiux-components`' own release workflow docs instead.
- **`LIVE_CONTROLS_PROPS.md`** - an early, hand-written props audit covering 32 of 121 effects, fully superseded in scope and accuracy by `remixer-effect-props.md`. No unique surviving information; recoverable from git history if ever needed.
