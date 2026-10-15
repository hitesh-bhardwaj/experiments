# Pro-components setup: replacing `hyperiux-pro-components/apps/docs` with `experiments/vault-main`

**Date:** 2026-10-15 · **Supersedes:** `PRO_COMPONENTS_REPLACEMENT_REPORT.md` (same findings, now verified by a trial run)
**Neither repo was modified.** The trial ran in a throw-away copy under the session scratchpad.

| | Source (new) | Target (old) |
|---|---|---|
| Repo / branch | `experiments` · `main` · `3f1bf04` + uncommitted work (tech removal, CSV untracked, docs sync) | `hyperiux-pro-components` · `master` · `d03e23b6` (2026-10-08), clean, equal to `origin/master` |
| Folder | `vault-main/` (1 level below repo root) | `apps/docs/` (2 levels below repo root) |

## 1. Verdict

**The replacement works, but only after patching about 175 path references and merging pro's three newest commits first.** A plain copy fails.

### Trial run (evidence)

I extracted pro's `HEAD` (`git archive`), deleted `apps/docs`, copied in the tracked files of `vault-main` (1,964 files), linked the same `node_modules`, and ran the checks in that layout:

| Step | Plain copy (no patches) | After the patches in section 3 |
|---|---|---|
| `vitest run` | ❌ 9 tests fail + `registry-effects.render.test.jsx` cannot load (`apps/registry/index.json` not found) | ✅ **316 passed, 13 skipped** (23 files, 2 skipped) |
| `next build --webpack` | ❌ **Failed to compile**: `Module not found: …/registry/effects/…/registry.json` (150 demo pages) | ✅ Compiled, **511 static pages**, exit 0 |
| `node scripts/build-registry.js` | not run | ✅ "Registry built successfully! 150 effects." |
| `component:verify` | not run | ⚪ Not meaningful: the trial copy is not a git repo, so its `git diff --check` step cannot pass |

Limits of the trial: it ran against **pro's unchanged root `registry/`**, used the experiments `node_modules` and `.env.local`, and the sandbox cannot reach some remote hosts (the build printed `TimeoutError` lines for remote fetches; they are not fatal and appear in the experiments build too). It did not exercise Supabase, Clerk, Razorpay or Sanity.

## 2. What must happen first

| # | Before copying | Why |
|---|---|---|
| 1 | In pro: `git switch -c replace-docs-with-vault` and `git tag pre-vault-replace master` | Rollback |
| 2 | **Bring pro's 3 newest commits into experiments (or confirm they are obsolete)**: `6a081713`, `bee5cf41` (both 2026-10-06), `d03e23b6` (2026-10-08) | 63 files touched by them differ from experiments; experiments has none of these fixes. Without this, a replace silently reverts them. File list in `PRO_COMPONENTS_REPLACEMENT_REPORT.md` section 3 |
| 3 | **Decide the registry**: replace pro's root `registry/` with `experiments/registry/` in the same change | 139 of 150 entries differ, 5 effects change tier (below). The root registry is **not inside `apps/docs`**, so replacing only `apps/docs` leaves the app and its registry disagreeing |
| 4 | Decide the tier list | `depth-shift-transition` and `full-screen-crosshair`: pro → **free**. `glowing-text`, `information-drawer`, `liquid-glass-cursor`: free → **pro**. Pro currently says 56 free / 94 pro; experiments says 55 free / 95 pro, while `llms.txt` and the marketing copy say 56 free |

## 3. Patches required after copying (all verified in the trial)

Everything is a path-depth or folder-name fix. No application logic changes.

| # | Where | Change | Count |
|---|---|---|---|
| P-1 | Every `src/app/(marketing)/demo/**` file that imports a registry JSON | `"../../../../../../registry/` → `"../../../../../../../registry/` (one more `../`) | **149 files** |
| P-2 | `src/app/(marketing)/demo/scroll-stack/v2/page.tsx` | It is one folder deeper: 7 → **8** `../` | 1 file |
| P-3 | `next.config.mjs:14` | `path.join(__dirname, "../")` → `path.join(__dirname, "../../")` (`outputFileTracingRoot`, `turbopack.root`) | 1 line |
| P-4 | `src/lib/registry.js` | `vault-main/public/r` → `apps/docs/public/r`; `../registry/effects` → `../../registry/effects`; `vault-main/registry/effects` → `apps/docs/registry/effects` | 3 lines |
| P-5 | `scripts/component-workflow.mjs`, `component-ship.mjs`, `sanity-code-sync.mjs`, `create-template.mjs`, `package-template.mjs` | Repo-root walk `"..", ".."` → `"..", "..", ".."` (**three** levels from `apps/docs/scripts`) | 5 files |
| P-6 | `scripts/build-registry.js:8` | `"../../registry/effects"` → `"../../../registry/effects"` | 1 line |
| P-7 | Same scripts and `vitest.config.js`, `src/lib/component-workflow.test.js`, `src/app/api/copy-usage/route.js` | Replace the string `vault-main` with `apps/docs` (`path.join(ROOT, "vault-main", …)` → `"apps", "docs"`; `npm --prefix vault-main` → `npm --prefix apps/docs`) | ~60 refs, 9 files |
| P-8 | `vitest.config.js:35` | `allow: [path.resolve(__dirname, "..")]` → `"../.."` | 1 line |
| P-9 | `test/effect-harness.js:6` | `path.resolve(__dirname, "../..")` → `"../../.."` | 1 line |
| P-10 | `src/lib/component-workflow.test.js:10` | `path.resolve(__dirname, "../../..")` → `"../../../.."` | 1 line |

A global replace of `vault-main` is safe in comments too. A ready sed for P-1 (run from `apps/docs`, macOS):

```bash
grep -rl '"\(\.\./\)\{6\}registry/' src | xargs sed -i '' 's#"../../../../../../registry/#"../../../../../../../registry/#'
sed -i '' 's#"../../../../../../../registry/#"../../../../../../../../registry/#' "src/app/(marketing)/demo/scroll-stack/v2/page.tsx"
```

**Careful:** do not apply the scripts' `..` patch twice (my first trial did, which produced four levels and would have broken them). The correct value is exactly three.

### Root-level scripts (pro root `scripts/`)

Pro root has its own copies of `component-workflow.mjs`, `build-registry.js`, `generate-sitemap.mjs`, `package-template.mjs`, `create-template.mjs`, `sanity-code-sync.mjs`, and root `package.json` calls those (`./scripts/...`). The experiments versions differ by 4–528 lines per file (`build-registry.js` 528). After the copy you will have **two** sets. Pick one:

- **Recommended:** point root `package.json` at `apps/docs/scripts/*` and delete the root copies, so one workflow exists.
- Or replace the root `scripts/` with the patched `apps/docs/scripts` and keep the root commands.

Also the `prebuild` hook: pro runs `node ../../scripts/generate-sitemap.mjs`, experiments runs `node scripts/generate-sitemap.mjs`. After picking one set, keep only one sitemap generator.

## 4. Breakpoints and styling: what to sync while copying

You asked specifically about tablet and mobile (`max-lg:` vs `max-[1025px]:`). Verified counts:

| Where | `max-[1025px]:` | `max-lg:` | `max-md:` | `max-sm:` |
|---|---|---|---|---|
| **Pro** `apps/docs/src` | **3,601** (337 files) | 3 | 3,480 | 515 |
| **Experiments** `vault-main/src` | 2,451 (247 files) | **805** | 3,516 | 375 |
| Pro `registry/effects` | 1,011 | 0 | 1,131 | 26 |
| Experiments `registry/effects` | 1,086 | 1 | 1,083 | 27 |

### What it means

1. **The two spellings are identical in effect only because experiments' `globals.css` redefines the `lg` breakpoint.** It contains `--breakpoint-lg: 1025px` (lines 74–76). **Pro's `globals.css` does not** (checked: lines 72–77 hold only base styles). So in pro today `max-lg:` means below **1024px**, which is why its few uses were avoided. The copied `globals.css` brings the override, and `max-lg:` then equals `max-[1025px]:`. **Do not drop or "merge away" that variable.**
2. **Site files are already converted** (805 `max-lg:`). Since you replace the whole `apps/docs`, there is no conversion work for site code: pro's 3,601 old-style uses simply disappear with the files.
3. **Do not run a global find-and-replace `max-[1025px]` → `max-lg` after copying.** The remaining 2,451 are in demos, template demos and effect components, which the style guide says must not be touched. Registry effects ship to customers whose projects use Tailwind's default `lg` (1024px), so they must stay on the explicit `max-[1025px]:`. Converting them would shift their tablet breakpoint by 1px for users and make `apps/docs/src/components/<slug>` drift from `registry/effects/**/<slug>`, which `component:verify` reports as mirror drift.
4. **If you cherry-pick pro's 3 newest commits into experiments:** convert `max-[1025px]:` → `max-lg:` only in **site** files; leave it in `registry/**`, `src/components/<effect>/**`, `demo/**` and `template-demo/**`.
5. **Mobile is `max-md:` (below 768px)** on the site and in both repos' effects. `max-sm:` (below 640px) is allowed in demos and effects only. The site uses `max-sm:` in 16 files today, which the guide forbids (see `DESIGN_DEV_SYNC_REPORT.md`).
6. **JS breakpoints:** experiments adds `src/lib/breakpoints.js` (`MEDIA.tablet`, `MEDIA.mobile`, `BREAKPOINTS.lg/.md`). Pro has no such file. It arrives with the copy; check any pro-only file that hard-codes `1025` or `768`.

### Verification command (after the copy)

```bash
# Site code should have no old-style tablet breakpoint left (effects/demos are expected to keep it):
git grep -n "max-\[1025px\]:" -- apps/docs/src \
  ':!apps/docs/src/app/(marketing)/demo' ':!apps/docs/src/app/(marketing)/template-demo' \
  ':!apps/docs/src/components/*-*' | head
# The override must still be present:
grep -n "\-\-breakpoint-lg: 1025px" apps/docs/src/app/globals.css
```

### Other style and doc files to carry over

| File | In pro today | Action |
|---|---|---|
| `apps/docs/STYLE_GUIDE.md` | does not exist | Arrives with the copy; it is the source of truth |
| `apps/docs/CLAUDE.md` | only `@AGENTS.md` plus the Next.js block | **Copy the synced `experiments/CLAUDE.md` over it** (it is outside `vault-main`, so it will not come with the folder) |
| Pro root `CLAUDE.md` lines 48–50 | "Tablet: `max-[1025px]:`, Mobile: `max-md:`" | Update to `max-lg:` for site pages and say effects and demos keep `max-[1025px]:` |
| Pro root `CODING_STANDARDS.md` line 276 | "Use `max-sm:` for mobile and `max-md:` for tablet" | Align with the scope note added to `vault-main/src/CODING_STANDARDS.md` (effects and demos only; site follows the guide) |
| `apps/docs/AGENTS.md` | Next.js block only | Take the experiments version (it points to `STYLE_GUIDE.md`) |

## 5. Other things to do while copying

| # | Item | Detail |
|---|---|---|
| E-1 | **Restore `apps/docs/.vercel/`** (`project.json`, `README.txt`) | Tracked in pro; not in `vault-main`. Without it the folder loses its Vercel link. Keep Vercel's Root Directory as `apps/docs` |
| E-2 | **Keep `public/6c3fb3ebc1a24db6987bf58cedc51337.txt`** | A domain-verification file that exists only in pro |
| E-3 | **Port the 2 pro-only tests** | `src/app/api/effects/[slug]/copy/route.test.js` and `src/lib/effect-ai-prompt.test.js`. Real coverage that a replace would drop |
| E-4 | **Replace `package.json` and `package-lock.json` together**, then `npm ci` in `apps/docs` | New: `matter-js`; `next` 16.3.8; `archiver ^8` (pro root pins `^7`; align both) |
| E-5 | **Regenerate registry artifacts** | `npm run build:registry` then `npm run build:registry:dist`, so `public/r/*.json` and `registry/dist/*.tgz` match the replaced registry |
| E-6 | **CI env** | `.github/workflows/ci.yml` runs lint, test and build in `apps/docs` with 31 secrets. Add: `ADMIN_EMAIL`, `INSTALL_LIMIT_ENFORCE`, `INSTALL_LIMIT_IP_SALT`, `NEXT_PUBLIC_HOMEPAGE`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RESEND_COMMUNITY_AUDIENCE_ID`, `RESEND_COMMUNITY_STACK_PROPERTY`, `SANITY_API_TOKEN`, `SANITY_REVALIDATE_SECRET`, the six `RAZORPAY_PLAN_*_USD/INR` ids. (`RESEND_AUDIENCE_ID` is read by the newsletter route and is in neither list.) Also add `npm audit --audit-level=high` |
| E-7 | **Database and third parties** | Run `sql/pro_plus_plans.sql`; create the USD/INR Razorpay plans; set Clerk redirect URLs for `/sso-callback`; add a Sanity publish webhook to `/api/revalidate` with `x-revalidate-secret` |
| E-8 | **Removed on purpose, so check no link points to them** | `/tech`, `/tech/[slug]` (deleted in experiments), `/extras/*` (4 pages), old `homepage-v3`, `(app)/sign-in` (moved to `(auth)`, same URL). Verify `NEXT_PUBLIC_CLERK_SIGN_IN_URL` is still `/sign-in` |
| E-9 | **Unrelated pro files that mention `apps/docs`** | 35 references in `registry/**` docs, plus `README.md`, `Installation-SyncUp.md`, `RBAC-ADMIN-PLAN.md`, `.claude/agents`, `.codex/agents`, `update_tension.py`. They keep working (path stays `apps/docs`) but describe the old structure |
| E-10 | **Dependabot branches** | `apps/docs/sharp-0.35.5`, `undici-7.30.0`, `dompurify-3.4.16`, `axios-1.20.0`, `source-map-js-1.2.2` are open. The experiments lockfile already contains patched versions of sharp, axios, dompurify and source-map-js; close or rebase them after the swap |
| E-11 | **Generated files** | Do not copy `node_modules`, `.next`, `tsconfig.tsbuildinfo`, `.env.local`. Pro tracks `apps/docs/next-env.d.ts`; experiments git-ignores it, so either keep it or regenerate with `next build` |
| E-12 | **Registry naming** | Docs component folder is `clip-path-slider` but the registry slug is `clippath-slider`; `infinite-carousel` has no folder under `src/components`. `component:verify` will flag both; rename the registry slug or add a mirror |

## 6. What disappears (exists only in pro `apps/docs`)

218 tracked files, grouped: old homepage (`homepage-v3` 49, `components/Homepage` 27, `public/homepage-v3` 11), WebGL lab helpers (`ScrollRigComponents` 25, `Experience` 6, `ATTransition` 5, `StackingPlane`, `hyperiux-model-dither`), 6 routes under `/extras` and `/tech`, old auth components (7), old pricing components (4), 11 `WebsiteComps` files, 2 tests (E-3), 25 public files (3D models, `H.glb`, `studio.exr`, videos, NeueHaas fonts), `data/waitlist-export.csv` (real emails, intentionally untracked), `.vercel/*` (E-1), five old CSS-module and page files. Full list: `PRO_COMPONENTS_REPLACEMENT_REPORT.md` section 6.

## 7. Runbook

```bash
# 0. Pro repo: safety
cd ~/Documents/GitHub/hyperiux-pro-components
git switch -c replace-docs-with-vault && git tag pre-vault-replace master

# 1. Decide and merge pro's 3 newest commits into experiments first (section 2, item 2)

# 2. Replace the app (tracked files only, keeps .vercel and the verification file)
cp -R apps/docs/.vercel /tmp/docs-vercel
cp apps/docs/public/6c3fb3ebc1a24db6987bf58cedc51337.txt /tmp/
git rm -r -q apps/docs
mkdir -p apps/docs
(cd ~/Documents/GitHub/experiments/vault-main && git ls-files -z | xargs -0 -I{} sh -c 'test -f "{}" && echo "{}"' \
  | tar -cf - -T -) | tar -xf - -C apps/docs
cp -R /tmp/docs-vercel apps/docs/.vercel
cp /tmp/6c3fb3ebc1a24db6987bf58cedc51337.txt apps/docs/public/
cp ~/Documents/GitHub/experiments/CLAUDE.md apps/docs/CLAUDE.md

# 3. Replace the registry (section 2, item 3)
rsync -a --delete ~/Documents/GitHub/experiments/registry/ registry/

# 4. Apply P-1 … P-10 (section 3), then
cd apps/docs && npm ci
npm run lint && npm test && npx next build --webpack
npm run build:registry && npm run build:registry:dist
cd ../.. && npm run component:verify   # reports mirror drift, see E-12

# 5. Deploy a Vercel PREVIEW first; smoke-test:
#    /  /effects  /effects/components/gsap-flip-card  /pricing  /sign-in  /community  /checkout/pro.yearly  /demo/spiral-gallery
```

## 8. Acceptance checklist

- [ ] Pro's 3 newest commits are merged or consciously dropped
- [ ] `registry/` replaced; tiers for the 5 effects confirmed
- [ ] P-1 … P-10 applied; no `vault-main` string left (`git grep vault-main -- apps/docs ':!apps/docs/package-lock.json'`)
- [ ] `npm test` passes (expect 316 passed, 13 skipped)
- [ ] `next build` passes (expect 511 static pages)
- [ ] `npm run build:registry` reports 150 effects
- [ ] `--breakpoint-lg: 1025px` present; no `max-[1025px]` left in site code (section 4 command)
- [ ] `.vercel/`, the verification `.txt`, and both pro-only tests restored
- [ ] CI env updated and green on a PR
- [ ] Vercel preview smoke test passed
- [ ] Root `package.json` scripts point at one script set

## 9. Not verified

| Area | Reason |
|---|---|
| `component:verify` and `component:sync` against real git history | Trial copy had no git repo |
| Whether pro's registry fixes (63 files) are improvements or already superseded | Needs a human review |
| Supabase, Clerk, Razorpay, Resend, Sanity configuration | No access; listed in E-6 and E-7 |
| Vercel build in the real project (Node version, root directory, memory) | Not run; CI notes `--max-old-space-size=6144` is needed for the full build |
| Visual parity of pages after the swap | Browser test was run on experiments only (`BROWSER_TEST_REPORT.md`) |
