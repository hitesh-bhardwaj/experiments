# Hyperiux Vault - Phase 2 Plan

> **Audit status (2026-08-12):** the status table below is stale in three places (fixed
> inline): "Props schema design" and "Remixer panel + live prop controls" are marked
> 🟡 built-not-merged but are fully merged and live (registry.json `props`/`remixer`
> fields and `RemixerPanel.tsx` both confirmed on this branch); "TypeScript, all 115
> effects" is marked in-progress but the migration is complete (121/121 effects
> converted, 0 remaining `.js`/`.jsx` - see [`typescript-migration-plan.md`](./typescript-migration-plan.md)).
> "Admin dashboard expansion" has no status marker at all, implying not-started - a
> `dashboard/{admin,saved,settings,usage,invoicing}` scaffold already exists; whether
> every described sub-feature (login/activity tracking, in-app Vercel Analytics, daily
> install/copy metric) is wired up wasn't independently re-verified here.

*Internal planning · Rev. 8 (compressed for team-wide Claude Code)*

**8 / 19** items done · **2** built, not yet merged · **1** descoped · **4** waves · **~4–5** weeks estimated · **8** deferred to Phase 3

---

## Where the compression actually comes from

Five people each running Claude Code doesn't make every task 5x faster - it makes *repetitive, batchable-across-many-files* work compress hard, because the team can split 150+ effects into parallel batches and process each one with assistance. It doesn't touch work that's bottlenecked by human review, not typing speed.

- **Compresses hardest:** typing all 150+ effects, testing all 150+ effects, the code-comments pass - all genuinely parallelizable across the team, batch by batch.
- **Compresses moderately:** the remixer panel, the registry/Sanity workflow tool, the admin dashboard - Claude Code speeds up writing and wiring the code, but these are single novel features that still need real iteration and testing, not a batch job.
- **Barely compresses:** Sanity content entry, comparison-page research and fact-checking, design. These are bottlenecked by a person deciding and reviewing, not by how fast code gets written.

## Before anything else

**Foundation gates the rest of the phase.** Six items below - props table, default image/text, published dates, changelog display, a11y badges, and the remixer panel itself - all read from the same registry + Sanity data. Right now that pipeline has a real crack in it: the documented free-effect build step in `hyperiux-components` is dead, and the registry's declared `files` array is silently ignored in favor of a directory scan. Building six features on top of that without fixing it first means fixing it six times, or shipping six things that quietly drift from each other.

- Fix the dead build step and the `files`-array inconsistency
- Ship a single scaffold command that creates the registry entry, runs the build, and drafts the matching Sanity document in one pass
- Design the props schema once - shared source for both the props table and the remixer's controls

## How the phase is sequenced

| Wave | Duration |
|---|---|
| Foundation | ~1 wk |
| Core | ~2.5 wk |
| Extended | ~1 wk |
| Design | TBD (parallel, non-blocking) |

Critical path Foundation → Core → Extended: **~4–5 weeks**. Design (Wave 4) runs alongside Core and Extended, not blocking either. The MCP Server stays at the tail of Extended, after Wave 1's registry fix has had time to prove out.

Wave 2's TypeScript and testing retrofits changed most: split across 2–3 people running Claude Code on parallel batches of effects, rather than one person working through 150+ effects sequentially.

---

## Wave 1 - Foundation

| Item | Effort | Status |
|---|---|---|
| Unified registry + Sanity workflow | ~~2–3 days~~ | ✅ Done - merged to `phase-2-dev` (`e19b662e0`/`9ff76c0f3`): new `component-workflow.test.js`, `sanity-code-sync.test.js`, `component-automation-plan.md` |
| Props schema design | ~~1 day~~ | 🟡 Built, not yet merged - `registry.json` now carries real `props`/`remixer` fields on the `props-remixer` branch (`2867563bf`) |
| CI gate | ~~1 day~~ | ✅ Done |
| Extended linting | ~~1–2 days~~ | ✅ Done |

Registry workflow and props schema run in parallel with CI gate and linting - two tracks, not four sequential steps. That's the whole wave in about a week.

**CI gate + extended linting were estimated at 2–3 days combined - shipped in one session instead.** First real data point on how this compression model plays out in practice:
- CI gate: lint, test, and build run on every PR for both `apps/docs` and `hyperiux-vault`, verified green on GitHub's actual runners (not just locally) - [PR #17](https://github.com/Hyperiux-Immersion-Labs/hyperiux-pro-components/pull/17). Branch protection turned out to need a paid GitHub plan for a private repo (free-tier org, confirmed via the API) - deferred by choice, not blocked; the checks themselves are live and enforced by convention for now.
- Extended linting: found and fixed 2 real lint errors, wired the previously-unused Sanity Studio lint script, and made a deliberate call to keep ~70 new React-Compiler-rule warnings (`react-hooks/refs`, `set-state-in-effect`, `immutability`, `purity`) non-blocking rather than risk a blind fix across 39 animation/WebGL files - tracked in [issue #16](https://github.com/Hyperiux-Immersion-Labs/hyperiux-pro-components/issues/16) for a proper pass.

## Wave 2 - Core

| Item | Effort | Notes |
|---|---|---|
| Remixer panel + live prop controls | ~~4–5 days~~ | 🟡 Built, not yet merged - `790541607` → `d0354fb5d` "implemented remixer panel in all effects", still only on `props-remixer` |
| ~~Props table in Sanity~~ | ~~1–2 days + ongoing~~ | ⏹ Descoped - props/data render directly from the registry on effect detail pages instead of a separate Sanity table |
| TypeScript, all 150+ effects | ~1.5 wk | 🟡 In progress - infra done, pilot (`scroll-stack`, `hover-stack`) converted and verified; see `typescript-migration-plan.md` for the category-by-category rollout |
| Tests, all 150+ effects | ~~1 wk~~ | ✅ Done - [PR #19](https://github.com/Hyperiux-Immersion-Labs/hyperiux-pro-components/pull/19) |
| Admin dashboard expansion | 2–3 days | Login/activity tracking, Vercel Analytics in-app, daily install/copy metric - extends existing email log view |
| Accessibility badge | 1 day | 94% of effects already handle reduced motion - surfaces it as a trust signal |
| "Similar effects" recommendations | 1 day | Category/tag-based, no ML needed |
| On-site changelog display | ~~1 day~~ | ✅ Done - [PR #18](https://github.com/Hyperiux-Immersion-Labs/hyperiux-pro-components/pull/18) |
| Published date on effect cards | ~~1 day~~ | ✅ Done - changelog-driven `addedAt`/`updatedAt` dates, synced into Sanity (`f5bb00ad3`) |
| Code comments pass | 1–2 days | Claude-assisted, human-reviewed before merge |
| Default image + text hardening | ~~1 day~~ | ✅ Done - remaining components already ship with real images/text, no blank-state gap found |
| Em dash cleanup in Sanity | 1 day | Same style rule already applied to CLI README/changelog |

**Tests, all 150+ effects - shipped, jsdom + `@testing-library/react` harness in `apps/docs`, scope confirmed as render-mounts-cleanly + prop-contract (the "One remaining call" below is now resolved on that basis):** 110/150+ effects pass a real mount-without-throwing check; the other 5 are documented, individually-reasoned known limitations, not silent gaps - `fish-eye` imports `three/webgpu`, which can't run outside a real browser GPU context, and 4 effects (`dotted-grid`, `full-screen-crosshair`, `svg-pixel-reveal`, `text-stream`) only fail to import when batched with ~30+ others in one test session despite working fine alone, an unresolved vite-node/esbuild tooling quirk rather than a bug in any of them. Building the harness also surfaced a real, live bug: `liquid-glass-cursor`'s main file held JSX but was named `index.js` instead of `.jsx` - harmless in this repo's own permissive webpack config, but would fail to parse for anyone installing that Pro effect via the CLI into a standard toolchain. Fixed alongside the harness.

## Wave 3 - Extended

| Item | Effort | Notes |
|---|---|---|
| Comparison pages | ~1 wk | Aceternity, Magic UI, Osmo + 1 reserved slot. Mostly research/writing, one page per person, concurrent |
| MCP Server | ~~2–3 days~~ | ✅ Done - merged in `hyperiux-components` ([PR #6](https://github.com/Hyperiux-Immersion-Labs/hyperiux-components/pull/6), `1f980bb`); extra docs/tests (`57bc913`) still sitting on that repo's `phase-2-dev` |

## Wave 4 - Design (parallel, not on the critical path)

| Item | Effort |
|---|---|
| Landing + category page design and build | Design: TBD · Build: 2–3 days |

Held for later, correctly - needs a real designer, not dev-driven design-in-code. Starts whenever that person is engaged and runs alongside Waves 2 and 3 rather than blocking either.

---

## Deferred to Phase 3

| Item | Why |
|---|---|
| In-browser sandbox (CodeSandbox / StackBlitz embed) | Large lift, nice-to-have over must-have |
| Curated effect collections / kits | Better once the registry foundation has settled |
| Framework support beyond Next.js App Router | Deserves its own initiative, not a line item |
| Theming / design-token layer | Cross-cutting - needs TS + registry work done first |
| Performance / bundle-size indicator | Lower priority than the a11y badge |
| Team / agency shared libraries | Pro-tier feature, real scope of its own |
| "Your project" dashboard view | Valuable, not urgent |
| Public showcase gallery | Needs a submission + moderation flow - content-ops, not engineering |

## Resolved calls

**How deep should "proper tests for all 150+ effects" go?** - Resolved: render-mounts-cleanly + prop-contract, not full pixel-diff visual regression. Shipped on that basis in [PR #19](https://github.com/Hyperiux-Immersion-Labs/hyperiux-pro-components/pull/19); see Wave 2 above. Full visual regression remains a separate, larger infrastructure project if it's ever wanted.

---

*Hyperiux Vault - Phase 2, Rev. 8 · Wave 1: 3/4 done, 1 built-unmerged · Wave 2: 4 done, 1 built-unmerged, 1 descoped, 6 open · Wave 3: 1/2 done · ~4–5 wk critical path · TS: all 150+ effects, parallelized · Design: gated, parallel · Comparisons: Aceternity, Magic UI, Osmo + 1*
