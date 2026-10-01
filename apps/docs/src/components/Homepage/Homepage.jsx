import SignalSection from "@/homepage-v3/sections/SignalSection";
import WhyVault from "@/homepage-v3/sections/WhyVault";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import CTAV3 from "@/homepage-v3/sections/CTAV3";
import CurvedGradient from "@/homepage-v3/sections/CurvedGradient";
import ExplainVault from "@/homepage-v3/sections/ExplainVault";
import ExploreTheEffects from "@/homepage-v3/sections/ExploreTheEffects";
import FAQV3 from "@/homepage-v3/sections/FAQV3";
import FooterV3 from "@/homepage-v3/sections/FooterV3";
import Hero from "@/homepage-v3/sections/Hero";
import Preview from "@/homepage-v3/sections/Preview";
import ProblemFixes from "@/homepage-v3/sections/Problem&Fixes";
import Techstack from "@/homepage-v3/sections/Techstack";
import UseCases from "@/homepage-v3/sections/UseCases";
import PricingPlansHome from "@/homepage-v3/sections/PricingPlansHome";
import NavbarV3 from "@/homepage-v3/components/NavbarV3";
import LoaderV3 from "@/homepage-v3/components/LoaderV3";
import DitherTransition from "@/homepage-v3/components/DitherTransition";
import ScrollTopOnLoad from "@/homepage-v3/components/ScrollTopOnLoad";
import SmallMotion from "@/homepage-v3/sections/SmallMotion";
import CursorV3 from "@/homepage-v3/components/CursorV3";

const USE_CASES = [
  {
    id: 1,
    title: "Creative Front-End Developers",
    text: "Stop rebuilding the same scroll reveal, text animation, cursor trail, and transition from scratch. Start from production-ready source and shape it to your project.",
    cta: "Browse Effects",
    link: "/effects",
  },
  {
    id: 2,
    title: "Startup Founders & Product Teams",
    text: "Make your launch page feel more premium without hiring a full motion team. Use Vault to speed up build cycles, and raise perceived product quality.",
    cta: "Start with Free Effects",
    link: "/effects/free",
  },
  {
    id: 3,
    title: "Agencies & Freelancers",
    text: "Move faster on client websites while keeping the work custom. Use Vault as a starting point for high-end interaction systems, then adapt the code for each brand.",
    cta: "See Agency Licensing",
    link: "#",
  },
  {
    id: 4,
    title: "CTOs & CPOs",
    text: "Get the creative benefit of premium motion without committing to an opaque dependency. Source-first code, clear stack choices, and a workflow your developers can own.",
    cta: "Read the Docs",
    link: "/docs",
  },
  {
    id: 5,
    title: "Marketing Teams",
    text: "Upgrade the moments that affect perception: hero sections, campaign pages, product storytelling, proof sections, and final CTAs.",
    cta: "Explore Use Cases",
    link: "#",
  },
];

export default function Homepage({ faqItems, effects = [] }) {

  return (
    <div className="home-type">
      <LoaderV3 />
      <CursorV3 />
      <NavbarV3 effects={effects} introOnLoader />
      {/* Theremin's scroll feel: a slower glide, a slightly stronger wheel */}
      <LenisSmoothScroll lerp={0.065} wheelMultiplier={0.85} />
      <ScrollTopOnLoad />
      <div className="relative">
        <Hero />
        <div className="relative z-10">
          <WhyVault />
          <SmallMotion/>
          {/* <Techstack /> */}
          {/* <CurvedGradient /> */}
          <ProblemFixes />
           <SignalSection />
          <ExploreTheEffects />
         
          {/* <Preview /> */}
          {/* <ExplainVault /> */}
          {/* <UseCases useCases={USE_CASES} /> */}
          {/* <DitherTransition
            markers={false}
            mobileStartTriggers="-10% bottom"
            mobileEndTriggers="bottom -50%"
            className="h-[60vw] max-md:h-[150vw]!"
          /> */}
          <PricingPlansHome />
          {/* <DitherTransition
            dotColor="#ffffff"
            invert
            accentShift={0.8}
            start="top bottom"
            end="150% top"
            mobileStartTriggers="top bottom"
            mobileEndTriggers="bottom -50%"
            markers={false}
            accentColor="#eaeaea"
            className="h-[75vw] mt-[-10vw]"
          /> */}
          <FAQV3 faqItems={faqItems} />
          {/* <CTAV3 /> */}
          <FooterV3 />
        </div>
      </div>
    </div>
  );
}
