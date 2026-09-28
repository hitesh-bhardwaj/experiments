import { getEffectRouteSlug } from "./effect-slugs";
import { createPageMetadata } from "./seo-metadata";

export const effectsOverviewContent = {
  name: "Hyperiux Vault Effects",
  ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/effects.jpg",
  metadata: {
    title: "React & Next.js Effects Library | Hyperiux Vault",
    description: "Explore 150+ editable interaction effects for React and Next.js, including scroll, cursor, WebGL, buttons and transitions. Preview live and install fast.",
  },
  description: [
    "150+ production-ready interaction effects for React & Next.js. Browse scroll systems, cursor effects, WebGL scenes, buttons, and transitions. Preview live, then copy or install with the CLI.",
  ],
  cta: {
    heading: "Request a Custom Animation",
    description: "Need a custom effect? Tell us what to create.",
    buttonText: "Request Custom Animation",
    buttonLink: "#",
  },
  faqs: [
    {
      question: "Where should I start if I only know the page needs to feel better?",
      answer: "Start with the page job. If the page needs a stronger story, look at scroll effects. If it needs atmosphere, explore backgrounds or WebGL effects. If it needs better conversion support, review buttons, FAQs, forms, testimonials, and navigation patterns.",
    },
    {
      question: "When is browsing the full Vault better than choosing a category first?",
      answer: "Use the full catalog when you are still exploring the interaction direction. It helps when the goal is clear, such as “make the hero sharper” or “make the CTA feel better,” but the exact component type is not decided yet.",
    },
    {
      question: "How do I choose between a subtle effect and a more expressive one?",
      answer: "Choose the effect that improves the section without stealing its job. A quiet background may be better for SaaS copy. A WebGL scene may be right for a launch hero. A cursor effect may suit a portfolio, but not a pricing page. The strongest choice is the one that makes the page clearer, sharper, or more memorable.",
    },
    {
      question: "How should the catalog handle heavier previews?",
      answer: "Keep the page light. Avoid running many WebGL, canvas, video, or continuous animation previews at once. Use static thumbnails, lazy loading, offscreen pause, and click-to-preview behavior where the effect is too heavy for always-on browsing.",
    },
    {
      question: "What changes when reduced motion is enabled?",
      answer: "Animated previews should pause or become static. Autoplay, looping motion, cursor trails, WebGL movement, and continuous background effects should not run automatically. The catalog should remain fully browsable without motion."
    },
    {
      question: "Are free effects really free for commercial use?",
      answer: "Yes. Free effects are commercial-friendly where marked in the license, so you can ship them on client sites and products without paying."
    },
    {
      question: "What's the difference between Free and Pro?",
      answer: "Free includes 50+ effects covering text, buttons, and basic scroll interactions. Pro unlocks the full 150+ effect library, including cursor effects, WebGL scenes, and advanced page transitions."
    },
    {
      question: "Do I need an account to use free effects?",
      answer: "Yes. To use or copy even free effects, you need to sign in with an account.Free effects don’t require a Pro plan, but signing in is required so the site can generate your access token, track copy/install usage, and keep your saved effects and account activity synced."
    },
    {
      question: "How do I upgrade from free to Pro effects?",
      answer: "You can subscribe to our Pro plans on the Pricing page. Once subscribed, you will receive a CLI token to install Pro effects directly from our registry."
    },
    {
        question: "What makes a component worth featuring?",
        answer: "A featured component should have a clear reason to stand out: strong craft, practical use, launch-page value, brand impact, technical quality, or a pattern the Hyperiux team believes users should notice first.",
      },
      {
        question: "Is Featured only for the most visually dramatic effects?",
        answer: "No. Some featured components may be quiet but commercially useful. A Dotted Grid, Animated FAQ, Directional Menu, or premium CTA button can deserve attention as much as a WebGL hero or page transition.",
      },
      {
        question: "How should users treat the Featured page?",
        answer: "Use it as a curated starting point, not a final answer. Featured helps users find strong candidates quickly, but the right component still depends on the page goal, audience, device mix, and performance budget."
      },
      {
        question: "When should a user leave Featured and browse a category instead?",
        answer: "If the user needs a specific behavior, such as a loader, cursor, form, carousel, or text reveal, they should open that category and compare more options. Featured is selective by design."
      },
      {
        question: "How should Featured previews stay fast?",
        answer: "The page should not run multiple heavy effects at once. WebGL, canvas, video, and continuous animation previews should use static thumbnails, lazy loading, offscreen pause, or click-to-preview behavior."
      },
      {
        question: "What accessibility standard should Featured components meet?",
        answer: "A component should not be featured only because it looks good. It should have a credible path for readable HTML, keyboard access where relevant, visible focus states, mobile behavior, and reduced-motion fallback."
      },
      {
        question: "How should Featured work for mobile users?",
        answer: "The page should prioritize clarity over spectacle. Cursor effects can be shown as static previews, WebGL effects can use poster images, and motion-heavy cards should not make browsing slower or harder."
      },
      {
        question: "Can Featured change over time?",
        answer: "Yes. Featured can change as the Vault grows, as new components launch, or as the Hyperiux team decides certain effects are more useful, more polished, or more relevant for current product and brand use cases."
      }
  ],
};

export const freeEffectsContent = {
  id: "free",
  name: "Free Effects",
  slug: "free",
  ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/free.jpg",
  metadata: {
    title: "Free React & Next.js Effects | Hyperiux Vault",
    description: "Browse 50+ free Hyperiux Vault effects for React and Next.js - real scroll, button, and text animations you can install, remix, and ship today.",
  },
  description: [
    "The Free tier includes 50+ production-ready Hyperiux Vault effects - text animations, buttons, and core scroll interactions that are free to use forever, no account required to preview. Upgrade to Pro when you need cursor effects, WebGL scenes, or the full 150+ effect library.",
  ],
  faqs: [
    {
      question: "Are free effects really free for commercial use?",
      answer: "Yes. Free effects are commercial-friendly where marked in the license, so you can ship them on client sites and products without paying."
    },
    {
      question: "What's the difference between Free and Pro?",
      answer: "Free includes 50+ effects covering text, buttons, and basic scroll interactions. Pro unlocks the full 150+ effect library, including cursor effects, WebGL scenes, and advanced page transitions."
    },
    {
      question: "Do I need an account to use free effects?",
      answer: "No. Copy the code directly from any effect page, or install it via the CLI without creating an account."
    },
    {
      question: "How do I upgrade from free to Pro effects?",
      answer: "You can subscribe to our Pro plans on the Pricing page. Once subscribed, you will receive a CLI token to install Pro effects directly from our registry."
    }
  ],
};

export const proEffectsContent = {
  id: "pro",
  name: "Pro Effects",
  slug: "pro",
  ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/pro.jpg",
  metadata: {
    title: "Pro Effects | Hyperiux Vault",
    description: "Browse all Pro effects in Hyperiux Vault - premium-tier components built for teams who need more. Upgrade to unlock instant CLI access.",
  },
  description: [
    "The Pro tier is where Hyperiux Vault goes deeper - more complex interactions, more refined motion, and effects that take real effort to build from scratch.",
    "Preview available now. Upgrade to Pro for instant install access.",
  ],
};

export const effectCategories = [
  {
    id: "featured",
    name: "Featured Components",
    slug: "featured",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/featured.jpg",
    metadata: {
      title: "Featured Components | Hyperiux Vault",
      description: "Browse curated featured Hyperiux Vault components selected for strong craft, practical use, and brand impact.",
    },
    description: [
      "Browse a handpicked selection of effects and components from across Vault, curated to help you discover interesting interactions, useful ideas and strong starting points for your next build.",
    ],
    cta: {
      heading: "Request a Custom Animation",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "What makes a component worth featuring?",
        answer: "A featured component should have a clear reason to stand out: strong craft, practical use, launch-page value, brand impact, technical quality, or a pattern the Hyperiux team believes users should notice first.",
      },
      {
        question: "Is Featured only for the most visually dramatic effects?",
        answer: "No. Some featured components may be quiet but commercially useful. A Dotted Grid, Animated FAQ, Directional Menu, or premium CTA button can deserve attention as much as a WebGL hero or page transition.",
      },
      {
        question: "How should users treat the Featured page?",
        answer: "Use it as a curated starting point, not a final answer. Featured helps users find strong candidates quickly, but the right component still depends on the page goal, audience, device mix, and performance budget."
      },
      {
        question: "When should a user leave Featured and browse a category instead?",
        answer: "If the user needs a specific behavior, such as a loader, cursor, form, carousel, or text reveal, they should open that category and compare more options. Featured is selective by design."
      },
      {
        question: "How should Featured previews stay fast?",
        answer: "The page should not run multiple heavy effects at once. WebGL, canvas, video, and continuous animation previews should use static thumbnails, lazy loading, offscreen pause, or click-to-preview behavior."
      },
      {
        question: "What accessibility standard should Featured components meet?",
        answer: "A component should not be featured only because it looks good. It should have a credible path for readable HTML, keyboard access where relevant, visible focus states, mobile behavior, and reduced-motion fallback."
      },
      {
        question: "How should Featured work for mobile users?",
        answer: "The page should prioritize clarity over spectacle. Cursor effects can be shown as static previews, WebGL effects can use poster images, and motion-heavy cards should not make browsing slower or harder."
      },
      {
        question: "Can Featured change over time?",
        answer: "Yes. Featured can change as the Vault grows, as new components launch, or as the Hyperiux team decides certain effects are more useful, more polished, or more relevant for current product and brand use cases."
      }
    ],
  },
  {
    id: "text",
    name: "Text Animations",
    slug: "text-animations",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/text-animations.jpg",
    aliases: ["text-effects"],
    metadata: {
      title: "Text Animations for React & Next.js | Hyperiux Vault",
      description: "React text animations for real HTML text: scramble, mask, overflow, blur, fill, spotlight, and reveal effects for headlines, launch copy, and short statements.",
    },
    description: ["Bring headlines and key messages to life with reveals, scrambles, fills and motion effects that add emphasis, create visual interest and make important words stand out at the right moment."],
    cta: {
      heading: "Request a Custom Text Animation",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: " Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Which text animation should I use for a headline?",
        answer: "Use Scramble Text or Glitchy Text for technical, cyber, AI, launch, or developer-tool headlines. Use Mask Text Reveal, Overflow Text Reveal, Slide Text Reveal, or Perspective Text Reveal for polished section intros. Use Text Fill, Spotlight Text, or Text Hover Expand for short emphasized phrases.",
      },
      {
        question: "Where do animated text effects work best?",
        answer: "Text animations work best on hero headlines, section intros, product claims, launch statements, editorial one-liners, short proof points, campaign copy, and technical brand moments. They should help important words arrive with intent.",
      },
      {
        question: "What copy should not be animated?",
        answer: "Avoid animating body copy, legal text, form labels, error messages, accessibility-critical instructions, and long paragraphs. Reading should never feel like the page is asking for applause before delivering the sentence.",
      },
      {
        question: "How do I prevent layout shift with split text?",
        answer: "Reserve the final text space, avoid changing font metrics during animation, and keep the readable final phrase in normal document flow. Animate only the lines, words, or characters that matter."
      },
      {
        question: "How should animated text remain accessible?",
        answer: "The final text must exist as real DOM text and should be exposed once to assistive technology. Screen readers should not announce every animated character or fragment as separate content."
      },
      {
        question: "What should text animations do on small screens?",
        answer: "Reduce stagger, shorten duration, avoid tiny clipped text, and make sure line breaks remain stable across widths. Mobile text animation should feel lighter than desktop animation."
      },
      {
        question: "How should text reveals respect reduced motion?",
        answer: "Reduced-motion users should see the final readable text immediately. Remove scrambling, spinning, long staggers, delayed word reveals, and repeated typewriter loops."
      },
      {
        question: "Are text animations bad for SEO?",
        answer: "No, if the final text exists as real HTML and is not replaced by canvas-only glyphs. Search engines should see the words, not just the choreography."
      }
    ],
  },
  {
    id: "backgrounds",
    name: "Animated Backgrounds",
    slug: "backgrounds",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/animated-backgrounds.jpg",
    metadata: {
      title: "Animated Backgrounds for React & Next.js | Hyperiux Vault",
      description: "React animated backgrounds for SaaS and AI heroes: dotted grids, particle fields, and dithered canvas textures, with guidance on contrast, density, and cost.",
    },
    description: [
       "Add depth, movement and atmosphere behind your content with animated grids, particles, textures and patterns that make sections feel more immersive without taking attention away from the message."],
    cta: {
      heading: "Request a Custom Background Animation",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Should I use Dotted Grid, Spider Particles, or Dither Canvas?",
        answer: "Use Dotted Grid when the page needs technical structure with very low runtime cost. Use Spider Particles when a short hero or product statement benefits from gentle network motion. Use Dither Canvas when the brand needs grain, signal, or computational texture. Choose CSS-only whenever the background does not need per-pixel interaction.",
      },
      {
        question: "Which pages benefit most from animated backgrounds?",
        answer: "Animated backgrounds work best for SaaS hero sections, AI launches, developer tools, technical brand pages, studio websites, product overview sections, and lightweight visual systems. They should make the foreground message feel sharper, not make the background feel like the product.",
      },
      {
        question: "When does an animated background become a bad idea?",
        answer: "Avoid animated backgrounds behind low-contrast text, long reading surfaces, forms, pages already carrying video or WebGL, and mobile-first flows where animation adds cost without meaning. If the headline fights the surface, the background is too loud.",
      },
      {
        question: "How do I control performance cost for background effects?",
        answer: "Cap particle counts, reduce density, pause canvas work offscreen, avoid full-page blur filters, and use static CSS or image fallbacks where possible. Keep content layers above the background and never make the background part of the reading experience.",
      },
      {
        question: "How do I keep text readable over an animated background?",
        answer: "Protect contrast around headlines, body copy, forms, and CTAs. Use masks, fades, lower opacity, density controls, and overlays where needed. Decorative canvases should be hidden from assistive technology.",
      },
      {
        question: "How should animated backgrounds adapt on mobile?",
        answer: "Reduce density, disable pointer reactions, simplify motion, and swap canvas effects for static textures where the device or viewport does not justify animation. Mobile backgrounds should feel lighter than desktop backgrounds.",
      },
      {
        question: "Can a dotted background be CSS-only?",
        answer: "Yes, and it should be when the design does not need per-pixel interaction. CSS gradients, masks, and opacity are usually enough for a production hero surface.",
      },
      {
        question: "When should I use WebGL instead of a background effect?",
        answer: "Use WebGL when the hero itself needs shader-led depth, 3D interaction, or proof-of-craft. For normal product pages, a lightweight background is usually the better commercial decision.",
      }
    ],
  },
  {
    id: "buttons",
    name: "Animated Buttons",
    slug: "buttons",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/animated-buttons.jpg",
    metadata: {
      title: "Animated Buttons for React & Next.js | Hyperiux Vault",
      description: "Accessible animated buttons for React and Next.js: CTA microinteractions, staggered labels, arrow fills, and scramble links that preserve semantics and focus.",
    },
    description: "Make calls to action feel more responsive and engaging with button effects that add satisfying hover, click and motion feedback while keeping the action clear, familiar and easy to use.",
    cta: {
      heading: "Request a Custom Button Animation",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Which animated button should I use for a primary CTA?",
        answer: "Use Character Stagger Primary Button or Arrow Fill Button for primary CTAs that need confidence and feedback. Use Scramble Link Button, Dot Fill Button, or Link Button for secondary actions. Use Animated Toggle only for real binary state changes.",
      },
      {
        question: "Where do animated buttons create useful feedback?",
        answer: "Animated buttons work best on hero CTAs, pricing toggles, product cards, secondary links, launch pages, and marketing sections where feedback improves confidence. The motion should confirm the action, not delay it.",
      },
      {
        question: "When should a button stay boring?",
        answer: "Avoid animated buttons when the action is destructive, the label becomes unclear, the form state is complex, or the page already has too many motion signals. Critical actions need clarity before character.",
      },
      {
        question: "How fast should a button microinteraction be?",
        answer: "If the animation happens before activation, keep it roughly under 200ms. Longer motion belongs after activation or as decorative confirmation, not as friction before the click.",
      },
      {
        question: "What semantics should animated buttons preserve?",
        answer: "Use real button elements for actions and real anchors for navigation. Preserve visible focus states, keyboard activation, loading states, disabled states, and programmatic state changes.",
      },
      {
        question: "How should animated buttons behave on touch screens?",
        answer: "Use tap-safe sizes, immediate feedback, and no hover-only meaning. Mobile users should understand the action without needing a desktop hover state.",
      },
      {
        question: "What should reduced-motion buttons remove?",
        answer: "Remove label scrambling, long staggers, directional fills, looping emphasis, and dramatic hover travel. Keep immediate hover, focus, active, loading, and disabled feedback.",
      }
    ],
  },
  {
    id: "carousels",
    name: "Carousel Effects",
    slug: "carousels",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/carousel-effects.jpg",
    metadata: {
      title: "Carousel Effects for React & Next.js | Hyperiux Vault",
      description: "React carousel effects for visual showcases: clip-path reveals and zoom sliders with visible controls, swipe, and keyboard support.",
    },
    description: [
      "Present images, projects and content collections through engaging carousel interactions that make browsing feel more dynamic while helping users move naturally through showcases, portfolios, campaigns and visual stories."
    ],
    cta: {
      heading: "Request a Custom Carousel Animation",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Should I use a carousel, a grid, or a scroll effect?",
        answer: "Use a carousel for equal-weight visuals users may browse in sequence. Use a grid when comparison, scanning, search visibility, or proof matters. Use a scroll effect when the sequence is part of the story and the order matters.",
      },
      {
        question: "Which carousel effect fits a visual showcase?",
        answer: "Use Clip Path Slider for lookbooks, hero galleries, portfolio slides, and campaign visuals. Use Zoom Slider when the active image should move forward with controlled depth. If users need to compare items, use a grid instead.",
      },
      {
        question: "What content should not live inside a carousel?",
        answer: "Avoid placing pricing, mandatory proof, testimonials that drive trust, feature comparisons, long text, and conversion-critical content inside a carousel. Important content should not become optional just because it looks neat sliding sideways.",
      },
      {
        question: "How do I keep carousel performance under control?",
        answer: "Optimize images, lazy-load offscreen slides carefully, avoid repaint-heavy masks over huge visuals, and pause autoplay when the carousel is inactive or offscreen. Keep the slide count focused.",
      },
      {
        question: "What accessibility controls does a carousel need?",
        answer: "Provide visible previous/next controls, keyboard support, swipe support, pause controls, current-slide indication, focus management, and polite announcements when the user changes slides. Autoplay should never be the only way to access content.",
      },
      {
        question: "How should carousels behave on mobile?",
        answer: "Support swipe, keep controls reachable, reduce exaggerated zoom or mask depth, and switch to stacked content when slides become informational. Mobile users should not have to fight a showcase to understand the page.",
      },
      {
        question: "What changes under reduced motion for carousel effects?",
        answer: "Remove zoom, masking, dramatic slide travel, and autoplay by default. Use instant slide changes or a short fade while keeping controls visible.",
      },
      {
        question: "Should a carousel autoplay?",
        answer: "Only if it pauses on hover, focus, touch interaction and reduced motion. Autoplay is decoration; user control is the feature.",
      },
      {
        question: "Can carousels be SEO-friendly?",
        answer: "Yes, if slide content is present in crawlable HTML and important content is not hidden behind client-only states or autoplay.",
      }
    ],
  },
  {
    id: "scroll",
    name: "Scroll Effects",
    slug: "scroll-effects",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/scroll-effects.jpg",
    metadata: {
      title: "Scroll Animations for React & Next.js | Hyperiux Vault",
      description: "React scroll animations for product stories, feature tours, and portfolio chapters. Compare behavior, mobile fallbacks, and GSAP/Lenis needs before production.",
    },
    description: ["Turn scrolling into part of the experience with reveals, transformations and sequenced motion that guide attention, build visual rhythm and help content unfold naturally as users move through the page."],
    cta: {
      heading: "Request a Custom Scroll Animation",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Which scroll effect should I choose for a product story?",
        answer: "Use Sticky Content Wrapper when one core claim should stay fixed while proof changes beside it. Use Scroll Stack when each feature needs to become a chapter. Use Stacking Cards when the sequence should accumulate visual weight. Use Horizontal Feature Reveal, Parallax Slider, or Infinite Perspective Slider only when the mobile fallback can become a clean vertical stack or swipe sequence.",
      },
      {
        question: "Where do React scroll animations create the most value?",
        answer: "Scroll effects work best on SaaS feature stories, product tours, agency process pages, portfolio chapters, methodology pages, case studies, and long-form brand pages. They are most useful when the page has a real sequence and the visitor benefits from paced explanation.",
      },
      {
        question: "When should I avoid adding a scroll effect?",
        answer: "Avoid scroll effects on dashboards, forms, pricing tables, comparison matrices, long documentation, search-heavy pages, and any route where speed-to-action matters more than staged storytelling. If the static page is clearer than the animated version, the scroll effect is costing more than it adds.",
      },
      {
        question: "What keeps scroll animations performant in React and Next.js?",
        answer: "Animate transform and opacity, pre-size images, avoid layout reads during scroll, and clean up timelines or listeners when the route changes. If the effect uses GSAP ScrollTrigger, Lenis, Motion, or requestAnimationFrame, initialize it inside a client component and test it on a mid-range phone before treating it as production-safe.",
      },
      {
        question: "How should scroll effects stay accessible?",
        answer: "The visual sequence must match the DOM sequence. Keyboard users should reach every link and control without needing to scroll at a precise velocity. Content should remain readable as normal HTML even when pinning, scrubbing, smoothing, or perspective motion is removed.",
      },
      {
        question: "What is the safest mobile fallback for pinned, horizontal, or perspective scroll effects?",
        answer: "Collapse complex scroll behavior into vertical sections, native swipe, or static cards. Reduce parallax distance, avoid desktop-style pinning on short viewports, and disable smoothing that fights native touch behavior.",
      },
      {
        question: "How should reduced-motion users experience scroll animation pages?",
        answer: "Reduced-motion users should receive the same sections in the same order with pinning, scrubbed transforms, scroll smoothing, and perspective shifts removed. A brief opacity reveal is acceptable, but hidden chapters that only appear at a precise scroll state are not.",
      },
      {
        question: "How do I avoid scroll-jacking in React?",
        answer: "Keep native scroll behavior, avoid trapping wheel or touch input, preserve real document order, and use scroll-linked animation only as progressive enhancement. If the page cannot be understood as static sections, the scroll effect is doing too much.",
      },
      {
        question: "Do scroll animations hurt SEO?",
        answer: "Not when the real content is server-rendered and crawlable. The danger is hiding content behind client-only animation, lazy-loaded empty shells, or scroll states that never render useful text in the initial HTML.",
      }
    ]
  },
  {
    id: "components",
    name: "Creative Components",
    slug: "components",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/components.jpg",
    metadata: {
      title: "Creative Components for React & Next.js | Hyperiux Vault",
      description: "Creative React components for conversion pages: animated FAQ, forms, tabs, modals, video, and testimonial components, built with ARIA-first, crawlable markup.",
    },
    description: "Add thoughtful interaction to cards, tabs, FAQs, forms, modals and other interface elements with effects that make everyday components feel more engaging, responsive and enjoyable to explore.",
    cta: {
      heading: "Request a Custom Creative Component",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Which creative component should I add first to a SaaS landing page?",
        answer: "Start with Animated FAQ and Form because they directly support objection handling and lead capture. Use Tabs and Modal to organize depth, and use proof components such as Testimonial Swiper or Interactive List Preview when they make decision-making easier.",
      },
      {
        question: "Where do creative components matter most?",
        answer: "Creative components work best on SaaS landing pages, pricing pages, product pages, agency service pages, lead-capture flows, proof sections, onboarding visuals, and conversion-focused sections. This category exists for revenue-adjacent interaction, not decoration.",
      },
      {
        question: "When can a creative component damage conversion?",
        answer: "It damages conversion when animation delays validation, hides required content, interrupts form completion, traps users in a modal, or makes a simple decision feel theatrical. The component should clarify state or reveal support, not slow the task.",
      },
      {
        question: "How do conversion components stay fast?",
        answer: "Keep state transitions short, avoid expensive re-renders during typing or validation, lazy-load media-heavy components, and never make user action wait for decoration. Input handling should stay independent from motion.",
      },
      {
        question: "What accessibility patterns are non-negotiable?",
        answer: "Accordions need buttons and aria-expanded; dialogs need labels, focus trap, Escape close, and focus restore; tabs need keyboard behavior; forms need labels, validation clarity, and visible error messaging. Use semantic HTML before adding animation.",
      },
      {
        question: "How should these components adapt to mobile layouts?",
        answer: "Use full-width drawers, inline sections, stacked tabs, larger touch targets, and simpler reveal patterns where desktop components become cramped. Long or form-heavy dialogs often work better as inline mobile sections.",
      },
      {
        question: "What should reduced-motion do for FAQs, tabs, modals, and forms?",
        answer: "State changes should remain instant and visible. Accordions can open without height animation, tabs can switch without sliding panels, modals can appear without scale or blur, and forms should accept input without waiting for decorative motion.",
      }
    ],
  },
  {
    id: "navigation",
    name: "Navigations",
    slug: "navigation",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/navigation.jpg",
    metadata: {
      title: "Navigations for React & Next.js | Hyperiux Vault",
      description: "React navigations for menus and navbars: directional menus, immersive overlays, elevated headers, and expanding navbars.",
    },
    description: "Make menus, navbars and navigation patterns feel more polished and responsive with interactions that add character while helping users stay oriented and move confidently between important parts of the experience.",
    cta: {
      heading: "Request a Custom Navigation",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Which navigation effect should I choose for a marketing site?",
        answer: "Use Directional Menu when the site has navigation depth across services, products, resources, docs, use cases, or portfolios. Use Immersive Full Screen Navigation for portfolios and brand sites where the menu is a designed moment. Use Elevate Navbar for SaaS and product sites that need sticky navigation without visual weight. Use Expanding Navbar when space is constrained and the link set justifies it.",
      },
      {
        question: "Where does animated navigation add value?",
        answer: "Animated navigation works best on SaaS websites, agency sites, studios, product ecosystems, resource hubs, portfolios, and complex marketing sites. It should make orientation clearer, not make the menu feel like a separate experience users must solve.",
      },
      {
        question: "When should navigation stay simple?",
        answer: "Keep navigation simple on tiny sites with only a few links, utility apps, forms, checkout flows, and any menu that relies only on hover. Navigation is the riskiest place to be clever because everyone needs it.",
      },
      {
        question: "How do I keep animated menus performant?",
        answer: "Keep menu animations short, avoid large layout shifts, preload only essential panel content, and ensure the menu does not block route transitions or scroll restoration. The menu should open quickly and close cleanly.",
      },
      {
        question: "What accessibility behavior should animated navigation support?",
        answer: "Use real links, visible focus, keyboard movement, aria-expanded, aria-controls where appropriate, Escape close, and focus restore to the trigger. For overlay menus, trap focus only while the overlay is open.",
      },
      {
        question: "What should desktop navigation become on mobile?",
        answer: "Use a drawer, accordion, or simple full-screen menu. Do not translate desktop hover behavior directly onto touch screens. Tap and keyboard paths should work independently of hover.",
      },
      {
        question: "How should reduced motion simplify navigation?",
        answer: "Open and close menus instantly or with a short opacity change. Direction-aware panels, large overlays, and scroll-linked navbar shifts should reduce to clear state changes.",
      }
    ],
  },
  {
    id: "cursor",
    name: "Cursor Effects",
    slug: "cursor-effects",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/cursor.jpg",
    metadata: {
      title: "Cursor Effects for React & Next.js | Hyperiux Vault",
      description: "Custom cursor effects for React and Next.js: glass lenses, image trails, pixel blooms, and aura cursors, each with touch-device and reduced-motion fallbacks.",
    },
    description: "Add an expressive layer to pointer movement with trails, distortions, followers and responsive interactions that make browsing feel more tactile, playful and connected to what users are exploring on screen.",
    cta: {
      heading: "Request a Custom Cursor Effect",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Which cursor effect should I choose for a brand homepage?",
        answer: "Use Liquid Glass Cursor or Colorful Cursor Aura when the page needs a premium atmospheric pointer layer. Use Magnetic Image Trail, Phantom Image Trail, or Inertia Image when pointer movement should preview portfolio or product imagery. Use Pixel Bloom Cursor, Noise Ripple Cursor, Fish Eye Cursor, or Rope Cursor for experimental launch pages that can carry more expressive motion.",
      },
      {
        question: "Where do custom cursor effects work best?",
        answer: "Cursor effects belong on creative portfolios, agency homepages, campaign pages, culture brands, editorial microsites, product launches, and proof-of-craft pages. They work best when the pointer can become part of the brand without being responsible for meaning, navigation, or conversion clarity.",
      },
      {
        question: "Which pages should never use custom cursor behavior?",
        answer: "Avoid cursor effects on dashboards, checkout, forms, documentation, admin tools, dense product UIs, accessibility-critical flows, and pages with many native controls. Precision beats atmosphere in these contexts.",
      },
      {
        question: "How do I keep a cursor effect from becoming expensive?",
        answer: "Use one cursor layer, throttle pointer movement with requestAnimationFrame, avoid large full-screen filters, and keep the cursor layer below modals, menus, and critical UI. Image trails should disable when the tab is hidden, pointer velocity becomes excessive, or the effect is outside the intended section.",
      },
      {
        question: "What usability rules matter most for custom cursors?",
        answer: "Preserve native click meaning, visible focus rings, keyboard operation, hover states, modal stacking, and screen-reader independence. Never hide important content behind pointer-only interaction.",
      },
      {
        question: "What should happen to cursor effects on touch devices?",
        answer: "Disable them on coarse pointers and return to native touch behavior. If the cursor revealed imagery or proof, replace that behavior with visible previews, static cards, tap-accessible states, or mobile galleries.",
      },
      {
        question: "How should reduced motion affect cursor trails, ripples, and pointer-following effects?",
        answer: "Reduced motion should disable trails, inertia, ripples, lag, and delayed pointer-following entirely. Users should see the native pointer and the same content access through visible cards, links, or tap-accessible previews.",
      }
    ],
  },
  {
    id: "transitions",
    name: "Page Transitions",
    slug: "page-transitions",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/page-transition.jpg",
    metadata: {
      title: "Page Transitions for React & Next.js | Hyperiux Vault",
      description: "Next.js page transitions for branded route changes: pixel wipes, block reveals, SVG draws, and flips, with App Router, focus, and reduced-motion guidance.",
    },
    description: ["Create smoother movement between pages and views with transitions that maintain visual continuity, reinforce the experience and make navigation feel more intentional instead of like an abrupt change of screen."],
    cta: {
      heading: "Request a Custom Page Transition",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Which page transition should I choose for a branded route change?",
        answer: "Use Pixel Transition or Block Transition for graphic brands and confident launch pages. Use Svg Brush Transition when the brand has a lighter illustrated system. Use Page Flip only when the page metaphor fits the content. Use Chess Grid or Pie Rotation on simple route trees where orientation will stay clear.",
      },
      {
        question: "Where do page transitions make the experience feel better?",
        answer: "Page transitions work best on creative agency websites, campaign microsites, product launches, editorial portfolios, brand journeys, and low-frequency navigation paths where continuity matters. They turn the cut between pages into a brief brand moment.",
      },
      {
        question: "When should route transitions be avoided?",
        answer: "Avoid route transitions in apps with frequent navigation, dashboards, checkout, docs, search flows, and utility products where delay hurts completion. If users are trying to act quickly, the transition should get out of the way.",
      },
      {
        question: "How long should a production page transition last?",
        answer: "Most page transitions should stay around 300–600ms. Longer transitions need a real loading reason. Never add fake delay just to show the animation.",
      },
      {
        question: "How should focus behave after a page transition?",
        answer: "Move focus to the destination page’s main heading or main region after navigation. Do not leave focus trapped in the transition overlay, and make sure the transition layer stops blocking interaction once the route is ready.",
      },
      {
        question: "What should the mobile version of a route transition do?",
        answer: "Use short fades, simple overlay reveals, or instant navigation on low-power devices. Avoid complex flips, heavy masks, and large full-screen motion when it slows down orientation.",
      },
      {
        question: "What is the reduced-motion fallback for page transitions?",
        answer: "Use instant navigation or a very short opacity fade. Do not slide, flip, rotate, pixelate, mask, or sweep the entire viewport for users who have asked for less motion.",
      },
      {
        question: "Do these transitions work with the Next.js App Router?",
        answer: "Yes, but placement matters. Transitions often need a wrapper that remounts on route change, such as `template.tsx` or a dedicated route transition layer, rather than a persistent layout.",
      }
    ],
  },
  {
    id: "loaders",
    name: "Loaders",
    slug: "loaders",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/loaders.jpg",
    aliases: ["website-loaders"],
    metadata: {
      title: "Loaders & Preloaders for React & Next.js | Hyperiux Vault",
      description: "React loaders and preloaders for real wait states: numeric progress, line, and stack loaders tied to actual latency, with aria-busy and skeleton guidance.",
    },
    description: ["Make necessary waiting moments feel clearer and more considered with loading animations that communicate activity, maintain visual continuity and reassure users that the experience is still actively responding."
    ],
    cta: {
      heading: "Request a Custom Loader",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Which loader should I use for a real wait state?",
        answer: "Use Numeric Tunnel only when progress maps to a real signal such as upload percentage, asset warm-up, or measured initialization. Use Lines Loader for short unknown waits. Use Stack Loader for brief route or asset transitions. Use skeletons when the layout is known and content will stream into place.",
      },
      {
        question: "When does a loader actually earn its place?",
        answer: "A loader earns its place during route latency, upload progress, WebGL warm-up, asset-heavy experiences, product demos, and branded launch flows. It should represent something genuinely happening.",
      },
      {
        question: "When should I avoid showing a preloader?",
        answer: "Avoid preloaders on fast pages, fake delays, blocking first paint, progress numbers that lie, or loaders that hide usable content. If the page is already fast, do not manufacture a wait.",
      },
      {
        question: "How do loaders stay honest and lightweight?",
        answer: "Tie animation to real load state, keep it short, avoid blocking first paint, clean up timers, and prefer skeletons when the layout is predictable. Do not let the loader outlive the wait.",
      },
      {
        question: "How should loading states be announced accessibly?",
        answer: "Use aria-busy on the loading region and concise status text when the change matters. Do not spam live regions on every animation frame or announce decorative movement.",
      },
      {
        question: "What should loaders look like on mobile?",
        answer: "Keep them short, light, and clear. Avoid full-screen blocking animations unless the user genuinely cannot proceed until the task completes.",
      },
      {
        question: "How should reduced motion handle loaders and preloaders?",
        answer: "Replace animated loops with static progress text, a simple bar, skeleton content, or an instant reveal once content is ready. The wait should remain clear without continuous motion.",
      }
    ],
  },
  {
    id: "webgl",
    name: "WebGL & 3D Effects",
    slug: "webgl-effects",
    ogImage: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/webgl-effects.jpg",
    aliases: ["webgl"],
    metadata: {
      title: "WebGL and 3D Effects for React & Next.js | Hyperiux Vault",
      description: "WebGL and 3D React effects for shader-led heroes: bloom, glass, tunnels, and interactive canvas scenes, with device-tier GPU budgets and poster fallbacks.",
    },
    description: "Create richer, more immersive moments with interactive 3D, shaders, particles and WebGL effects that add depth and visual impact where standard interface animation is not enough.",
    cta: {
      heading: "Request a Custom WebGL Effect",
      description: "Need a custom effect? Tell us what to create.",
      buttonText: "Request Custom Animation",
      buttonLink: "#",
    },
    faqs: [
      {
        question: "Which WebGL or 3D effect should I choose for a premium hero?",
        answer: "Use Fractal Glass, Grid Tunnel, or Progressive Bloom Valley for premium hero moments where the visual itself proves craft. Use sliders, blur reveals, and lighter 3D interactions when the scene supports product or portfolio exploration rather than becoming the whole page.",
      },
      {
        question: "Where do WebGL and 3D effects justify their production cost?",
        answer: "They justify the cost on premium hero sections, AI and product launches, creative portfolios, immersive brand work, shader-led showcases, and proof-of-craft pages. The visual payoff needs to be commercially meaningful because this is the highest-cost category.",
      },
      {
        question: "When should I avoid WebGL on a page?",
        answer: "Avoid heavy WebGL on content-dense pages, low-power-first audiences, checkout, dashboards, documentation, and routes where load speed is the main conversion lever. If the canvas disappears and the page no longer communicates, the implementation is too dependent on spectacle.",
      },
      {
        question: "How do I control GPU and render cost?",
        answer: "Cap DPR at 1.0 on mobile and up to 1.5 on mid-range desktop. Pause render loops offscreen and when the tab is hidden. Reduce postprocessing, shader iterations, texture size, bloom, and particle counts before sacrificing HTML content.",
      },
      {
        question: "What content should stay outside the canvas?",
        answer: "Meaningful headings, links, CTAs, product copy, and conversion content should remain in HTML. Decorative canvas scenes should be hidden from assistive technology and backed by poster or static fallbacks where needed.",
      },
      {
        question: "What should WebGL do on mobile devices?",
        answer: "Reduce quality, lower texture size, simplify shaders, disable bloom-heavy passes, and switch to a poster fallback when the device cannot justify the scene. Mobile simplification should be designed, not treated as a failure state.",
      },
      {
        question: "What is the reduced-motion fallback for shader-led scenes?",
        answer: "Pause time-based uniforms, camera movement, bloom pulses, and pointer-coupled motion. Serve a static poster or still canvas state that preserves the visual identity without continuous GPU work.",
      },
      {
        question: "Will WebGL slow down the site?",
        answer: "It can if shipped raw. Cap DPR, pause render loops offscreen, reduce postprocessing, and use poster fallbacks for low-power devices.",
      },
      {
        question: "What dependencies do these effects need?",
        answer: "Treat dependencies as source-verified implementation facts. WebGL effects can involve GPU-specific packages, shader assets, postprocessing, or framework integrations, but name exact packages only when the shipped source and verified dependency documentation confirm them.",
      },
      {
        question: "How should WebGL behave on mobile?",
        answer: "Cap DPR at 1.0, reduce texture size, simplify shaders, and disable bloom-heavy passes. Use a poster fallback when the device cannot justify the scene.",
      },
      {
        question: "Should WebGL content live in the canvas?",
        answer: "No. Headings, CTAs, and meaningful product copy should remain in HTML. The canvas can disappear and the page should still communicate.",
      },
      {
        question: "What is the reduced-motion fallback for WebGL effects?",
        answer: "Pause time-based uniforms, camera movement, and pointer coupling. Show a static poster or still state that preserves the art direction.",
      }
    ],
  },
];

const categoriesById = new Map(effectCategories.map((category) => [category.id, category]));
const categorySlugAliases = {
  featured: "featured",
  "featured-effects": "featured",
  text: "text",
  "text-effects": "text",
  "text-animations": "text",
  transitions: "transitions",
  "page-transitions": "transitions",
  loader: "loaders",
  loaders: "loaders",
  "website-loader": "loaders",
  "website-loaders": "loaders",
  webgl: "webgl",
  "webgl-effects": "webgl",
  scroll: "scroll",
  "scroll-effects": "scroll",
  "scroll-animations": "scroll",
  cursor: "cursor",
  "cursor-effects": "cursor",
  other: "components",
  others: "components",
};
const categoriesBySlug = new Map([
  ...effectCategories.map((category) => [category.slug, category]),
  ...Object.entries(categorySlugAliases).map(([slug, id]) => [
    slug,
    categoriesById.get(id),
  ]),
].filter(([, category]) => Boolean(category)));

export function getEffectCategory(id) {
  return categoriesById.get(id) || null;
}

// Effects sourced from Sanity carry `categorySlug`, which is Sanity's own
// slug field and does NOT always match the canonical short `id` used
// everywhere else (e.g. Sanity's categorySlug is "text-animations" while
// the site-wide id is "text") - resolve through categorySlug first so
// callers always get back the canonical id instead of a raw Sanity slug
// (which would otherwise render as an ugly label like "Scroll-effects").
export function resolveEffectCategoryId(effect) {
  if (effect?.categorySlug) {
    return getEffectCategoryBySlug(effect.categorySlug)?.id || effect.category;
  }

  return effect?.categories?.[0] || effect?.category;
}

// Single source of truth for how a category/filter id reads as a chip label -
// used by the vault listing's category chips + featured/free/pro dropdown,
// and by the Saved Effects / Usage dashboard tabs so the same id never
// renders under two different names. Deliberately a plain capitalize rather
// than each category's full `.name` (e.g. "text" -> "Text", not "Text
// Animations") to keep filter chips compact.
export function getQuickCategoryLabel(id) {
  if (id === "all") return "All";
  if (id === "free") return "Free";
  if (id === "pro") return "Pro";
  if (id === "featured") return "Featured";
  if (id === "webgl") return "WebGL";

  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function getEffectCategoryBySlug(slug) {
  const normalizedSlug = slug?.toString().toLowerCase();

  return categoriesBySlug.get(normalizedSlug) || categoriesById.get(normalizedSlug) || null;
}

export function getEffectCategorySlugAliases(slug) {
  const normalizedSlug = slug?.toString().toLowerCase();
  const category = getEffectCategoryBySlug(normalizedSlug);

  return [
    category?.slug,
    category?.id,
    ...(category?.aliases || []),
    normalizedSlug,
    slug,
  ].filter((value, index, values) => value && values.indexOf(value) === index);
}

export function getEffectCategoryHref(id) {
  if (id === "all") return "/effects";
  if (id === "pro") return "/effects/pro";

  const category = getEffectCategory(id);
  return `/effects/${category?.slug || id}`;
}

function getCategoryDescriptionText(category) {
  const description = category?.metadata?.description || category?.metaDescription || category?.description;

  return Array.isArray(description)
    ? description.filter(Boolean).join(" ")
    : description || "";
}

export function getEffectCategoryMetadata(categoryOrId, overrides = {}) {
  const requestedId =
    typeof categoryOrId === "string"
      ? categoryOrId.toLowerCase()
      : categoryOrId?.id;
  const category =
    typeof categoryOrId === "string"
      ? getEffectCategoryBySlug(categoryOrId) || getEffectCategory(categoryOrId)
      : categoryOrId;

  const isFree = requestedId === "free";
  const isPro = requestedId === "pro";
  const isOverview = !isFree && !isPro && (!category || category?.id === "all");
  const content = isFree ? freeEffectsContent : isPro ? proEffectsContent : isOverview ? effectsOverviewContent : category;
  const title =
    overrides.title ||
    content?.metadata?.title ||
    content?.metaTitle ||
    `${content?.name || "The Vault"} | Hyperiux Vault`;
  const description =
    overrides.description ||
    getCategoryDescriptionText(content) ||
    "Browse Hyperiux Vault effects, animations, and UI components.";
  const url =
    overrides.url ||
    (isOverview ? "/effects" : getEffectCategoryHref(content.id));

  return createPageMetadata({
    title,
    description,
    path: url,
    image: overrides.image || content?.ogImage || "/seo/homepage.png"
  });
}

export function getEffectCategoryContent(categoryOrId) {
  const requestedId =
    typeof categoryOrId === "string"
      ? categoryOrId.toLowerCase()
      : categoryOrId?.id;

  if (requestedId === "free") return freeEffectsContent;
  if (requestedId === "pro") return proEffectsContent;
  if (requestedId === "all") return effectsOverviewContent;

  return (
    (typeof categoryOrId === "string"
      ? getEffectCategoryBySlug(categoryOrId) || getEffectCategory(categoryOrId)
      : categoryOrId) || effectsOverviewContent
  );
}

export function getEffectPrimaryCategory(effect) {
  const categories = effect?.categories?.length
    ? effect.categories
    : [effect?.category || "components"];

  return categories[0] || "components";
}

export function getEffectHref(effect) {
  const effectSlug = getEffectRouteSlug(effect?.effectSlug || effect?.slug || effect?.name);

  if (!effectSlug) return "/effects";

  if (effect?.categorySlug) {
    const category = getEffectCategoryBySlug(effect.categorySlug);
    const categorySlug = category?.slug || effect.categorySlug;

    return `/effects/${categorySlug}/${effectSlug}`;
  }

  const categoryId = effect.categories?.[0] || effect.category || "components";

  const category = getEffectCategory(categoryId);

  const categorySlug = category?.slug || categoryId;

  return `/effects/${categorySlug}/${effectSlug}`;
}

export function getEffectPreviewHref(effect) {
  const effectSlug = getEffectRouteSlug(effect?.effectSlug || effect?.slug || effect?.name);

  return effectSlug ? `/demo/${effectSlug}` : "/effects";
}
