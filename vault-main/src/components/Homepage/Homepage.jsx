import SignalSection from "@/homepage-v3/sections/SignalSection";
import WhyVault from "@/homepage-v3/sections/WhyVault";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import ExplainVault from "@/homepage-v3/sections/ExplainVault";
import ExploreTheEffects from "@/homepage-v3/sections/ExploreTheEffects";
import FAQV3 from "@/homepage-v3/sections/FAQV3";
import FooterV3 from "@/homepage-v3/sections/FooterV3";
import Hero from "@/homepage-v3/sections/Hero";
import ProblemFixes from "@/homepage-v3/sections/Problem&Fixes";
import PricingPlansHome from "@/homepage-v3/sections/PricingPlansHome";
import NavbarV3 from "@/homepage-v3/components/NavbarV3";
import LoaderV3 from "@/homepage-v3/components/LoaderV3";
import ScrollTopOnLoad from "@/homepage-v3/components/ScrollTopOnLoad";
import CursorV3 from "@/homepage-v3/components/CursorV3";


export default function Homepage({ faqItems, effects = [] }) {
  return (
    <div className="home-type">
      <LoaderV3 />
      <CursorV3 />
      <NavbarV3 effects={effects} introOnLoader />
      <LenisSmoothScroll lerp={0.065} wheelMultiplier={0.85} />
      <ScrollTopOnLoad />
      {/* Sections (not the header) cap ButtonV3's vw sizing at the 1536px container */}
      <div className="relative [--hx-vw:var(--cvw)]">
        <Hero />
        <div className="relative z-10">
          <WhyVault />
          <ExplainVault/>
          <ProblemFixes />
           <SignalSection />
          <ExploreTheEffects />
          <PricingPlansHome />
          <FAQV3 faqItems={faqItems} />
          <FooterV3 />
        </div>
      </div>
    </div>
  );
}
