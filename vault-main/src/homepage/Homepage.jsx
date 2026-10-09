import SignalSection from "@/homepage/sections/SignalSection";
import WhyVault from "@/homepage/sections/WhyVault";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import ExplainVault from "@/homepage/sections/ExplainVault";
import ExploreTheEffects from "@/homepage/sections/ExploreTheEffects";
import FAQ from "@/homepage/sections/FAQ";
import Footer from "@/homepage/sections/Footer";
import Hero from "@/homepage/sections/Hero";
import ProblemFixes from "@/homepage/sections/Problem&Fixes";
import PricingPlansHome from "@/homepage/sections/PricingPlansHome";
import Navbar from "@/homepage/components/Navbar";
import Loader from "@/homepage/components/Loader";
import ScrollTopOnLoad from "@/homepage/components/ScrollTopOnLoad";
import SectionOverlay from "@/components/Animations/SectionOverlay";
import Cursor from "@/homepage/components/Cursor";


export default function Homepage({ faqItems, effects = [] }) {
  return (
    <div className="home-type">
      <Loader />
      <Cursor />
      <Navbar effects={effects} introOnLoader />
      <LenisSmoothScroll lerp={0.065} wheelMultiplier={0.85} />
      <ScrollTopOnLoad />
      {/* Sections (not the header) cap Button's vw sizing at the 1536px container */}
      <div className="relative [--hx-vw:var(--cvw)]">
        <Hero />
        <div className="relative z-10">
          <WhyVault />
          <ExplainVault/>
          <ProblemFixes />
           <SignalSection />
          <ExploreTheEffects />
          {/* Pricing + FAQ are one white sheet: it scales in at pricing and leaves after the FAQ */}
          <SectionOverlay>
            <PricingPlansHome />
            <FAQ faqItems={faqItems} />
          </SectionOverlay>
          <Footer />
        </div>
      </div>
    </div>
  );
}
