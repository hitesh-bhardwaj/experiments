# Vault style guide

Rules for the Vault site's own pages and their sections. Follow them when writing new UI and when touching existing UI. Every rule says what to use and what not to use. If something isn't covered, ask before inventing a new pattern.

## Scope

These rules, and every change made to follow them, apply **only to the Vault site and its pages**:

- homepage, pricing, community, blog listing and posts
- effects listing and effect detail, templates listing and template detail
- docs, legal pages, dashboard and admin
- the shared site UI they use: header, footer, sidebar, buttons, modals, skeletons

They do **not** apply to, and must never change:

| Area | Where it lives |
|---|---|
| Demos | `src/app/(marketing)/demo/` |
| Template demo sites | `src/app/(marketing)/template-demo/` |
| The registry and the effect components it ships (the code users copy or install) | `registry/` at the repo root, `public/r/`, and the effect folders under `src/components/` that the registry points to (e.g. `src/components/pixel-transition/`) |
| Code shown to users inside code blocks | snippet strings in docs and effect pages (they are content, not page styling) |

Leave those working exactly as they are. Don't restyle, refactor or "fix" them to match this guide.

### Keeping site changes out of demos, registry and templates

- Make site style fixes in the site's own files (`src/homepage/`, `src/app/(app)/`, `src/app/(marketing)/` except `demo/` and `template-demo/`, and the site components in `src/components/`).
- Before editing anything shared (`globals.css`, `blog.css`, `Button`, `LinkButton`, a hook, a token), check whether demos, template demos or registry effects import it. If they do, don't change its existing behaviour: add an opt-in prop, a new utility or a new token for the site instead.
- Don't rename, remove or change the value of a token or utility that a demo, template demo or registry effect uses.
- Don't edit a demo, template demo or registry file to make a site change work. If a site change seems to need that, ask first.

## Format: how styles are written

| Use | Don't use |
|---|---|
| Tailwind classes in the component's `className` | New stylesheet files, new classes in `globals.css` (unless Tailwind truly can't do it: third-party markup, complex keyframes) |
| The design tokens and utilities listed in this guide | Hard-coded values that duplicate a token |
| Desktop classes first, then `max-lg:`, then `max-md:` overrides, in that order | Min-width prefixes (`sm:`, `md:`, `lg:`), or overrides written before the desktop class |
| A plain utility next to a scale class to tweak it (`type-h2 max-md:text-[7vw]`) | `!` overrides (`text-sm!`, `mt-0!`, `w-fit!`) |
| Tailwind classes for transitions and transforms | Inline `style={{…}}` for anything Tailwind can express (keep `style` for values computed in JS) |
| One space between classes | Double spaces, leading or trailing spaces in `className` |
| Values with at most one decimal place: `0.1em`, `1.6` | Two or more decimals: `0.14em`, `1.65`, `0.76vw` |

Shared values (class strings, size constants, data) are defined **once** and imported. Never copy a constant into a second file; if two components need it, the main component exports it and the other imports it.

## Units and sizing

| Context | Use | Don't use |
|---|---|---|
| Text, gaps, padding, widths inside a `site-container` (1536px) section | `calc(var(--cvw)*N)`, e.g. `gap-[calc(var(--cvw)*2)]` | Plain `vw` (`gap-[2vw]`): it keeps growing past 1536px and squeezes the layout on 1800px+ screens |
| Shared components that also render outside the container (`Button`, the header) | `calc(var(--hx-vw,1vw)*N)` | Plain `vw` or `cvw` |
| Tablet / mobile overrides (below 1536px `vw` and `cvw` are equal) | `vw` or `cvw` | `px` or `rem` |
| Bounds on a fluid size | `clamp()` / `min()` with `cvw`: `clamp(15px, calc(var(--cvw)*1.05), 17px)` | Fixed sizes without a fluid part |
| Widths of children | `w-full`, `%`, `flex-1` | Screen-based widths (`w-[25vw]`, `w-[85vw]`, `w-screen`) that break out of the gutter |
| Heights | `aspect-*`, `min-h-svh`, content height | Fixed `vw` heights with `overflow-hidden` on text (text gets clipped) |
| Tailwind's default spacing scale (`gap-3`, `p-4`, `h-11`) | Allowed | |
| `px` | Only on content-only pages (blog, docs, legal), hairlines (`1px`, `2px`) and `clamp()` bounds | `px` for layout, spacing or text anywhere else |
| `rem` | Never | `mt-[2rem]`, `text-[clamp(1.6rem,…)]` |
| `vh` / `svh` / `dvh` | Hero heights and sticky offsets only | Spacing (`pt-[10vh]`) |

**Fixed overlays** (modals, drawers, toasts) may use screen widths (`w-[53vw]`) because they aren't inside a section.

## Layout

| Use | Don't use |
|---|---|
| `site-container` on every section's content wrapper (`mx-auto w-full max-w-[1536px]`) | Hand-written `mx-auto max-w-[1536px]` (and never drop `w-full`) |
| `section-x` for every section's side gutter | Hand-written gutters (`px-[4.5vw] max-md:px-[6vw]`, `px-[calc(var(--cvw)*4.5)]`) |
| `section-y` or `py-[7%]` for a section's vertical padding | One-off values (`py-[15%]`, `py-[18vw]`, `pt-[10vh] pb-[14vh]`) |
| An `id` on every section | Sections without an `id`, or section content outside its `section` |
| Flexbox for new layouts (`flex`, `flex-col`, `w-[30%]`, `gap-[…]`) | New CSS grid (existing grid may stay), shorthand like `flex-[0.7_1_0%]` |

### Layout utilities (`globals.css`)

| Utility | Desktop | `max-lg` | `max-md` |
|---|---|---|---|
| `site-container` | `margin-inline: auto; width: 100%; max-width: 1536px` | same | same |
| `section-x` | `padding-inline: cvw×4.5` | `6vw` | `7vw` |
| `section-y` | `padding-block: cvw×7` | `10vw` | `15vw` |

Hero sections keep their own vertical padding (they sit under the fixed header). Use the same hero top padding as the other page of the same kind: listings `pt-36 max-lg:pt-32 max-md:pt-28`, detail pages `pt-25 max-md:pt-36`.

## Spacing

| Use | Don't use |
|---|---|
| `gap-*` on a flex container, or `space-y-*` / `space-x-*` on the parent | Margins between siblings (`mt-*`, `mb-*`, `ml-*`, `mr-*`, `my-*`) |
| `px-*` / `py-*` | Single-side padding (`pt-*`, `pb-*`, `pl-*`, `pr-*`) unless the design truly needs it |
| `ml-auto` / `mt-auto` to push an item to the end of a flex row or column | Negative margins to nudge things into place (`-mt-3`, `mt-[-60vh]`) |
| One spacing rule per element per breakpoint | Two competing rules (`max-md:p-[7vw] max-md:py-[12%]`, `max-md:pt-[15%] max-md:py-[12%]`) |

## Responsive breakpoints

| Prefix | Screen | JS |
|---|---|---|
| none | desktop, 1025px and wider | |
| `max-lg:` | tablet, below 1025px (1024px iPads stay tablet) | `MEDIA.tablet`, `BREAKPOINTS.lg` |
| `max-md:` | mobile, below 768px | `MEDIA.mobile`, `BREAKPOINTS.md` |

| Use | Don't use |
|---|---|
| `max-lg:` and `max-md:` only | `max-sm:` (demos only, never on site pages), `max-[1025px]:` or any arbitrary `max-[…px]:` |
| `MEDIA` / `BREAKPOINTS` from `@/lib/breakpoints` in JS | Hard-coded queries: `matchMedia("(min-width: 1026px)")`, `"(max-width: 760px)"`, `innerWidth < 768` |
| `MEDIA.tablet` / `MEDIA.mobile` and `BREAKPOINTS.lg` / `.md` in JS | `MEDIA.smallMobile` / `BREAKPOINTS.sm` (demos only) |
| Smaller-or-equal sizes as the screen gets smaller | A phone size larger than its tablet size |

`next/image` `sizes` strings may contain px widths; keep them on the breakpoints above (`767px`, `1024px`).

If a breakpoint ever changes, change it in both `globals.css` (`--breakpoint-*`) and `src/lib/breakpoints.js`.

## Typography

### Type scale (`globals.css`, `@utility type-*`)

Every class sets font, size, line height and letter spacing for all screens, and stops growing at the 1536px container. Values below are the live values in `globals.css`.

| Class | Use for | Font | Desktop | `max-lg` | `max-md` | Line height |
|---|---|---|---|---|---|---|
| `type-display` | hero headline (one per page) | Aeonik | `cvw×6.4` | `8vw` | `min(13vw, 65px)` | 1.05 |
| `type-h1` | section headings | Aeonik | `cvw×4.6` | `5.5vw` | `min(11vw, 46px)` | 1.05 |
| `type-h2` | sub-headings, large card titles, statements | Aeonik | `cvw×2.6` | `3.4vw` | `min(6.5vw, 31px)` | 1.15 |
| `type-h3` | card titles, FAQ questions, list titles | Aeonik | `cvw×1.6` | `2.2vw` | `min(5vw, 20px)` | 1.25 |
| `type-body-lg` | intro paragraphs, card body on large cards | Avenir | `cvw×1.1` | `clamp(15px, 2.5vw, 18px)` | `clamp(15px, 4.1vw, 17px)` | 1.6 |
| `type-body` | body copy | Avenir | `clamp(15px, cvw×1.05, 17px)` | same | same | 1.65 |
| `type-small` | meta text, dates, card body, captions | Avenir | `clamp(13px, cvw×0.9, 15px)` | same | same | 1.5 |
| `type-label` | eyebrows, field labels, tags, buttons-as-text | Avenir, weight 500 | `clamp(15px, cvw×0.92, 16px)` | same | same | 1.4, tracking 0.05em |

### Picking a class

- Pick by **role**, not by matching a pixel size: the hero headline is `type-display`, every section heading is `type-h1`, every card title is `type-h3`.
- Page-level consistency: the same role uses the same class on every page (all detail-page titles, all "Related …" headings, all CTA headings).
- Every visible text element gets a `type-*` class. Don't leave text unstyled to inherit whatever the parent sets.

### Do and don't

| Use | Don't use |
|---|---|
| A `type-*` class | One-off sizes: `text-[3.2vw]`, `text-[calc(var(--cvw)*3.6)]`, `text-[0.8vw] max-md:text-[3vw]` |
| `type-*` alone, or with a plain size override for a real one-off (`type-h2 max-md:text-[7vw]`) | Overriding the scale's line height (`leading-[1.2]`, `leading-[1.3]`, inline `lineHeight`) |
| The scale's built-in font | `font-avenir` on a heading, `font-aeonik` on body text, redundant `font-aeonik` on an `h2` |
| Weight 400 (the scale default); `type-label`'s 500 | `font-bold`, `font-semibold`, `font-medium`, `font-light` without asking first (bold inside article content is `<strong>`, styled by `blog.css`) |
| `font-medium!` only for the approved bold labels and titles | Any other `!` weight |
| | The old classes `.text18`…`.text140`, `.t96` (being removed) |
| | `text-sm`, `text-base` and other Tailwind fixed sizes on site UI |
| | New size constants (`T16`, `LABEL`, `BTN_TEXT`) |

### Listing sizes (approved exception)

The effects and templates listings, their cards, drawers and filter menu use small fixed-ratio sizes (`T11`–`T28`), approved to stay. They must be defined **once** (in `templates/tokens.js`) and imported everywhere they're used. Don't redeclare them in another file, and don't add new ones.

### Fonts

| Role | Class | Font |
|---|---|---|
| headings, display, prices | `font-aeonik` (set by `type-display` … `type-h3`) | Aeonik Pro |
| body, labels, UI text | `font-avenir` (set by `type-body-lg` … `type-label`) | Avenir Next |
| code | `font-code` or `font-mono` | IBM Plex Mono |

Don't reference other fonts (Neue Haas, Geist Mono, system mono stacks) in classes or comments.

### Heading text

- Title Case for section headings (`Explore the Moments Your Website Is Missing.`).
- Highlight words with `gradient-text-animate` (add `gradient-text-single` for a single-colour sweep). Don't hand-write gradients.
- Don't force line breaks with `<br/>` inside headings; control wrapping with width.

## Colour

### Tokens (`globals.css`)

| Token | Value | Use for |
|---|---|---|
| `background` | `#111111` | dark page background; dark text on orange (`bg-primary text-background`) |
| `foreground` | `#ffffff` | text on dark; white cards on light sections |
| `primary` | `#ff5f00` | brand orange: buttons, highlights, active states |
| `primary-hover` | `#ff9253` | hover state of orange elements |
| `dark-card` | `#161616` | cards and panels on dark |
| `grey` | `#272727` | tags, chips, image placeholders on dark |
| `light-grey` | `#939393` | secondary text on dark when opacity can't be used |
| `secondary` | `#d9d9d9` | |
| `muted` | `#d2d2d2` | |
| `border` | `#bcbcbc` | |
| `light` | `#F4F4F4` | light-section background |
| `ink` | `#1D1D1D` | text on light sections; dark panels inside light sections |
| `black-20` / `white-20` | 20% black / white | dim text and hairlines (`var(--black-20)` / `var(--white-20)` in CSS and JS) |

Use them with Tailwind opacity modifiers: `bg-primary/10`, `text-foreground/80`, `border-black/10`.

### Text shades (the only greys)

| Surface | Primary text | Secondary text | Hover | Dim / inactive |
|---|---|---|---|---|
| Dark (`background`, `dark-card`) | `text-foreground` | `text-foreground/80` | `text-foreground` | `text-white/20` |
| Light (`light`, `foreground` cards) | `text-ink` | `text-black/60` | `text-black/40` | `text-black/20` |

- Hero summaries and taglines on dark are `text-foreground/80` on every page.
- Hairlines and borders: `border-foreground/10` on dark, `border-black/10` on light.

### Do and don't

| Use | Don't use |
|---|---|
| Token classes (`bg-primary`, `text-ink`, `bg-light`) | Hex or rgba in classes: `text-[#1D1D1D]`, `bg-[#F4F4F4]`, `bg-[#ff5f00]`, `ring-[rgba(…)]`, `text-[#6B6B6B]` |
| `text-ink` / `bg-light` on light sections | `text-background` as dark text on light sections (`background` is for the dark page and for text on orange) |
| `bg-foreground` for white cards on light sections | `bg-white` |
| `text-foreground/80` for light grey on dark | `text-light/80`, `text-foreground/90`, `/70`, `/60`, `/50`, `/35` and other one-off shades |
| `black/20`, `black/40`, `black/60` on light | `black/50`, `black/30` and other one-off greys |
| `ring-*`, `border-*` with token colours | Hand-written `shadow-[inset_0_0_0_1px_…]` to draw a border |
| `var(--primary)` etc. read in JS (`getComputedStyle(document.documentElement).getPropertyValue("--primary")`) | Hex in JS (`"#ff5f00"`, `"#FF6B00"`, `rgba()` strings built in code) |
| | Any other orange (`#FF6B00`, `#FFB27A`, `#B34A00`): the brand orange is `primary` / `primary-hover` only |

New colours (for example a success green or an error red) are added as tokens in `globals.css` first, then used through the token. Remove a colour variable from `globals.css` once nothing uses it.

## Shape and effects

| Use | Don't use |
|---|---|
| Square corners everywhere | `rounded-*` (`rounded-md`, `rounded-lg`, `rounded-[…]`) and the `--radius-*` variables |
| `rounded-full` only on true circles: avatar, cursor dot, toggle knob, slider thumb, spinner | `rounded-full` on pills, tags or buttons |
| `backdrop-blur-lg` | Other blur sizes |
| Tailwind's `shadow-*` scale, or one shared shadow constant | New one-off `shadow-[…]` values in each component |

## Buttons and links

| Use | Don't use |
|---|---|
| `Button` from `@/homepage/components/Button` for every button-styled link or action | Hand-copying `Button`'s sizes (`text-[calc(var(--hx-vw,1vw)*1.15)]`, `clamp(13px…)`) into another element |
| `buttonClassName()` + `ButtonChrome` when the element must be a native `<button>` (forms) | Restyling `Button` with `!` (`py-1.5!`, `text-black!`, `tracking-normal!`) |
| `LinkButton` for underlined text links | Hand-written underline gradients |
| Links inside article content styled by `blog.css` | `text-[#ff5f00] underline …` on content links |

## Animation

| Use | Don't use |
|---|---|
| `LineReveal` (`@/components/Animations/LineReveal`) on headings h1–h3 | Animating headings another way (the blog's `LineWipe` is the one approved exception) |
| `fadeup` class + `useFadeUp(rootRef)` for paragraphs, cards, buttons; stagger with `data-fadeup-delay` | `useFadeUp()` without a ref (it scans the whole page) |
| `prefersReducedMotion()` from `@/lib/motion` | Reading `matchMedia("(prefers-reduced-motion…)")` directly |
| Skipping or simplifying every scroll-scrubbed timeline under reduced motion | Scroll animations that ignore reduced motion |

## Sound

- No sound when particles react to the mouse, on any page.
- Clickable buttons and tags play only the homepage click sound.
- No hover sounds anywhere except the footer.
- The cursor-movement swish plays only on dark sections. Every light section turns it off with `data-sound-flow="off"` on its root; use `data-sound-flow="on"` for a dark area nested inside a light section. Don't invent other values.

## Scrolling

- Every page mounts `LenisSmoothScroll` (`@/components/SmoothScroll/LenisScroll`).
- In-page links (`href="#id"`) scroll smoothly through Lenis. Never jump.
- Scrollable areas (code blocks, panels) use Lenis `allowNestedScroll`. Don't use `data-lenis-prevent` or a nested Lenis instance, except on full-screen modals and drawers, where the scroll is meant to stay inside.

## Detail pages (blog.css)

These pages take **all** of their content styling from `src/styles/blog.css` (the `.blog-content` classes):

| Page | Content area |
|---|---|
| Docs | every docs page (`/docs/*`) |
| Blog posts | `/blog/[slug]` |
| Effect detail | `/effects/[category]/[effect]`, the article below the stage |
| Legal | terms of service, privacy policy, refund policy, license agreement |
| Template detail | the "What's Inside" copy |

**Follow `blog.css` and never override it.** The content inside `.blog-content` looks exactly how `blog.css` makes it look, on every one of these pages.

| Use | Don't use |
|---|---|
| Plain elements inside `.blog-content` (`<p>`, `<h2>`, `<h3>`, `<strong>`, `<a>`, `<ul>`, `<ol>`, tables, images, code blocks) | Tailwind classes on content that change its look: sizes, weights (`font-semibold`), colours (`text-[#ff5f00]`), spacing (`space-y-5`, `mt-4`), widths |
| Changes made inside `blog.css` when content should look different (they reach every detail page at once) | `!` overrides on content or content wrappers (`mb-[4vw]!`, `w-fit!`, `m-0!`) |
| `blog-theme-light` on a wrapper around `.blog-content` for light areas | Inline overrides of `blog.css` variables (`[--blog-text-secondary:#1d1d1d]`) |
| Content components (`DocsContent`, `Heading2`, `Para`, `List`, `Table`, `Image`) that only output plain markup | Content components that add their own colours, sizes or spacing |
| | One-off CSS for one page's content, or a per-page copy of `blog.css` rules |

- If a page's content needs something `blog.css` doesn't have, add it to `blog.css` (as a class every detail page can use) instead of styling it on the page.
- Legal pages use the effect detail layout: breadcrumb and `type-h1` title on the dark background, the full-width text below on one light area inside `blog-theme-light` + `blog-content`, the fixed TOC on the right. The shell is `src/app/(app)/(workspace)/legal/LegalBody.jsx`; each page's title lives in its `LEGAL_TITLES` map, not repeated in the content.
- The rest of this guide applies only to the page **around** the content: hero, header, sidebars, TOC, CTA blocks, related items and page footer.

## Data

- Keep a section's copy and data inside the section or page that renders it. No separate `*-data.js` files.
- If two components share data, the main component exports it and the other imports it.
- No placeholder text on live pages (`[To confirm: …]`). Hide the item until the copy is final.

## Code hygiene

- Delete unused files, components, constants and commented-out JSX instead of leaving them in place.
- Keep comments accurate: update or remove a comment when the code it describes changes.
- One component per pattern: when two pages need the same UI (preview drawers, related-items sliders), share one component instead of copying it.
