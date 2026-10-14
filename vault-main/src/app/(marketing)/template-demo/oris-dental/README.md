# Oris Dental - Modern Dental Clinic Template

A single-page website template for dental clinics, orthodontists, and cosmetic dental practices. One scrolling page - 3D interactive hero, about us with slot counters, scroll-pinned treatments, why choose us, parallax statement break, floating ribbon review showcase, practice gallery, appointment booking form, and interactive footer - built from [Hyperiux Vault](https://vault.hyperiux.com) effects arranged into a full site.

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript / JSX |
| 3D | Three.js + `@react-three/fiber` + `@react-three/drei` |
| Styling | Tailwind CSS + `oris-dental.css` |
| Animation | GSAP 3 (`ScrollTrigger`, `SplitText`) |
| Smooth scroll | Lenis (`lenis/react`) |

No CMS, no backend - content lives directly in the section files as plain data.

## What's in this download

```
oris-dental/
├── Code/          # this Next.js project - see "Running it locally" below
├── Figma File/    # the source .fig design file
└── LICENSE.md     # your license terms
```

## Folder structure

Inside `Code/`:

```
app/
├── page.tsx                    # Composes every section, in order
├── Header.tsx                  # Fixed nav, scroll-aware hide/show
├── Hero.tsx                    # 3D interactive tooth visualizer & intro copy
├── AboutOris.tsx                # Practice overview + animated slot counters
├── DentalTreatments.tsx         # Scroll-pinned stacked card deck of treatments
├── WhyOris.tsx                  # Why choose us feature card with animated metrics
├── CareComfort.tsx              # Care & comfort feature section
├── ParallaxSectionBreak.tsx     # Full-bleed parallax statement break
├── Reviews.tsx                  # Ribbon review strips + section break
├── PassionMeetPurpose.tsx       # Grid gallery showcasing clinic & doctors
├── BookAppointment.tsx          # Appointment booking card + contact form
├── Footer.tsx                   # Interactive dot canvas footer with brand wordmark
├── Loader.tsx                   # Watermark fill progress loading screen
├── OrisWrapper.tsx              # Lenis smooth scroll root wrapper
├── LenisSmoothScroll.tsx        # Lenis provider
├── ScrollTopOnLoad.tsx          # Resets scroll position on route load
├── oris-dental.css              # Custom font faces and scoped typographic tokens
├── assets/                      # Images, self-hosted fonts, review cards
│   ├── OrisDental.svg           # Brand logo watermark
│   ├── fonts/                   # Self-hosted AeonikPro font files (woff2)
│   └── reviews/                 # Review ribbon cards
├── teeth-3d/                    # 3D tooth visualizer (Three.js + drei)
│   ├── TeethCanvas.tsx
│   ├── ToothShield.tsx
│   ├── DotsCanvas.tsx
│   └── MouseTilt.tsx
└── effects/                     # Extracted self-contained effects
    ├── dot-fill-button/
    ├── circular-button/
    ├── slot-counter/
    ├── text-fill/
    ├── split-text-lines/
    ├── patient-card/
    ├── contact-form/
    └── smooth-carousel/
```

The 3D tooth model itself ships as a static asset at `Code/public/teeth-compressed.glb`
(referenced by URL from `teeth-3d/TeethCanvas.tsx`, not bundled).

## Running it locally

This is a standalone Next.js project - no monorepo, no workspace setup.

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

## Customizing

- **Copy** - every section's text lives as plain data at the top of its file: `STATS` in `AboutOris.tsx`, `TREATMENTS_DATA` in `DentalTreatments.tsx`, `WHY_STATS` in `WhyOris.tsx`, and so on. Edit those directly.
- **3D Model** - swap the 3D model under `assets/teeth.glb` and adjust lights/materials in `effects/teeth-3d/TeethCanvas.tsx`.
- **Colors** - Primary blue (`#3365e2`) and secondary navy (`#13314a`) are configured in `oris-dental.css` and can be adjusted across the template.
- **Contact Form** - Update the `handleSubmit` handler in `effects/contact-form/ContactForm.tsx` to connect to your backend or CRM API.
