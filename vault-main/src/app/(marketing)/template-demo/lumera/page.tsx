// Built using Hyperiux Vault: https://vault.hyperiux.com
import "./lumera-styles.css";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import ScrollTopOnLoad from "./ScrollTopOnLoad";
import Loader from "./Loader";
import ogImage from "./assets/og.png";
import Header from "./Header";
import Hero from "./Hero";
import LenisSmoothScroll from "./LenisSmoothScroll";
import EnquiryModalProvider from "./EnquiryModal";


const About = dynamic(() => import("./About"));
const HorizontalFeatureRevealSection = dynamic(
  () => import("./effects/horizontal-feature-reveal/HorizontalFeatureRevealSection"),
);
const Service = dynamic(() => import("./Service"));
const Works = dynamic(() => import("./Works"));
const Project = dynamic(() => import("./Project"));
const ShowCase = dynamic(() => import("./ShowCase"));
const Gallery = dynamic(() => import("./Gallery"));
const Bringing = dynamic(() => import("./Bringing"));
const ProjectHover = dynamic(() => import("./ProjectHover"));
const AnimatedFaq = dynamic(() => import("./effects/animated-faq"));
const Highlights = dynamic(() => import("./Highlights"));
const Roi = dynamic(() => import("./Roi"));
const CTA = dynamic(() => import("./CTA"));
const ParallaxFooter = dynamic(() => import("./effects/parallax-footer"));

export const metadata: Metadata = {
  title: "Lumera Heights - Luxury Dubai Real Estate Template",
  description:
    "A single-page luxury real estate template for Dubai property launches, featuring residences, amenities, gallery, nearby highlights, and enquiry flows.",
  openGraph: {
    title: "Lumera Heights - Luxury Dubai Real Estate Template",
    description:
      "A single-page luxury real estate template for Dubai property launches, featuring residences, amenities, gallery, nearby highlights, and enquiry flows.",
    images: [{ url: ogImage.src, width: ogImage.width, height: ogImage.height }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumera Heights - Luxury Dubai Real Estate Template",
    description:
      "A single-page luxury real estate template for Dubai property launches, featuring residences, amenities, gallery, nearby highlights, and enquiry flows.",
    images: [ogImage.src],
  },
};

export default function Page() {
  return (
    <div className="lumera-page relative">
      <EnquiryModalProvider>
      <Loader />
      <ScrollTopOnLoad />
      <LenisSmoothScroll />
      <Header />
      <Hero />
      <About />
      <HorizontalFeatureRevealSection />
      <Service />
      <Works />
      <Project />
      <ShowCase />
      <Gallery/>
      <Bringing />
      <ProjectHover />
      <AnimatedFaq />
      <Highlights />
      <Roi />
      <CTA />
      <ParallaxFooter />
      </EnquiryModalProvider>
    </div>
  );
}
