import SectionOverlay from "@/components/Animations/SectionOverlay";
import dynamic from "next/dynamic";
import VaultShell from "@/Layouts/VaultShell";
import { getSearchIndexEffects } from "@/lib/search-index";
import { FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo-metadata";
import CommunityCrowd from "@/components/Community/CommunityCrowd";
import CommunityHero from "@/components/Community/CommunityHero";
import Cursor from "@/homepage/components/Cursor";

// Below-the-fold sections load as separate chunks (still server-rendered)
const CommunityFamiliar = dynamic(() => import("@/components/Community/CommunityFamiliar"));
const CommunityStack = dynamic(() => import("@/components/Community/CommunityStack"));
const CommunityFounding = dynamic(() => import("@/components/Community/CommunityFounding"));
const FAQ = dynamic(() => import("@/homepage/sections/FAQ"));
const CommunityJoin = dynamic(() => import("@/components/Community/CommunityJoin"));

// NEEDS PRODUCT CONFIRMATION: the bracketed answers are placeholders from the concept
const COMMUNITY_FAQ = [
  {
    id: "cm-faq1",
    question: "Who is it for?",
    answer: "Front-end and creative developers, designers who code, and anyone who has ever re-timed an animation at 2am because it didn’t feel right. You don’t need to be an expert. You need to care.",
  },
  { id: "cm-faq2", question: "Is it free?", answer: "Joining the waitlist is free. [To confirm: community membership pricing.]" },
  {
    id: "cm-faq3",
    question: "Do I need Vault Pro to join?",
    answer: "[To confirm.] The community is built for anyone who cares about motion on the web, whether you use the free core or Pro.",
  },
  {
    id: "cm-faq4",
    question: "Where will the community live?",
    answer: "[To confirm: platform, e.g. Discord or Circle.] Waitlist members will get the invite link directly.",
  },
  { id: "cm-faq5", question: "When does it open?", answer: "[To confirm: launch date.] Waitlist members hear first and get invited first." },
];

export const metadata = createPageMetadata({
  title: "Vault Community",
  description:
    "A home for developers who treat motion as craft. Live teardowns, first access to new effects, honest critique. Join the waitlist.",
  path: "/community",
});

export default async function CommunityPage() {
  const effects = await getSearchIndexEffects();

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <FAQJSONLD faqs={COMMUNITY_FAQ} />
      <VaultShell effects={effects}>
        <Cursor />
        <main id="main-content" className="cm-x relative isolate bg-transparent font-avenir text-base leading-[1.6] text-white [&_[id]]:scroll-mt-24">
          <CommunityCrowd />
          <CommunityHero />
          <CommunityFamiliar />
          <CommunityStack />
          <SectionOverlay className="relative z-1 bg-light text-ink" data-zone="sheet" data-sound-flow="off">
            <CommunityFounding />
            <div className="[--hx-vw:var(--cvw)]">
              <FAQ faqItems={COMMUNITY_FAQ} />
            </div>
          </SectionOverlay>
          <CommunityJoin />
        </main>
      </VaultShell>
    </>
  );
}
