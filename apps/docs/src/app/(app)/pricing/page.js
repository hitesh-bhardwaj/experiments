import { headers } from "next/headers";
import VaultShell from "@/Layouts/VaultShell";
import { getSearchIndexEffects } from "@/lib/search-index";
import Hero from "@/components/Pricing/Hero";
import GlowingPlatesDeferred from "@/Experience/GlowingPlatesDeferred";
import Footer from "@/components/Homepage/Footer";
import CTA2 from "@/components/Homepage/CTA2";
import PricingCompareTable from "@/components/Pricing/PricingCompareTable";
import PricingLicense from "@/components/Pricing/PricingLicense";
import { FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import FAQs from "@/components/Homepage/FAQs";
import Pricing from "@/components/Pricing/Pricing";
import { createPageMetadata } from "@/lib/seo-metadata";
import FAQV3 from "@/homepage-v3/sections/FAQV3";
import UseCases from "@/homepage-v3/sections/UseCases";
import PricingV3 from "@/homepage-v3/sections/PricingV3";
import DitherTransition from "@/homepage-v3/components/DitherTransition";
import FooterV3 from "@/homepage-v3/sections/FooterV3";
import CubeBackgroundAscii from "@/homepage-v3/components/CubeBackgroundAscii";
const USE_CASES = [
  {
    id: 1,
    title: "Commercial use",
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
    title: "Team & agency use",
    text: "Pro is licensed per seat by default. Agencies and teams working across multiple client projects should use agency licensing rather than sharing one login.",
    link: "#",
  },
];

export const metadata = createPageMetadata({
  title: "Hyperiux Vault Pricing | Pro React Effects Library",
  description:
    "Simple Vault pricing: start free with 30+ effects, or go Pro for the full 150+ effect library, WebGL scenes, and cursor effects from $20/month.",
  path: "/pricing",
  image:
    "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/pricing.jpg",
});

// Reads Vercel's edge-injected geo header - makes this route dynamic
// (acceptable here: it's the checkout page, already personalized via
// Clerk client hooks; unlike the homepage teaser, static rendering isn't
// the priority for a page whose whole job is a live purchase flow).
export default async function PricingPage() {
  const headersList = await headers();
  const isIndia = headersList.get("x-vercel-ip-country") === "IN";
  const effects = await getSearchIndexEffects();

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <FAQJSONLD faqs={faqItems} />
      <VaultShell effects={effects}>
        <main id="main-content">
          <Hero />
          <CubeBackgroundAscii
            debug={false}
            src="/homepage-v3/pricing/new/3.mp4"
            config={{
              charSet: "hyperiux",
              charColumns: 179,
              charZoom: 1.01,
              charGap: 0.35,
              dither: 0.45,
              glyphGain: 2.4,
              videoScale: 1.36,
              videoOffsetX: 0.28,
              videoOffsetY: 0,
              levelsLow: 0.43,
              levelsHigh: 1,
              brightnessMap: 0.8,
              rampLow: 0,
              rampHigh: 0.63,
              invert: false,
            }}
          />
          <DitherTransition
            mobileEndTriggers={"bottom -50%"}
            className="h-[46vw]  max-[1025px]:h-[150vw]! bg-background "
          />
          <div className="max-[1025px]:mt-[-50vw] max-md:mt-0">
          <PricingV3 isIndia={isIndia} auth />

          </div>
          <DitherTransition
            dotColor="#050505"
            accentColor="#eaeaea"
            className="h-[70vw] mt-[-5vw] max-[1025px]:h-[150vw]! bg-foreground"
          />
          <div className="mt-[-35vw]">
            <PricingCompareTable isIndia={isIndia} />
          </div>
          <UseCases useCases={USE_CASES} />
          <div className="max-md:mt-[-30vw]!  ">
            <FAQV3 faqItems={faqItems} translateTop={false} />
          </div>
          {/* <CTA2 /> */}
        </main>
        <FooterV3 />
      </VaultShell>
    </>
  );
}
const faqItems = [
  {
    id: "faq1",
    question: "Is Pro available now?",
    answer:
      "Yes. Free Core is available immediately with no account required, and Pro is available today through self-serve checkout - no invite, approval, or waitlist needed.",
  },
  {
    id: "faq3",
    question: "Will pricing change after launch?",
    answer:
      "Pro is $20/month or $179/year, with Indian pricing shown in INR (GST included at checkout) for visitors browsing from India.",
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
      "Pro is billed automatically to the card on file - monthly at $20/month, or annually at $179/year. You'll get a receipt by email each time you're charged, and you can update or remove your payment method at any time.",
  },
  {
    id: "faq6",
    question: "Can I switch between monthly and annual?",
    answer:
      "Yes. Switch to annual at any time and the change applies at your next billing date. Switching from annual to monthly takes effect at the end of your current annual term.",
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
