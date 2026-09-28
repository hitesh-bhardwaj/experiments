# Kyntra - performance notes

How the Kyntra template's Lighthouse score was raised from **74 to ~91**, and why
each change is shaped the way it is. Written to be portable: the reasoning applies
to any Vault template that uses SplitText reveals over a full-bleed hero.

Measured with Lighthouse (desktop preset) against `next build && next start`, not
dev mode. Scores below carry `next-devtools` (~245 KB) in the bundle, which does
not ship to real users, so production numbers should be slightly better.

| Metric | Before | After |
| --- | --- | --- |
| Performance score | 74 | **90–92** |
| Largest Contentful Paint | **`NOT FOUND`** | 1.0 s |
| Speed Index | 2.5 s | 2.1 s |
| Total Blocking Time | 350 ms | 140 ms |
| Cumulative Layout Shift | 0 | 0 |
| Initial JS | 1437 KB | 1038 KB |

The entry animation is unchanged. Line-rise timing was diffed frame by frame
before and after; the lines still travel `translateY 124 → 0` on the same curve.

---

## 1. `Failed to find the Largest Contentful Paint`

### The cause

**GSAP SplitText sets `aria-hidden="true"` on every line wrapper it creates, and
LCP ignores `aria-hidden` subtrees.**

Once `ParaAnim` splits a heading, all of its text lives inside those wrappers, so
the browser has no LCP candidate there - *even at `opacity: 1`*. This is not an
accessibility bug: SplitText puts an `aria-label` on the parent, so screen readers
still read the heading correctly. Only the metric is blind to it.

That alone would be survivable if some other element could carry LCP. Nothing
could:

| Candidate | Why it was rejected |
| --- | --- |
| `<h1>`, hero `<p>` | Text inside `aria-hidden` SplitText wrappers |
| KYNTRA watermark | `alt=""` + `aria-hidden` → decorative, never a candidate |
| Phone mockup | Ancestor at `opacity: 0` from Motion, and below the fold at 1440×900 |

Every candidate on the page was disqualified, so Lighthouse reported *no LCP at
all* rather than a slow one.

### The fix

Promote the watermark to a real image. It is the largest thing painted above the
fold and is not gated behind any animation:

```diff
- {/* Oversized KYNTRA watermark */}
  <Image
    src={kyntraHero}
-   alt=""
-   aria-hidden
-   priority
+   alt="Kyntra"
+   loading="eager"
+   fetchPriority="high"
```

The image renders the word "KYNTRA", so a real `alt` is more correct anyway.

This required un-nesting the hero backdrop. The watermark and the gradient shared
one `motion.div` that faded `0 → 1`, which held the image at zero opacity. The
gradient keeps that exact 1.2 s fade; only the image moved out from under it:

```diff
- <motion.div aria-hidden initial={{opacity:0}} animate={{opacity:1}} className="… inset-0">
-   <div className="… gradient …" />
-   <Image … />
- </motion.div>
+ <div className="pointer-events-none absolute inset-0">
+   <motion.div aria-hidden initial={{opacity:0}} animate={{opacity:1}} className="… gradient …" />
+   <Image … />
+ </div>
```

### Rule of thumb

> Anything you want to be the LCP element must be **outside** every `aria-hidden`
> subtree, must not sit under an ancestor at `opacity: 0`, and must be above the
> fold. A SplitText heading can never be the LCP element - plan for an image.

---

## 2. Total Blocking Time and Speed Index

The main-thread breakdown pointed at layout, not script:

```
1082 ms  Style & Layout      ← the actual bottleneck
 476 ms  Script Evaluation
```

**SplitText forces a synchronous layout read per element.** The page has ~66
`ParaAnim` / `FadeUp` instances, and every one of them split on mount - including
sections far below the fold that nobody had scrolled to yet.

### Three changes in `components/Animations/gsapAnim.tsx`

**a. Defer off-screen splits** (the big win - Style & Layout 1082 ms → 658 ms)

Copy that is not near the viewport waits for an `IntersectionObserver` before
splitting. `rootMargin: "200% 0px"` means the split still happens well before the
element scrolls into view, so the reveal is set up in time and the tween is
untouched.

```ts
const box = el.getBoundingClientRect();
const nearViewport =
  box.top < window.innerHeight * 1.5 && box.bottom > -window.innerHeight;

if (nearViewport) {
  splitWhenFontReady();
} else {
  deferredObserver = new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    obs.disconnect();
    splitWhenFontReady();
  }, { rootMargin: "200% 0px" });
  deferredObserver.observe(el);
}
```

**b. Wait only on the fonts an element actually uses**

`document.fonts.ready` resolves only when *every* face on the page has loaded -
here that is 936 KB across 7 files. Above-the-fold copy sat at `opacity: 0` that
whole time. `fonts.load(shorthand)` waits for just the faces that element renders
in, and a `FONT_WAIT_CAP = 300` ms timeout guarantees the reveal is never blocked
by a slow font. Because every face is declared `font-display: swap`, text is
already painting in the fallback by then.

```ts
const { fontFamily, fontWeight, fontSize } = getComputedStyle(el);
try {
  fonts.load(`${fontWeight} ${fontSize} ${fontFamily}`).then(runOnce, runOnce);
} catch {
  fonts.ready.then(runOnce, runOnce);   // malformed shorthand fallback
}
fontTimer = window.setTimeout(runOnce, FONT_WAIT_CAP);
```

`runOnce` guards against the timeout and the font promise both firing.

**c. Start in-view copy directly**

Copy already on screen at load had to wait for ScrollTrigger's first refresh
before `onEnter` fired. Same tween, started directly instead:

```ts
const rect = el.getBoundingClientRect();
const inView = rect.top < window.innerHeight && rect.bottom > 0;
if (inView) {
  gsap.to(lines, { ...to, delay });
  return;
}
```

Copy split later by the deferred observer is still off screen at that point, so it
correctly keeps its ScrollTrigger.

**Cleanup.** The effect's teardown now also cancels the pending timeout and
disconnects the observer, so a fast unmount cannot fire a split into a dead node.

---

## 3. Initial JavaScript: 1437 KB → 1038 KB

**Below-fold sections are dynamically imported** in `page.tsx`. These still
server-render - only the JS is deferred, so HTML, SEO and no-JS content are
unchanged.

```ts
const Features = dynamic(() => import("./components/Features"));
const Smarter = dynamic(() => import("./components/Smarter"));
const HowKyntraWorks = dynamic(() => import("./components/HowKyntraWorks"));
const Trust = dynamic(() => import("./components/Trust"));
const Testimonial = dynamic(() => import("./components/Testimonial"));
const Blogs = dynamic(() => import("./components/Blogs"));
const KyntraFaq = dynamic(() => import("./components/KyntraFaq"));
const CTA = dynamic(() => import("./components/CTA"));
const ParallaxFooter = dynamic(() => import("./components/effects/parallax-footer"));
```

`Header`, `Hero`, `About` and `SectionBreak` stay static - they are above the fold.

**Modals load on first interaction** (`Header`, `CTA`, `HowKyntraWorks`). This
matters most in `Header`, which is above the fold and was pulling `EnquiryModal`
into the critical bundle.

The modals keep themselves mounted through their own close tween (`mounted = open
|| exiting`), so unmounting on `open === false` would cut the exit animation off.
A latch fixes that - it flips true on first open and never flips back:

```tsx
const [enquiryUsed, setEnquiryUsed] = useState(false);
// …
{enquiryUsed && <EnquiryModal open={enquiryOpen} onClose={closeEnquiryModal} />}
```

---

## 4. Image priority hygiene

`priority` was set on five below-fold images, where it competes with the real LCP
element for bandwidth. Removed from `About` (×2), `Trust`, `DownloadAppModal` and
`parallax-footer` - `next/image` lazy loads by default.

**Next.js 16 deprecates `priority` in favour of `preload`.** But the docs warn
against `preload` when several images could be the LCP depending on viewport,
which is exactly this hero (watermark on desktop, mockup on mobile). So the hero
pair and the header logo use `loading="eager"` + `fetchPriority="high"` instead -
same behaviour, non-deprecated API, no competing preloads.

---

## 5. `IntroOverlay` - the blank-then-reveal intro

`components/IntroOverlay.tsx`. A plain white sheet held over the page for the
first few frames, so a reload reads as "blank, then everything arrives in
sequence".

**Why this is the right shape.** Painting *over* the page is not the same as
hiding it. The content underneath renders and paints normally, so the browser
still picks an LCP candidate - an `opacity: 0` hero has none. This gets the
visual effect without re-breaking the metric.

Styled with `gsap.set` rather than Tailwind:

```ts
gsap.set(el, {
  position: "fixed", inset: 0, width: "100%", height: "100svh",
  backgroundColor: "#ffffff", zIndex: 9999, pointerEvents: "none", opacity: 1,
});

gsap.to(el, {
  opacity: 0, duration: FADE, delay: HOLD, ease: "power2.out",
  onComplete: () => gsap.set(el, { display: "none" }),  // drop the layer
});
```

`HOLD = 0.35`, `FADE = 0.6`. The hero `<h1>` already carries `delay={0.5}`, so its
reveal begins mid-fade and the copy emerges as the white clears.

Two details that are easy to get wrong:

- **The cover is also rendered in the server HTML** with matching inline styles.
  A cover that only appears at hydration lets the page flash through first. Costs
  roughly 2 Lighthouse points; worth it to avoid a visible flash, and easy to drop
  if you disagree - delete the `style` prop on the returned `<div>`.
- **A `<noscript>` rule hides it.** Without JS nothing would ever clear the sheet
  and the page would be permanently blank:
  ```tsx
  <noscript><style>{`[data-intro-overlay]{display:none!important}`}</style></noscript>
  ```

Reduced motion skips the fade and removes the cover immediately.

---

## Verifying after a change

Always measure a production build; dev mode numbers are meaningless.

```bash
npm run build && npm start
npx lighthouse http://localhost:3000/kyntra \
  --only-categories=performance --preset=desktop --view
```

Watch for regressions in this order:

1. **LCP reported at all.** If it says `NOT FOUND`, something made the watermark
   `aria-hidden` again, gave it back `alt=""`, or wrapped it in an `opacity: 0`
   ancestor.
2. **Style & Layout in the main-thread breakdown.** If it climbs back toward
   1000 ms, a new `ParaAnim` is splitting on mount - check it goes through
   `splitWhenFontReady`.
3. **Initial JS.** A new below-fold section imported statically in `page.tsx`
   undoes the code splitting.

Lighthouse runs vary by a few points; take the median of three, not a single run.
