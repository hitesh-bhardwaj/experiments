# Browser Test Report: Hyperiux Vault (`vault-main`)

**Date:** 2026-10-15 · **Build under test:** production build (`next build` + `next start`, port 3111), Next.js 16.3.8
**Companion to:** `PRODUCTION_READINESS_AUDIT.md` (this report covers Issue 5, the "no real-browser testing" gap)

## 1. Verdict

**Result: PASS with minor findings. No blocking defect was found in the areas that could be tested.**

| | |
|---|---|
| Page/viewport combinations loaded | **76** (19 routes × 4 viewports), 0 load failures |
| Horizontal overflow | **0** |
| Broken images | **0** |
| Uncaught JS errors | **0** |
| New findings | 1 × P3, 5 × P4, 3 items that need a manual look |
| Earlier "suspected" item resolved | `/checkout/pro` 404 was a wrong URL, not a bug (see 5.3) |

## 2. How it was tested (and what that means)

- **Browser:** headless Chromium 1155 driven by `playwright-core` 1.49.1. It was installed in the scratchpad, **not** in the project, so `package.json` is untouched.
- **Environment:** local production build with the local `.env.local` (Clerk **development** keys). Not the real production deployment.
- **Viewports:** 390×844 (mobile), 820×1180 (tablet), 1280×800 (laptop), 1920×1080 (desktop).
- **Not covered:** Safari, Firefox, real touch devices, GPU-accelerated WebGL, signed-in flows, real payments, screen readers. See section 8.

## 3. Route matrix (all 19 routes × 4 viewports)

| Route | Status | Overflow | Broken img | JS errors | Title | Meta desc | `<h1>` |
|---|---|---|---|---|---|---|---|
| `/` | 200 | none | 0 | 0 | yes | yes | 1 |
| `/effects` | 200 | none | 0 | 0 | yes | yes | 1 |
| `/effects/components` | 200 | none | 0 | 0 | yes | yes | 1 |
| `/pricing` | 200 | none | 0 | 0 | yes | yes | 1 |
| `/templates` | 200 | none | 0 | 0 | yes | yes | 1 |
| `/docs`, `/docs/installation`, `/docs/cli` | 200 | none | 0 | 0 | yes | yes | 1 |
| `/blog` | 200 | none | 0 | 0 | yes | yes | 1 |
| `/tech` | 200 | none | 0 | 0 | **duplicate of home** (B-04) | yes | 1 |
| `/community`, `/llm-info` | 200 | none | 0 | 0 | yes | yes | 1 |
| `/sign-in`, `/sign-up` | 200 | none | 0 | 0 | yes | yes | 1 |
| `/legal/*` (4 pages) | 200 | none | 0 | 0 | yes | yes | 1 |
| `/demo/spiral-gallery` | 200 | none | 0 | 0 | yes | yes | **0** (B-05) |

Every page also has `lang` set on `<html>` and zero `<img>` tags missing an `alt` attribute.

## 4. Interaction tests

| Test | Result | Detail |
|---|---|---|
| Mobile menu (390px and 820px) | **PASS** | "Open menu" opens a panel with the nav links and effect links; Escape closes it |
| Command search (Cmd+K / "Search effects") | **PASS** | Typing `blur` returns "Interactive Blur Reveal" and "Blur Text" |
| Search no-match state | **NOT VERIFIED** | The check picked up the cookie dialog instead of the search dialog, so inconclusive |
| Pricing interval toggle | **PASS** | Yearly shows $6.58 / $79 (Pro) and $14.92 / $179 (Pro+). Quarterly shows $9 / $27 and $19 / $57. Toggling back restores the yearly prices |
| Pricing CTAs | **PASS** | "Start Pro" → `/checkout/pro.yearly`, "Get Pro+" → `/checkout/pro_plus.yearly`, "Upgrade to Pro" → `/sign-up` |
| Effect detail page | **PASS** | h1, breadcrumb, description, tags and Get Code / Demo buttons all render |
| Copy button (signed out) | **PARTIAL** | Click showed an "Upgrade" prompt and nothing reached the clipboard. That is the expected gating for a signed-out user, but the signed-in copy flow was not tested |
| Sign-in page | **PASS** | Email input has a label; first Tab lands on "Continue" with a 2px solid outline |
| Signed-out `/dashboard` | **PASS** | Redirects to the sign-in page (see B-03) |
| 404 page | **PASS** | Unknown URL returns 404 with the custom "This page fell over" page |
| Keyboard tab order (home, first 12 stops) | **PASS** | Every focused element had a visible ring. Order: cookie banner → logo → nav → sound toggle → sign in |
| Reduced motion (`prefers-reduced-motion: reduce`) | **PASS** | Home loads with no errors, same content length (8,450 chars) |

## 5. Findings

| ID | Sev | Type | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| **B-01** | P3 | Confirmed | **Soft 404 for unknown effect slugs.** `/effects/components/does-not-exist` returns **HTTP 200** with the title "Effect Not Found". | `curl` returned 200; page title is "Effect Not Found". Search engines may index the junk URLs. | Call `notFound()` in `effects/[slug]/[effectSlug]/page.js` when the slug is unknown, so it returns 404. |
| **B-02** | P4 | Confirmed | **Cookie banner covers page content** until dismissed. On the 1920×1080 home it overlaps the headline's last line and the secondary hero button; on the effect page it covers the lower part of the preview. | Screenshots `shot-desktop-1920-_.png`, `effect-detail.png`. | Make the banner smaller or push it to a corner, or reserve space for it. |
| **B-03** | P4 | Needs check | **Sign-in redirect goes to `adequate-shad-61.accounts.dev`**, a Clerk *development* instance domain. | Signed-out `/dashboard` redirected there with the local dev keys. Expected locally. | Confirm in production that the redirect goes to your own Clerk domain (production keys). You said Vercel env is handled, so this is just a final check. |
| **B-04** | P4 | Confirmed | **`/tech` has the same `<title>` as the homepage** ("Hyperiux Vault - React & Next.js Interaction Effects."). | Title captured at all four widths. | Give `/tech` its own title and description. |
| **B-05** | P4 | Confirmed | **`/demo/spiral-gallery` has no `<h1>`**. | 0 `h1` elements. | Demo page only; add a visually hidden h1 if it should be indexed, or mark it `noindex`. |
| **B-06** | P4 | Needs check | **4 links look unnamed** to a script: 3 on `/pricing` (`/effects`, `/effects/free`, `mailto:hello@hyperiux.com`) and 1 blog post card. | Their text is inside animated spans (`opacity: 0` during the entrance animation), so `innerText` was empty at the time of the check. Probably a false positive. | Check with a screen reader or the accessibility tree that these links expose their text. |
| **B-07** | Info | Not verified | **Effect preview area rendered solid black** on `gsap-flip-card`, `timeline` and `information-drawer` after 6 seconds. There was no iframe or video; 5 `<canvas>` elements were present, and no JS errors. | `detail-timeline.png`. Headless Chromium has no GPU, so this may be an environment limit and not a bug. | Open one effect page in a normal browser and confirm the preview plays. **This is the most important manual check left.** |
| **B-08** | Info | Expected | **Console noise:** 404 for `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js`. | These exist only on Vercel, so they 404 locally. `ERR_ABORTED` on `.mp4` requests on `/effects` is lazy video loading being cancelled when scrolled off. | None. |

## 6. Performance snapshot (local, unthrottled, headless; not Lighthouse)

| Route | LCP | CLS | Load event | Requests | JS transferred | Total transferred |
|---|---|---|---|---|---|---|
| `/` | 92 ms | 0 | 124 ms | 109 | 710 KB | 1,090 KB |
| `/effects` | 1,492 ms | 0.005 | 931 ms | 137 | 229 KB | 472 KB |
| `/pricing` | 136 ms | 0 | 121 ms | 111 | 6 KB* | 129 KB |
| `/docs` | 80 ms | 0.004 | 87 ms | 125 | 23 KB* | 170 KB |

*Low JS figures mean most chunks were served from the browser cache on repeat navigation in the same session, so they understate a cold load. Treat all numbers as relative. **Real field numbers need Lighthouse or PageSpeed against the production URL.** The `/effects` LCP is the slowest and is worth watching on a real network. All four layout-shift scores are well under the 0.1 "good" threshold.

## 7. What passed, in short

- No horizontal scrolling at 390, 820, 1280 or 1920 px on any of the 19 routes.
- No broken images, no uncaught JS errors, no console errors apart from Vercel-only scripts.
- Mobile and tablet menus open and close correctly.
- Search, pricing toggle, pricing CTAs, custom 404 and the auth redirect behave as designed.
- Keyboard focus is visible, and reduced motion causes no errors.

## 8. Still not verified

| Area | Why | How to close it |
|---|---|---|
| Effect previews and WebGL scenes actually animating (B-07) | Headless browser has no GPU | Open 3 effects in Chrome or Safari |
| Signed-in flows: dashboard, saved effects, copy and install limits | No test account used | Sign in with a test user and walk the dashboard |
| Razorpay checkout and webhook | Needs test-mode keys and a payment | Run one test-mode purchase on a preview deploy |
| Safari, Firefox, iOS and Android devices | Only Chromium available | Quick pass on iOS Safari and Firefox |
| Screen reader behavior (B-06) | Not available | VoiceOver on the home, pricing and an effect page |
| Core Web Vitals on real infrastructure | Local build only | Lighthouse or PageSpeed on the production URL |
| Search no-match message | Check was inconclusive | Type gibberish in search and look |

## 9. Effect on the readiness score

The browser pass removes the biggest unknown from the earlier audit and found nothing blocking. It moves the **UI/UX** and **Functionality** rows in `PRODUCTION_READINESS_AUDIT.md` from NOT VERIFIED / PARTIAL toward PASS for the tested pages. The score moves from **6.5 → about 7.5 / 10**. The remaining gap is B-07 (confirm previews render on a real GPU) and one test-mode payment. Recommended small fix before launch: **B-01** (soft 404).
