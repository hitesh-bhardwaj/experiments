# Lumera Heights

A single-page luxury real estate template for Dubai property launches, built with Next.js, Tailwind CSS, and GSAP scroll animations. Built using [Hyperiux Vault](https://vault.hyperiux.com).

## What's in this download

```
lumera/
├── Code/          # this Next.js project - see "Getting started" below
├── Figma File/    # the source .fig design file
└── LICENSE.md     # your license terms
```

## What's included

- **Header** - animated navigation with a mobile menu
- **Hero** - full-screen intro with entrance animation
- **About** - brand/positioning section
- **Text fill animation** - scroll-driven headline reveal
- **Horizontal feature reveal** - pinned horizontal scroll section
- **Service** - service/offering highlights
- **Works** - portfolio/project listing
- **Project** - project detail with an infinite carousel
- **Showcase** - background video showcase
- **Gallery** - interactive feature gallery with image hover preview
- **Bringing** - supporting video section
- **Project hover** - hover-triggered image preview
- **FAQ** - animated accordion
- **Highlights** - nearby highlights/amenities
- **ROI** - investment/return details
- **CTA** - contact/enquiry call to action
- **Parallax footer** - animated footer with contact form

## Folder structure

Inside `Code/`:

```
app/
├── page.tsx                    # Composes every section, in order
├── Header.tsx                   # Animated nav with a mobile menu
├── Hero.tsx                     # Full-screen intro with entrance animation
├── About.tsx                    # Brand/positioning section
├── Service.tsx                  # Service/offering highlights
├── Works.tsx                    # Portfolio/project listing
├── Project.tsx                  # Project detail with an infinite carousel
├── ProjectHover.tsx             # Hover-triggered image preview
├── ShowCase.tsx                 # Background video showcase
├── Gallery.tsx                  # Interactive feature gallery
├── Bringing.tsx                 # Supporting video section
├── Highlights.tsx                # Nearby highlights/amenities
├── Roi.tsx                       # Investment/return details
├── CTA.tsx                       # Contact/enquiry call to action
├── EnquiryModal.tsx              # Enquiry modal + form
├── Loader.tsx                    # Entry loading screen
├── LenisSmoothScroll.tsx         # Lenis provider
├── ScrollTopOnLoad.tsx           # Resets scroll position on load
├── reducedMotion.ts              # Shared `usePrefersReducedMotion` hook
├── gsapAnimations.tsx            # Shared GSAP animation helpers
├── lumera-styles.css             # Color tokens and custom styles
├── fonts.css                     # Self-hosted @font-face declarations
├── smooth-carousel/              # Custom drag/inertia carousel engine
├── assets/                       # Images, video, icons, self-hosted fonts
│   ├── fonts/
│   └── icons/
└── effects/                      # Self-contained effect components
    ├── animated-form/             # The enquiry form + its inputs
    ├── animated-faq/              # The FAQ accordion primitives
    ├── char-stagger-button/
    ├── draggable-marquee/
    ├── horizontal-feature-reveal/
    ├── mask-text-reveal/
    ├── number-counter/
    ├── parallax-footer/
    └── parallax-image-animation/
```

## Requirements

- Node.js 18.18+ (LTS recommended)
- npm, pnpm, or yarn

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the dev server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view the template.

4. Build for production:

   ```bash
   npm run build
   npm start
   ```

## Customizing content

- **Copy** - edit the text directly inside each section component (e.g. `Hero.tsx`, `About.tsx`, `CTA.tsx`).
- **Images & video** - replace the files in `assets/` with your own, keeping the same filenames, or update the `import` paths in the component that uses them.
- **Colors & fonts** - the template's color tokens and custom styles live in `lumera-styles.css`; `@font-face` declarations are in `fonts.css`.
- **SEO / social preview** - the page title, meta description, and Open Graph/Twitter image are set in the template's `page.tsx` (`export const metadata`); the social preview image is `assets/og.png`.
- **Contact form** - the enquiry form fields and submit behavior are in `effects/animated-form/`.

## Reduced motion

Animated sections respect `prefers-reduced-motion` via the shared `usePrefersReducedMotion` hook in `reducedMotion.ts` - visitors with that OS/browser setting enabled get a static, fully browsable page instead of scroll/loop animations.

## License

This template is licensed for use per your Hyperiux purchase agreement - see [`LICENSE.md`](../LICENSE.md) or [vault.hyperiux.com](https://vault.hyperiux.com) for full license terms. Do not redistribute or resell the source files outside of your licensed usage.
