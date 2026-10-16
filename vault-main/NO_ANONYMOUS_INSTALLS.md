# No anonymous installs – what's left to ship

Goal: nobody gets an effect's code without signing in (web, CLI, MCP or a direct URL), so every row in the admin install data belongs to a real account. The pricing FAQ already promises this ("copying the code or installing it with the CLI needs a free account").

Audit: 2026-10-16. Data at that point: 186 anonymous rows in `install_unlocks` and 474 in `install_events`, still arriving daily, plus 26 / 29 rows from deleted accounts. One-off cleanup: `scripts/cleanup-anonymous-installs.mjs`.

## Where it stands

| Path | Today | Why |
|---|---|---|
| Website copy buttons | ✅ needs sign-in (live) | `api/copy-usage`, `api/effects/[slug]/copy` return 401 signed out; effect pages strip source before render |
| Server check for CLI / MCP | ⚠️ written, **not deployed** | `lib/install-limit.js` (signed out → `sign-in-required`, logged as denied), `api/cli/effects/[effectSlug]`, `api/effects/[slug]` return 401. Uncommitted in the working tree |
| Public registry files `/r/<effect>.json` | ❌ open | `scripts/build-registry.js` strips code from **Pro** effects only; the 56 **free** effects ship full source, reachable by `curl` or `npx shadcn add https://vault.hyperiux.com/r/<effect>.json` with no server involved |
| CLI `hyperiux@1.1.4` (latest) | ❌ goes around it | `src/utils/registry.js` `fetchRegistry()`: for a free effect, any error from the API that isn't `rateLimited` (a 401 included) falls back to the public JSON's code |
| MCP `hyperiux-mcp-server@0.2.1` (latest) | ❌ goes around it, and mislabels users | `dist/registry-client.js` `fetchEffect()`: free effects call the API with **no token** (`fetchProtectedEffect(name, null)`), so even signed-in users are anonymous; then it falls back to the public JSON on any non-rate-limit error |

All three must ship together: closing the server alone changes nothing while the public files and the clients' fallbacks exist.

## 1. Website / server (this repo)

- [ ] **Commit and deploy** the sign-in check: `src/lib/install-limit.js`, `src/app/api/cli/effects/[effectSlug]/route.js`, `src/app/api/effects/[slug]/route.js`.
- [ ] **Strip code from every effect in `/r/*.json`**, free included: in `scripts/build-registry.js` (around the `isPro` check that strips content) drop `content` for all tiers, then rebuild `public/r`. Keep `name`, `tier`, `dependencies`, `registryDependencies`, file paths – the CLI/MCP still read tier and paths there.
  - Old CLIs (≤ 1.1.4) and MCPs (≤ 0.2.1) will keep falling back to these files. Rather than an empty file, put a stub in each file's `content`, e.g. `// Sign in to install this effect: npx hyperiux login` – the old client then writes a file that says what to do instead of silently writing nothing. Same for anyone using the shadcn URL directly.
  - Check nothing else on the site reads code from `public/r` (the effect pages read Sanity).
- [ ] **Clean up when an account is deleted outside the app.** `api/webhooks/clerk` only handles `user.created`; accounts removed in the Clerk dashboard leave their rows behind (the "Anonymous · user" entries). Handle `user.deleted` there with the same cleanup as `api/user/delete-account` (and enable that event on the Clerk webhook).
- [ ] `api/user/delete-account` also leaves `cli_effect_installs`, `copy_usage` and `copy_usage_effects` rows – add them (or drop the two `copy_usage*` tables, which `install_unlocks` replaced).
- [ ] Optional safety net on the admin side: hide rows with no account in the Activity feed and counts (the Customers / Internal / All switch could gain an "exclude signed-out" rule) so a leftover can't show up even before cleanup.
- [ ] After deploying and once the new CLI/MCP are out, run `node --env-file=.env.local scripts/cleanup-anonymous-installs.mjs --apply` again to clear what arrived in between.

## 2. CLI – `hyperiux` (npm), next version e.g. 1.2.0

- [ ] `src/utils/registry.js` `fetchRegistry()`: **remove the public-JSON fallback** for free effects. Any failure from `/api/cli/effects/<name>` is an error, not a reason to use `/r/<name>.json`.
- [ ] Handle 401 `reason: "sign-in-required"`: stop and print "Sign in first: `npx hyperiux login`" (exit code 1). Also for `hyperiux init` / `list` if they install anything.
- [ ] Always send the CLI token when one exists, free effects included (it already does via `fetchProtectedEffect(name, token)` – keep it).
- [ ] Network/5xx errors: show the error and suggest retrying, never fall back to public content.
- [ ] `fetchLocalRegistry` (`--local`): fine for local development, but make sure it can't be pointed at the public registry to skip sign-in.
- [ ] Telemetry (`cli_telemetry_events`, `cli_effect_installs`): send `clerk_user_id` when signed in. Decide whether signed-out `init` / `add` attempts are still sent (they're attempts, not installs) – if kept, the admin pages should label them "signed-out attempts", not installs.
- [ ] README / `--help`: say an account is needed (`npx hyperiux login` first).
- [ ] Publish, then consider `npm deprecate hyperiux@"<1.2.0" "Sign-in is now required: update with npx hyperiux@latest"` so old installs warn.

## 3. MCP – `hyperiux-mcp-server` (npm), next version e.g. 0.3.0

- [ ] `dist/registry-client.js` → source `registry-client.ts` `fetchEffect()`: **send the token for free effects too** – replace `fetchProtectedEffect(name, null)` with the token from `getAuthToken()`.
- [ ] **Remove both public-JSON fallbacks** (free effects: any error; Pro effects: 401/403 and no token). Without a token, return a structured result: "Sign in to use Hyperiux effects: run `npx hyperiux login`" and no file content.
- [ ] `tools/get-effect`: surface that sign-in result to the assistant (like the existing `rateLimited` result), so the AI tells the user to sign in instead of retrying.
- [ ] Listing/search tools (`index.json`) can stay public – metadata only, no code.
- [ ] Docs (`/docs/mcp`, README): the token is required; show where the MCP reads it (same login as the CLI).
- [ ] Publish, then `npm deprecate hyperiux-mcp-server@"<0.3.0" "Sign-in is now required: update to the latest version"`.

## 4. Order to ship

1. CLI 1.2.0 and MCP 0.3.0 published (they work against the current server – signed-in users unaffected).
2. Website deploy: server check + stripped `/r` files (with the sign-in stub) + `user.deleted` webhook.
3. Run the cleanup script with `--apply`.
4. Watch admin Activity for a week: signed-out attempts should appear only as denied events with reason `sign-in-required`, and `install_unlocks` should get no rows without a user.

## Check after shipping

- `select count(*) from install_unlocks where clerk_user_id is null and usage_date >= '<deploy date>'` → 0
- `curl https://vault.hyperiux.com/r/animated-faq.json` → no source in `files[].content`
- Signed out: `npx hyperiux@latest add animated-faq` → "Sign in first", nothing written
- MCP signed in: fetching a free effect logs an `install_events` row **with** the user's id
