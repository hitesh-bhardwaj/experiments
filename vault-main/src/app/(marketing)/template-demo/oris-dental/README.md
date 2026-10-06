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

## Folder structure

```
oris-dental/
├── page.tsx                    # Composes every section, in order
├── Header.tsx                   # Fixed nav, scroll-aware hide/show
├── Hero.tsx                     # 3D interactive tooth visualizer & intro copy
├── AboutOris.tsx                # Practice overview + 4-column animated slot counters
├── DentalTreatments.tsx         # Scroll-pinned stacked card deck of treatments
├── WhyOris.tsx                  # Why choose us feature card with animated metrics
├── ParallaxSectionBreak.tsx     # Full-bleed parallax statement break
├── Reviews.tsx                  # Ribbon review strips + section break
├── PassionMeetPurpose.tsx       # Grid gallery showcasing clinic & doctors
├── BookAppointment.tsx          # Appointment booking card + contact form
├── Footer.tsx                   # Interactive dot canvas footer with brand wordmark
├── Loader.tsx                   # Watermark fill progress loading screen
├── OrisWrapper.tsx              # Lenis smooth scroll root wrapper
├── oris-dental.css              # Custom font faces and scoped typographic tokens
├── README.md                    # Template overview and usage guide
├── assets/                      # Self-contained template assets
│   ├── teeth.glb                # 3D tooth implant model
│   ├── OrisDental.svg           # Brand logo watermark
│   ├── animated-form-bg.png     # Form section background image
│   ├── hc1.png - hc4.png        # Clinic & doctors gallery images
│   ├── oris-whyus.png           # Why Choose Us banner image
│   ├── parallax.png             # Parallax full-bleed background
│   ├── fonts/                   # Self-hosted AeonikPro font files (woff2)
│   │   ├── AeonikPro-Light.woff2
│   │   ├── AeonikPro-Regular.woff2
│   │   ├── AeonikPro-Medium.woff2
│   │   └── AeonikPro-Bold.woff2
│   └── reviews/                 # Review ribbon cards (1.png - 9.png)
└── effects/                     # Extracted self-contained effects
    ├── dot-fill-button/
    │   └── DotFillButton.tsx
    ├── teeth-3d/
    │   ├── TeethCanvas.tsx
    │   ├── TeethParticleNet.tsx
    │   ├── DotsCanvas.tsx
    │   └── MouseTilt.tsx
    ├── slot-counter/
    │   └── SlotCounter.tsx
    ├── text-fill/
    │   └── TextFill.tsx
    ├── split-text-lines/
    │   └── SplitTextLines.tsx
    ├── patient-card/
    │   └── PatientCard.tsx
    └── contact-form/
        └── ContactForm.tsx
```

## Running it locally

This template lives inside the Hyperiux monorepo, at `vault-main/src/app/(marketing)/templates/oris-dental/`.

```bash
cd vault-main
npm install
npm run dev
```

Then open **http://localhost:3000/templates/oris-dental**.

## Customizing

- **Copy** - every section's text lives as plain data at the top of its file: `STATS` in `AboutOris.tsx`, `TREATMENTS_DATA` in `DentalTreatments.tsx`, `WHY_STATS` in `WhyOris.tsx`, and so on. Edit those directly.
- **3D Model** - swap the 3D model under `assets/teeth.glb` and adjust lights/materials in `effects/teeth-3d/TeethCanvas.tsx`.
- **Colors** - Primary blue (`#3365e2`) and secondary navy (`#13314a`) are configured in `oris-dental.css` and can be adjusted across the template.
- **Contact Form** - Update the `handleSubmit` handler in `effects/contact-form/ContactForm.tsx` to connect to your backend or CRM API.
