# Install tracking + daily limits across web, CLI, and MCP

## Context

Today Hyperiux can't answer "who installed what, and how?" and can't stop a free user
from taking the whole free catalog. The goal is to **track every effect acquisition
across all three surfaces** (website copy, `npx hyperiux add`, MCP `include_source`)
and **cap free usage at 3/day**, including for users who never sign in.

Roughly half of this already exists and is well-built - the plan below is mostly
*generalizing* existing machinery, not greenfield work. But there is one hard
architectural blocker that has to be dealt with first (§2).

Decisions taken (confirmed with the owner):

| Decision | Choice |
|---|---|
| Anonymous npm users | Allowed, but a **lower cap (2/day)** keyed on device-ID + IP. Signed-in free = 3/day. |
| Quota scope | **One shared quota** across website + CLI + MCP. |
| Pro subscribers | **Stay capped at 10/day** (unchanged from today). |
| Rollout | **Log-only (shadow) first**, calibrate against real data, then enforce. |

---

## 1. What already exists (reuse, do not rebuild)

| Capability | Where | State |
|---|---|---|
| **3/day free, 10/day pro limit** | `apps/docs/src/app/api/copy-usage/route.js` | Working, for website copy only |
| Quota ledger table | Supabase `copy_usage_effects` - unique `(clerk_user_id, usage_date, effect_slug)` | Working |
| Limit UI: toast, "X of Y left", upgrade CTA, cross-block lock | `apps/docs/src/app/(app)/effects/[slug]/useCopyLimit.js` → `components/ui/CopyBtn.jsx` (`onBeforeCopy` gate) | Working |
| Usage history page | `app/(app)/dashboard/usage/page.js` + `api/dashboard/usage/route.js` | Working |
| **Single authorization decision point** | `apps/docs/src/lib/effect-access.js` → `getEffectAccessDecision()` | Working, contract-tested |
| Pro source delivery chokepoint | `api/cli/effects/[effectSlug]/route.js` (+ legacy twin `api/effects/[slug]/route.js`) | Working |
| CLI token lifecycle (`hpx_` + sha256) | `api/cli/{token,validate,revoke}`, `lib/cli-auth.js`, `lib/cli-token.js` | Working, **Pro-only** |
| CLI token storage client-side | `packages/cli/src/utils/auth.js` (`~/.hyperiux/auth.json`, 0600) | Working |
| Global CLI state read/write helpers | `packages/cli/src/utils/cli-state.js` (`~/.hyperiux/state.json`) | Working, ready for a device-ID |
| **Atomic-counter precedent** | `lib/founding-slots.js` → plpgsql RPCs w/ `for update skip locked`, + real-Postgres concurrency test | Copy this pattern |
| Plan resolution + 60s cache | `lib/subscription.js` → `getUserPlan()` | Working |
| Admin bypass | `lib/admin.js` → `isAdminUser()` | Working |

**The critical reframe:** the website limiter *already is* the feature the owner asked
for - it's just scoped to one surface and to signed-in users. The work is to lift it
into a shared decision module and point all three surfaces at it.

---

## 2. The blocker: free-effect source is a static CDN file

This is the one thing that must change, and it drives everything else.

```
Free effect  →  GET vault.hyperiux.com/r/<slug>.json   →  files[].content  ← FULL SOURCE
                (static file in apps/docs/public/r/, zero server code)

Pro effect   →  GET vault.hyperiux.com/api/cli/effects/<slug>  →  gated, authed, ours
```

Verified: **all 32 free effects embed full source** in their public JSON; **all 88 pro
effects have it stripped**. Both the CLI (`packages/cli/src/utils/registry.js:68-72`)
and the MCP server (`packages/mcp-server/src/registry-client.ts:105-124`) short-circuit
and return that static payload directly for free effects.

So today a free install **touches no server code at all** - it cannot be counted,
limited, or attributed. No amount of work elsewhere changes that.

**Fix:** route free-effect source through `/api/cli/effects/[effectSlug]` too. The route
already handles free tier correctly (`effect-access.js:110` returns `allowed`), so
server-side this is nearly free. The cost is on the client side and in rollout (§6).

⚠️ **Two things to accept explicitly before starting:**

1. `CHANGE_GUIDELINES.md` rule 3 says *"Do not change the registry functionality."*
   This plan deliberately changes it. That needs to be a conscious, owner-approved
   exception, not a silent violation.
2. Free effects are **also mirrored in the public `hyperiux-components` repo**. Anyone
   can clone them. These limits are a **product/usage-shaping tool, not a security
   control** - the plan should be honest about that and not over-invest in
   unbypassable enforcement.

---

## 3. Identity model

Three keys, in priority order. The first one present wins.

| Key | Format | Source | Applies to |
|---|---|---|---|
| User | `user:<clerk_user_id>` | Clerk session (web) or `hpx_` token (CLI/MCP) | Signed-in |
| Device | `device:<uuid>` | **New** persistent UUID in `~/.hyperiux/state.json` | Anonymous CLI/MCP |
| IP | `ip:<sha256(ip + salt)>` | `x-forwarded-for` (Vercel) | Backstop |

Notes:
- The existing `getAnonymousProjectId()` (`packages/cli/src/utils/telemetry.js:64-68`)
  is `sha256(cwd + hostname)` - that's **per-project**, so it resets for every new
  folder and is useless as a quota key. Keep sending it as a useful analytics
  dimension, but add a real per-machine `deviceId` alongside it.
- IP is **hashed with a server-side salt** - never store raw IPs.
- Anonymous requests are checked against **both** device and IP buckets; the stricter
  verdict wins. Device-ID alone is trivially reset (`rm ~/.hyperiux/state.json`); IP
  alone unfairly punishes shared offices/CI. Together they're a reasonable deterrent.
  The IP bucket should be noticeably more generous (suggest ~10/day) so it only trips
  on genuine abuse.

---

## 4. Storage - two tables, Supabase Postgres

No Redis/KV is provisioned and none is needed at this volume. There is **no migration
tooling** in this repo - new SQL is hand-run in the Supabase editor and the test fixture
is kept in sync by hand (precedent: `apps/docs/test/fixtures/founding-slots-schema.sql`).

**`install_unlocks`** - the quota ledger. Small, uniquely-constrained, one row per
(identity, day, effect).

```sql
identity_key   text not null,          -- 'user:...' | 'device:...' | 'ip:...'
clerk_user_id  text,                   -- nullable, for joins/attribution
usage_date     date not null,          -- UTC
effect_slug    text not null,
source         text not null,          -- 'web' | 'cli' | 'mcp'
first_unlocked_at timestamptz default now(),
unique (identity_key, usage_date, effect_slug)
```

**`install_events`** - append-only analytics log. Wide, one row per *attempt*
including denials.

```sql
id, occurred_at, identity_key, clerk_user_id, device_id, ip_hash,
effect_slug, effect_tier, source, plan, decision,      -- 'allowed'|'denied'|'already-unlocked'
reason, enforced boolean, would_have_denied boolean,   -- shadow-mode fields
cli_version, mcp_version, user_agent, anonymous_project_id
```

Two tables rather than one because the quota needs a tight unique constraint and a fast
atomic claim, while the event log needs to grow unboundedly and record *denials* (which
must never occupy a quota slot). Deriving the quota from a `count(distinct)` over an
ever-growing event table degrades and complicates the atomic claim.

**Migration:** `copy_usage_effects` is a strict subset of `install_unlocks`
(`identity_key = 'user:' || clerk_user_id`, `source = 'web'`). Backfill it, then have
the web route read/write the new table. Keep the old table read-only for one release,
then drop.

**Atomicity - fixes a live bug.** Both `copy-usage/route.js:119-166` and
`cli/telemetry/route.js:114-153` are read-then-check-then-write; the first is a genuine
limit bypass under concurrent requests. Implement the claim as a single plpgsql RPC:

```sql
claim_install_slot(p_identity_key, p_usage_date, p_effect_slug, p_source, p_limit)
  -- INSERT ... ON CONFLICT DO NOTHING, then count within the same statement.
  -- Returns (allowed, already_unlocked, count, remaining).
```

Follow `lib/founding-slots.js` exactly - same shape, and there's already a
real-Postgres concurrency test harness to copy (`founding-slots.concurrency.test.js`).

---

## 5. The decision module

New: **`apps/docs/src/lib/install-limit.js`** - sibling to `effect-access.js`, same
single-decision-point discipline (this mirrors the F-040 consolidation the existing
comments describe).

```js
export const LIMITS = { anonymous: 2, free: 3, pro: 10, admin: null, ip: 10 };
export const LIMIT_POLICY_VERSION = "1";

// Returns { allowed, reason, limit, count, remaining, identityKey, enforced }
export async function getInstallLimitDecision({
  effectSlug, effectTier, source,          // 'web' | 'cli' | 'mcp'
  clerkUserId, cliToken, deviceId, ip,
  isDependency = false,                     // dependency installs don't consume quota
})
```

This also **collapses the duplicated constants** - `FREE_DAILY_LIMIT`/`PRO_DAILY_LIMIT`
are currently declared independently in both `api/copy-usage/route.js:7-8` and
`api/dashboard/usage/route.js:9-10`. Both import from here instead.

**Shadow mode:** gated on `INSTALL_LIMIT_ENFORCE` (default `false`). When off, always
return `allowed: true` but still write `install_events` with `would_have_denied`. This
is the whole point of the log-only rollout - it lets the 2/3/10 numbers be calibrated
against real traffic before anyone is blocked.

**Quota semantics** (inherited from the existing web limiter, keep it): the unit is
**one distinct effect per UTC day**. Re-copying or re-installing an effect already
unlocked today is free. `registryDependencies` pulled in transitively do **not** consume
quota - otherwise one `add` of a composite effect could eat a user's entire daily
allowance (see the recursion at `packages/cli/src/commands/add.js:302-317`).

---

## 6. Rollout - three stages

### Stage 1 - Track everything, enforce nothing

Server (`hyperiux-pro-components`):
- SQL: create both tables + `claim_install_slot` RPC; backfill from `copy_usage_effects`.
- New `lib/install-limit.js` (shadow mode on).
- `api/cli/effects/[effectSlug]/route.js` - record an event on every request, free and
  pro alike. Call `getInstallLimitDecision` but don't act on it yet.
- `api/copy-usage/route.js` - delegate to `install-limit.js`; write to `install_unlocks`.
- **Fix the two live telemetry bugs** in `api/cli/telemetry/route.js` - see §7.

Clients (`hyperiux-components`):
- `packages/cli/src/utils/cli-state.js` - add `getOrCreateDeviceId()` (helpers already
  exist).
- `packages/cli/src/utils/registry.js:60-76` - route free effects through the API;
  **keep the static JSON as a fallback** so nothing breaks. Add
  `x-hyperiux-device-id` + `x-hyperiux-cli-version` headers at the single header site
  (`registry.js:138-144`).
- `packages/cli/src/utils/telemetry.js` - flatten `effectSlug` to top level and attach
  the bearer token (both currently broken, §7).
- `packages/mcp-server/src/registry-client.ts:105-124` - same treatment; share
  `~/.hyperiux/state.json` for the device-ID.

### Stage 2 - Calibrate

- Admin surface: extend `/dashboard/admin` + new `api/admin/installs` - installs by
  user, effect, source, day; **and how many would have been denied**.
- Answer before flipping the switch: are 2/3/10 right? What's the shape of real usage?
  Do CI pipelines / monorepos / shared office IPs trip the limits?

### Stage 3 - Enforce

- Flip `INSTALL_LIMIT_ENFORCE=true`.
- CLI: new `rateLimited` branch. `createRegistryError` already carries
  `{ status, requiresPro }` (`registry.js:39-46`) - add `rateLimited`/`retryAfter` and
  branch at `add.js:93`, modelled on the existing Pro-upsell block (spinner.fail → red
  statement → yellow instruction → cyan command → dim detail).
- MCP: return a structured "limit reached" result rather than source.
- **Only then** strip `content` from the 32 free public JSONs. This is the hard break:
  free files have `content` but **no `source` fallback field**, so old CLI/MCP versions
  will fail outright. Needs a deprecation window, a minimum-version nudge, and a
  server-side kill switch (MCP is separately versioned - old versions persist forever).

---

## 7. Live bugs this work must fix

These are pre-existing and currently make CLI install data **completely empty**:

1. **Every CLI `add` telemetry POST 400s.** `add.js:340` sends the slug nested as
   `properties.effect`; `api/cli/telemetry/route.js:75-77` reads it top-level. The CLI
   swallows the error silently. No CLI install has ever been recorded.
2. **No auth header on telemetry** - `trackCliEvent` never attaches the bearer token, so
   `last_clerk_user_id` is always null, even for Pro users.
3. **`cli_effect_usage` is the wrong shape** - `onConflict: "effect_slug"`, global
   `added_count`/`installed_count` only. No per-user, no per-day dimension. It can't
   answer "what did user X install." Superseded by `install_events`.
4. **Read-modify-write races** in both `copy-usage` and `cli/telemetry` (§4).

---

## 8. Files to modify

**`hyperiux-pro-components/apps/docs/`**
- `src/lib/install-limit.js` - **new**, the decision point
- `src/lib/supabase-rpc` usage - new `claim_install_slot` RPC (SQL run by hand + fixture)
- `src/app/api/cli/effects/[effectSlug]/route.js` - record + (later) enforce
- `src/app/api/effects/[slug]/route.js` - same, legacy twin
- `src/app/api/copy-usage/route.js` - delegate to `install-limit.js`
- `src/app/api/cli/telemetry/route.js` - fix slug parsing + auth; write `install_events`
- `src/app/api/dashboard/usage/route.js` - import shared constants
- `src/app/api/admin/installs/route.js` + `src/app/(app)/dashboard/admin/` - **new** analytics
- `scripts/build-registry.js` + `apps/docs/scripts/build-registry.js` - Stage 3 only:
  stop embedding `content` for free effects

**`hyperiux-components/packages/cli/src/`**
- `utils/cli-state.js` - `getOrCreateDeviceId()`
- `utils/registry.js` - free effects via API; new headers; `rateLimited` error
- `utils/telemetry.js` - flatten payload, attach token, send device-ID
- `commands/add.js` - rate-limit branch at :93; don't charge quota for dependencies
- `package.json:21` - append any new util to the `build` (`node --check`) chain

**`hyperiux-components/packages/mcp-server/src/`**
- `registry-client.ts` - free effects via API, device-ID + version headers
- `tools/get-effect.ts` - surface a limit-reached result

---

## 9. Verification

- **Unit** - `install-limit.js` decision matrix across all identity × plan × tier ×
  shadow/enforce combinations. Mirror the existing
  `apps/docs/src/lib/effect-access.test.js`.
- **Concurrency** - `claim_install_slot` against real Postgres, N parallel claims on the
  4th effect must yield exactly one winner. Copy `founding-slots.concurrency.test.js`
  (harness + disposable-Postgres fixture already exist).
- **Contract** - extend `apps/docs/src/app/api/effect-delivery-contract.test.js` so the
  CLI route and its legacy twin stay locked to one status/reason matrix.
- **CLI** - mock `../utils/registry.js` to reject with a `{ status: 429 }`-shaped error
  and assert the message + exit. Note `process.exit` is spied to *throw*, so use
  `await expect(add(...)).rejects.toThrow("process.exit(1)")`
  (`src/tests/add-overwrite.test.js:98`).
- **E2E manual** - with `HYPERIUX_REGISTRY_URL`/`HYPERIUX_APP_URL` pointed at local:
  install 4 free effects anonymously (4th denied at cap 2 → verify), sign in free (3),
  Pro (10), admin (unlimited); confirm one shared bucket by copying 2 on the website then
  installing a 3rd via CLI; confirm re-installing an already-unlocked effect is free.
- **Shadow-mode check** - before Stage 3, confirm `install_events` shows a plausible
  `would_have_denied` rate. If it's high, the limits are wrong, not the users.

---

## 10. Risks / flagged

1. **Rate limits here are not a security boundary.** Free effects are public in
   `hyperiux-components` and on the CDN. Treat this as usage shaping and analytics.
2. **Stripping static free `content` is a hard break** for old CLI/MCP versions (no
   `source` fallback exists). Stage 3 only, with a deprecation window.
3. **MCP is separately versioned via npm** - old versions bypass forever. Needs a
   server-side kill switch, not client-version gating.
4. **The website limiter is client-cooperative.** Source is already in the RSC payload
   from Sanity, so a signed-in user can read it without pressing the button. The quota
   records button presses. Closing that is a separate, larger change.
5. **Pre-existing status inconsistency, out of scope but worth a ticket:**
   `PAID_STATUSES = ["authenticated", "active"]` (`lib/pro-access.js:16`) vs
   `ACTIVE_STATUSES = ["active", "trialing"]` (`lib/subscription.js:5`,
   `lib/effect-access.js:13`). A subscriber in `authenticated` state is written as Pro
   but resolves to **free** at access time.
6. **`docs/effect-access.md` is referenced from 5 files and does not exist.** Worth
   writing alongside this, since it's meant to be the entry-point map.
7. **Incidental dead code** in the CLI: `src/utils/api.js` (zero importers, duplicate API
   client) and `src/commands/{logout,whoami}.js` (unused; `whoami.js` imports a
   nonexistent `getAuthStatus`). Delete before adding a second auth path.
8. **Privacy** - IPs hashed with a server-side salt, never stored raw. `install_events`
   needs a retention policy. Honour the CLI's existing `DO_NOT_TRACK` /
   `HYPERIUX_TELEMETRY_DISABLED` opt-out for *analytics* fields, while still enforcing
   quota (the quota check is functional, not tracking).
