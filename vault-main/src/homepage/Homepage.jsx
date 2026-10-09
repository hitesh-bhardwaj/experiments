import WhyVault from "@/homepage/sections/WhyVault";
import dynamic from "next/dynamic";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import Hero from "@/homepage/sections/Hero";
import Navbar from "@/homepage/components/Navbar";
import Loader from "@/homepage/components/Loader";
import ScrollTopOnLoad from "@/homepage/components/ScrollTopOnLoad";
import SectionOverlay from "@/components/Animations/SectionOverlay";
import SquareCursor from "@/homepage/components/SquareCursor";

// Below-the-fold sections load as separate chunks (still server-rendered)
const ExplainVault = dynamic(() => import("@/homepage/sections/ExplainVault"));
const ProblemFixes = dynamic(() => import("@/homepage/sections/Problem&Fixes"));
const SignalSection = dynamic(() => import("@/homepage/sections/SignalSection"));
const ExploreTheEffects = dynamic(() => import("@/homepage/sections/ExploreTheEffects"));
const PricingPlansHome = dynamic(() => import("@/homepage/sections/PricingPlansHome"));
const FAQ = dynamic(() => import("@/homepage/sections/FAQ"));
const Footer = dynamic(() => import("@/homepage/sections/Footer"));


export default function Homepage({ faqItems, effects = [] }) {
  return (
    <div className="home-type">
      <Loader />
      <SquareCursor />
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
