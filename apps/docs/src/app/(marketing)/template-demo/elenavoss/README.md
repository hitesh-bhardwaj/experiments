# Elena Voss - Creative Portfolio Template

A single-page portfolio template for a freelance web designer or small
creative studio. One scrolling page - hero, portfolio, services, awards,
client showcase, testimonials, FAQ, contact modal, footer - built from
[Hyperiux Vault](https://vault.hyperiux.com) effects arranged into a full
site.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | GSAP 3 (`ScrollTrigger`, `SplitText`) + `@gsap/react`'s `useGSAP` |
| Smooth scroll | Lenis |
| Icons | lucide-react |
| Form validation | zod |

No CMS, no backend - content lives directly in the section files as plain
data.

## Folder structure

```
elenavoss/
├── page.tsx              # composes every section, in order
├── Header.tsx             # fixed nav, scroll-aware blur + hide/show
├── Hero.tsx                # intro sequence: image → headline → header
├── Portfolio.tsx           # scroll-pinned project list
├── WhyWorkWithMe.tsx
├── Services.tsx            # horizontal scroll on desktop, grid on mobile
├── Awards.tsx               # hover-reveal award list
├── Line.tsx                 # the interactive divider used in Awards
├── SectionBreak.tsx         # "trusted by" logo strip
├── Clients.tsx               # ripple rings + client logos
├── Testimonials.tsx          # quote carousel
├── Faq.tsx                    # accordion
├── Footer.tsx
├── GetInTouchModal.tsx        # contact modal + its React context provider
├── elenavoss.css               # styles that don't fit as Tailwind utilities
│                                 (fonts, marquee keyframes, divider-line mask)
├── effects/                     # self-contained animation components,
│                                 adapted from Hyperiux Vault for this template
│   ├── animated-form/            # the contact form + its inputs
│   ├── animated-modal/           # the modal shell GetInTouchModal uses
│   ├── animated-faq/             # the FAQ accordion primitives
│   ├── overflow-text-reveal/     # the char/line reveal-on-scroll used everywhere
│   └── dot-fill-button/          # the pill button with the animated dot
└── assets/                       # images, icons, self-hosted fonts
```

## Running it locally

This template lives inside the Hyperiux monorepo, at
`apps/docs/src/app/(marketing)/templates/elenavoss/`.

```bash
cd apps/docs
npm install      # once
npm run dev
```

Then open **http://localhost:3000/templates/elenavoss**.

## Customizing

- **Copy** - every section's text lives as a plain array/object at the top
  of its file: `SERVICES` in `Services.tsx`, `FAQ_ITEMS` in `Faq.tsx`,
  `testimonials` in `Testimonials.tsx`, `AWARD_ITEMS` in `Awards.tsx`, and
  so on. Edit those directly.
- **Images** - swap the files under `assets/` and update the matching
  `import` at the top of whichever section uses them.
- **Colors** - the accent gradient (`#F16B0D` → `#E61416`) and the dark
  backgrounds (`#070707` / `#080808`) are set inline via Tailwind
  arbitrary values throughout each section, not as CSS variables - a
  project-wide find/replace is the most reliable way to re-theme.
- **Contact form** - `submitHandler` in `GetInTouchModal.tsx` currently
  logs to the console. Replace it with a real API call before shipping.
- **Responsive breakpoints** - every section uses `max-[1025px]:` for
  tablet and `max-md:` for mobile (Tailwind's default `md`, 768px). Keep
  any new markup consistent with that convention rather than introducing
  Tailwind's other default breakpoints.

## Motion & accessibility

Every animated section checks `prefers-reduced-motion` and falls back to
a static layout - not just "animation off," but a deliberate alternate
composition (e.g. the scroll-pinned logo wall in `SectionBreak.tsx`
becomes a plain static grid; the interactive divider line in `Line.tsx`
renders as a plain straight line).
