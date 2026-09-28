# Effect Audit Reports

Two point-in-time QA sweeps, merged: the Remixer Panel prop-wiring audit and the
reduced-motion disclaimer audit. Both were snapshots as of late July 2026.

> **Follow-up verification (2026-08-12):** re-checked a broad sample of both reports'
> findings against the current, post-TypeScript-migration codebase. Several effects
> (`webgl-slider`, `zoom-slider`, `infinite-carousel`, `ring-carousel`,
> `horizontal-feature-reveal`, `svg-pixel-reveal`) had their prop sets or reduced-motion
> handling reworked during the TS conversion - this silently fixed some previously-open
> issues but also **reintroduced three fixes both reports had marked resolved**:
>
> - **`char-stagger-button`** - `iconVariant` is back as a real, working prop but has no
>   `registry.json` entry, so the remixer panel can never expose it (props-remixer
>   report regression).
> - **`horizontal-feature-reveal`** - registry reverted to a hard early-return skip
>   under reduced motion (dropping all 4 SplitText reveals + parallax), while the docs
>   mirror still has the intended gentler opacity-fade version (reduced-motion report
>   regression - the drift is back, same direction as originally flagged).
> - **`svg-pixel-reveal`** - registry is back to zero reduced-motion code despite its
>   own `registry.json` v1.1.0 changelog still claiming it was ported (reduced-motion
>   report regression).
> - **`webgl-slider`** - the v1.1.1 changelog entry correcting the reduced-motion scope
>   no longer exists in `registry.json` (only v1.0.0/1.1.0/1.2.0 remain), so the
>   changelog undersells the actual (still-broad) reduced-motion behavior again.
> - **`pixel-bloom`** - never fixed in the first place; still the reduced-motion
>   report's one open item, changelog claims handling that doesn't exist in code.
>
> Neither report should be treated as "settled, safe to archive." The props-remixer
> report is also explicitly partial - only `backgrounds`/`buttons`/`carousels` were ever
> audited (3 of 11 categories); 8 remain unaudited.

---

## Part 1 - Props Remixer audit

*(formerly `props-remixer-audit-report.md`, covers backgrounds/buttons/carousels only)*


Audits each effect's Remixer Panel (dynamic props / live controls) for correctness across three pieces:
- `registry/effects/{category}/{effect}/registry.json` - the `props`/`remixer` metadata (source of truth for what the panel exposes and what copied code contains).
- The **registry component** (what copied code produces after install).
- The **docs mirror component** at `apps/docs/src/components/{effect}/` (what the live `/demo/{effect}` preview actually renders).



Error types: **MISMATCH** (a control claims to work but doesn't, on the registry side, the mirror side, or via wrong `docsOnly` classification) · **BROKEN_CONTROL** (an unrecognized `remixer.control` type silently renders as an unlabeled range slider, or a "suggested" prop's name doesn't match anything `SuggestedEffectRemixerDemo` knows how to simulate, so it visibly does nothing) · **UNDOCUMENTED** (a real, meaningful prop with no `registry.json` entry, so the remixer system can never expose it) · **STALE_INVENTORY** (`REMIXER_EFFECT_PROPS.md` or `REMIXER_PANEL.md` no longer matches current `registry.json`/component reality) · **LOW_VALUE** (a prop works fine but a real user customizing the effect would never reach for it - judgment call, not a bug) · **CONFLICTING_PROPS** (two props actually fight over the same rendered output, not just similarly-named - a real correctness hazard, distinct from LOW_VALUE).

---

## backgrounds - audited 2026-07-28

**No functional errors.** All 3 effects (`dither-canvas`, `dotted-grid`, `spider-particles`) are wired via `RegistryRemixerDemo` directly, all have `remixer.enabled: true`, and every prop declared in `registry.json` exists identically on both the registry component and the docs mirror - every live control actually works and every copied-code snippet will actually import and apply correctly. No prop name is broken.

### STALE_INVENTORY (documentation only - not a functional bug)

| Effect | File | What's stale |
|---|---|---|
| `dither-canvas` | `REMIXER_EFFECT_PROPS.md:19,25` | Lists `videoSrc` and `className` as having a "text" remixer control, but `registry.json` gives neither prop a `remixer` object - they don't actually appear in the panel. |
| `dotted-grid` | `REMIXER_EFFECT_PROPS.md:29-40` | Omits `dotHue`, which has a real, working `range` control in `registry.json:135-146`. Also lists `className` as a "text" control, but `registry.json:186-189` gives it no `remixer` object at all. |
| `spider-particles` | `REMIXER_EFFECT_PROPS.md:45-55` | Missing 6 props that are real, fully-wired controls in current `registry.json:90-183`: `lerpSpeed`, `fadeSpeed`, `showWeb` (range/checkbox), `webColor`, `centerColor`, `glowColor` (color). |
| `spider-particles` | `REMIXER_PANEL.md:395-476` ("Spider Particles As Reference Example") | The whole worked example is out of date. It still claims `lerpSpeed`/`fadeSpeed`/`showWeb` are docs-only and must be **excluded** from copied code (its checklist item 6 and its expected 6-key `spiderParticlesProps` snippet). Current `registry.json` has none of these three marked `docsOnly`/`copyable:false` - they're now real props, included in copied code. These props have "graduated" from docs-only to real; the plan doc's example needs updating to match, and it also predates `webColor`/`centerColor`/`glowColor`/`particlesGlow` entirely. |

### LOW_VALUE props - RESOLVED (props removed 2026-07-28)

| Effect | Prop(s) | Why | Status |
|---|---|---|---|
| `dotted-grid` | `dotHue`, `trailSaturation` | Raw hue-degree/saturation number sliders manually reconstructing an HSL color a single `color` picker would represent far more intuitively. | **Removed.** Hardcoded as `DOT_HUE`/`TRAIL_SATURATION` constants (same values, 210/16) in both registry and mirror; no longer props at all. |
| `spider-particles` | `lerpSpeed`, `fadeSpeed` | Raw easing/physics coefficients - technical tuning constants, not design controls. | **Removed.** Hardcoded as `LERP_SPEED`/`FADE_SPEED` constants (same values, 0.1/0.04) in both registry and mirror. |

### CONFLICTING_PROPS

**None found.** Verified by reading actual usage in each registry component (not just prop names):
- `dither-canvas`: `colorBoost` → `uColorBoost` uniform, `colorizeFromVideo` → `uColorizeFromVideo` uniform (`index.jsx:674-675,874-875`) - two distinct shader uniforms, not a shared output.
- `spider-particles`: `particleColor`, `glowColor`, `centerColor`, `webColor` each map to a different rendering target - particle fill, glow uniform, center-point fill, and connection-line color respectively (`index.jsx:96-99,218-249,375-380`). `particlesGlow` is a normal boolean gate on the (separately-colored) glow uniform, not a competing write to the same output.

No pair of props in this category silently overrides or fights another.

---

## buttons - audited 2026-07-28

All 7 effects (`animated-toggle`, `arrow-fill-button`, `char-stagger-button`, `char-stagger-primary-button`, `dot-fill-button`, `link-button`, `scramble-link-button`) use `RegistryRemixerDemo` directly - none are still on `SuggestedEffectRemixerDemo`. All have `remixer.enabled: true`, and no `remixer.control` type is unimplemented, so there are no `BROKEN_CONTROL` cases here. This category has real functional bugs, unlike backgrounds.

**Systemic issue across 4 effects (acknowledged, left as-is per instruction):** `char-stagger-button`, `char-stagger-primary-button`, `link-button`, and `scramble-link-button` all have a `btnText` (registry component + `registry.json`) vs `text` (docs mirror component) prop-name split. Each effect's `DemoContent.jsx` papers over this with a hand-written `render` function that manually renames the value before handing it to the mirror. It works today only because of that manual workaround. **Decision: not fixing this - out of scope for now.**

### MISMATCH - ALL FIXED (2026-07-28)

| Effect | Was | Fix applied |
|---|---|---|
| `animated-toggle` | `registry.json` declared a `checked` prop (checkbox) that neither component destructured or used anywhere - the control was fully inert. | Removed the dead `checked` prop entry from `registry.json` entirely. `defaultChecked` already covers the same "start active" purpose and is the one that actually works. |
| `arrow-fill-button` | `arrowColor`/`hoverArrowColor` had an explicit remixer default (`"#ff5f00"`), but both components only read them via `arrowColor \|\| fillTextColor` fallback logic meant for when the prop is `undefined`. Since remixer always seeded a defined value, the fallback - and `fillTextColor`'s own color control - could never take effect. | Removed the `"default"` field from `arrowColor`/`hoverArrowColor` in `registry.json` (kept their `remixer` color control). Now they stay `undefined` until a user explicitly picks a color, so the fallback to `fillTextColor`/`hoverFillTextColor` works until then, and the explicit override still works once touched. No component code change needed - the fallback logic (`index.jsx:144-145`) was already correct. |
| `dot-fill-button` | `fillColor` had no `remixer` object at all, so `getGroupsFromProps` skipped it - a real, functional prop with no way to reach it from the panel. | **Superseded 2026-07-28** - see CONFLICTING_PROPS below: `fillColor` and `dotColor` turned out to be the exact same rendered property (`background: dotColor \|\| fillColor` on one element, no separate "expanded" state), so rather than exposing both, `fillColor` was removed entirely and consolidated into a single `dotColor` prop. |

### UNDOCUMENTED - FIXED (2026-07-28)

| Effect | Was | Fix applied |
|---|---|---|
| `arrow-fill-button` | The mirror component had real, working `animationDuration` and `showArrow` props (`index.jsx:23-25`, used at lines 85, 143, 169-200) that didn't exist on the registry/shipped component at all, with no `registry.json` entry. | Ported `showArrow` into the registry component - it now conditionally renders the arrow-icon block, with a matching `registry.json` checkbox entry. **`animationDuration` was ported then removed again per follow-up instruction** - the registry component still hardcodes the original `ANIMATION_DURATION_MS` constant for the mobile press-release timing, same as before this audit; only `showArrow` is now in sync between registry and mirror. |

### CONFLICTING_PROPS - ALL FIXED (2026-07-28)

| Effect | Was | Fix applied |
|---|---|---|
| `animated-toggle` | `defaultChecked` vs `checked` - only `defaultChecked` was wired into `useState(defaultChecked)`; `checked` did nothing. | Resolved by removing the dead `checked` prop (see MISMATCH above) - no more conflict, since only `defaultChecked` exists now. |
| `arrow-fill-button` | `arrowColor` vs `fillTextColor` (and `hoverArrowColor` vs `hoverFillTextColor`) - `arrowColor`'s remixer-seeded default always won over the `\|\|` fallback. | Resolved by removing `arrowColor`/`hoverArrowColor`'s `"default"` field (see MISMATCH above) - the fallback chain now works as originally intended. |
| `dot-fill-button` | `dotColor` vs `fillColor` - both fed the exact same `background` on the exact same element (no separate "expanded" state), so they were genuinely the same property under two names, not just a fallback pair. | **Consolidated 2026-07-28** - removed `fillColor` entirely (component destructure, mirror destructure, `registry.json` entry) and kept a single `dotColor` prop with its own `"#ffffff"` default in both components. `REMIXER_EFFECT_PROPS.md` updated to match. |

All 3 `registry.json` files and the edited `arrow-fill-button/index.jsx` validated (JSON parse + JS/JSX syntax check) - no errors. Versioning intentionally left untouched per instruction - no version bumps or changelog entries added for these fixes.

### LOW_VALUE - kept as-is per instruction (these props stay configurable)

| Effect | Prop | Why |
|---|---|---|
| `char-stagger-button` | `staggerStep` | Raw per-character delay in seconds (0–0.08, step 0.005) - no intuitive feel for "0.02" vs "0.04"; a qualitative fast/slow choice would serve better. Still configurable. |
| `char-stagger-primary-button` | `staggerStep` | Same as above. Still configurable. |
| `dot-fill-button` | ~~`staggerStep`~~ | **Removed 2026-07-28** - hardcoded as `STAGGER_STEP = 0.01` constant in both registry and mirror components; no longer a prop. `registry.json` entry and `REMIXER_EFFECT_PROPS.md` row removed. |
| `scramble-link-button` | `stepMs` | Ms delay between scramble-frame repaints - only tunable by trial and error against `scrambleDuration`. Still configurable. |
| `scramble-link-button` | `revealStagger` | An internal divisor inside the `revealThreshold` formula (`index.jsx:33-34`) - a tuning coefficient, not a look/feel control. Still configurable. |

### STALE_INVENTORY

| Effect | What's stale |
|---|---|
| `animated-toggle` | `REMIXER_EFFECT_PROPS.md` still lists this as "- Suggested props" with placeholder names/defaults (`checked`, `size` 44, `activeColor` #ff6b00, `inactiveColor` #222222, `duration` 0.35) - real props have since shipped with different names/defaults (`defaultChecked`, `size` 96, `activeColor` #ff5f00, `inactiveColor` #a1a1aa, `duration` 0.32). |
| `arrow-fill-button` | Lists `href`/`className`/`...props` as if remixer-controlled (they aren't in current `registry.json`) and omits the real `fillTextColor` color control. |
| `char-stagger-button` | ~~Listed `iconVariant`~~ **Resolved 2026-07-28** - `iconVariant` was removed entirely from both components and `registry.json` per instruction (the "Single" icon variant branch was dead-ended; always renders the "Stacked" variant now, its previous default). `REMIXER_EFFECT_PROPS.md`'s row for it removed too. *(Follow-up fix: removing the ternary left the icon sized `w-full h-full`, which rendered oversized with nothing constraining it - corrected to a fixed `h-4 w-4` in both components, matching the old "Single" variant's size.)* Also lists `showLine` default as `false` (the mirror's own stray default) when the registry/registry.json default is `true`. |
| `char-stagger-primary-button` | Lists `hoverColor`'s default as `""` (the mirror's stray default) when the actual registry/registry.json default is `"#ffffff"`. |
| `dot-fill-button` | ~~Lists `btnText` default as `""`... `dotColor` as `undefined`... omits `fillColor`~~ **Resolved 2026-07-28** - `fillColor` no longer exists (consolidated into `dotColor`, see CONFLICTING_PROPS above), `staggerStep` no longer exists (removed, see LOW_VALUE above), and `dotColor`'s default is now correctly listed as `"#ffffff"`. `btnText`'s `""` default is still stale (actual: `"Try demo"`) - not part of this fix. |

`link-button` had no additional findings beyond the systemic `btnText`/`text` MISMATCH above - its `REMIXER_EFFECT_PROPS.md` entry is actually in sync with current `registry.json`.

---

## carousels - audited 2026-07-29

All 5 effects (`clippath-slider`, `infinite-carousel`, `ring-carousel`, `webgl-slider`, `zoom-slider`) declare `remixer.enabled: true` in `registry.json`. Unlike `backgrounds` (clean), this category has widespread, near-identical bugs: in 4 of 5 effects, `REMIXER_EFFECT_PROPS.md`'s old "- Suggested props" tables were copied verbatim into `registry.json`'s real `props`/`remixer` arrays without ever wiring the implementation, so a majority of each panel's controls are dead. The 5th (`ring-carousel`) has a different root cause - a docs-mirror wiring bug, not a registry.json problem. `clippath-slider` fixed 2026-07-29; `infinite-carousel` fixed 2026-07-29 (see below, both); `ring-carousel`, `webgl-slider`, `zoom-slider` not yet fixed.

**Correction to the opening claim above:** it's not actually true that all 5 use `RegistryRemixerDemo` - `infinite-carousel`'s real `/demo/infinite-carousel/page.js` was a fully static page rendering `<InfiniteCarousel />` with zero props and no `RegistryRemixerDemo`/`RemixerLauncher` anywhere, despite `registry.json` declaring a complete 9-prop remixer schema. The panel literally never rendered on the live page - a 6th bug this section missed, on top of the 5 dead-prop MISMATCH below. Fixed as part of the 2026-07-29 pass (see below).

### `clippath-slider` - FIXED 2026-07-29 (per instruction, not a full unwind of every dead prop)

| Was | Fix applied |
|---|---|
| `slides` had a live `json` remixer control. | Remixer control removed per instruction. `slides` stays a real, working, documented prop (`registry.json`, both `index.jsx` wrappers) - just no longer live-editable in the panel. |
| `clueText` had a live `text` remixer control. | Remixer control removed per instruction. `clueText` stays a real, working, documented prop - no longer live-editable. Added a new `showClue` boolean prop (default `true`, `checkbox` remixer control, `content` group) that gates whether the clue paragraph renders at all - both `ClippathSliderComp.jsx` (registry + mirror) now check `showClue && clueText` before rendering it. |
| `clipDirection`, `easing`, `showControls` (the whole "Controls" panel group) had live remixer controls despite being dead (see original MISMATCH row below). | Remixer controls removed per instruction - the "Controls" group no longer appears in the panel at all. All 3 stay declared, documented `registry.json` props with their original defaults; they remain unwired in the component (out of scope for this fix - only `duration` was asked to be made functional). This also resolves the `clipDirection` `BROKEN_CONTROL` (empty `select` options) below, since it's no longer rendered. |
| `duration` was declared with a working-looking `range` remixer control but was never read by `ClippathSliderComp.jsx` - the sweep transition (`runSweepAnimation`'s `gsap.to(proxy, ...)`) and the paired outgoing-layer scale-down tween were both hardcoded to `1.2`s. | Wired for real: both registry and mirror `ClippathSliderComp.jsx` now accept `duration` (default `0.75`, matching `registry.json`) and use it for both of those tweens (they run concurrently as one visual transition). Both `index.jsx` wrappers now accept and forward `duration`. The reduced-motion fade path (`REDUCED_MOTION_FADE_DURATION = 0.18`) is intentionally left untouched - it's a separate accessibility-specific constant, not the "Clip-path transition duration" the prop describes. |

`apps/docs/public/r/clippath-slider.json` regenerated via `apps/docs/scripts/build-registry.js` to match. `REMIXER_EFFECT_PROPS.md` updated (see its own section) - table graduated out of "Suggested props" and now lists the real prop set, matching the `spider-particles`-style formatting used for other graduated effects.

### `infinite-carousel` - FIXED 2026-07-29 (per instruction, adding only the 5 REMIXER_EFFECT_PROPS.md-listed props)

| Was | Fix applied |
|---|---|
| No remixer panel rendered on `/demo/infinite-carousel` at all (see the correction note above) - the page was static, ignoring `registry.json`'s remixer schema entirely. | Rewired the demo page to the `spider-particles`/`DemoContent.jsx` pattern: `page.js` now imports `registry.json` and renders `<DemoContent registry={...} />`; `DemoContent.jsx` (previously a dead unused stub) wraps `<InfiniteCarousel />` in `RegistryRemixerDemo`, preserving the page's existing custom header/title markup via the `children` render-prop, same structure `clippath-slider`/`spider-particles` use. |
| `items` (array, default `[]`) duplicated the real, working `cards` prop - both described as "the content rendered in the loop," `items` predates `cards` shipping in 1.2.0. Wiring both as independent live controls would let one silently override the other. | **Removed** `items` entirely from `registry.json` (same resolution class as the `dot-fill-button` `fillColor`/`dotColor` consolidation earlier in this audit) - per instruction, confirmed with a follow-up question rather than assumed. |
| `speed` (declared, unwired) - loop speed was a hardcoded `pixelsPerSecond = 100` constant inside `horizontalLoop()`. | Wired as a multiplier: `pixelsPerSecond = 100 * Math.max(speed, 0.01)` in both registry and mirror `InfiniteCarouselComp.jsx` (the `0.01` floor guards against a `speed: 0` edge case producing `Infinity`-duration tweens, since `duration = distance / pixelsPerSecond`). Threaded through the outer `index.jsx` wrapper and into the loop-rebuild `useEffect`'s dependency array. |
| `gap` (declared, unwired) - item spacing was hardcoded via Tailwind `gap-8 ...` classes on a *different* (vertical, controls-row-to-track) wrapper than actually spaces the cards. | Wired as `wrapperStyle.gap: `${gap}px`` on the outer `index.jsx` wrapper, applied to the loop-track flex container that `InfiniteCarouselComp` already exposes via its existing `wrapperStyle` passthrough - no core engine changes needed, since GSAP's `horizontalLoop` reads live `offsetLeft`/width from the DOM (which already accounts for flex `gap`) rather than baking spacing in statically. |
| `pauseOnHover` (declared, unwired) - "Pauses carousel motion while hovered," but this carousel has no autoplay/continuous motion, only drag and nav-button interaction, so there was nothing to pause. | Confirmed the semantic gap with a follow-up question rather than guessing. Implemented as: while hovered (tracked via a `isHoveredRef` set by `onPointerEnter`/`onPointerLeave` on the track wrapper), a completed drag's post-release momentum coast (GSAP `Draggable`'s `inertia`) is disabled by mutating `draggableInst.vars.inertia` fresh on each `onPress` - the closest real "pause the motion" behavior available in an interaction-only carousel. Reduced motion continues to disable inertia unconditionally, independent of hover. |
| `direction` had `"control": "select"` with `"options": []` (a `BROKEN_CONTROL`, empty dropdown) and did nothing regardless. | Options fixed to `["left", "right"]`; wired to `horizontalLoop`'s existing (previously-unused-by-this-effect) `config.reversed` flag - `direction === "right"` reverses the timeline. |

`apps/docs/public/r/infinite-carousel.json` regenerated via `apps/docs/scripts/build-registry.js`. `REMIXER_EFFECT_PROPS.md` updated - table graduated out of "Suggested props," lists the real 8-prop set (`cards`/`draggable`/`showNav`/`mobileBreakpoint` plus the 4 newly-wired props; `items` removed), matching the `spider-particles` formatting convention.

### MISMATCH - dead controls (not fixed yet)

| Effect | Dead prop(s) | Detail |
|---|---|---|
| ~~`clippath-slider`~~ | ~~`clipDirection`, `duration`, `easing`, `showControls` (4/8 declared)~~ | **Fixed 2026-07-29** - see `clippath-slider - FIXED` above. `duration` is now wired and functional; `clipDirection`/`easing`/`showControls` are still unwired but were removed from the remixer panel, so they're no longer *presented* as live controls that silently do nothing - they're now correctly non-interactive documented props. |
| ~~`infinite-carousel`~~ | ~~`items`, `speed`, `gap`, `pauseOnHover`, `direction` (5/9 declared)~~ | **Fixed 2026-07-29** - see `infinite-carousel - FIXED` above. `speed`/`gap`/`pauseOnHover`/`direction` are now wired and functional (plus the demo page now actually renders the panel, which it didn't before at all); `items` was removed as a redundant duplicate of `cards` rather than wired. |
| `ring-carousel` | `snap`, `autoPlay`, `autoPlayInterval`, `pauseOnHover`, `showNavigation`, `showDots` (6/6 declared) - **preview-only bug** | `registry.json` and the shipped registry component are actually correct (all 6 props properly destructured and forwarded). The bug is isolated to the docs mirror: `apps/docs/src/components/ring-carousel/index.jsx`'s `RingCarousel()` takes **zero props** and hardcodes `snap`/`autoPlay`/`autoPlayInterval`/`pauseOnHover` as literals when calling `RingCarouselComp`; `showNavigation`/`showDots` aren't passed at all. Since `RegistryRemixerDemo` renders the mirror, every one of the 6 panel controls is a no-op in the live preview - but copy-pasted/installed code (built from the real registry component) works correctly. |
| `webgl-slider` | `slides`, `distortionStrength`, `transitionDuration`, `backgroundColor`, `showControls` (5/6 declared) | Neither the registry nor mirror `WebGLSliderComp` destructures these - only `images` is real (added in the 1.2.0 changelog). **Copy-code bug:** `images` (the one working prop) is marked `"copyable": false` while the 5 dead props aren't, so the generated snippet omits the working prop and includes 5 that `WebGLSlider` silently ignores. |
| `zoom-slider` | `zoomScale`, `duration`, `autoplay`, `showControls`, `slides` (5/8 declared) | Not destructured anywhere. Card/hover scale (`gsap.to(..., { scale: 1.05 })`) and all animation durations are hardcoded literals; no autoplay timer exists (nav is drag/wheel/touch only); no nav-controls UI exists; `slides` sits right next to - and is easily confused with - the real, working `sliderData` prop (only `sliderData` is actually read). |

### BROKEN_CONTROL

| Effect | Prop | Issue |
|---|---|---|
| ~~`clippath-slider`~~ | ~~`clipDirection`~~ | **Resolved 2026-07-29** - `"control": "select"` with `"options": []` rendered an empty, unusable dropdown. Fixed by removing `clipDirection`'s remixer control entirely (see `clippath-slider - FIXED` above), so it no longer renders in the panel at all. |
| ~~`infinite-carousel`~~ | ~~`direction`~~ | **Resolved 2026-07-29** - same defect: `"control": "select"` with `"options": []`. Fixed by populating real options (`["left", "right"]`) and wiring `direction` to `horizontalLoop`'s `reversed` flag (see `infinite-carousel - FIXED` above), instead of removing the control. |

### STALE_INVENTORY

| Effect | File | What's stale |
|---|---|---|
| ~~`clippath-slider`~~ | ~~`REMIXER_EFFECT_PROPS.md:172-180`~~ | **Resolved 2026-07-29** - was still labeled "- Suggested props" and missing `clueText`/`cursorBg`/`cursorLineColor`. Table replaced with the real, current prop set (`slides`, `clueText`, `showClue`, `cursorBg`, `cursorLineColor`, `duration`, `clipDirection`, `easing`, `showControls`), heading graduated (no more "- Suggested props" suffix), and a note added distinguishing which props are live in the panel vs. documented-only. |
| ~~`infinite-carousel`~~ | ~~`REMIXER_EFFECT_PROPS.md:182-190`~~ | **Resolved 2026-07-29** - was still labeled "- Suggested props" and omitted `cards`/`draggable`/`showNav`/`mobileBreakpoint`. Table replaced with the real, current 8-prop set (`items` dropped, see `infinite-carousel - FIXED` above), heading graduated, descriptions updated to reflect actual wired behavior (e.g. `speed` as a multiplier, `pauseOnHover` as a momentum-coast pause rather than an autoplay pause). |
| `ring-carousel` | `REMIXER_EFFECT_PROPS.md:192-205` | Lists 10 rows including `items`/`className`/`renderItem`/`...rest`, none of which have any `registry.json` entry - describes an aspirational prop set, not the actual 6 remixer-exposed props. |
| `webgl-slider` | `REMIXER_EFFECT_PROPS.md:207-215` | Still lists the 5 dead props under "Suggested props" (accurately, in that they were never implemented) - but `registry.json` has since promoted them into a real, non-functional `props`/`remixer` array, so the doc and `registry.json` now describe two different broken states. |
| `zoom-slider` | `REMIXER_EFFECT_PROPS.md:217-225` | Still lists `slides`/`zoomScale`/`duration`/`autoplay`/`showControls` under "Suggested props", predating the 1.2.0 change that added the real `title`/`subheading`/`sliderData` props and turned on `remixer.enabled`. |

### UNDOCUMENTED

| Effect | Prop(s) | Detail |
|---|---|---|
| `ring-carousel` | `itemWidth`, `itemHeight`, `radius`, `gap`, `dragSensitivity`, `momentum`, `friction` | Real, meaningful physics/visual knobs (ring size, drag feel, momentum/friction) accepted via the registry component's `...rest` passthrough and consumed by `RingCarouselComp`, but have no `registry.json` prop entry - the remixer system can never expose them. |

### LOW_VALUE

| Effect | Prop | Why |
|---|---|---|
| `clippath-slider` | `easing` | Even if wired, a raw GSAP ease-curve string (`"power3.inOut"`) as free text has no intuitive UX for a normal user; would read better as a `select` of a handful of named curves. Moot for now - its remixer control was removed 2026-07-29 (see `clippath-slider - FIXED` above), so it isn't surfaced as free text in the panel anymore. |

### CONFLICTING_PROPS

**None found in the strict sense** (no two *functioning* props fight over the same rendered output - the dead props above don't conflict with anything because they don't drive any output at all). Worth flagging as a UX-adjacent issue: `zoom-slider`'s `slides` and `sliderData` are two content controls that both claim to feed slide data, but only `sliderData` is wired - a user is likely to edit the dead one first since it's listed right before the real one (see MISMATCH above).

---

## Pending categories

- `components`, `cursor`, `loaders`, `navigation`, `scroll`, `text`, `transitions`, `webgl` - not yet audited.

*(Run `Audit registry/effects/{category} for props-remixer issues` to add the next one.)*

---

## Part 2 - Reduced-motion audit

*(formerly `reduced-motion-audit-report.md`, covers all 150+ effects at the time)*


Audits every effect under `registry/effects/{category}/{effect-name}/` for consistency between:
- **The claim** - what `registry.json`'s changelog says about reduced-motion behavior.
- **The code** - what the `.jsx` actually does when `prefersReducedMotion` is true.
- **The docs mirror** - whether `apps/docs/src/components/{effect-name}/` matches the registry copy's reduced-motion logic.

Status legend: **CONSISTENT** (claim matches code) · **MISMATCH** (claim and code disagree) · **UNDOCUMENTED** (code has reduced-motion logic with no changelog claim) · **MIRROR_OK** / **MIRROR_DRIFT** (docs copy matches / diverges from registry copy).

**Status: complete.** All 11 categories / 150+ effects audited (registry `.jsx` code vs. `registry.json` changelog claims, plus the `apps/docs/src/components/{effect-name}/` mirror).

**Totals:** 109 consistent · 1 mismatch (open) · 5 undocumented (all fixed 2026-07-28) · 5 mirror drifts (all fixed 2026-07-28).

> **Correction:** the initial pass flagged `arrow-fill-button` as a mismatch because the audit agent only searched for JS-level `prefersReducedMotion`/`matchMedia` calls. On manual review (`registry/effects/buttons/arrow-fill-button/index.jsx:151-197`), every animated element carries a `motion-reduce:transition-none` Tailwind class - a pure-CSS implementation of the same media query that the browser applies live, with no JS needed. This fully satisfies the claim ("fill/clip-path/arrow hover transitions are disabled... instead of animating") and works correctly in the demo and on install. Reclassified as CONSISTENT. The agent's check has a blind spot: it doesn't recognize CSS-only (`motion-reduce:`) implementations as valid "code handling," only JS-level checks. Any future rerun should also grep for `motion-reduce:`/`motion-safe:` classes before calling something a mismatch.

---

## Mismatches found

| Effect | Category | Issue |
|---|---|---|
| `pixel-bloom` | cursor | Changelog claims "reduce-motion applied" but the component has **zero** `prefersReducedMotion`/`matchMedia`/`motion-reduce:` handling of any kind (confirmed via direct grep) - pure overclaim. |

## Undocumented reduced-motion handling - ALL FIXED (2026-07-28)

| Effect | Category | Was | Fix applied |
|---|---|---|---|
| `scramble-link-button` | buttons | No changelog entry at all, but code already had a real `matchMedia` check skipping the scramble animation. | Added changelog entry (v1.0.1) documenting the existing behavior. No code change needed. |
| `webgl-slider` | carousels | Changelog only claimed "scroll-snap animations are skipped/shortened," undersell­ing the actual scope (also disables hover-bend, zeroes GPU fold/curl, widens spacing). | Added a v1.1.1 changelog entry correcting the scope. No code change needed. |
| `animated-faq` | components | Code zeroes the GSAP accordion tween duration under reduced motion, no changelog entry mentioned motion/reduce at all. | Added changelog entry (v1.1.1). No code change needed. |
| `text-fill-animation` | text | No changelog field at all; code already skipped the scroll-scrubbed stagger fill under reduced motion. | Added changelog entry (v1.0.1). No code change needed. |
| `svg-pixel-reveal` | scroll | Registry source had **zero** reduced-motion code; only its docs mirror had a "this effect can't be reduced" notice. | Ported the mirror's `usePrefersReducedMotion` hook + notice into the registry `index.jsx` (matching this file's existing inline-style convention, not the mirror's Tailwind classes), and added a changelog entry (v1.1.0). This was a real code fix, not just documentation - the registry source was missing functionality its own mirror already had. |

## Mirror drift (docs copy vs. registry copy) - ALL FIXED (2026-07-28)

| Effect | Category | Was | Fix applied |
|---|---|---|---|
| `dotted-grid` | backgrounds | Registry has an imperative `reduceMotion` flag that freezes the canvas into a static shape under reduced motion. The docs mirror kept only the notice - it had dropped the static-fallback branch entirely. | Ported the local `reduceMotion` variable, its own `matchMedia` change-listener, the static-shape draw-loop branch, and the `handleClick` skip into the mirror's `index.jsx`, matching the registry exactly. **Then, per user request:** removed the "this effect can't be reduced" notice from both copies entirely - now that the effect has a real static-fallback under reduced motion, the notice was inaccurate. Also removed the now-dead `usePrefersReducedMotion` hook infrastructure (registry's local `useSyncExternalStore`-based hook, mirror's `@/lib/motion` import) that existed solely to feed that notice. `registry.json` bumped to v1.1.2. |
| `perspective-text-reveal` | text | Registry replaces the 3D rotateX/perspective stagger with a plain fade-up under reduced motion. The mirror had **no** `prefersReducedMotion` check at all - always ran the full 3D animation. | Ported the `prefersReduced` check and the entire fade-up branch (constants + `gsap.set`/`gsap.to` block) into the mirror. Mirror is now byte-identical to registry for this file. |
| `text-fill-animation` | text | Registry skips the scroll-scrubbed stagger fill under reduced motion. The mirror had zero reduced-motion handling - always ran the scroll-scrubbed animation. | Ported the `prefersReducedMotion` check and the `gsap.set(...show)` / else-branch split into the mirror. |
| `horizontal-feature-reveal` | scroll | Registry hard-skipped all SplitText reveals under reduced motion (early return); the mirror instead ran opacity-fade variants of the same tweens for all four reveals - a genuine design difference, not just missing code. | **User's call: made the mirror's gentle-fade approach canonical.** Removed registry's early return; added the `reducedMotion ? {opacity fade} : {directional version}` ternary to all four `gsap.from(...)` reveal blocks (head, number, title, content) and an explicit `if (reducedMotion) { gsap.set(x:0); return }` for the image parallax, matching the mirror. Added `registry.json` v1.2.0 changelog entry. |
| `svg-pixel-reveal` | scroll | Registry had **zero** reduced-motion code; only the mirror had a "this effect can't be reduced" notice. | Ported the mirror's `usePrefersReducedMotion` hook + notice into the registry `index.jsx` (see UNDOCUMENTED fix above). Both sides now equivalent. |

All edited files (registry + mirror) were syntax-validated (ESLint for files inside `apps/docs`, `acorn-jsx` parse check for registry files outside its lint scope) - zero errors.

## Clean categories (no mismatches, no drift)

- **backgrounds** (3/3) - dither-canvas, dotted-grid (mirror drift fixed above), spider-particles all consistent, all mirrors OK.
- **buttons** (7/7, except scramble-link-button undocumented above) - animated-toggle, arrow-fill-button (CSS-only `motion-reduce:` implementation, see correction note above), char-stagger-button, char-stagger-primary-button, dot-fill-button, link-button all consistent.
- **carousels** (5/5, except webgl-slider undocumented-scope above) - clippath-slider, infinite-carousel, ring-carousel, zoom-slider consistent.
- **cursor** (16/16, except pixel-bloom mismatch above) - all others (butterfly-trail-cursor, character-trail, coffee-bean-cursor, colorful-cursor-aura, cursor-move, fish-eye, full-screen-crosshair, inertia-img, interactive-arrows, liquid-glass-cursor, magnetic-image-trail, noise-ripple-cursor, phantom-image-trail, pixelated-image-effect, rope-cursor) consistent, all mirrors OK.
- **loaders** (3/3) - lines-loader, numeric-tunnel, stack-loader all consistent, all mirrors OK.
- **navigation** (4/4) - directional-menu, elevate-navbar, expanding-navbar, immersive-full-screen-nav all consistent, all mirrors OK.
- **transitions** (6/6) - block-transition, chess-grid-transition, page-flip-transition, pixel-transition, radial-slice-transition, svg-brush-transition all consistent, all mirrors OK.
- **components** (14/14, except animated-faq undocumented above) - animated-form, animated-modal, animated-tabs, border-beam, card-drift, cards-runway, depth-card-stack, gooey-counter, hover-stack, interactive-list-preview, ribbon-drift, testimonial-swiper, video-player all consistent, all mirrors OK.
- **text** (16/16) - blur-text, circle-text-reveal, glitchy-text, mask-text-reveal, number-counter, overflow-stagger-text, overflow-text-reveal, perspective-text-reveal (mirror drift fixed above), rectangular-text-reveal, scramble-text, slide-text-reveal, spotlight-text, text-cloning, text-fill-animation (undocumented + mirror drift fixed above), text-hover, text-stream all consistent, all mirrors OK.
- **scroll** (22/22) - circular-slider, circular-split-roll, draggable-marquee, grid-scale, helix-slider, horizontal-feature-reveal (mirror drift fixed above), infinite-perspective-slider, parallax-footer, parallax-gallery, parallax-image-animation, parallax-slider, rotation-slider, scroll-distortion, scroll-shuffled-cards, scroll-stack, split-canvas, square-translate, stacking-cards, sticky-content-wrapper, svg-path, svg-pixel-reveal (undocumented + mirror drift fixed above), text-convergence all consistent, all mirrors OK.
- **webgl** (19/19) - 3d-portfolio-slider, book-flip, colliding-models, curved-plane, donut-particles, draggable-canvas, file-encryption, fractal-glass, grid-lift, grid-tunnel, hero-banner-animated, hover-slider, hyperiux-glitter, infinite-grid-gallery, interactive-blur-reveal, milky-way, mouse-pixelation, progressive-bloom-valley, strip-slider all consistent, all mirrors OK. Cleanest category in the whole audit - no issues of any kind.
