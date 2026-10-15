# Hyperiux Vault — Production Readiness Audit

**Target:** `vault-main` (Next.js 16.3.5, React 19.2.7, webpack build) · **Branch:** `main` · **Date:** 2026-10-15
**Mode:** read-only audit. The only file created is this report. (Running `next build` regenerated `.next/`, which is git-ignored; `public/sitemap.xml` was already modified before the audit.)

---

## A. Executive Summary

| | |
|---|---|
| **Readiness score** | **6.5 / 10** |
| **Decision** | **NO-GO** until P1-01 (vulnerable Next.js) is fixed. It is a version bump plus a smoke test. After that it becomes **CONDITIONAL GO**. |
| Findings | P0: 0 · **P1: 1** · P2: 4 · P3: 6 · P4: 5 |
| Strong points | Build, ESLint, `tsc` and 316 unit tests all pass. Payment and admin authorization are well built. Content counts mostly agree. |
| Weak points | A critical dependency advisory, **no browser, visual or accessibility testing was possible**, no CI, no error boundaries, and minimal security headers. |

**Why 6.5 and not higher:** the code is mature and the server-side logic is careful. But I could not verify the visual, interaction, responsive, a11y or performance layers, and one critical-severity advisory is open on the framework itself.

**Scope actually inspected:** 1,362 source files exist under `src/`. Roughly 70 files were read directly: proxy, admin helper, about 15 API routes, payment verification, config, sitemap, robots and llms.txt. The rest were covered by grep-based scans and the automated checks. This is **not** a file-by-file read of every component.

---

## B. Methodology and Limitations

- **Commands run:** `eslint .`, `tsc --noEmit`, `vitest run`, `npm audit --omit=dev`, `next build --webpack`, `next start` followed by `curl` smoke tests (41 URLs), plus manual POST edge cases.
- **Not available or not done:** real browser, viewport screenshots, Lighthouse and Core Web Vitals, screen reader or keyboard testing, a clean-consumer install of registry packages, production env vars, live Supabase, Clerk, Razorpay or Sanity. The npm audit and the build used the installed `node_modules` and the local `.env.local`.
- **Rule:** anything listed as *Suspected* or *NOT VERIFIED* was not reproduced.

---

## C. Inventory (compact)

- **Stack:** Next.js App Router (`(app)`, `(marketing)` route groups), Clerk, Supabase, Razorpay, Resend, Sanity, Sentry, GSAP, R3F and Three.
- **Page routes:** 45 `page.js` files, including dynamic `effects/[slug]/[effectSlug]`, `templates/[slug]`, `blog/[slug]`, `tech/[slug]`, `checkout/[plan]`. Build produced **518 static pages**.
- **API routes:** 59 `route.js` files covering admin (15), cli (6), razorpay (5), dashboard, templates, wishlist, user, webhooks and public forms.
- **Registry:** 150 effects in `registry/index.json` (55 free, 95 pro) with 150 packaged `.tgz` files.
- **Tests:** 25 test files (23 ran, 2 skipped).
- **Deploy:** `vercel.json` (framework nextjs) and a `Caddyfile` for local dev. **No `.github/` CI directory.**

---

## D. Scorecard

| Category | Status | Evidence |
|---|---|---|
| Functionality | PARTIAL | 41 URLs smoke-tested over HTTP. No interactive testing. |
| UI/UX | NOT VERIFIED | No browser available. |
| Content accuracy | PARTIAL | Counts checked; free/pro mismatch (F-02). |
| Content sync | PARTIAL | Registry vs llms.txt disagree by 1 (F-02). |
| Component reliability | NOT VERIFIED | Only jsdom tests with canvas stubbed. |
| Developer experience | PARTIAL | Rich scripts; consumer install not tested. |
| Accessibility | NOT VERIFIED | Static greps only (F-10). |
| Performance | NOT VERIFIED | No measurements. Build size not captured. |
| Security | PARTIAL | Auth sound; dependency advisories open. |
| Code quality | PASS | Lint 0 errors, tsc clean. |
| Testing | PARTIAL | 316 pass; no E2E; no CI. |
| Build and deployment | PARTIAL | Build passes; no CI; advisories. |
| Documentation | PARTIAL | llms.txt, STYLE_GUIDE and AGENTS.md exist; not checked line by line. |
| Error handling / observability | PARTIAL | Sentry configured; no `error.js` or `global-error.js` (F-05). |

---

## E. Critical and High Findings

**P1-01 / P1 — Confirmed: Next.js 16.3.5 has a critical advisory set**
- **Issue:** installed `next` 16.3.5 is in the vulnerable range 16.0.0–16.3.7 (`npm audit`, severity critical).
- **Evidence / Impact:** advisories include SSRF in image optimization (the app has 152 `next/image` imports), cache poisoning of SSG/ISR pages (518 prerendered pages), and metadata image route information disclosure. The `next/og` RCE does not apply because no `ImageResponse` use was found.
- **Solution:** run `npm audit fix` or bump `next` past 16.3.7, then rebuild and rerun the smoke test.
- **Verification:** `npm audit --omit=dev` reports no critical items; `next build` passes.

**P2-01 / P2 — Confirmed: other high-severity dependencies**
- **Issue:** `axios` (12 advisories incl. SSRF/prototype pollution), `sharp <0.35.5`, `dompurify <=3.4.15` (DOM XSS), `source-map-js`, `brace-expansion`. Total: 7 vulnerabilities (1 critical, 5 high, 1 low).
- **Evidence / Impact:** `npm audit` exit 1. Most are transitive; exploitability depends on use and was not traced.
- **Solution:** `npm audit fix` in the same change as P1-01. Check the lockfile diff.
- **Verification:** audit is clean or only accepted items remain; tests plus build pass.

**P2-02 / P2 — Confirmed: no security headers beyond a frame-src CSP**
- **Issue:** `next.config.mjs` `headers()` only sets `Content-Security-Policy: frame-src …`. The live response confirms no `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` or `X-Frame-Options`. `X-Powered-By: Next.js` is exposed.
- **Evidence / Impact:** `curl -I localhost:3111/`. Clickjacking and MIME sniffing are not mitigated. Vercel adds HSTS by default but not the rest.
- **Solution:** add `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `frame-ancestors 'self'` (check embeds first). Set `poweredByHeader: false`.
- **Verification:** `curl -I` shows the headers; checkout and CodePen embeds still load.

**P2-03 / P2 — Confirmed: no CI and no E2E tests**
- **Issue:** no `.github/` directory and no E2E config in the repo. All 316 tests are unit or jsdom tests.
- **Evidence / Impact:** the build, lint, tests and audit are not gated; payment and auth flows have no browser-level coverage.
- **Solution:** add a workflow running lint, `tsc`, `vitest`, `next build` and `npm audit --audit-level=high`. Add a Playwright smoke for home, effects, pricing and sign-in.
- **Verification:** a PR run shows all gates green.

**P2-04 / P2 — Confirmed: customer PII committed to git**
- **Issue:** `vault-main/data/waitlist-export.csv` is tracked (32 lines; columns `id, email, status, invited, createdAt`).
- **Evidence / Impact:** `git ls-files` lists it; introduced in commit `ab73d89`. A real email list sits in repo history.
- **Solution:** `git rm --cached`, add to `.gitignore`. Decide whether to scrub history (`git filter-repo`) if the repo is shared or public.
- **Verification:** `git ls-files data` is empty.

---

## F. Findings Register (P3 / P4) and Suspected Defects

| ID | Sev | Issue | Evidence / Impact | Solution | Verification |
|---|---|---|---|---|---|
| F-01 | P3 | No rate limiting or CAPTCHA on `POST /api/newsletter` and `/api/community/waitlist` | Neither route has a limiter or reCAPTCHA (grep); anyone can flood the Resend audience. | Add the existing recaptcha helper or an IP limiter. | 20 rapid POSTs get 429. |
| F-02 | P3 | Free/pro count mismatch | `registry/index.json` = 55 free / 95 pro. `public/llms.txt` and `WhyVault.jsx:18` say 56 free / 94 Pro. | Pick one source (registry) and generate llms.txt and the copy from it. | Counts match everywhere. |
| F-03 | P3 | Hard-coded marketing counts in many files | "50+ free" and "150+" are repeated in `categories.js`, `json-ld.js`, `seo-metadata.js`, `page.js`, `welcome-email.jsx`, `ExitIntentInviteModal.jsx`. Drift risk. | Centralize in one constant. | Single definition. |
| F-04 | P3 | `GET /api/cli/stats`, `/api/templates/views` are unauthenticated and uncached or limited inconsistently | `cli/stats` runs up to 50 COUNT queries per request with no limit. | Add `s-maxage` caching or a limiter. | Repeated calls hit cache. |
| F-05 | P3 | No `error.js` or `global-error.js` | Only `not-found.js` and 3 `loading.js` found under `src/app`. A render error shows the framework default and may not reach Sentry. | Add `global-error.js` with `Sentry.captureException`. | Throw in a page; fallback shows and Sentry logs. |
| F-06 | P3 | Stale Stripe code and env vars | 32 "stripe" mentions in `src`; `STRIPE_*` in `.env.local`. Razorpay is the live provider. | Remove dead Stripe paths and env entries. | `grep -i stripe` is empty. |
| F-07 | P3 | Sentry Replay enabled | `sentry.client.config.js`: 10% sessions, 100% on error. Replays on pages with email and payment fields; privacy policy must say so. | Confirm masking and disclosure. | Replay shows masked inputs. |
| F-08 | P4 | Malformed JSON returns 500 | `POST /api/newsletter` with `{bad` → `500 "Something went wrong"` and an error log. Should be 400. | Return 400 on JSON parse errors. | Same request returns 400. |
| F-09 | P4 | `console.log` in source | 15 occurrences under `src`. | Strip or guard them. | `git grep console.log` is empty. |
| F-10 | P4 | Focus-style risk | 64 `outline-none` uses; replacement focus styles not confirmed. 5 `<div onClick>` (2 overlay divs with `aria-hidden`; `NavbarMobile.jsx:661,669` wrap elements). | Manual keyboard pass. | Tab through nav, drawers, modals. |
| F-11 | P4 | Project style-rule drift (CLAUDE.md) | 604 `font-bold/semibold/medium`; 33 hand-written `rem` values; 21 min-width prefixes in `.js` files (`sm:`, `md:`, `lg:`, `xl:`). Includes template demos, which may be exempt. | Triage; fix outside demos. | Re-run the greps. |
| F-12 | P4 | Unused public token | `NEXT_PUBLIC_SANITY_VIEWER_TOKEN` is in `.env.local` but unused in `src`. A `NEXT_PUBLIC_` value ships to browsers. | Remove it, or confirm the dataset is public. | Not present in the client bundle. |

**Suspected (not reproduced):**
- `/checkout/pro` returned 404; `parsePlanKey` likely wants a specific key (for example a period suffix). Confirm the pricing page links resolve.
- `.env.local` does not define `SANITY_REVALIDATE_SECRET`, `RESEND_AUDIENCE_ID`, `RESEND_COMMUNITY_AUDIENCE_ID`, `RECAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `CLERK_WEBHOOK_SECRET`, `ADMIN_EMAIL`, or the `RAZORPAY_PLAN_*_USD` ids that code references. Locally the waitlist returned 503. **Production values were not inspected; confirm each is set in Vercel.**
- `InformationDrawerComp.tsx:369` renders `member.content` with `dangerouslySetInnerHTML`; the current callers pass static strings, so risk is low unless future data is user-supplied.
- `rzp_test_key` in `create-subscription/route.test.js` is a test fixture, not a secret.

---

## G. Route-by-Route (HTTP smoke test, production build, `next start`)

HTTP status only. **No route was browser-tested**, so none is rated PASS for rendering or content.

| Route | Result | Status |
|---|---|---|
| `/`, `/effects`, `/effects/components`, `/templates`, `/pricing`, `/blog`, `/tech`, `/community`, `/llm-info`, `/sign-in`, `/sign-up`, `/demo/spiral-gallery` | 200 | PARTIAL |
| `/docs`, `/docs/cli`, `/docs/installation`, `/docs/mcp`, `/docs/license`, `/docs/dependencies` | 200 | PARTIAL |
| `/legal/privacy-policy`, `/terms-of-service`, `/refund-policy`, `/license-agreement` | 200 | PARTIAL |
| `/legal` | 307 → `/legal/license-agreement` | PASS (matches config) |
| `/effects-v4` | 308 → `/effects` | PASS |
| `/dashboard`, `/dashboard/admin`, `/cli-auth` | 307 when signed out | PASS (auth redirect) |
| `/checkout/pro` | 404 | PARTIAL (see suspected) |
| `/nonexistent-xyz` | 404 | PASS |
| `/sitemap.xml`, `/robots.txt` | 200 | PASS |
| Other dashboard, admin, effect-detail, template-detail, blog-detail, tech-detail routes | not requested | NOT VERIFIED |

**API probes:** `/api/admin/me` 401 · `/api/admin/users` 403 · `/api/dashboard` 307 · `/api/media-proxy?url=https://evil.com` 400 (host allow-list works) · `/api/cli/stats` 400 without params · `/api/revalidate` GET 405 · `/api/effects/list` 200.

---

## H. Components

- **Registry:** 150 entries, each with `files`, `dependencies`, `importPath`, `exportName` and a packaged tarball. Count matches `llms.txt` (150).
- **Tests:** `registry-effects.render.test.jsx` plus an effect-delivery contract test pass. These run in jsdom with canvas and WebGL stubbed, so **GSAP/ScrollTrigger cleanup, WebGL disposal and reduced-motion behavior are NOT VERIFIED**.
- **Clean-consumer install of the `.tgz` packages and CLI flow:** NOT VERIFIED.
- Demo-to-source consistency per component: NOT VERIFIED.

---

## I. Content and Synchronization

- **Pass:** total of 150 effects consistent across registry, llms.txt and marketing copy; sitemap has 345 URLs, 164 effect URLs; robots.txt points to the sitemap.
- **Fail:** F-02 (55 vs 56 free); F-03 (duplicated counts).
- **Risk:** `public/sitemap.xml` is regenerated by `prebuild` with a new `lastmod` on every build, producing a 618-line git diff each time (the file is modified in the working tree now). Consider not committing it.
- **Placeholder / dead content:** commented-out phone numbers in the legal pages are not rendered. Two "TODO" strings in `smooth-carousel/core.ts` were not examined. Marketing claims and external links were **not** link-checked.

---

## J. Security

**Verified controls**
- Admin routes call `assertAdmin` or `assertSuperAdmin` (8 routes use `assertSuperAdmin`, or `getRole` with its own check; `/api/admin/me` returns 401 when signed out). Unauthenticated probes were denied.
- Razorpay payment verification uses HMAC with `timingSafeEqual`, a user-ownership check on the subscription, and a separate webhook route authenticated by signature.
- `/api/revalidate` fails closed when the secret is unset. `/api/e/[id]` restricts redirects to the app origin. `/api/media-proxy` has a host allow-list.
- Admin email fallback fails closed when `ADMIN_EMAIL` is unset.
- No live secrets found in tracked files (regex scan). `.env.local` is git-ignored and not tracked. `CLAUDE.md` is ignored.

**Open:** P1-01, P2-01, P2-02, P2-04, F-01, F-04, F-07, F-12.
**Not verified:** Supabase RLS policies (the app uses a service-role client server-side), Clerk webhook signature path in production, CORS on `media-proxy` (`access-control-allow-origin: *` by design), the Next image `remotePatterns` config, and secret-scanning of git history.

---

## K. Performance and Accessibility

- **Performance:** NOT VERIFIED. No Lighthouse, CWV or bundle-size numbers were captured. Observed only: static pages respond in under 70 ms locally with `x-nextjs-cache: HIT`. The home HTML is 418 KB uncompressed. The app ships GSAP, Three, R3F, Rapier, Recharts, jsPDF and Matter; per-route code splitting was not measured (`npm run analyze` is available).
- **Accessibility:** NOT VERIFIED. Static signals only: 0 `<img>` tags without `alt` in my grep (JSX multi-line tags may be missed); 571 reduced-motion references (good sign); see F-10.

---

## L. Automated Check Results

| Command | Exit | Result |
|---|---|---|
| `npx eslint .` | 0 | No output, no errors or warnings |
| `npx tsc --noEmit -p .` | 0 | Clean |
| `npx vitest run` | 0 | 23 files passed, 2 skipped; 316 passed, 13 skipped. jsdom "Not implemented" warnings only |
| `npm audit --omit=dev` | **1** | 7 vulnerabilities (1 critical, 5 high, 1 low) |
| `npx next build --webpack` | 0 | Compiled in 16.4 s, 518 static pages generated |
| `next start` + curl (41 URLs) | n/a | See section G |

Note: `npm run build` runs `prebuild` (sitemap generation) which rewrites a tracked file, so I ran `next build` directly.

---

## M. Untested / Unverified

Browser rendering and console or hydration errors · responsive layouts at any viewport · interaction flows (copy, search, filters, dialogs, theme) · keyboard and screen reader behavior · Core Web Vitals and Lighthouse · real payment, webhook, email and CLI flows · Supabase RLS · production environment configuration · deploy and rollback process · animation lifecycle and WebGL cleanup · clean-consumer package install · link checking.

Reason: no browser automation or live third-party credentials were available in this audit, and the audit rules forbid side-effecting actions.

---

## N. Remediation Plan

1. **Must fix before release**
   - P1-01 and P2-01: upgrade `next` and run `npm audit fix`, then rebuild and rerun tests.
   - P2-04: untrack `data/waitlist-export.csv`.
   - Confirm every env var in F-suspected is set in production, especially Clerk webhook, reCAPTCHA, Resend audiences and Razorpay plan ids.
   - Do a manual browser pass: home, pricing, one free and one pro effect, sign-in, checkout (test mode), mobile menu.
2. **Right after release:** P2-02 headers, P2-03 CI plus Playwright smoke, F-01 rate limits, F-05 `global-error.js`, F-07 Replay masking.
3. **Safe to defer:** F-02, F-03 count centralization, F-06 Stripe removal, F-08, F-09, F-12.
4. **Optional:** style-rule cleanup (F-11), bundle analysis, Lighthouse budget.

---

## O. Release Checklist

- [ ] `npm audit --omit=dev` has no critical or high items (or each is documented)
- [x] `eslint`, `tsc`, `vitest` pass
- [x] `next build` passes
- [ ] Production env vars verified in Vercel
- [ ] Waitlist CSV untracked
- [ ] Manual smoke test in a real browser (desktop and mobile)
- [ ] Test-mode payment, then webhook delivery confirmed
- [ ] Sentry receives a test error from production
- [ ] Rollback path known (previous Vercel deployment)

---

## P. Final Decision

**NO-GO** at this moment: an open critical advisory on the framework in use (P1-01) and critical verification (browser, payments, production env) is incomplete.

**Readiness: 6.5 / 10.** Fixing P1-01, P2-01 and P2-04, then completing the manual browser pass and env check, would move this to a **CONDITIONAL GO (about 8/10)**. I would not claim a full GO until CI, security headers and an accessibility pass exist.
