import Homepage from "@/components/Homepage/Homepage";
import { FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo-metadata";
import { getSearchIndexEffects } from "@/lib/search-index";
import ReferralRocketTracking from "@/components/WebsiteComps/ReferralRocketTracking";

const faqItems = [
  {
    id: "faq-1",
    question: "What is Hyperiux Vault?",
    answer: (
      <>
        Vault is a source-first interaction effects library for React and Next.js. It covers scroll effects, text animations, cursor systems, page transitions, WebGL scenes, backgrounds, navigations, creative components. Effects install as editable code inside your project.
      </>
    ),
    defaultOpen: true,
  },
  {
    id: "faq-2",
    question: "How does Vault fit with a UI component library?",
    answer: (
      <>
        Keep the UI library. Your design system handles interface primitives such as buttons, forms, cards, grids, and tabs. Vault handles how parts of the interface enter, respond, transition, and move through time.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-3",
    question: "Why use Vault if I already know GSAP, Motion, or Three.js?",
    answer: (
      <>
        Those tools give you animation and rendering primitives. Vault gives you composed interaction patterns with a working structure, production decisions, and implementation guidance already in place. You still have the source, so the underlying tools remain fully available.
      </>
    ),
    defaultOpen: false,
  }, 
  {
    id: "faq-4",
    question: "Do I own the code?",
    answer: (
      <>
        The effect source is installed inside your project and can be inspected and modified locally. Usage rights follow the Free Core or Pro license attached to the effect.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-5",
    question: "Will Vault effects hurt performance?",
    answer: (
      <>
        Any interaction can hurt performance when used badly. A text reveal and a continuous WebGL scene have very different costs. Vault exposes dependencies and implementation notes so your team can make that decision with the page, device, and performance budget in mind. Test production pages on real devices before shipping.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-6",
    question: "Does Vault support reduced motion?",
    answer: (
      <>
        Effects with significant motion should include a reduced-motion strategy or implementation guidance. The final behaviour remains under your control because the source lives in your project.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-7",
    question: "Can I customize the effects?",
    answer: (
      <>
        Yes. Copy, styling, timing, easing, breakpoints, triggers, layout, mobile behaviour, and implementation code can all be changed inside your project.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-8",
    question: "What do I keep if I cancel Pro?",
    answer: (
      <>
        Code already installed in your project stays there. Access to new Pro downloads, updates, and future Pro releases follows the current subscription and license terms.
      </>
    ),
    defaultOpen: false,
  },
];


export const metadata = createPageMetadata({
  title: "Hyperiux Vault - React & Next.js Interaction Effects.",
  description:
    "Start with 50+ free source-first effects. Upgrade to Pro for 150+ effects.",
  path: "/",
  image:
    "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/homepage.jpg",
});

export default async function page() {
  const effects = await getSearchIndexEffects();

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <FAQJSONLD faqs={faqItems} />
      <ReferralRocketTracking />
      <Homepage faqItems={faqItems} effects={effects} />
    </>
  );
}
