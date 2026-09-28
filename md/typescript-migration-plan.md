# TypeScript Migration Plan - Registry Effects

> **Audit status (2026-08-12): migration is COMPLETE.** `registry/effects/**` is 100%
> TypeScript (237 `.tsx` + 65 `.ts`, 0 remaining `.jsx`/`.js`), across all 121 effects -
> the per-category "pending" rows in the Execution Order table below no longer reflect
> reality, they all shipped. The "Final cleanup" section at the bottom is **not** done
> yet: `apps/docs/src/CODING_STANDARDS.md` (a separate file from root
> `CODING_STANDARDS.md`) and [`component-workflow-tooling.md`](./component-workflow-tooling.md)
> (formerly `component-automation-plan.md`) still describe/hardcode the pre-migration
> `.jsx` state and haven't been updated post-migration.

Execution plan for `phase-2-plan.md`'s Wave 2 item "TypeScript, all 150+ effects." Scope is
strictly the registry effects - nothing else in the repo (no `Payments`, `Dashboard`, `auth`,
`Homepage`, etc.).

## Scope

For each of the 116 effects under `registry/effects/<category>/<slug>/`:

- `registry/effects/<category>/<slug>/*.jsx|.js` → `.tsx`/`.ts`
- `apps/docs/src/components/<slug>/*.jsx|.js` → `.tsx`/`.ts` (the docs-local mirror used by
  `/demo` and `/embed` routes - content-diverged from the registry copy in some effects; each
  tree is converted independently, preserving its own current content)
- `apps/docs/src/app/(marketing)/demo/<slug>/page.js` → `page.tsx`
- `apps/docs/src/app/(marketing)/embed/<slug>/page.js` → `page.tsx` (where an embed route exists)
- `registry.json` + `package.json` in each effect folder: `main`/`files[].path`/`files[].target`
  updated to the new extensions
- `registry/effects/_shared/createSuspendedRaf.js(.test.js)` → `.ts` (not an effect itself -
  referenced as a copy-paste template, not imported at runtime - but it's the one non-effect
  file living in this tree)

Out of scope: everything under `apps/docs/src/components/` that isn't a registry effect mirror
(`Payments`, `Dashboard`, `auth`, `Buttons`, `Homepage`, `ui`, `layout`, `hooks`, etc.), and the
rest of the Next.js app.

## Already done (pilot)

`scroll-stack` and `hover-stack` are fully converted and verified end-to-end. That pass also
found and fixed every extension-sensitive spot in the shared tooling, so the remaining effects
are mechanically the same pattern with no more infra surprises expected:

- `apps/docs/scripts/build-registry.js` - file-discovery filter and entry-file sort now
  recognize `.tsx`/`.ts`
- `apps/docs/src/lib/registry.js` - private-effect file discovery and `getEffectCode()` primary
  file heuristic now recognize `.tsx`/`.ts`
- `scripts/component-workflow.mjs` - `SOURCE_EXTENSIONS`, the index-file sort, and
  `resolveLocalImport()` now recognize `.tsx`/`.ts`
- `registry/tsconfig.json` - new, local-only config so `registry/effects/**/*.tsx` gets
  `tsc --noEmit` coverage and editor IntelliSense (points `react`/`gsap` type resolution at
  `apps/docs/node_modules` since `registry/` has no `node_modules` of its own). Never read by
  any build/pack script.
- `registry/index.json` (root snapshot read by the render-contract test) - entries refreshed to
  the new paths directly, not via `component:sync` (that command copies docs → registry and
  would overwrite the intentional per-tree content differences)

## Typing approach

Behavior-preserving conversion, not a rewrite. Per file:

- Type component props with an interface/type alias next to the component (matches the existing
  `depth-shift-transition` precedent).
- Type `useState`/`useRef` where inference doesn't already cover it.
- Inline CSS custom properties (`style={{ "--foo": ... }}`) need a small
  `CSSProperties & Record<string, string | number>` cast - `React.CSSProperties` doesn't allow
  arbitrary custom-property keys under `strict`.
- For genuinely complex shapes (raw WebGL/Three.js uniforms, GSAP timeline internals, refs into
  imperative canvas/particle systems) prefer a narrow, honest type over blocking the migration -
  `unknown` + a narrowing cast, or a small local type, rather than chasing full type coverage on
  code that isn't changing behavior. Tightening those can be a later, separate pass.
- No new runtime dependencies. `gsap` and `three` already ship their own types; nothing else in
  the registry's `dependencies` needs an `@types/*` package.

## Execution order

Smallest categories first to keep verification batches small and catch any per-category surprise
(e.g. an effect with an unusual file layout) early rather than late.

| Order | Category | Effects | Status |
|---|---|---|---|
| ✅ | (pilot) | scroll-stack, hover-stack | done |
| 1 | `loaders` | 3 | pending |
| 2 | `backgrounds` | 3 | pending |
| 3 | `carousels` | 5 | pending |
| 4 | `navigation` | 4 | pending |
| 5 | `buttons` | 7 | pending |
| 6 | `transitions` | 7 | pending |
| 7 | `components` | 14 (minus hover-stack, already done) | pending |
| 8 | `text` | 16 | pending |
| 9 | `cursor` | 16 | pending |
| 10 | `webgl` | 19 | pending |
| 11 | `scroll` | 22 (minus scroll-stack, already done) | pending |
| - | `_shared` | 2 files, not an effect | pending |

## Verification per batch

After each category:

1. `apps/docs/node_modules/.bin/tsc --noEmit -p registry/tsconfig.json` - registry-side files
2. `tsc --noEmit -p apps/docs/tsconfig.json --ignoreDeprecations 6.0` - docs-side files (the
   `--ignoreDeprecations` flag works around a pre-existing, unrelated `baseUrl` deprecation
   warning in that tsconfig - not something this migration introduces or should fix as a
   drive-by)
3. `node scripts/build-registry.js` (root) - rebuilds `registry/dist/*.tgz`, confirms
   `package.json` sync
4. `node apps/docs/scripts/build-registry.js` - rebuilds `apps/docs/public/r/*.json`
5. `npm --prefix apps/docs run test` - full vitest suite, in particular
   `registry-effects.render.test.jsx` (mounts every effect) and `component-workflow.test.js`
6. Refresh `registry/index.json` for the batch's slugs (same direct-write approach as the pilot,
   not `component:sync`)

Any failure gets fixed before moving to the next category, not deferred.

## Final cleanup (after all 116 effects are converted)

These currently hardcode `.js`/`.jsx` as the mandated extensions and would be actively wrong
mid-migration, so they're updated last, once true:

- `apps/docs/src/CODING_STANDARDS.md` - "Only `.js` and `.jsx` files are allowed" and related
  `index.jsx` mentions
- `component-automation-plan.md` - file-discovery include/exclude lists and `index.jsx` examples
- `phase-2-plan.md` - mark the "TypeScript, all 150+ effects" row done
