import dynamic from "next/dynamic";
import { headers } from "next/headers";
import VaultShell from "@/Layouts/VaultShell";
import { getSearchIndexEffects } from "@/lib/search-index";
import PricingHero from "@/components/Pricing/pricing-hero/PricingHero";
import { FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo-metadata";
import SquareCursor from "@/homepage/components/SquareCursor";
import SectionOverlay from "@/components/Animations/SectionOverlay";

// Below-the-fold sections load as separate chunks (still server-rendered)
const FAQ = dynamic(() => import("@/homepage/sections/FAQ"));
const Footer = dynamic(() => import("@/homepage/sections/Footer"));
const PricingFinder = dynamic(() => import("@/components/Pricing/exploded/PricingFinder"));
const PricingCredits = dynamic(() => import("@/components/Pricing/exploded/PricingCredits"));
const PricingUseCase = dynamic(() => import("@/components/Pricing/exploded/PricingUseCase"));
const PricingProCompare = dynamic(() => import("@/components/Pricing/exploded/PricingProCompare"));
const PricingPlansHome = dynamic(() => import("@/homepage/sections/PricingPlansHome"));

export const metadata = createPageMetadata({
  title: "Hyperiux Vault Pricing | Pro React Effects Library",
  description:
    "Simple Vault pricing: start free, go Pro for every component from $7.42/month, or Pro+ for every component and the full template catalogue with 10 installs a day.",
  path: "/pricing",
  image:
    "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/pricing.jpg",
});

export default async function PricingPage() {
  const headersList = await headers();
  const isIndia = headersList.get("x-vercel-ip-country") === "IN";
  const currency = isIndia ? "INR" : "USD";
  const effects = await getSearchIndexEffects();

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <FAQJSONLD faqs={faqItems} />
      <VaultShell effects={effects}>
        <SquareCursor />
        <main id="main-content">
          <PricingHero />
          {/* Plans through FAQ are one sheet that scales in after the hero, like the homepage */}
          {/* Above the footer (z-200), whose ribbons reach up behind the FAQ */}
          <SectionOverlay className="relative z-201">
            {/* The homepage plans section, reused as is; #plans is the hero's "See the plans" target */}
            <div id="plans" className="home-type">
              <PricingPlansHome currency={currency} checkout />
              <PricingFinder currency={currency} />
            </div>
            <div className="home-type">
              <PricingCredits />
              <PricingProCompare currency={currency} />
            </div>
            <PricingUseCase useCases={USE_CASES} />
            <FAQ faqItems={faqItems} translateTop={false} />
          </SectionOverlay>
        </main>
        <Footer/>
      </VaultShell>
    </>
  );
}
const USE_CASES = [
  {
    id: 1,
    title: "Commercial Use",
    text: "Free effects are commercial-friendly where marked in the license. Pro is built for production use on client sites, SaaS products, and internal tools alike.",
    link: "/effects",
  },
  {
    id: 2,
    title: "Ownership",
    text: "Every effect you install is source-first - the files land in your repository. You inspect, adapt, and maintain them like the rest of your front end, with no runtime dependency on Hyperiux.",
    link: "/effects/free",
  },
  {
    id: 3,
    title: "Team & Agency Use",
    text: "Pro is licensed per seat by default. Agencies and teams working across multiple client projects should use agency licensing rather than sharing one login.",
    link: "mailto:hello@hyperiux.com",
  },
];

const faqItems = [
  {
    id: "faq1",
    question: "Is Pro available now?",
    answer:
      "Yes. Free Core is available immediately with no account required, and Pro is available today through self-serve checkout - no invite, approval, or waitlist needed.",
  },
  {
    id: "faq3",
    question: "How much do Pro and Pro+ cost?",
    answer:
      "Pro is $27 a quarter or $89 a year. Pro+ is $57 a quarter or $179 a year. Visitors from India see INR prices (Pro ₹1,497 a quarter or ₹4,999 a year, Pro+ ₹2,997 a quarter or ₹8,999 a year), with 18% GST added at checkout.",
  },
  {
    id: "faq4",
    question: "Can I use Free Core without an account?",
    answer:
      "Yes. Free Core effects should be available to preview and install without creating an account.",
  },
  {
    id: "faq5",
    question: "How does billing work?",
    answer:
      "Your plan is billed automatically to your saved payment method, every 3 months or once a year. You'll get a receipt by email each time you're charged, and you can update or remove your payment method at any time.",
  },
  {
    id: "faq6",
    question: "Can I switch plans or billing period?",
    answer:
      "Yes, at the end of your current billing period: let your plan run out, then pick the new one. Templates you've redeemed and code you've installed stay yours.",
  },
  {
    id: "faq-installs",
    question: "What counts as an install?",
    answer:
      "Each new component you copy from the site, add with the Hyperiux CLI or pull in through MCP counts once per day, whichever way you get it. Pro includes 5 a day and Pro+ 10 a day. Getting the same component again that day doesn't count twice.",
  },
  {
    id: "faq-credits",
    question: "How do template credits work?",
    answer:
      "Each credit unlocks one whole template, yours to keep even if you cancel. Pro gets 3 credits a year on yearly billing (quarterly Pro has none) for the selected catalogue. Pro+ gets 5 a year on yearly billing (1 every quarter on quarterly) for the full catalogue. Unused credits roll over while your plan is active.",
  },
  {
    id: "faq7",
    question: "What happens if I cancel Pro?",
    answer:
      "Pro access continues until the end of the current billing period, then reverts to the free tier. Effects you've already installed stay in your repository - cancelling stops new Pro installs, it doesn't touch code you've already shipped.",
  },
  {
    id: "faq8",
    question: "Do you offer refunds?",
    answer:
      "If Pro isn't right for you, contact us within 7 days of a new subscription and we'll issue a refund. Outside that window, cancel anytime to stop future billing.",
  },
  {
    id: "faq9",
    question: "Can my team or agency use one license?",
    answer:
      "Pro is licensed per seat by default. If you need multi-seat or agency coverage, use agency licensing rather than sharing a single login - talk to Hyperiux and we'll scope it to your team size.",
  },
  {
    id: "faq10",
    question: "Do you offer agency or multi-seat pricing?",
    answer:
      "Yes. Agency licensing covers multiple seats and client projects under one agreement, with annual invoicing available - contact Hyperiux to scope it to your team size.",
  },
  {
    id: "faq11",
    question: "What happens to effects I've already installed if I downgrade?",
    answer:
      "Nothing changes in your codebase. Downgrading stops access to installing new Pro effects; source code you've already shipped keeps working exactly as it does today.",
  },
  {
    id: "faq12",
    question: "Do effects require GSAP, Three.js, Lenis, or other libraries?",
    answer:
      "Some do, some don't - every effect page lists its exact dependencies before you install, so you know the setup cost upfront. Scroll and text effects are often dependency-light; WebGL scenes typically require Three.js.",
  },
  {
    id: "faq13",
    question: "Is Vault compatible with the Next.js App Router?",
    answer:
      "Yes. Effects are built with the App Router in mind and documented for client-component boundaries. Pages Router projects are supported too, with setup notes on each effect page.",
  },
  {
    id: "faq14",
    question:
      "Do you offer discounts for students, nonprofits, or open-source projects?",
    answer:
      "We review student, nonprofit, and open-source discount requests case by case - email hello@hyperiux.com with a short description of your use case.",
  },
];
