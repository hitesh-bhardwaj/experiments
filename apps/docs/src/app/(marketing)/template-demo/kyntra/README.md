# Kyntra

A single-page app landing template for home maintenance and service booking, built with Next.js, Tailwind CSS, and GSAP scroll animations. Built using [Hyperiux Vault](https://vault.hyperiux.com).

## What's included

- **Header** - animated navigation with a mobile menu
- **Hero** - full-screen intro with app mockup and entrance animation
- **About** - brand/positioning section
- **Section break** - scroll-driven transition between sections
- **Features** - appliance records, warranties, and repair history highlights
- **Smarter** - supporting feature breakdown
- **How Kyntra works** - step-by-step onboarding walkthrough
- **Trust** - trusted professionals / credibility section
- **Testimonial** - customer testimonial carousel
- **Blogs** - article listing
- **FAQ** - animated accordion
- **CTA** - app download call to action
- **Parallax footer** - animated footer with contact form
- **Modals** - enquiry form and app download flows

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
- **Images** - replace the files in `assets/` with your own, keeping the same filenames, or update the `import` paths in the component that uses them.
- **Colors & fonts** - the `--kyntra-primary` color token and the `@font-face` declarations for Helvetica Neue and Aeonik Pro live in `kyntra-styles.css`; the font files are in `assets/fonts/`.
- **SEO / social preview** - the page title, meta description, and Open Graph/Twitter image are set in `page.tsx` (`export const metadata`); the social preview image is `assets/kyntra-og.jpg`.
- **Contact form** - the enquiry form fields, validation schema, and submit behavior are in `components/effects/animated-form/`.
- **Section order** - sections are composed in `page.tsx`; reorder or remove them there.

## Effects

Reusable animation components live in `components/effects/`:

- **animated-faq** - accordion with height and opacity transitions
- **animated-form** - validated contact form with animated fields
- **char-stagger-button** / **char-stagger-primary-button** - per-character label animation on hover
- **number-counter** - count-up animation on scroll
- **parallax-footer** - footer that reveals on scroll
- **parallax-image-animation** - scroll-linked image movement
- **scroll-stack** - stacked cards driven by scroll
- **text-fill-animation** - scroll-driven headline fill reveal

## Smooth scrolling

`LenisSmoothScroll.tsx` mounts [Lenis](https://lenis.darkroom.engineering/) for smooth scrolling, and `ScrollTopOnLoad.tsx` resets scroll position on load. Scrollable areas inside modals opt out with the `data-lenis-prevent` attribute.

## Reduced motion

Animated sections respect `prefers-reduced-motion` via the helpers in `components/Animations/reducedMotion.tsx` - visitors with that OS/browser setting enabled get a static, fully browsable page instead of scroll/loop animations.

## License

This template is licensed for use per your Hyperiux purchase agreement. See [vault.hyperiux.com](https://vault.hyperiux.com) for full license terms. Do not redistribute or resell the source files outside of your licensed usage.
