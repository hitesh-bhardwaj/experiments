import VaultShell from "@/Layouts/VaultShell";
import { getSearchIndexEffects } from "@/lib/search-index";
import { FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo-metadata";
import CommunityCrowd from "@/components/Community/CommunityCrowd";
import CommunityHero from "@/components/Community/CommunityHero";
import CommunityFamiliar from "@/components/Community/CommunityFamiliar";
import CommunityStack from "@/components/Community/CommunityStack";
import CommunityFounding from "@/components/Community/CommunityFounding";
import CommunityFAQ from "@/components/Community/CommunityFAQ";
import CommunityJoin from "@/components/Community/CommunityJoin";
import { COMMUNITY_FAQ } from "@/components/Community/community-data";
import CursorV3 from "@/homepage-v3/components/CursorV3";

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
        <CursorV3 />
        {/* data-zone sections steer the crowd; transparent so the site grid + fluid show through */}
        <main id="main-content" className="cm-x relative isolate bg-transparent font-avenir text-base leading-[1.6] text-[#F4F4F4] [&_[id]]:scroll-mt-24">
          <CommunityCrowd />
          <CommunityHero />
          <CommunityFamiliar />
          <CommunityStack />
          <div className="relative z-1 mx-auto max-w-[calc(100%-2*clamp(0px,1vw,16px))] bg-[#F4F4F4] text-[#1D1D1D]" data-zone="sheet">
            <CommunityFounding />
            <CommunityFAQ />
          </div>
          <CommunityJoin />
        </main>
      </VaultShell>
    </>
  );
}
