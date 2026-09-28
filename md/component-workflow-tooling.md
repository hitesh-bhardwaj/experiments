# Component Workflow Tooling

Two planning docs, merged: the `scripts/component-workflow.mjs` plan (component
new/sync/rename/move/delete/diff/revert/verify) and the `scripts/sanity-code-sync.mjs`
plan (keeping Sanity's rendered code blocks in sync with the registry source). Both
were Wave 1 Foundation items and both scripts are built.

> **Audit status (2026-08-12):** both docs are best read as *documentation of what
> exists* - the described commands are built and match, not aspirational. Two real
> gaps found:
>
> 1. **`component-workflow.mjs`'s `main` file default is still hardcoded to
>    `"index.jsx"`** (4 call sites). File discovery/import-resolution *are* already
>    TypeScript-aware (`.ts`/`.tsx` included in `SOURCE_EXTENSIONS`), but since
>    `registry/effects/**/index.*` is now 100% `.tsx` (see
>    [`typescript-migration-plan.md`](./typescript-migration-plan.md)), running
>    `component:new` on a new TS-only component without explicitly passing `--main
>    index.tsx` will fail - the script looks for a nonexistent `index.jsx`.
> 2. **`sanity-code-sync.mjs` has no `--all` batch mode and no `component:sync
>    --sync-sanity-code` integration flag.** Both are consistent with the plan's own
>    "Minimum Viable Version" scoping - they were always optional/deferred, just still
>    genuinely unbuilt.
> 3. **`component-workflow.mjs` still treats `registry.json` mostly as generated
>    output, not as the home for curated remixer metadata.** In practice, teams now
>    hand-author `props`, `remixer`, and related install-facing metadata directly in
>    `registry/effects/{category}/{slug}/registry.json` first, then expect workflow
>    commands to preserve and carry that data through public JSON, tarballs, and free
>    mirror sync. The current script rebuilds core metadata from docs source and does
>    not yet have a "preserve existing `registry.json.props` when present" rule.
>
> Everything else - command boundaries, safety gating (`--yes`/`--dry-run`), the
> matching/patch-shape logic, required env vars - checks out against the live scripts.

---

## Part 1 - Component workflow (`scripts/component-workflow.mjs`)

*(formerly `component-automation-plan.md`)*


This document proposes an automation layer for the workflow described in
[`developer-new-component.md`](./developer-new-component.md).

## Goal

Create one command that takes a component already built in
`apps/docs/src/components/{slug}/` and prepares every distribution artifact that
the repo expects:

- `registry/effects/{category}/{slug}/`
- `registry/effects/{category}/{slug}/registry.json`
- `registry/effects/{category}/{slug}/package.json`
- `registry/index.json`
- `apps/docs/public/r/{slug}.json`
- `apps/docs/public/r/index.json`
- `registry/dist/hyperiux-{slug}-{version}.tgz`
- for free components only, the mirror in the sibling `hyperiux-components`
  repo

The command should make the current manual workflow repeatable, reviewable, and
harder to partially complete.

## Proposed Commands

New component:

```bash
npm run component:new -- \
  --slug immersive-full-screen-nav \
  --category navigation \
  --tier free \
  --title "Immersive Full Screen Navigation" \
  --description "Clip-path powered full-screen navigation overlay" \
  --version 1.0.0 \
  --date 2026-07-27
```

Existing component refresh:

```bash
npm run component:sync -- \
  --slug immersive-full-screen-nav \
  --bump patch \
  --summary "Added reduced-motion support" \
  --date 2026-07-27
```

Dry run:

```bash
npm run component:new -- --slug grid-tunnel --category webgl --tier pro --dry-run
```

Verification:

```bash
npm run component:verify -- --slug immersive-full-screen-nav
```

Inspect differences before syncing or reverting:

```bash
npm run component:diff -- --slug immersive-full-screen-nav
```

Revert tracked distribution artifacts for a component:

```bash
npm run component:revert -- --slug immersive-full-screen-nav --yes
```

Sync files without changing the version or changelog:

```bash
npm run component:sync -- --slug immersive-full-screen-nav --no-version-bump
```

Rename a component slug:

```bash
npm run component:rename -- \
  --from old-slug \
  --to new-slug \
  --bump major \
  --summary "Renamed component slug" \
  --date 2026-07-27
```

By default, `component:rename` renames distribution artifacts only. It does not
rename `apps/docs/src/components/{old-slug}` because that folder may contain
in-progress developer work. To rename the docs source folder too, pass
`--move-docs-source`:

```bash
npm run component:rename -- \
  --from old-slug \
  --to new-slug \
  --bump major \
  --summary "Renamed component slug" \
  --date 2026-07-27 \
  --move-docs-source
```

Move a component to another category:

```bash
npm run component:move -- \
  --slug grid-tunnel \
  --from webgl \
  --to backgrounds \
  --bump minor \
  --summary "Moved component to backgrounds category" \
  --date 2026-07-27
```

Delete a component fully:

```bash
npm run component:delete -- --slug old-component --yes
```

`component:delete` is destructive and should print a plan unless `--yes` is
passed. A full delete removes:

- `apps/docs/src/components/{slug}/`
- `registry/effects/{category}/{slug}/`
- the matching `registry/index.json` entry
- `apps/docs/public/r/{slug}.json`
- the matching `apps/docs/public/r/index.json` entry
- matching `registry/dist/hyperiux-{slug}-*.tgz` files
- matching `registry/dist/registry-index.json` entries
- any alias group whose canonical `slug` is the deleted slug
- for free-tier components, the mirror folder and mirror `registry/index.json`
  entry in `../hyperiux-components`

Run this command only when the component should be removed from both the docs
source tree and distribution registry.

The implementation can live as `scripts/component-workflow.mjs`, with package
scripts added later after review.

## Inputs

Required for a new component:

| Input | Example | Notes |
|---|---|---|
| `slug` | `immersive-full-screen-nav` | Lowercase hyphen folder name. Must exist in `apps/docs/src/components/{slug}`. |
| `category` | `navigation` | Must be one of the existing `registry/effects/*` categories. |
| `tier` | `free` or `pro` | Drives public JSON behavior and free-repo mirror sync. |
| `title` | `Immersive Full Screen Navigation` | Human-readable title. |

Optional:

| Input | Example | Default |
|---|---|---|
| `description` | `Full-screen navigation overlay...` | Prompt/fail if missing for new components. |
| `version` | `1.0.0` | `1.0.0` for new registry entries. |
| `packageVersion` | `1.0.0` | Match `registry.json` version unless explicitly overridden. |
| `date` | `2026-07-27` | Changelog release date. Defaults to today's date. |
| `summary` | `Initial release` | Changelog summary. Defaults to `Initial release` for new components. |
| `addedAt` | `2026-07-27` | Not written in the first automation pass unless Sanity automation is added. |
| `main` | `index.jsx` | `index.jsx`. |
| `exportName` | `ImmersiveFullscreenNav` | Auto-detect when safe; otherwise require explicit input. |
| `exportKind` | `default` | Auto-detect when safe; otherwise require explicit input. |
| `dependencies` | `gsap,lucide-react` | Auto-detect first pass, allow explicit override. |
| `previewUrl` | `/demo/slug` | Always `/demo/{slug}` for this repo. |
| `freeRepoPath` | `../hyperiux-components` | Only needed for `tier=free`. |
| `dryRun` | `true` | Print operations without writing files. |

Required for an existing component refresh:

| Input | Example | Notes |
|---|---|---|
| `slug` | `immersive-full-screen-nav` | Finds the current registry entry and derives category/tier from it. |
| `bump` | `patch` | One of `patch`, `minor`, or `major`. |
| `summary` | `Added reduced-motion support` | Prepended to `registry.json.changelog`. |

Optional for an existing refresh:

| Input | Example | Default |
|---|---|---|
| `date` | `2026-07-27` | Today's date. |
| `version` | `1.2.0` | Explicit target version. Mutually exclusive with `--bump`. |
| `breaking` | `true` | `true` automatically when `--bump major`; otherwise `false`. |
| `freeRepoPath` | `../hyperiux-components` | Used only if the current registry entry is `tier=free`. |
| `dryRun` | `true` | Print planned writes and commands without changing files. |

Required for a slug rename:

| Input | Example | Notes |
|---|---|---|
| `from` | `old-slug` | Existing canonical slug. |
| `to` | `new-slug` | New lowercase hyphenated slug. |
| `bump` or `version` | `major` | Slug changes should usually be a major bump unless this is pre-release/internal. |
| `summary` | `Renamed component slug` | Changelog summary. |

Optional for a slug rename:

| Input | Example | Default |
|---|---|---|
| `category` | `webgl` | Auto-detected from current registry entry. |
| `date` | `2026-07-27` | Today's date. |
| `moveDocsSource` / `move-docs-source` | `true` | Whether to rename `apps/docs/src/components/{from}` to `{to}`. Default is `false` for safety. |
| `addAlias` | `true` | Add old slug as an alias in `apps/docs/src/lib/effect-slugs.js`. Default `true`. |
| `dryRun` | `true` | Print planned path/metadata changes without writing files. |

Required for a category move:

| Input | Example | Notes |
|---|---|---|
| `slug` | `grid-tunnel` | Existing canonical slug. |
| `from` | `webgl` | Current category. Can be auto-detected, but explicit input prevents accidental moves. |
| `to` | `backgrounds` | Destination category under `registry/effects`. |
| `bump` or `version` | `minor` | Category changes are metadata/discovery changes; usually minor unless breaking. |
| `summary` | `Moved component to backgrounds category` | Changelog summary. |

Optional for a category move:

| Input | Example | Default |
|---|---|---|
| `date` | `2026-07-27` | Today's date. |
| `dryRun` | `true` | Print planned path/metadata changes without writing files. |

`addedAt` / published date is currently Sanity-owned in this repo, not
registry-owned. The component workflow command should not pretend to update it
until Sanity document creation/update is automated. In the first version, use
`--date` for changelog/release date only.

## Command Boundaries

Keep the commands explicit so automation does not guess at risky intent:

- `component:new` creates distribution artifacts for a new slug.
- `component:sync` refreshes an existing component with the same slug and
  category. It can detect added/removed component files, but it must not rename
  slugs or move categories.
- `component:rename` changes a canonical slug and updates every derived path and
  metadata field.
- `component:move` changes a registry category and updates every derived path
  and metadata field.
- `component:verify` is read-only validation.

If `component:sync --slug old-slug` cannot find
`apps/docs/src/components/old-slug`, it should fail with a message suggesting
`component:rename --from old-slug --to new-slug`. It should not silently infer a
rename from nearby folder names.

## What Dry Run Means

`--dry-run` is a safety mode. It performs discovery and validation, then prints
what it would do without writing files or running mutating build commands.

For `component:new`, dry run should print:

- whether `apps/docs/src/components/{slug}` exists
- the detected distributable files
- the registry folder it would create
- the generated `registry.json`
- the generated `package.json`
- whether a free-tier mirror would be required
- the public registry build command it would run
- the tarball build command it would run
- the verification checks it would run

For `component:sync`, dry run should print:

- the current registry category/tier/version
- the next version from `--bump` or `--version`
- files that would be copied from the docs component folder into the registry
- the changelog entry that would be prepended
- generated public registry/tarball outputs
- free mirror operations, if any

For `component:rename`, dry run should print:

- current registry folder
- new registry folder
- optional docs source folder rename
- old and new `registry.json.name`
- old and new package name
- old and new `previewUrl`, `importPath`, `target`, and `files[].target`
- old slug alias that would be added
- generated public registry/tarball outputs
- free mirror operations, if any

For `component:move`, dry run should print:

- current registry category/path
- destination registry category/path
- old and new `registry.json.category`
- old and new `registryPath` in `registry/index.json`
- generated public registry/tarball outputs
- free mirror operations, if any

Use dry run before the real command when category, tier, version, or file
selection is uncertain.

## Automation Flow

### Phase 1: Preflight

1. Verify `apps/docs/src/components/{slug}/` exists.
2. Verify `slug` is lowercase hyphenated.
3. Verify `category` exists under `registry/effects/`.
4. Verify `tier` is exactly `free` or `pro`.
5. Refuse to overwrite an existing registry folder unless `--overwrite` or
   `component:sync` is used.
6. For `tier=free`, verify the sibling `hyperiux-components` checkout exists,
   unless `--skip-free-mirror` is explicitly passed.
7. Check that `apps/docs/scripts/build-registry.js` and root
   `scripts/build-registry.js` are present.
8. In dry-run mode, show the full file plan and stop before writes.

### Phase 2: Discover Distributable Files

Scan `apps/docs/src/components/{slug}/` and include only files users need:

- include `.js`, `.jsx`, `.css`
- exclude docs-only files by convention:
  - `Demo.jsx`
  - `*.demo.jsx`
  - `*.test.js`
  - `*.test.jsx`
  - `*.spec.js`
  - local notes/readmes unless explicitly requested

Then parse local relative imports so the command can fail if a required file is
missing from the generated `files` list.

### Phase 3: Create Registry Source

Copy distributable files to:

```text
registry/effects/{category}/{slug}/
```

Generate `registry.json`:

```json
{
  "name": "slug",
  "version": "1.0.0",
  "changelog": [
    {
      "version": "1.0.0",
      "date": "YYYY-MM-DD",
      "summary": "Initial release",
      "breaking": false
    }
  ],
  "type": "registry:component",
  "title": "Title",
  "description": "Description",
  "category": "category",
  "dependencies": [],
  "registryDependencies": [],
  "previewUrl": "/demo/slug",
  "tier": "free",
  "subfolder": true,
  "main": "index.jsx",
  "exportName": "ExportName",
  "exportKind": "default",
  "importPath": "@/components/effects/slug",
  "target": "src/components/effects/slug",
  "files": [
    {
      "path": "index.jsx",
      "target": "src/components/effects/slug/index.jsx"
    }
  ]
}
```

Preserve curated metadata already authored in
`registry/effects/{category}/{slug}/registry.json` when it exists. In particular,
the workflow should treat these fields as registry-authored data rather than
regenerating or dropping them:

- `props`
- `remixer`
- `registryDependencies`
- any future install-facing metadata that is not derivable from source files

That means the workflow should support this real authoring pattern:

1. The developer builds the effect in `apps/docs/src/components/{slug}/`.
2. The developer hand-edits
   `registry/effects/{category}/{slug}/registry.json` to add curated `props`
   entries, default values, remixer controls, disabled controls, copy-code
   behavior, and other registry-only metadata.
3. The workflow command uses that existing registry file as the source of truth
   for those fields and only regenerates the fields that are actually derived
   from source/distribution state, such as:
   - `version`
   - `changelog`
   - `dependencies`
   - `main`
   - `exportName`
   - `exportKind`
   - `files`
   - `previewUrl`
   - `importPath`
   - `target`

For a brand-new effect, if a registry folder already exists because the team has
already started hand-authoring `registry.json`, the safe behavior should be:

- `component:new --overwrite` may recreate generated artifacts, but it should
  merge/preserve curated `props` and `remixer` metadata from the existing
  `registry.json` unless the user explicitly requests a full reset.
- `component:sync` should be the preferred path once
  `registry/effects/{category}/{slug}/registry.json` exists, even if other
  generated artifacts are still missing.

Generate `package.json` in the same folder. Use the package version from
`registry.json` unless the team decides to keep package tarball versions
separate:

```json
{
  "name": "@hyperiux/slug",
  "version": "1.0.0",
  "description": "Description",
  "main": "index.jsx",
  "files": ["index.jsx", "registry.json"],
  "keywords": ["category", "hyperiux"],
  "dependencies": {}
}
```

### Phase 4: Update Root Registry Index

Update `registry/index.json` automatically:

1. Insert the new component object.
2. Keep entries sorted by `name`.
3. Copy key metadata from `registry.json`.
4. Set `registryPath` to
   `registry/effects/{category}/{slug}/registry.json`.
5. Preserve existing unrelated entries exactly.

This should use a JSON parser/stringifier, not string manipulation.

### Phase 5: Free-Tier Mirror

Only when `tier=free`:

1. Copy the registry folder to:

   ```text
   ../hyperiux-components/registry/effects/{category}/{slug}/
   ```

2. Keep the source files and `registry.json` identical unless that repo has a
   documented schema difference.
3. Verify the copied mirror folder matches this repo's registry folder.
4. Verify the mirror repo's `registry/index.json` and
   `registry/effects/**/{slug}` folders agree, so stale orphan folders from
   past renames/removals are flagged.

If the mirror repo is missing, the command should fail by default. Free effects
must not silently ship only in the pro repo.

### Phase 6: Build Public Registry

Run from this repo:

```bash
npm --prefix apps/docs run build:registry
```

This produces:

- `apps/docs/public/r/{slug}.json`
- refreshed `apps/docs/public/r/index.json`

Important behavior already handled by the existing script:

- Free components embed file content in public JSON.
- Pro components strip file content from public JSON.
- `previewUrl` must be `/demo/{slug}`.
- export detection runs and fails on ambiguous exports.

### Phase 7: Build Tarballs

Run from the repo root:

```bash
npm run build:registry
```

This syncs each effect package and rebuilds `registry/dist/*.tgz` plus
`registry/dist/registry-index.json`.

The automation should either:

- run the existing full tarball rebuild, or
- add a later optimized mode that packs only one component and updates
  `registry/dist/registry-index.json`.

Start with the full rebuild because it already exists and is easier to trust.

### Phase 8: Existing Component Sync

`component:sync` should automate existing updates end to end:

1. Find the component in `registry/index.json` or by walking
   `registry/effects/**/{slug}/registry.json`.
2. Read its current `category`, `tier`, `version`, `dependencies`, `files`,
   `main`, `exportName`, `exportKind`, `props`, and `remixer`.
3. Copy the latest distributable files from
   `apps/docs/src/components/{slug}/` to the existing registry folder.
4. Bump `registry.json.version` from `--bump`, or set it from `--version`.
5. Prepend a changelog entry:

   ```json
   {
     "version": "1.1.1",
     "date": "2026-07-27",
     "summary": "Added reduced-motion support",
     "breaking": false
   }
   ```

6. Sync `package.json.version` to the registry version.
7. Update the matching `registry/index.json` entry.
8. If `tier=free`, copy the same registry folder into
   `../hyperiux-components/registry/effects/{category}/{slug}/`.
9. Rebuild `apps/docs/public/r`.
10. Rebuild `registry/dist`.
11. Run `component:verify`.

This is the command that removes the common manual update work. After the
developer changes the component source in `apps/docs/src/components/{slug}/`,
`component:sync` should update the registry, changelog, public JSON, tarball,
and free mirror.

Crucially, `component:sync` should not wipe out curated registry metadata just
because it is not derivable from docs source. If
`registry/effects/{category}/{slug}/registry.json` already contains
hand-authored `props` definitions or remixer configuration, the sync should
preserve those values exactly unless the user explicitly asks to regenerate
them. This keeps effect-specific prop metadata authoritative in the registry
folder and ensures it syncs everywhere else correctly:

- `registry/index.json`
- `apps/docs/public/r/{slug}.json`
- `apps/docs/public/r/index.json`
- `registry/dist/*.tgz`
- free-tier mirror files in `../hyperiux-components`

`component:sync` should also update file lists. If the source code starts
importing a new local helper file, the command should include it in
`registry.json.files` and `package.json.files`. If a file was removed from the
source folder and no remaining file imports it, the command should remove it
from `registry.json.files`; deleting the stale file from the registry folder
should require confirmation or an explicit `--prune` flag.

`component:sync` should not change slug or category. Those changes are handled
by the dedicated phases below.

### Phase 9: Rename Slug

`component:rename` should automate canonical slug changes:

1. Find the current component by `--from`.
2. Verify `--to` is lowercase hyphenated and not already used.
3. Verify the current docs source folder exists, or require `--source` if the
   docs folder has already been manually renamed.
4. Move or copy the docs source folder only when `--move-docs-source` is
   passed. The safe default is to leave docs source untouched and only update
   registry artifacts, because docs source can include unfinished local work.
   If developers expect the component source folder to follow the new slug,
   they should explicitly include `--move-docs-source`.
5. Move:

   ```text
   registry/effects/{category}/{from}/
   ```

   to:

   ```text
   registry/effects/{category}/{to}/
   ```

6. Update `registry.json`:
   - `name`
   - `version`
   - `changelog`
   - `previewUrl`
   - `importPath`
   - `target`
   - every `files[].target`
7. Update `package.json`:
   - `name`
   - `version`
   - `files` if file names changed
8. Update `registry/index.json`:
   - `name`
   - `registryPath`
   - `importPath`
   - `target`
   - `previewUrl` if present
   - `version`
9. Add an alias from `from` to `to` in
   `apps/docs/src/lib/effect-slugs.js` unless `--no-alias` is passed.
10. If tier is free, mirror the rename into
    `../hyperiux-components/registry/effects/{category}/`.
11. Rebuild `apps/docs/public/r`.
12. Rebuild `registry/dist`.
13. Run `component:verify --slug {to}`.

The old slug should no longer produce a first-class `public/r/{from}.json`
entry after the rebuild. Compatibility should come from slug aliases/routing,
not duplicated registry entries, unless the team explicitly chooses to keep a
deprecated alias package.

### Phase 10: Move Category

`component:move` should automate category changes:

1. Find the component by slug and confirm its current category matches `--from`.
2. Verify `--to` exists under `registry/effects/`.
3. Move:

   ```text
   registry/effects/{from}/{slug}/
   ```

   to:

   ```text
   registry/effects/{to}/{slug}/
   ```

4. Update `registry.json.category`.
5. Update `registry.json.version` and prepend changelog.
6. Update `registry/index.json.registryPath`, `category`, `categories` if
   present, and `version`.
7. If tier is free, mirror the move into
   `../hyperiux-components/registry/effects/`.
8. Rebuild `apps/docs/public/r`.
9. Rebuild `registry/dist`.
10. Run `component:verify --slug {slug}`.

Category moves should not alter the docs component source folder because
`apps/docs/src/components/{slug}` is slug-based, not category-based.

### Phase 11: Verification

The command should verify:

1. `registry/effects/{category}/{slug}/registry.json` exists.
2. `registry/effects/{category}/{slug}/package.json` exists.
3. Every `registry.json.files[].path` exists.
4. `apps/docs/public/r/{slug}.json` exists.
5. `apps/docs/public/r/index.json` contains the slug.
6. `registry/dist/hyperiux-{slug}-{version}.tgz` exists.
7. For `tier=free`, the mirror repo has the same registry folder.
8. For `tier=free`, the mirror repo has no effect folders missing from
   `registry/index.json`, and no index entries missing from `registry/effects`.
9. For `tier=pro`, public JSON does not contain source `content` fields for
   component files.
10. The `registry/index.json` entry points at the same registry path.
11. `registry.json.version`, `package.json.version`, `public/r/{slug}.json`
    version, and tarball version agree.
12. For renamed components, the old slug is no longer present as a primary
    registry item and an alias exists unless `--no-alias` was used.
13. For moved components, the old category folder no longer contains the slug
    and the new category folder does.
14. `git diff --check` passes.

The standalone verification command should be:

```bash
npm run component:verify -- --slug immersive-full-screen-nav
```

It should be read-only and safe to run before or after `component:new` /
`component:sync`.

## Manual vs Automated Work

The goal is that developers only manually build and test the actual component
experience in:

```text
apps/docs/src/components/{slug}/
```

Everything distribution-related should be automated.

Automated by `component:new`:

- copy source into `registry/effects/{category}/{slug}`
- generate `registry.json`
- generate/sync `package.json`
- update `registry/index.json`
- rebuild `apps/docs/public/r`
- rebuild `registry/dist`
- sync `hyperiux-components` for free-tier components
- verify output

Automated by `component:sync`:

- copy changed source into the existing registry folder
- bump version
- add changelog entry
- detect new imported local files and add them to `registry.json.files`
- remove stale file-list entries when source files disappear, with explicit
  confirmation for deleting files from the registry folder
- sync package version
- update `registry/index.json`
- rebuild `apps/docs/public/r`
- rebuild `registry/dist`
- sync `hyperiux-components` for free-tier components
- verify output

Automated by `component:rename`:

- update canonical slug across registry folder path, `registry.json`,
  `package.json`, `registry/index.json`, public registry, tarball name, and
  free mirror
- optionally rename the docs source folder with `--move-docs-source`
- add old-slug alias for route/search compatibility
- verify the new slug and old-slug alias state

Automated by `component:move`:

- move registry folder between categories
- update category metadata and root index path
- mirror the category move for free-tier components
- rebuild public registry and tarballs
- verify old/new category state

Still manual in the first implementation:

- writing the component implementation itself
- creating or refining the docs demo page
- adding Sanity content such as `addedAt`, cover image, SEO copy, and long-form
  docs content
- deciding final title/description when not passed as command options

Later automation can add demo-page scaffolding and Sanity draft creation, but
those should be separate phases because they touch content/design workflows.

## Test Suites

The automation needs tests before it becomes the default workflow. Use fixture
directories under `scripts/component-workflow/__fixtures__/` so tests do not
mutate the real registry.

### Unit Tests

Run with:

```bash
npm --prefix apps/docs run test -- scripts/component-workflow
```

Coverage:

- slug validation accepts `grid-tunnel` and rejects spaces/underscores/caps
- category validation reads valid categories from `registry/effects`
- version bumping:
  - `1.2.3 + patch -> 1.2.4`
  - `1.2.3 + minor -> 1.3.0`
  - `1.2.3 + major -> 2.0.0`
- changelog insertion prepends newest entry and preserves older entries
- file discovery includes `.js`, `.jsx`, `.css`
- file discovery excludes `Demo.jsx`, `*.test.jsx`, `*.spec.js`
- relative import validation catches missing local files
- dependency detection maps external imports to `dependencies`
- registry metadata generation produces stable `files[].target` values
- rename metadata generation rewrites `name`, package name, targets, preview
  URL, and root index path
- category move metadata generation rewrites category and registry path without
  changing slug

### Dry-Run Tests

Run with:

```bash
npm run component:new -- --slug fixture-effect --category components --tier pro --dry-run
```

Expected:

- no files are written
- no registry/public/dist output changes
- output lists planned file copies, JSON writes, build commands, and verify
  checks
- exit code is non-zero when required inputs are missing

### Integration Tests With Fixtures

Run with:

```bash
npm --prefix apps/docs run test -- scripts/component-workflow/component-workflow.integration.test.js
```

Coverage:

- `component:new` creates registry folder, `registry.json`, `package.json`, and
  root index entry in a temporary fixture repo
- `component:sync` copies changed source, bumps version, and prepends changelog
- `component:sync` adds newly imported local files to `registry.json.files`
- `component:rename` moves a fixture slug and adds the old slug alias
- `component:move` moves a fixture component between categories
- free-tier sync copies the registry folder into a temporary
  `hyperiux-components` fixture
- pro-tier sync does not require or touch the free mirror
- verification fails when a `files[].path` target is missing
- verification fails when package/public/tarball versions disagree

### Real Repo Smoke Tests

After fixture tests pass, run a real dry-run against existing components:

```bash
npm run component:new -- --slug grid-tunnel --category webgl --tier pro --dry-run
npm run component:sync -- --slug immersive-full-screen-nav --bump patch --summary "Smoke test" --dry-run
npm run component:rename -- --from old-fixture --to new-fixture --bump major --summary "Smoke rename" --dry-run
npm run component:move -- --slug grid-tunnel --from webgl --to backgrounds --bump minor --summary "Smoke move" --dry-run
npm run component:verify -- --slug immersive-full-screen-nav
```

Then run a non-dry-run only on a disposable fixture component.

### Registry Build Tests

After the command writes real registry files, run:

```bash
npm --prefix apps/docs run build:registry
npm run build:registry
```

Expected:

- `apps/docs/public/r/{slug}.json` exists
- `apps/docs/public/r/index.json` contains the slug
- `registry/dist/hyperiux-{slug}-{version}.tgz` exists
- `registry/dist/registry-index.json` contains the tarball

### Tier-Specific Public JSON Tests

For a free component:

```bash
node -e "const d=require('./apps/docs/public/r/SLUG.json'); console.log(d.files.some(f => f.content))"
```

Expected: `true`.

For a pro component:

```bash
node -e "const d=require('./apps/docs/public/r/SLUG.json'); console.log(d.files.some(f => f.content))"
```

Expected: `false`.

### CLI Install Smoke Test

In a temporary consumer project after registry build:

```bash
export HYPERIUX_DEV_REGISTRY_PATH="/absolute/path/to/hyperiux-pro-components/apps/docs/public/r"
npx hyperiux init -y
npx hyperiux add SLUG --yes --dry-run
```

For free components, also run without `--dry-run` in the temporary project and
confirm files land under `src/components/effects/{slug}`.

For pro components, use `hyperiux login` first or limit this smoke test to the
public metadata path, because pro source is intentionally fetched through the
authenticated API.

### Final Checks

Before merging the automation itself:

```bash
git diff --check
npm --prefix apps/docs run test
```

Full `npm --prefix apps/docs run lint` is useful but currently may fail on
unrelated React compiler/hook rules. Treat lint failures as blockers only when
they point at the automation files or generated registry files.

## Suggested Implementation Steps

1. Add a pure metadata helper module under `scripts/component-workflow/`.
   It should handle slug validation, category validation, PascalCase export name
   derivation, dependency detection, and `files` array generation.
2. Add a read-only dry-run command that prints the planned operations for one
   existing component folder.
3. Add registry folder generation for pro components only.
4. Add `registry/index.json` update.
5. Add `apps/docs` public registry rebuild.
6. Add root tarball rebuild.
7. Add free-tier mirror copying to `hyperiux-components`.
8. Add sync/update mode with version bump, changelog insertion, and file-list
   refresh.
9. Add `component:rename`.
10. Add `component:move`.
11. Add `component:verify`.
12. Add tests around generated metadata, dry-run plans, and fixture mutations.
13. Add package scripts after the command is stable.

## Safety Rules

- Default to `--dry-run` style output before the first real write.
- Never delete a target folder automatically.
- Refuse to overwrite existing registry files unless `--overwrite` is passed.
- Refuse free-tier runs when the public mirror repo cannot be found.
- Use atomic writes for JSON where practical.
- Preserve unrelated formatting and fields in existing JSON files where possible.
- Treat ambiguous exports as a hard error.
- Treat missing local relative imports as a hard error.
- Print every file written, copied, or regenerated.

## Open Decisions

1. Should automation also create the docs demo page under
   `apps/docs/src/app/(marketing)/demo/{slug}/page.js`, or only validate that it
   exists?
2. Should free-tier mirror sync be required by default, or should local-only
   development allow `--skip-free-mirror`?
3. Should `registry/dist` rebuild all packages every time, or should a focused
   one-component pack mode be added?
4. Should dependencies be auto-detected from imports, manually provided, or both
   with validation?
5. Should Sanity `addedAt` be automated in this command, or should it remain in
   the future registry/Sanity workflow tool?
6. Should slug renames default to moving the docs source folder too, or require
   explicit `--move-docs-source` every time? Current implementation requires
   the explicit flag.
7. Should category moves be patch/minor by default, or always require explicit
   bump/version selection?

## Minimum Viable Version

The first useful automation can be intentionally small:

```bash
npm run component:new -- --slug slug --category category --tier pro --title "Title" --description "Description" --version 1.0.0 --date 2026-07-27
```

It should:

1. Copy files from `apps/docs/src/components/{slug}` to
   `registry/effects/{category}/{slug}`.
2. Generate `registry.json`.
3. Generate `package.json`.
4. Update `registry/index.json`.
5. Run `npm --prefix apps/docs run build:registry`.
6. Run `npm run build:registry`.
7. Run `component:verify`.
8. Print a verification summary.

After that works for pro components, add the free-tier mirror branch.

---

## Part 2 - Sanity code sync (`scripts/sanity-code-sync.mjs`)

*(formerly `sanity-code-sync-plan.md`)*


This document plans an automation layer that keeps Sanity `effectCodeBlock`
content in sync with the registry source files for each component.

It is a plan only. No implementation code is included here.

## Goal

When a component is updated in:

```text
registry/effects/{category}/{slug}/
```

the matching code blocks in Sanity should be updated automatically, so the
effect detail page does not keep showing stale code copied manually into Sanity.

The sync should update the actual Sanity document, not override code locally in
the app. After a successful sync, opening the document in Sanity Studio should
show the new code inside the existing code block.

## Current System

The effect detail page renders content from Sanity in:

```text
apps/docs/src/app/(app)/effects/[slug]/effect-detail.jsx
```

Code blocks are rendered when `content.body` contains objects like:

```json
{
  "_type": "effectCodeBlock",
  "filename": "index.jsx",
  "language": "jsx",
  "code": "..."
}
```

The schema is defined in:

```text
hyperiux-vault/schemaTypes/effectContent.js
```

The current `effectCodeBlock` schema has:

- `code`
- `language`
- `filename`

There is no registry-source marker today. That means the first implementation
has to match Sanity code blocks to registry files by `filename`.

## Reference Script

There is an existing script:

```text
hyperiux-vault/upload-missing-content.py
```

It is useful only as a reference for Sanity mutation shape. It should not be
used directly for this workflow because:

- it is a markdown content seeder, not a registry code sync tool
- it uses broad `createOrReplace` document writes
- it does not understand registry file lists
- it contains a hardcoded Sanity token

New automation must use environment variables for credentials.

## Proposed Commands

Read-only diff:

```bash
npm run sanity:code:diff -- --slug immersive-full-screen-nav
```

Dry run sync:

```bash
npm run sanity:code:sync -- --slug immersive-full-screen-nav --dry-run
```

Real sync:

```bash
npm run sanity:code:sync -- --slug immersive-full-screen-nav --yes
```

Sync all changed code blocks for all registry components:

```bash
npm run sanity:code:sync -- --all --dry-run
```

Optional integration after the standalone command is trusted:

```bash
npm run component:sync -- \
  --slug immersive-full-screen-nav \
  --bump patch \
  --summary "Updated source" \
  --sync-sanity-code
```

The first implementation should keep Sanity sync separate from
`component:sync`. Sanity writes affect production CMS data and need their own
dry-run and review step.

## Why Not Use a Studio Agent as the Primary Workflow

It is technically possible to use a Claude/browser agent to update code through
Sanity Studio:

1. open Sanity Studio
2. search for the effect document
3. open each code block
4. paste the latest registry code
5. save/publish the document

That should not be the primary workflow for recurring code sync.

Reasons:

- Studio UI automation is brittle; layout changes, focus issues, modals,
  loading states, or login/session problems can break it.
- Large code blocks are easy to paste incompletely or into the wrong field.
- It is harder to produce a reliable diff before writing.
- It is harder to test in fixtures.
- It is harder to guarantee that only `effectCodeBlock.code` changed.
- It may accidentally touch text, SEO, CTA, FAQ, or manual example blocks.
- It depends on browser state instead of explicit credentials and API calls.

The primary sync should be a deterministic Sanity API command:

- fetch the exact `effectContent` document
- compare registry files to Sanity code blocks
- print a dry-run diff
- patch only intended code fields
- preserve all other body content
- require `--yes` for mutation

An agent can still help with one-time editorial cleanup:

- fixing old documents whose code blocks have missing or wrong filenames
- deciding which missing registry files should become visible code blocks
- tagging blocks with future metadata like `source: "registryFile"`
- reviewing diff output before a real sync

Use an agent for messy migration/review work. Use the API command for repeatable
sync.

## Required Environment

The command should fail unless these are available:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=...
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=...
```

The token must have permission to update `effectContent` documents.

Do not hardcode tokens in scripts.

## Matching Strategy: First Version

For a given slug:

1. Find the component in the registry.
2. Read its `registry.json`.
3. Read `registry.json.files`.
4. For each non-asset file entry, read:

   ```text
   registry/effects/{category}/{slug}/{files[].path}
   ```

5. Fetch the Sanity document:

   ```groq
   *[_type == "effectContent" && effectSlug == $slug][0]
   ```

   Category slug can be included as an extra guard when available:

   ```groq
   *[
     _type == "effectContent" &&
     effectSlug == $slug &&
     categorySlug == $category
   ][0]
   ```

6. Walk `body`.
7. Find top-level `_type: "effectCodeBlock"` blocks.
8. Match each block by `filename`.
9. If `block.filename` equals a registry file path or basename, compare
   `block.code` with the registry file content.
10. Patch only changed matching blocks.

Example:

```text
Sanity body block filename: index.jsx
Registry file path: index.jsx
```

This updates:

```json
{
  "_type": "effectCodeBlock",
  "filename": "index.jsx",
  "code": "old code"
}
```

to:

```json
{
  "_type": "effectCodeBlock",
  "filename": "index.jsx",
  "code": "new registry code"
}
```

The same Sanity block remains in place. Only its `code`, and optionally
`language`, are updated.

## What Diff Should Print

For one slug, `sanity:code:diff` should print:

- registry category
- registry version
- Sanity document id
- registry files discovered
- Sanity code block filenames discovered
- matching blocks
- changed blocks
- missing Sanity blocks for registry files
- stale Sanity blocks with no matching registry file
- skipped blocks with no filename
- whether the command would require `--create-missing`

Example output shape:

```text
sanity:code:diff

component:
navigation/immersive-full-screen-nav@1.1.1

sanity document:
effect-content-immersive-full-screen-nav

matching blocks:
- index.jsx changed
- CustomNavbar.jsx unchanged
- FullscreenNav.jsx changed

missing sanity blocks:
- useFocusTrap.js

stale sanity blocks:
- old-helper.jsx

skipped:
- code block without filename at body[7]
```

## Sync Behavior

Default behavior:

- update only existing matching `effectCodeBlock` blocks
- match by exact `filename` first
- allow basename match only if it is unambiguous
- preserve `_key`
- preserve block order
- preserve text, image, FAQ, CTA, SEO, and manual content
- preserve unknown fields on each code block
- update `code`
- update `language` only when missing or when `--sync-language` is passed

The command should not create missing code blocks by default.

To create missing code blocks:

```bash
npm run sanity:code:sync -- \
  --slug immersive-full-screen-nav \
  --create-missing \
  --yes
```

When `--create-missing` is passed, missing registry files should be appended to
the body after the last existing `effectCodeBlock`. If no code blocks exist,
they should be appended to the end of `body`.

## Patch Shape

The command should avoid replacing the whole document.

Preferred mutation:

1. Fetch the document.
2. Build a new `body` array in memory with only intended code changes.
3. Send a patch for the `body` field:

```json
{
  "mutations": [
    {
      "patch": {
        "id": "effect-content-immersive-full-screen-nav",
        "set": {
          "body": []
        }
      }
    }
  ]
}
```

This replaces the body array, but leaves all other document fields untouched.
Because Sanity array patching individual nested objects by `_key` can be more
fragile, replacing `body` is acceptable only if the command preserves every
existing non-code block exactly.

The diff output should show a summary before any mutation.

## Safety Rules

- Default to dry-run behavior unless `--yes` is passed.
- `--dry-run` and missing `--yes` should never write to Sanity.
- Never use `createOrReplace` for existing documents.
- Never touch documents whose `_type` is not `effectContent`.
- Never update code blocks without a filename unless an explicit mapping is
  provided later.
- Never overwrite stale Sanity blocks that do not match registry files.
- Fail on ambiguous basename matches.
- Fail if multiple Sanity documents match the same slug/category.
- Fail if `SANITY_API_TOKEN` is missing.
- Print the Sanity document id before mutation.
- Print the number of changed blocks after mutation.

## Pro Component Security Note

Pro source code is already stored in this private repo. Syncing Pro source into
Sanity means Sanity also becomes a source-code store.

The app currently redacts locked code server-side before sending props to the
client. That protects browser output, but Sanity access permissions must also be
treated as source-code access.

Before syncing Pro source, verify:

- only trusted team members can read/edit these Sanity documents
- public APIs do not expose raw `body.code`
- Sanity tokens used by CI or local scripts are write-scoped and not committed

## Future Schema Improvement

The safer long-term model is to add registry metadata to `effectCodeBlock`:

```js
source: "manual" | "registryFile"
registryFile: "index.jsx"
```

Then the sync command can update only blocks where:

```js
source === "registryFile"
```

This avoids accidentally updating hand-authored example code that happens to use
the same filename.

Suggested future schema fields:

```js
defineField({
  name: 'source',
  title: 'Code Source',
  type: 'string',
  initialValue: 'manual',
  options: {
    list: [
      {title: 'Manual', value: 'manual'},
      {title: 'Registry File', value: 'registryFile'},
    ],
  },
})

defineField({
  name: 'registryFile',
  title: 'Registry File',
  type: 'string',
})
```

The first implementation can work without this schema change, but should be
written so it can use these fields later when they exist.

## Test Plan

Unit tests with fixture Sanity documents should cover:

- matching `filename` to registry `files[].path`
- exact path match beats basename match
- basename match fails when ambiguous
- missing code blocks are reported
- stale code blocks are reported
- no-filename code blocks are skipped
- manual/non-code body blocks are preserved exactly
- changed code updates only `code`
- `--create-missing` appends missing blocks
- dry run does not mutate

Integration-style tests should use a mocked Sanity HTTP endpoint or a fake
client object. They should not hit production Sanity.

## Open Decisions

1. Should the first version update all existing filename-matched blocks, or only
   blocks marked with a phrase/convention in `filename`?
2. Should missing registry files create new Sanity code blocks by default, or
   require `--create-missing`? Recommended: require `--create-missing`.
3. Should `language` always be derived from extension, or only filled when
   missing? Recommended: fill when missing.
4. Should `component:sync` call Sanity sync automatically? Recommended: no for
   the first implementation.
5. Should Pro code be synced to Sanity for every component, or only selected
   effects? Recommended: require explicit slug or `--all --include-pro`.

## Minimum Viable Version

Implement only:

```bash
npm run sanity:code:diff -- --slug slug
npm run sanity:code:sync -- --slug slug --yes
```

MVP behavior:

1. Read registry files for one slug.
2. Fetch one Sanity document by `effectSlug`.
3. Match top-level `effectCodeBlock` blocks by `filename`.
4. Update only changed matching `code` fields.
5. Preserve all other body content.
6. Print a clear diff before mutation.
7. Require `--yes` to mutate.
