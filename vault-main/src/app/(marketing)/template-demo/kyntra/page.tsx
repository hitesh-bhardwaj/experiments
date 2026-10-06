// Built using Hyperiux Vault: https://vault.hyperiux.com
import "./kyntra-styles.css";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import ogImage from "./assets/kyntra-og.jpg";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import SectionBreak from "./components/SectionBreak";
import LenisSmoothScroll from "./components/LenisSmoothScroll";
import ScrollTopOnLoad from "./components/ScrollTopOnLoad";
import IntroOverlay from "./components/IntroOverlay";

// Below the fold: these still server-render, only their JS is deferred, so
// HTML, SEO and no-JS content are unchanged.
const Features = dynamic(() => import("./components/Features"));
const Smarter = dynamic(() => import("./components/Smarter"));
const HowKyntraWorks = dynamic(() => import("./components/HowKyntraWorks"));
const Trust = dynamic(() => import("./components/Trust"));
const Testimonial = dynamic(() => import("./components/Testimonial"));
const Blogs = dynamic(() => import("./components/Blogs"));
const KyntraFaq = dynamic(() => import("./components/KyntraFaq"));
const CTA = dynamic(() => import("./components/CTA"));
const ParallaxFooter = dynamic(
  () => import("./components/effects/parallax-footer"),
);

const title = "Kyntra - Smart Home Management App Template";
const description =
  "A single page app landing template for home maintenance and service booking, featuring appliance records, warranties, repair history, trusted professionals and download flows.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [
      { url: ogImage.src, width: ogImage.width, height: ogImage.height },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage.src],
  },
};

const page = () => {
  return (
    <div className="kyntra-page relative">
      <IntroOverlay />
      <ScrollTopOnLoad />
      <LenisSmoothScroll />
      <Header />
      <Hero />
      <About />
      <SectionBreak />
      <Features />
      <Smarter />
      <HowKyntraWorks />
      <Trust />
      <Testimonial />
      <Blogs />
      <KyntraFaq />
      <CTA />
      <ParallaxFooter />
    </div>
  );
};

export default page;
