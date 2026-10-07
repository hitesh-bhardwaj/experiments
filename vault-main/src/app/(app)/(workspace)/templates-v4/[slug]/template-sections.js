// Detail-page data for the v4 sample, taken from each template's own source in
// src/app/(marketing)/template-demo/<slug>: section names and notes from its
// README, `effect` from the Vault effect that section's component imports,
// and `effects`/`stack` from its effects/ folder and README.
//
// Sections are matched to the layers in public/assets/templates-exploded/
// <slug>/manifest.json by the layer's label (the Figma export's file name, or
// for a stitched capture the section's DOM id or heading):
//   match - the layer label starts with this (case-insensitive)
//   after - for a layer with no id/heading: the first one after this match
// Anything unmatched falls back to a tidied-up version of its label.

export const TEMPLATE_SECTIONS = {
  elenavoss: {
    stack: ["Next.js", "React 19", "Tailwind CSS", "GSAP", "Lenis", "zod"],
    effects: ["overflow-text-reveal", "dot-fill-button", "animated-faq", "animated-form", "animated-modal"],
    sections: [
      { match: "hero", name: "Hero", note: "An intro sequence: the image settles first, then the headline and header rise in.", effect: "overflow-text-reveal" },
      { match: "portfolio", name: "Portfolio", note: "A scroll-pinned project list that steps through the work.", effect: "overflow-text-reveal" },
      { match: "work-with-me", name: "Why work with me", note: "Positioning copy revealed line by line.", effect: "overflow-text-reveal" },
      { match: "services", name: "Services", note: "Horizontal scroll on desktop, a plain grid on mobile.", effect: "overflow-text-reveal" },
      { match: "awards", name: "Awards", note: "A hover-reveal award list with an interactive divider.", effect: "overflow-text-reveal" },
      { match: "clientblur", name: "Clients", note: "Ripple rings around the client logos." },
      { match: "testimonials", name: "Testimonials", note: "A quote carousel.", effect: "overflow-text-reveal" },
      { match: "frequently", name: "FAQ", note: "Accordion answers that open with a smooth height animation.", effect: "animated-faq" },
      { match: "footer", name: "Footer", note: "Contact links and the pill button with the animated dot.", effect: "dot-fill-button" },
    ],
  },
  "oris-dental": {
    stack: ["Next.js", "React 19", "Three.js", "React Three Fiber", "Tailwind CSS", "GSAP", "Lenis"],
    effects: ["split-text-lines", "slot-counter", "smooth-carousel", "circular-button", "text-fill", "patient-card", "contact-form", "char-stagger-button", "dot-fill-btn"],
    sections: [
      { match: "oris-hero", name: "Hero", note: "A real-time 3D tooth model visitors can rotate, beside the intro copy.", effect: "split-text-lines" },
      { match: "about-oris", name: "About", note: "Practice overview with four animated slot counters.", effect: "slot-counter" },
      { match: "care-comfort", name: "Care & comfort", note: "A smooth carousel of care highlights.", effect: "smooth-carousel" },
      { match: "dental-treatments", name: "Treatments", note: "A scroll-pinned, stacked card deck of treatments.", effect: "split-text-lines" },
      { match: "parallax", name: "Statement break", note: "A full-bleed parallax statement with a scroll-driven text fill.", effect: "text-fill" },
      { match: "oris-reviews", name: "Reviews", note: "Ribbon strips of patient reviews.", effect: "text-fill" },
      { match: "reviews", name: "Reviews", note: "Ribbon strips of patient reviews.", effect: "text-fill" },
      { match: "passion-meet-purpose", name: "Clinic & doctors", note: "A grid gallery of the clinic and its doctors.", effect: "split-text-lines" },
      { match: "oris-form", name: "Book an appointment", note: "A booking card with a validated contact form.", effect: "contact-form" },
      { match: "brighten", name: "Footer", note: "An interactive dot-canvas footer with the brand wordmark.", effect: "char-stagger-button" },
    ],
  },
  lumera: {
    stack: ["Next.js", "React 19", "Tailwind CSS", "GSAP", "Lenis"],
    effects: ["mask-text-reveal", "horizontal-feature-reveal", "draggable-marquee", "parallax-image-animation", "number-counter", "animated-faq", "parallax-footer", "char-stagger-button", "animated-form"],
    sections: [
      { match: "hero", name: "Hero", note: "A full-screen intro with counting launch figures.", effect: "number-counter" },
      { match: "about", name: "About", note: "Brand positioning with a masked headline reveal.", effect: "mask-text-reveal" },
      { match: "lumera-features", name: "Feature reveal", note: "A pinned section that scrolls the residence features sideways.", effect: "horizontal-feature-reveal" },
      { match: "services", name: "Services", note: "A draggable marquee of what the development offers.", effect: "draggable-marquee" },
      { match: "works", name: "Works", note: "Project listing with parallax images.", effect: "parallax-image-animation" },
      { match: "project", name: "Project", note: "Project detail with an infinite carousel.", effect: "mask-text-reveal" },
      { match: "showcase", name: "Showcase", note: "A background-video showcase.", effect: "mask-text-reveal" },
      { match: "core features", name: "Gallery", note: "An interactive feature gallery with image previews.", effect: "mask-text-reveal" },
      { match: "bringing", name: "Bringing it home", note: "A supporting video section.", effect: "mask-text-reveal" },
      { after: "bringing", name: "Project hover", note: "Hover a project name to preview its image." },
      { match: "faq", name: "FAQ", note: "Accordion answers that open with a smooth height animation.", effect: "animated-faq" },
      { match: "highlights", name: "Highlights", note: "Nearby highlights and amenities.", effect: "mask-text-reveal" },
      { match: "roi", name: "ROI", note: "Investment and return figures that count up.", effect: "number-counter" },
      { match: "cta", name: "Call to action", note: "The enquiry call to action.", effect: "mask-text-reveal" },
      { match: "footer", name: "Footer", note: "A parallax footer with the contact form.", effect: "parallax-footer" },
    ],
  },
  kyntra: {
    stack: ["Next.js", "React 19", "Tailwind CSS", "GSAP", "Lenis"],
    effects: ["scroll-stack", "number-counter", "parallax-image-animation", "animated-faq", "parallax-footer", "char-stagger-button", "char-stagger-primary-button", "animated-form"],
    sections: [
      { match: "one app", name: "Hero", note: "A full-screen intro with an animated app mockup." },
      { match: "kyntra-about", name: "About", note: "Brand and positioning." },
      { match: "kyntra-section-break", name: "Section break", note: "A scroll-driven transition between sections." },
      { match: "features", name: "Features", note: "Appliance records, warranties and repair history, stacked as you scroll.", effect: "scroll-stack" },
      { match: "smarter", name: "Smarter", note: "A supporting feature breakdown." },
      { match: "how-it-works", name: "How Kyntra works", note: "A step-by-step onboarding walkthrough.", effect: "char-stagger-primary-button" },
      { match: "trusted", name: "Trust", note: "Trusted-professional proof with counting figures and parallax imagery.", effect: "number-counter" },
      { match: "stories", name: "Testimonials", note: "A customer testimonial carousel." },
      { match: "resources", name: "Blogs", note: "An article listing.", effect: "char-stagger-button" },
      { match: "faq", name: "FAQ", note: "Accordion answers that open with a smooth height animation.", effect: "animated-faq" },
      { match: "cta", name: "Call to action", note: "The app download call to action.", effect: "char-stagger-primary-button" },
      { match: "footer", name: "Footer", note: "A parallax footer with the enquiry form.", effect: "parallax-footer" },
    ],
  },
};

const tidy = (label = "") =>
  label
    .replace(/-?_R_.*$/, "") // drop React useId suffixes
    .split(/[-_\s]+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());

/**
 * Names the captured layers of one device. Tiny unlabelled layers (spacers)
 * merge into the layer above. `effectsByName` maps registry names to
 * { title, href } for the "Powered by" link.
 */
export function resolveSections(slug, captured = [], effectsByName = {}) {
  const rules = TEMPLATE_SECTIONS[slug]?.sections || [];
  const layers = [];
  for (const s of captured) {
    const prev = layers[layers.length - 1];
    if (!s.label && prev && s.h < 260) {
      prev.h = s.y + s.h - prev.y;
      continue;
    }
    layers.push({ ...s });
  }

  let lastMatch = null;
  return layers.map((s, i) => {
    const label = (s.label || "").toLowerCase();
    let rule = label ? rules.find((r) => r.match && label.startsWith(r.match)) : null;
    if (!rule && !label && lastMatch) rule = rules.find((r) => r.after && lastMatch.startsWith(r.after));
    if (rule?.match) lastMatch = rule.match;
    return {
      y: s.y,
      h: s.h,
      ...(s.src && { src: s.src, w: s.w }), // a Figma export: the slab shows this whole image
      name: rule?.name || s.name || tidy(s.label) || `Section ${i + 1}`,
      note: rule?.note || "",
      effect: rule?.effect ? effectsByName[rule.effect] || null : null,
    };
  });
}
