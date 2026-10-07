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

- Never use px, rem or `clamp()` for sizing: font sizes, spacing, gaps, widths, heights or offsets.
- Use `vw` for text sizes and gaps. Use `vw`, `%` or `vh`/`svh` for everything else.
- Tailwind's default spacing classes (`pt-7`, `gap-3`, `p-4`, `mt-10`) are allowed. Never write rem values by hand (`mt-[2rem]`).
- Set smaller screens with overrides, also in `vw` (for example `text-[4.6vw] max-[1025px]:text-[6vw] max-md:text-[9vw]`). Plain desktop `vw` text gets too small on phones without them.

## Responsive breakpoints

- Use exactly two breakpoints:
  - tablet: `max-[1025px]:` (1025px and below)
  - mobile: `max-md:` (below 768px)
- Write desktop styles first, then the tablet override, then the mobile override.
- Don't use `max-sm:`, `max-lg:`, other arbitrary `max-[…]` values, or min-width prefixes (`sm:`, `md:`, `lg:`). When editing existing code, move those to `max-[1025px]:` or `max-md:`.
- No more than one decimal place in any value: `0.1em`, not `0.14em`; `1.6`, not `1.65`.

## Layout

- Use flexbox for layout, not CSS grid. When editing existing code, replace grid with flex wherever you can.
- Use plain flex utilities (`flex`, `flex-col`, `w-[30%]`, `gap-[2vw]`). No complex shorthand like `flex-[0.7_1_0%]`.
- Every section's content wrapper has `mx-auto w-full max-w-[1536px]` so the site holds together on large screens. Do not remove it.
- Every section has an `id`, for anchor links and scroll targeting.
- Every section's left and right gutter is `px-[4.5vw]`, smaller on tablet and mobile via `max-[1025px]:` / `max-md:`, so all sections line up.
- Every pricing and homepage section has `py-[7%]`. Hero sections keep their own vertical padding.
- No child may break out of the section's gutter or max width. Size children with `w-full` or `%`, not screen-based widths like `w-[85vw]`.

## Spacing

- Avoid `pt-*`, `pb-*`, `pl-*`, `pr-*` unless really needed. Use `px-*` / `py-*`.
- Avoid margins (`m-*`, `mt-*`, `mb-*`, `mx-*`, `my-*`) in general. Prefer `gap-*` on a flex container, or `space-y-*` / `space-x-*` on the parent (`flex gap-3`, `space-y-2`).

## Typography

- Never make text bold (`font-bold`, `font-semibold`, `font-medium`, numeric weights above 400) without asking first.
- Write h1, h2, h3 and paragraph sizes as classes directly on each tag. No shared constants file.
- Fonts:
  - headings and display text: `font-aeonik`
  - body text: `font-avenir`
  - code: IBM Plex Mono, via `font-code` (or `font-mono`, which points to the same font)

## Shape

- No rounded corners anywhere: cards, sections, buttons, inputs, images, tags. Everything is square-edged. Don't use `rounded-*`.
- When using a backdrop blur, use `backdrop-blur-lg`.

## Colour

- Use the colour tokens in `src/app/globals.css` with opacity modifiers (`bg-primary/10`, `text-foreground/60`): `primary`, `primary-hover`, `background`, `foreground`, `secondary`, `dark-card`, `grey`, `light-grey`, `border`, `muted`.
- Do not hard-code hex or rgba values.
- For dim or secondary text and similar soft colours, use `black/20` on light surfaces and `white/20` on dark ones, so these shades stay uniform across the site. Never use one-off greys like `#C9C9C9`.
  - Tailwind: `text-black/20`, `text-white/20`, or the `black-20` / `white-20` tokens (`text-black-20`, `border-white-20`).
  - CSS and JS: `var(--black-20)` / `var(--white-20)`.
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

## Data

- Keep a section's copy and data inside the section or page that renders it. No separate `*-data.js` files.
- If two components share data, the main component exports it and the other imports it from there.
