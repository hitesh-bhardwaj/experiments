// Shared OG/Twitter card image for the whole Templates section (the
// /templates listing and every /templates/[slug] detail page) - used
// instead of a per-template screenshot so a shared link always previews
// with the same branded "Templates" card.
export const TEMPLATES_OG_IMAGE =
  "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/templates-og.jpg";

// Design-only mock data for the Templates listing/detail pages - no
// Sanity/registry backing yet, see md/sections-templates-plan.md. Each of
// these three is a real, fully-built template already live at
// /template-demo/<slug>; tags/tier/dates are still placeholder. viewCount is
// real (see lib/template-views.js), merged onto these at request time by
// /templates/page.js and /templates/[slug]/page.js - not stored here.
export const TEMPLATES = [
  {
    slug: "elenavoss",
    title: "Elena Voss",
    category: "Portfolio",
    tier: "pro",
    pricing: { standaloneOneTime: 39, includedInAnnualPro: true },
    tags: ["GSAP", "Scroll"],
    screenshots: ["/assets/templates/templates-listing/elenavoss.png"],
    href: "/templates/elenavoss",
    previewHref: "/template-demo/elenavoss",
    publishedAt: "2026-06-04",
    updatedAt: "2026-08-17",
    tagline:
      "A refined portfolio template crafted for creatives who let their work speak - minimal layout, bold typography, and a seamless flow designed to leave a lasting impression.",
    overview: [
      "Elena Voss is a single-page portfolio built for creative web designers who want their work to carry the page. Hero, portfolio, services, awards, testimonials, and FAQ sections are all included, laid out around a clean grid with generous whitespace.",
      "Every section transition and reveal is driven by GSAP scroll animation, so the page feels considered without leaning on heavy motion. Swap in your own work, copy, and client list and it's ready to ship.",
    ],
  },
  {
    slug: "oris-dental",
    title: "Oris Dental",
    category: "Healthcare",
    tier: "pro",
    pricing: { standaloneOneTime: 49, includedInAnnualPro: true },
    tags: ["3D", "WebGL"],
    screenshots: ["/assets/templates/templates-listing/orisdental.png"],
    href: "/templates/oris-dental",
    previewHref: "/template-demo/oris-dental",
    publishedAt: "2026-05-12",
    updatedAt: "2026-08-10",
    tagline:
      "A modern dental clinic template built around an interactive 3D teeth visualizer, with treatment showcases, patient reviews, and online appointment booking.",
    overview: [
      "Oris Dental is a full clinic site - about, treatments, patient reviews, and a booking flow - anchored by a real-time 3D tooth model rendered with react-three-fiber that patients can rotate and inspect.",
      "Smooth scroll and parallax section breaks carry the page along without slowing it down, and the booking form is wired up and ready for a real backend.",
    ],
  },
  {
    slug: "lumera",
    title: "Lumera",
    category: "Real Estate",
    tier: "pro",
    pricing: { standaloneOneTime: 39, includedInAnnualPro: true },
    tags: ["GSAP", "Smooth Scroll"],
    screenshots: ["/assets/templates/templates-listing/lumera.png"],
    href: "/templates/lumera",
    previewHref: "/template-demo/lumera",
    publishedAt: "2026-04-28",
    updatedAt: "2026-08-02",
    tagline:
      "A luxury real estate template for Dubai property launches - residences, amenities, gallery, nearby highlights, and enquiry flows.",
    overview: [
      "Lumera is a single-page property launch site: a cinematic hero, residence highlights, amenities, a project gallery, and an ROI/investment section, all built for a single flagship development.",
      "GSAP-driven smooth scroll and reveal animations run throughout, with an enquiry flow ready to connect to a real lead form.",
    ],
  },
  {
    slug: "kyntra",
    title: "Kyntra",
    category: "App",
    tier: "pro",
    pricing: { standaloneOneTime: 39, includedInAnnualPro: true },
    tags: ["GSAP", "Lenis"],
    screenshots: ["/assets/templates/templates-listing/kyntra.png"],
    href: "/templates/kyntra",
    previewHref: "/template-demo/kyntra",
    publishedAt: "2026-09-09",
    updatedAt: "2026-09-09",
    tagline:
      "A single-page app landing template for home maintenance and service booking, with animated app mockups and a full onboarding walkthrough.",
    overview: [
      "Kyntra is a smart-home service-booking app landing page: hero with an animated device mockup, appliance records and warranty tracking, a step-by-step \"how it works\" walkthrough, trusted-professional credibility section, testimonials, and an article listing.",
      "Every section transition runs on GSAP scroll animation with Lenis smooth scroll underneath, and the footer ships with a working enquiry form and an app-download modal ready to wire up to a real backend.",
    ],
  },
];

export function getTemplateBySlug(slug) {
  return TEMPLATES.find((template) => template.slug === slug) || null;
}

export function getRelatedTemplates(slug, limit = 2) {
  return TEMPLATES.filter((template) => template.slug !== slug).slice(0, limit);
}
