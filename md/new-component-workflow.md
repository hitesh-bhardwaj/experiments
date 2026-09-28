# End-to-End Component Workflow

> **Status:** Finalized (doc only). This is the target pipeline;
> `scripts/component-ship.mjs` has not been updated to match yet - that's
> the next pass, once this doc is confirmed correct. Sanity is no longer
> synced automatically by any command in this pipeline - it's always a
> manual copy/paste + publish step in Sanity Studio, fed by files this
> pipeline generates for that purpose.

---

## Pipeline overview

```
Phase 0  Developer scaffold      component + demo page, wired to a shared LOCAL remixer component
   |                              (a scratch copy of the global Remixer Panel, used to try out
   |                              values/props before anything is final)
Phase 1  Registry sync            registry.json/package.json (props table, remixer sub-blocks,
   |                              changelog) written from what was settled on in Phase 0; files
   |                              copied into registry/effects/{category}/{slug}/; ONLY this
   |                              effect's public/r/{slug}.json is (re)built and public/r/index.json
   |                              is updated to add/refresh this effect's entry - no other effect's
   |                              public files are touched
Phase 2  Codegen                  for ONE named effect only, in one step since both halves touch
   |                              the registry anyway: (a) rewrites the demo page's local-remixer
   |                              usage to the shared global Remixer Panel, carrying over the
   |                              finalized props/values; (b) re-syncs the registry-side files
   |                              (index.tsx, registry.json, package.json, and every other
   |                              distributable file) in registry/effects/{category}/{slug}/ so
   |                              they reflect the just-rewired demo/component; (c) writes the
   |                              type-stripped JSX version of each of those registry files into a
   |                              LOCAL (non-registry) folder, one subfolder per effect, for the
   |                              developer to paste into Sanity Studio by hand - then delete
Phase 3  Rollback-on-failure      auto-revert if a later phase fails after Phase 1 already wrote
```

`update` re-runs Phases 1–2 together for one already-shipped effect whose
demo/component changed again later (see below) - the developer doesn't
walk through each phase by hand a second time.

---

## Phase 0 - Developer scaffold (manual)

- [ ] Component folder created at `apps/docs/src/components/{slug}/`,
  lowercase-hyphen name, `index.tsx` with a default export, accepts
  `className`, no hardcoded colors, no `@/` imports between own files.
- [ ] Preview page created at `apps/docs/src/app/(marketing)/demo/{slug}/page.tsx`.
- [ ] The preview page wires the component up to
  **`LocalRemixerDemo`** (`apps/docs/src/components/local-remixer/`) - a
  single shared component, reused across every effect's demo, that wraps
  the same production `RegistryRemixerDemo`/`RemixerPanel` machinery every
  shipped demo uses, but takes a draft `{ name, props, remixer }` object
  literal written directly in the demo file instead of an imported
  `registry.json` (which doesn't exist yet for a brand-new component).
  Same controls, same UI, same behavior as the real thing - just fed from
  local draft state instead of a shipped registry entry.
- [ ] The developer iterates using the local remixer until the
  props/defaults/ranges are settled. Those settled values are what Phase 1
  turns into `registry.json`'s `props` array, and what Phase 2 later wires
  the *global* Remixer Panel to.

No automated check today - this is groundwork before Phase 1 runs.

---

## Phase 1 - Registry sync (effect-scoped public/r rebuild)

```bash
node scripts/component-ship.mjs registry --slug {slug} --category {c} --tier {t} --title "..." --description "..."
# new component vs existing is auto-detected from whether a registry.json already exists for the slug
```

What it does:
- Discovers the component's distributable files, detects dependencies and
  the export name/kind.
- Writes `registry.json` - including the `props` array with a `remixer`
  sub-block per prop (drafted from what was settled on with the Phase 0
  local remixer) and a `changelog` entry for this version.
- Writes `package.json`.
- Copies the distributable files into `registry/effects/{category}/{slug}/`,
  with `// Built using Hyperiux Vault: https://vault.hyperiux.com` inserted
  as the first line of every distributable code file (`.ts`/`.tsx`/`.js`/
  `.jsx`/`.css`) - added if the source file doesn't already start with it,
  left as-is if it does (so re-running `registry`/`update` doesn't stack
  duplicate headers).
- Updates the single entry for this slug in root `registry/index.json`
  (adds it if new, replaces it if existing - other entries untouched).
- Free-mirror sync into `../hyperiux-components` if `tier: "free"`.
- **Rebuilds `public/r` scoped to this effect only:** regenerates
  `public/r/{slug}.json` for this effect, and updates just this effect's
  entry inside `public/r/index.json` (add if new, refresh if existing).
  It does **not** re-run a full `build:registry` pass over every effect -
  only this slug's public JSON and this slug's entry in the shared index
  file are touched.
- Free tier: full source stays embedded in `public/r/{slug}.json`,
  matching existing `build-registry.js` behavior (content stripped only
  for `pro`/`paid` tiers).

Stops the pipeline on failure; Phase 3 can revert what this phase wrote if
a later phase fails.

---

## Phase 2 - Codegen (global-remixer swap + registry re-sync + local JSX handoff, one effect only)

```bash
node scripts/component-ship.mjs codegen --slug {slug}
```

**Always scoped to exactly the one `--slug` passed in.** Never reads,
writes, or deletes anything belonging to any other effect.

Merged into one step because (b) and (a) both end up touching the
registry for the same effect - no reason to split them into two phases
that would each re-sync the same files:

1. **Swap to the global remixer.** Rewrites the demo page created in
   Phase 0: removes the local-remixer wiring, replaces it with the shared,
   production **global Remixer Panel** component (the same one every other
   effect's demo page uses), carrying over the finalized props/values/
   ranges the developer settled on with the local remixer - now also
   present in `registry.json`'s `props` from Phase 1 - so the global
   Remixer Panel reads the same values from `registry.json` instead of
   local demo-page state. The demo page that ships never contains the
   local remixer.
2. **Registry-side re-sync - only if something actually differs.** Before
   writing anything, diffs the current source in
   `apps/docs/src/components/{slug}/` against what's already copied into
   `registry/effects/{category}/{slug}/`. If nothing differs (ignoring the
   Vault header line), this step is a no-op - `registry.json`,
   `package.json`, and the copied files are left untouched, no version
   bump, no changelog entry. If one or more files differ, only those files
   are recopied (same Vault-header insertion rule as Phase 1), and
   `registry.json`/`package.json` are only rewritten if the diff actually
   changes something that affects them (e.g. a new/changed prop, a new
   dependency, a different export) - not unconditionally regenerated every
   `codegen` run.
3. **Local JSX handoff folder (not inside `registry/`).** Writes a
   type-stripped JSX version of each of that effect's registry code files
   into a dedicated local folder outside the registry tree, e.g.
   `codegen/{slug}/` at the repo root - one subfolder per effect, so every
   effect's handoff files live in predictable, separate places instead of
   scattered through `registry/effects/**`. `.tsx`/`.ts` files get a
   `jsx: "preserve"`-transpiled, type-stripped JSX version written
   alongside; `.css`/`.json` pass through unchanged. The
   `// Built using Hyperiux Vault: https://vault.hyperiux.com` header
   carries over from the registry source into these generated JSX files
   too, so what the developer pastes into Sanity already has it.
   - **Only files that actually changed are (re)written.** Each candidate
     file's freshly generated output is diffed against whatever's already
     in `codegen/{slug}/` for that path; a file whose source hasn't
     changed since the last `codegen`/`update` run is left untouched.
   - The developer opens `codegen/{slug}/`, copies the code into the
     matching `effectCodeBlock`s in Sanity Studio by hand, and publishes
     there when ready.
   - Once Sanity is updated, **the developer deletes `codegen/{slug}/`**
     themselves - because it's a dedicated per-effect folder (not mixed in
     with anything else), there's nothing else to check for before
     deleting it; no separate command is needed to find leftover output.

---

## `update` - re-sync an already-shipped component

```bash
node scripts/component-ship.mjs update --slug {slug} --summary "..." [--bump patch|minor|major | --version x.y.z]
```

For a component that's already been shipped once, whose demo/component
code changed again later: `update` re-runs Phase 1 (registry sync,
effect-scoped `public/r` rebuild) and Phase 2 (global-remixer swap +
registry re-sync + codegen) together for that one effect, in one call.

- Scoped to the single `--slug` passed in - must not read, write, or
  delete anything belonging to any other component's registry entry,
  `public/r` files, or codegen output.
- Only touches what actually changed: the registry-sync half only rewrites
  `registry.json`/`package.json` fields that differ (new/changed props, a
  new changelog entry when the version bumped, updated file list) rather
  than blindly rewriting the whole file; the codegen half only regenerates
  the specific file(s) under `codegen/{slug}/` whose source changed since
  the last run.

---

## Phase 3 - Rollback on partial failure

If a later phase fails after Phase 1 has already written new
registry/version data, the script doesn't leave the repo half-shipped:

- Detects which tracked paths Phase 1 touched for this slug (registry
  folder, the relevant `public/r/{slug}.json`, this slug's entry in
  `public/r/index.json`, this slug's entry in root `registry/index.json`,
  dist tarball).
- Prompts once: "A later phase failed after the registry was already
  updated for `{slug}`. Revert the registry changes from this run? [y/N]"
  - a `git restore` on just those tracked paths if confirmed.
- Never auto-reverts silently - always asks first.

---

## Command reference

All commands are `node scripts/component-ship.mjs <command> --slug {slug} [flags]`.

| Command | What it does |
|---|---|
| `registry` | Phase 1: create (`new`) or update (`sync`) the registry entry - props table, remixer sub-blocks, changelog; rebuilds only this effect's `public/r/{slug}.json` and this effect's entry in `public/r/index.json`. |
| `codegen` | Phase 2: **requires `--slug`**, scoped to exactly that effect. Rewrites the demo to the global Remixer Panel, re-syncs that effect's registry-side files **only if they differ from source** (no-op otherwise), then writes only the changed type-stripped JSX file(s) into `codegen/{slug}/` for manual copy into Sanity. Never touches any other slug. |
| `update` | Re-runs `registry` + `codegen` together for one already-shipped `--slug` whose demo/component changed again. Diff-scoped like `codegen`. |
| `revert` | Standalone Phase 3: `git restore` the tracked distribution paths for a slug. |
| `ship` | Runs Phase 1 (`registry`) then Phase 2 (`codegen`) for a slug end to end, stopping on failure, offering `revert` on failure. |

Common flags: `--slug` (required by every command), `--category`, `--tier`,
`--title`, `--description` (required by `registry`/`ship` for a brand-new
component), `--bump patch|minor|major` or `--version x.y.z` (for `registry`
/`update` on an existing component), `--summary` (changelog entry text),
`--dry-run` (print the plan, write nothing), `--yes` (apply without an
extra confirm prompt, required for `revert`), `--no-props-ok` (acknowledge
a component intentionally has no props).

---

## Notes for the `component-ship.mjs` implementation pass

- The effect-scoped `public/r` rebuild in Phase 1/`update` replaces the
  current behavior of shelling out to the full `build:registry` script for
  both `apps/docs` and root - it needs its own targeted logic that writes
  one `public/r/{slug}.json` and patches one entry into `public/r/index.json`
  without regenerating every other effect's file.
- Phase 2's automated demo rewrite needs a defined contract for what the
  Phase 0 local remixer's "settled values" look like (e.g. a props/defaults
  object literal in the demo file) so the script can extract them
  mechanically rather than guessing from arbitrary JSX.
- The shared local remixer component now exists at
  `apps/docs/src/components/local-remixer/LocalRemixerDemo.tsx` (barrel at
  `local-remixer/index.ts`) - a normal source component the developer
  imports into a demo page, not something `component-ship.mjs` generates.
  It wraps `RegistryRemixerDemo` from `remixer-panel/`, so Phase 2's
  automated swap just needs to replace the `LocalRemixerDemo` import/JSX
  with `RegistryRemixerDemo` reading from the real `registry.json`,
  carrying over the same `props`/`render`/`children`/`component` values.
- `codegen`'s local output folder (`codegen/{slug}/` at repo root, one
  subfolder per effect) is intentionally outside `registry/` and outside
  version control cleanup logic - since it's already partitioned per
  effect, there's no `list`-style command; the developer just looks in the
  one subfolder for the effect they're working on and deletes it once done.
