# Effects listing audit

I compared the effects listing (`/effects` and `/effects/[category]`) against `STYLE_GUIDE.md` and your saved decisions. The files are `EffectsListing.jsx`, `EffectCard.jsx`, `PreviewDrawer.jsx`, `FilterMenu.jsx` and `CustomAnimationCta.jsx`. I only read code; nothing was changed. This page was brought in line with the guide on 2026-10-08. The small text-size constants (`T11`–`T28`) were approved to stay, so I don't flag those sizes, only how they're shared. The FAQ is the shared, already-configured component. I didn't open the page in a browser, so anything marked "check" needs a visual look.

## Issues that repeat across the page

1. **Plain `vw` inside the 1536px container.** The shared `WRAP` wrapper (`EffectsListing.jsx:105`) uses `px-[4.5vw]`, and every gap and width uses plain `vw`. It should be `cvw`, the same as on Pricing and Community.
2. **Gutter.** `WRAP` uses `max-md:px-[6vw]` with no tablet step, so tablets keep 4.5vw. It should use `section-x` (with your 6vw-or-7vw phone decision still open).
3. **The small text sizes are copied in three files.** `T11`, `T13`, `T14` and `T16` are defined separately in `EffectsListing.jsx:94–101`, `EffectCard.jsx:23–25` and `PreviewDrawer.jsx:25–28`. They've already drifted: `T11` is `max-md:text-[2.9vw]` in two files, while `LABEL` in `EffectCard.jsx:19` uses `2.8vw`. Your rules say a shared value should be defined once and imported.
4. **Hand-sized section headings.**
    - The "Trending this Week" heading (`:606`) sizes text by hand.
    - The upgrade band (`:825`) and the custom-work CTA (`CustomAnimationCta.jsx:31`) both use `text-[4.2vw] max-lg:text-[5.5vw] max-md:text-[9vw]`.
    
    These are section headings, so `type-h1` (or `type-h2`) would fit. Your notes list "Trending this week" as an approved native size; the two CTA headings aren't.
    

## 1. Hero (`EffectsListing.jsx:568–600`)

**Spacing**

- `:568`: `pt-36 pb-20`, `max-lg:pt-32 max-lg:pb-14` and `max-md:pt-28`. Hero sections keep their own padding, so this is fine. Just note it's set in Tailwind's fixed units, while the templates hero uses the same values.
- `:578`: `mt-3` on the `h1`, a negative-margin nudge.

**Layout**

- `:589`: `w-[25vw]` is a screen-based width for the description column. It should be `%`, or `cvw` inside the container.

## 2. Trending this Week (`:602–640`)

**Spacing**

- `:604`: `pb-28 pt-4`, then `max-lg:pb-20 max-lg:pt-16`. The top padding is 4 on desktop but 16 on tablet. **Check:** this looks unintentional.

**Text**

- `:606`: `font-aeonik` is redundant, since `h2` already gets Aeonik from `globals.css`.

## 3. Catalogue sheet: count, filters and grid (`:643–800`)

**Spacing**

- `:646`: `pt-10 pb-4` and `max-md:pt-8`.
- `:657`: `pl-[0.3vw]` plus `mx-1` on the dot (`:658`).
- `:700`: `pt-6 pb-24` and `max-md:pb-16`.
- `:645`: stray whitespace.

**Text**

- `:651`: `font-medium` on the count number. It's a bold number, so confirm it's approved (your notes approved bold labels, not numbers).

**Layout**

- `:650`, `:659` and `:750`: fixed-width slots in screen units: `w-[6vw]` / `max-lg:w-[14vw]` / `max-md:w-[32vw]`, `w-[14vw]` / `max-md:w-[48vw]`, and `w-[10vw]` / `max-md:w-[34vw]`. They're deliberate (so the rolling text doesn't shift things), but they're `vw` and not `cvw`.

**Colours**

- `:871`: `SlidingSegment` uses `bg-white`. On a light section that should be `bg-foreground` or the `light` token.
- `:715`: `text-black/50` on the category counts is a one-off grey. The guide's scale is 20, 40 and 60.

**Code quality**

- `:871`: a double space inside the `className`.
- `:876`: the inline style `calc(… + 2px)` is a px value, which is fine here.

## 4. "Show More Effects" (`:752–770`)

- `:754`: the "Showing X of Y" text has no `type-*` class, so it inherits whatever the page's default size is. Give it `type-small`.
- `:757`: `w-55` on the progress bar is Tailwind's default spacing scale, which is allowed. Fine.
- `:762`: the "Show More" button has no `type-*` class, so its text size isn't set. It also doesn't use the site `Button`.

## 5. Upgrade band ("Everything in the Vault. One Plan.", `:820–842`)

**Text**

- `:825`: a hand-written heading size with no `type-*` class.

**Spacing**

- `:822`: `pb-24` and `max-md:pb-16`.
- `:823`: `px-10 py-12`, `max-lg:p-10` and `max-md:p-7`.
- `:836`: `mt-5` on the button group, a margin.

**Colours**

- `:833`: `text-light/80` on the dark band. Your rule for light grey on dark is `text-foreground/80`.

**Code quality**

- `:833`: a double space in the `className`.
- `:826–830`: a `<br/>` inside the heading forces the line break. It may break oddly on narrow screens.

## 6. FAQ and custom work CTA (`:845–850`, `CustomAnimationCta.jsx`)

**Spacing**

- `:845`: `pb-[5vw]` and `max-lg:pb-14`.
- `CustomAnimationCta.jsx:28`: its own `px-[2.8vw] py-[3.3vw]`, `max-lg:px-[3vw]`, `max-md:px-[7vw]`.
- `CustomAnimationCta.jsx:38`: `mt-5` and a `max-md:px-[5vw]!` important override on the button.

**Text**

- `CustomAnimationCta.jsx:31`: a hand-written heading size, the same as the upgrade band.

**Colours**

- `CustomAnimationCta.jsx:32`: `text-light/80` on dark should be `text-foreground/80`.

**Code quality**

- `CustomAnimationCta.jsx:31`: a trailing space in the `className`.

## 7. EffectCard (`EffectCard.jsx`)

**Text**

- `:247`: the card title `h4` uses a hand-written size (`text-[1.25vw] max-md:text-[4vw] max-lg:text-[2.2vw]`), which is `T18` written out again. The breakpoints are also out of order (`max-md` before `max-lg`).

**Code quality**

- `:15`: the comment says "body is Neue Haas … code is Geist Mono". Both are out of date; the fonts are now Avenir and IBM Plex Mono.
- `:83`: `sizes="(max-width: 767px) …, (max-width: 1025px) …"` hard-codes the breakpoints. It's acceptable in a `sizes` string, but it should stay in step with `lib/breakpoints`.

**Colours**

- `:24` and `:139`: hand-written shadows (`shadow-[0_0.1vw_0.4vw_color-mix(…)]` and the hover shadow). These are fine as one-offs, but they're unshared.

## 8. PreviewDrawer (`PreviewDrawer.jsx`)

**Scrolling (against the guide)**

- `:233`: `data-lenis-prevent` on the drawer. The guide says to use Lenis `allowNestedScroll`, not `data-lenis-prevent`. Here the drawer is a modal, so trapping the scroll is arguably correct; the code comment explains this. Your call whether to keep the exception.

**Layout**

- `:236`: the panel is `w-[53vw]`, a screen-based width. It's a fixed overlay, so this is acceptable.

**Spacing**

- `:238`: `pt-7 pb-16`.
- `:324`: `pr-2 pl-4`.
- `:356`: `pt-10`.

**Text**

- `:321`, `:326` and `:351`: a few more hand-written sizes that duplicate `T13`, `T14` and `T16` (`:326` uses `3vw` for phones where `T14` uses `3.6vw`).
- `:302`: `leading-[1.2]` on the Save button.
- `:324`: the Sign In button has four `!` overrides (`py-1.5! text-[0.9vw]! max-lg:text-[1.6vw]! max-md:text-[3.3vw]!`) forcing the site `Button` smaller.

**Colours**

- `:318`: `border-white/20` on dark. Fine, it's the guide's dim shade.

## 9. FilterMenu (`FilterMenu.jsx`)

**Text**

- `:182` (menu items) and `:218` (dark trigger): hand-written sizes (`text-[1vw]` / `max-md:text-[4vw]`, with `max-lg:text-[2.5vw]` only on the trigger). The light version uses `text-sm`, a fixed rem size.

**Spacing**

- `:182`: a double space in the `className`.

**Layout**

- `:24` (comment) and the code: the panel stays 16px inside the screen, a px value. Acceptable for a fixed overlay.

---

**Mechanical fixes:**

- Replace the `WRAP` gutter with `section-x` and `cvw`.
- Move the `T*` and `LABEL` constants into one shared file.
- Swap `text-light/80` for `text-foreground/80`.
- Swap `bg-white` for a token.
- Add `type-small` to the unstyled "Showing…" text and the "Show More" button.
- Fix the outdated font comment.

**Need your decision:**

- The two CTA headings (upgrade band and custom work): use `type-h1`, or keep them at their current size.
- The bold count number.
- Keeping `data-lenis-prevent` on the preview drawer.
- The Sign In button's forced smaller size.