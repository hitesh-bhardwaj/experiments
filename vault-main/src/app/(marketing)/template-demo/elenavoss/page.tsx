import type { Metadata } from "next";
import dynamic from "next/dynamic";
import ogImage from "./assets/og-image.webp";
import Hero from "./Hero";
import "./elenavoss.css";
import ReactLenis from "lenis/react";
import Header from "./Header";
import { GetInTouchModalProvider } from "./GetInTouchModal";

const Portfolio = dynamic(() => import("./Portfolio"));
const WhyWorkWithMe = dynamic(() => import("./WhyWorkWithMe"));
const Services = dynamic(() => import("./Services"));
const Awards = dynamic(() => import("./Awards"));
const SectionBreak = dynamic(() => import("./SectionBreak"));
const Testimonials = dynamic(() => import("./Testimonials"));
const Faq = dynamic(() => import("./Faq"));
const Footer = dynamic(() => import("./Footer"));

const TITLE = "Elena Voss - Creative Web Designer Portfolio Template";
const DESCRIPTION =
  "A single-page portfolio template for creative web designers - award-winning work, services, testimonials, and client showcase, built with GSAP scroll animations.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,

    images: [
      {
        url: ogImage.src,
        width: ogImage.width,
        height: ogImage.height,
        alt: TITLE,
      },
    ],
  },
};

const page = () => {
  return (
    <ReactLenis root>
      <GetInTouchModalProvider>
        <div className="elenavoss-body">
          <Header/>
          <Hero />
          <Portfolio/>
          <WhyWorkWithMe/>
          <Services/>
          <Awards/>
          <SectionBreak/>
          <Testimonials/>
          <Faq/>
          <Footer/>
        </div>
      </GetInTouchModalProvider>
    </ReactLenis>
  );
};

export default page;
