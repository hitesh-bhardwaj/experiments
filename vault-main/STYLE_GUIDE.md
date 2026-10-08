# Vault style guide

Rules for the Vault site's own pages and their sections. Follow them when writing new UI and when touching existing UI.

## Scope

These rules apply to the site's own pages and the sections, layout and UI that make them up: homepage, docs, pricing, community, blog, effects listing, header, footer and so on.

They do **not** apply to:

- the effect components shipped through the Vault (the code users copy or install)
- templates, including `src/app/(marketing)/template-demo/`
- demos, including `src/app/(marketing)/demo/`

Leave those working as they are. Don't restyle or refactor them to match this guide.

## Units and sizing

- `vw` is the default unit for text sizes, gaps and spacing. Use `vw`, `%` or `vh`/`svh` for everything else.
- Use `clamp()` and `calc()` to keep `vw` sizes in bounds when a layout needs it (a minimum on small screens, a maximum on large ones), for example `text-[clamp(2.2rem,4.6vw,4.6rem)]`.
- `px` is allowed only on content-only pages, where readable fixed sizes matter: blog, docs, and legal/policy pages. Everywhere else, don't size with px or hand-written rem (`mt-[2rem]`).
- Tailwind's default spacing classes (`pt-7`, `gap-3`, `p-4`, `mt-10`) are allowed.
- Set smaller screens with overrides, also in `vw` (for example `text-[4.6vw] max-lg:text-[6vw] max-md:text-[9vw]`). Plain desktop `vw` text gets too small on phones without them.
- Inside a `max-w-[1536px]` section, write sizes with `--cvw` instead of `vw`: `text-[calc(var(--cvw)*6.4)]`, not `text-[6.4vw]` (same for padding, gaps and widths). `--cvw` is `1vw` up to 1536px and then stops growing, so the content scales with its container. Plain `vw` keeps growing after the container stops, which makes text wrap and squeeze on 1800px+ screens. Below 1536px both are identical, so tablet/mobile overrides can use either. The homepage sections (`homepage-v3/sections`) already use it.
- Shared components that also render outside the 1536px container (`Button`, used by the header) size with `calc(var(--hx-vw,1vw)*N)`: plain `vw` by default, capped where a parent sets `[--hx-vw:var(--cvw)]` (the homepage sections wrapper in `Homepage.jsx` does).

## Responsive breakpoints

- Use Tailwind's breakpoints, desktop first:
  - desktop: unprefixed classes (1025px and wider)
  - tablet: `max-lg:` (below 1025px, so 1024px iPads stay on tablet)
  - mobile: `max-md:` (below 768px)
  - small mobile: `max-sm:` (below 640px), only when mobile needs a further tweak
- `lg` is set to 1025px in `globals.css` (`--breakpoint-lg`), so `max-lg:` matches the old `max-[1025px]:` exactly. When editing existing code, replace `max-[1025px]:` with `max-lg:`; don't add new arbitrary `max-[…]` breakpoints.
- Write desktop styles first, then the `max-lg:`, `max-md:` and `max-sm:` overrides. Avoid min-width prefixes (`sm:`, `md:`, `lg:`).
- In JS (`matchMedia`, resize checks), import the widths from `@/lib/breakpoints` instead of writing numbers: `MEDIA.tablet` / `MEDIA.mobile` / `MEDIA.smallMobile` for queries (`window.matchMedia(MEDIA.tablet)`), `BREAKPOINTS.lg` / `.md` / `.sm` for width checks (`window.innerWidth < BREAKPOINTS.lg`). They match `max-lg:` / `max-md:` / `max-sm:` exactly. If a breakpoint ever changes, change it in both `globals.css` (`--breakpoint-*`) and `breakpoints.js`.
- No more than one decimal place in any value: `0.1em`, not `0.14em`; `1.6`, not `1.65`.

## Layout

- New layouts use flexbox, not CSS grid. Existing grid layouts can stay as they are; don't rewrite them just to switch to flex.
- Use plain flex utilities (`flex`, `flex-col`, `w-[30%]`, `gap-[2vw]`). No complex shorthand like `flex-[0.7_1_0%]`.
- Every section's content wrapper has `mx-auto w-full max-w-[1536px]` (the `site-container` utility) so the site holds together on large screens. Do not remove it.
- Every section has an `id`, for anchor links and scroll targeting.
- Every section's left and right gutter is the `section-x` utility (`cvw×4.5`, then `6vw` on tablet and `7vw` on mobile), so all sections line up. Vertical section padding is `section-y`.
- Every pricing and homepage section has `py-[7%]`. Hero sections keep their own vertical padding.
- No child may break out of the section's gutter or max width. Size children with `w-full` or `%`, not screen-based widths like `w-[85vw]`.

## Spacing

- Avoid `pt-*`, `pb-*`, `pl-*`, `pr-*` unless really needed. Use `px-*` / `py-*`.
- Avoid margins (`m-*`, `mt-*`, `mb-*`, `mx-*`, `my-*`) in general. Prefer `gap-*` on a flex container, or `space-y-*` / `space-x-*` on the parent (`flex gap-3`, `space-y-2`).

## Typography

- Never make text bold (`font-bold`, `font-semibold`, `font-medium`, numeric weights above 400) without asking first.
- Use the shared type scale (defined once in `globals.css`). Each class sets font, size, line height and tracking for desktop, tablet and mobile, and stops growing at the 1536px container:

  | Class | Use | Desktop | `max-lg` | `max-md` |
  |---|---|---|---|---|
  | `type-display` | hero headline | `cvw×6.4` | `8.5vw` | `13vw`, max 65px |
  | `type-h1` | section headings | `cvw×4.6` | `6vw` | `9vw`, max 46px |
  | `type-h2` | sub-headings, large card titles | `cvw×2.6` | `4vw` | `6.5vw`, max 31px |
  | `type-h3` | card titles, FAQ questions | `cvw×1.6` | `2.6vw` | `5vw`, max 20px |
  | `type-body-lg` | intro paragraphs | `cvw×1.1` | `2.2vw` | `clamp(15px, 4.1vw, 17px)` |
  | `type-body` | body copy | `clamp(15px, cvw×1.05, 17px)` | same | same |
  | `type-small` | meta text, card body | `clamp(13px, cvw×0.9, 15px)` | same | same |
  | `type-label` | eyebrows, field labels (uppercase, medium, 0.14em) | `clamp(11px, cvw×0.72, 12px)` | same | same |

- Phone sizes stop at the tablet size (the `max-md` maximums above), so 640–767px screens such as an iPad mini in portrait don't get oversized text, and nothing jumps at 768px.
- Pick the class by role, not by matching a pixel size. Don't write new one-off `text-[…]` sizes or new size constants (`T16`, `LABEL`). If a design really needs a one-off tweak, add a utility next to the scale class (`type-h2 max-md:text-[7vw]`): it overrides the scale without `!`.
- The old `.text18`…`.text140` / `.t96` classes still work but are being replaced by the scale. Don't use them in new code.
- To change a size site-wide, edit its `@utility type-*` block at the end of `globals.css` (desktop size first, then the `@variant max-lg` / `@variant max-md` sizes). Every element using that class updates. Don't fork a class for one section; override it in place with a utility instead.
- Fonts:
  - headings and display text: `font-aeonik`
  - body text: `font-avenir`
  - code: IBM Plex Mono, via `font-code` (or `font-mono`, which points to the same font)

## Shape

- No rounded corners anywhere: cards, sections, buttons, inputs, images, tags, pills. Everything is square-edged. Don't use `rounded-*` (`rounded-md`, `rounded-lg`, `rounded-[…]` and so on), and remove it when you touch existing code.
- The one exception is a true circle, an element meant to be round (an avatar, a cursor dot, a toggle knob, a slider thumb, a spinner): `rounded-full` is fine there.
- When using a backdrop blur, use `backdrop-blur-lg`.

## Colour

- Use the colour tokens in `src/app/globals.css` with opacity modifiers (`bg-primary/10`, `text-foreground/60`): `primary`, `primary-hover`, `background`, `foreground`, `secondary`, `dark-card`, `grey`, `light-grey`, `border`, `muted`, `light` (#F4F4F4, light-section background) and `ink` (#1D1D1D, text on light sections).
- Do not hard-code hex or rgba values.
- For dim or secondary text and similar soft colours, use `black/20` on light surfaces and `white/20` on dark ones, so these shades stay uniform across the site. Never use one-off greys like `#C9C9C9`.
  - Tailwind: `text-black/20`, `text-white/20`, or the `black-20` / `white-20` tokens (`text-black-20`, `border-white-20`).
  - CSS and JS: `var(--black-20)` / `var(--white-20)`.
- Greys on light sections: dim or inactive text `black/20`, hover `black/40`, body copy `black/60`.
- In JS (GSAP, canvas), read colours from the CSS variable (`getComputedStyle(document.documentElement).getPropertyValue("--primary")`). Never write the hex.
- Remove colour variables from `globals.css` once nothing uses them.

## Animation

- Headings (h1–h3) use `LineReveal` (`@/components/Animations/LineReveal`), as on the homepage.
- Paragraphs, cards and buttons use the `fadeup` class, with `useFadeUp(rootRef)` called in the section. Stagger them with `data-fadeup-delay`.
- Respect reduced motion. Skip or simplify animations when `prefersReducedMotion()` is true.

## Sound

- No sound when particles react to the mouse, on any page. The community crowd's sparkle jingle was removed for this reason; don't add it back elsewhere.
- Clickable buttons and tags play only the homepage click sound.
- No hover sounds anywhere except the footer.
- The swish sound that follows cursor movement plays only on dark sections. Every white or light section turns it off with `data-sound-flow="off"` on its root element. Use `data-sound-flow="on"` to turn it back on for a dark area nested inside a light section, such as a dark card.

## Scrolling

- Every page mounts Lenis smooth scroll (`LenisSmoothScroll` from `@/components/SmoothScroll/LenisScroll`).
- In-page links (`href="#id"`) scroll smoothly to their target through Lenis. Never jump.
- Scrollable areas (code blocks, panels) must not trap the wheel. Use Lenis `allowNestedScroll` instead of `data-lenis-prevent` or a nested Lenis instance, so the page keeps scrolling once the area reaches its end.

## Styling approach

- Style with Tailwind classes in the component.
- Don't create new stylesheet files, and don't add classes to `globals.css`, unless Tailwind truly can't do it (for example third-party markup or complex keyframes).

## Detail pages (blog.css)

- Detail pages get their content styling from `src/styles/blog.css` (the `.blog-content` classes):
  - blog posts
  - effect detail
  - docs
  - template detail
- No overrides on that content:
  - don't add Tailwind classes that restyle it
  - don't add `!` overrides
  - don't add one-off CSS for it
- To change how content looks, change `blog.css`, so every detail page stays in sync.
- The rest of this guide still applies to the page around the content: hero, header, sidebars, TOC and page footer. It doesn't apply to the content itself.

## Data

- Keep a section's copy and data inside the section or page that renders it. No separate `*-data.js` files.
- If two components share data, the main component exports it and the other imports it from there.
