import VaultShell from "@/Layouts/VaultShell";
import { getSearchIndexEffects } from "@/lib/search-index";
import { FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo-metadata";
import FooterV3 from "@/homepage-v3/sections/FooterV3";
import CommunityCrowd from "@/components/Community/CommunityCrowd";
import CommunityHero from "@/components/Community/CommunityHero";
import CommunityFamiliar from "@/components/Community/CommunityFamiliar";
import CommunityStack from "@/components/Community/CommunityStack";
import CommunityFounding from "@/components/Community/CommunityFounding";
import CommunityFAQ from "@/components/Community/CommunityFAQ";
import CommunityJoin from "@/components/Community/CommunityJoin";
import { COMMUNITY_FAQ } from "@/components/Community/community-data";
import "@/components/Community/community.css";

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
        {/* .cm-x scopes the community styles; data-zone sections steer the crowd */}
        <main id="main-content" className="cm-x">
          <CommunityCrowd />
          <CommunityHero />
          <CommunityFamiliar />
          <CommunityStack />
          <div className="sheet" data-zone="sheet">
            <CommunityFounding />
            <CommunityFAQ />
          </div>
          <CommunityJoin />
        </main>
        <FooterV3 />
      </VaultShell>
    </>
  );
}
