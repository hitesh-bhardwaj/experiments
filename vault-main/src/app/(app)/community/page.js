import SectionOverlay from "@/components/Animations/SectionOverlay";
import dynamic from "next/dynamic";
import VaultShell from "@/Layouts/VaultShell";
import { getSearchIndexEffects } from "@/lib/search-index";
import { FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo-metadata";
import CommunityCrowd from "@/components/Community/CommunityCrowd";
import CommunityHero from "@/components/Community/CommunityHero";

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
    question: "What is Hyperiux Vault Community?",
    answer: "Hyperiux Vault Community is a Discord space built for creative developers, designers and motion enthusiasts who want to push the boundaries of web experiences. It's a place to exchange ideas, explore creative coding, share experiments, and connect with people who are equally passionate about building interactive experiences.",
  },
  { id: "cm-faq2", question: "Who can join Vault Community?", answer: "Whether you're an experienced creative developer, a frontend engineer, a designer learning to code, or a student experimenting with animations, you're welcome here. You don't need years of experience or an impressive portfolio. All you need is curiosity, a willingness to learn and a passion for creating better experiences on the web." },
  {
    id: "cm-faq3",
    question: "Is Vault Community free to join?",
    answer: "Yes, Hyperiux Vault Community is completely free to join. You don't need a Vault Pro subscription, a credit card, or any paid membership to participate. The community is about bringing creative minds together, sharing knowledge, exchanging feedback and growing alongside developers who care about the craft.",
  },
  {
    id: "cm-faq4",
    question: "How do I join Vault Community?",
    answer: "We're getting our Discord community ready for launch. For now, simply enter your email address in the waitlist form at the top of this page. Once the community goes live, we'll send an invitation directly to your inbox with everything you need to join and start connecting with fellow creative developers.",
  },
  { id: "cm-faq5", question: "When will Vault Community launch?", answer: "We're putting the finishing touches on our Discord community and getting everything ready for its official launch. While we haven't announced a specific date yet, we're working towards opening it soon. Join the waitlist and you'll receive an email invitation as soon as the community is ready to welcome members." },
  { id: "cm-faq6", question: "What can I expect inside Vault Community?", answer: "Expect conversations around creative coding, React, Next.js, GSAP, Three.js, WebGL and everything that makes the web more interactive. You'll be able to share projects created using Hyperiux Vault, exchange feedback, explore interesting implementations, discover creative techniques and connect with developers who love experimenting beyond conventional interfaces." },
  { id: "cm-faq7", question: "Do I need Vault Pro to join the community", answer: "Not at all. Vault Community is open to everyone, whether you're using our free effects, have a Vault Pro subscription, or haven't explored Vault yet. While members can discuss Vault components, share implementations and exchange ideas, community membership doesn't require a paid subscription or automatically unlock premium Vault effects." },
  { id: "cm-faq8", question: "Is Vault Community limited to React and Next.js developers?", answer: "Definitely not. While Hyperiux Vault primarily focuses on React and Next.js, our community welcomes anyone passionate about creative web development. Whether you're experimenting with GSAP, Three.js, WebGL, Motion, Vue, Svelte, or Webflow, there's room to share your ideas, explore new techniques and learn from developers working across different technologies." },

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
        <main id="main-content" className="cm-x relative isolate bg-transparent font-avenir text-white [&_[id]]:scroll-mt-24">
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
