import type { Metadata } from "next";
import Header from "./Header";
import Hero from "./Hero";
import "./oris-dental.css";
import OrisWrapper from "./OrisWrapper";
import AboutOris from "./AboutOris";
import CareComfort from "./CareComfort";
import DentalTreatments from "./DentalTreatments";
import ParallaxSectionBreak from "./ParallaxSectionBreak";
import Reviews from "./Reviews";
import PassionMeetPurpose from "./PassionMeetPurpose";
import BookAppointment from "./BookAppointment";
import Footer from "./Footer";
import Loader from "./Loader";
import ScrollTopOnLoad from "./ScrollTopOnLoad";

const TITLE = "Oris Dental - Modern Dental Clinic & Care Template";
const DESCRIPTION =
  "A modern dental clinic template featuring interactive 3D teeth visualizer, smooth scroll animations, treatment showcases, patient reviews, and online appointment booking.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function Page() {
  return (
    <OrisWrapper>
      <ScrollTopOnLoad />
      <Loader />
      <Header />
      <Hero />
      <div className="z-10 text-oris-secondary relative bg-white">
        <AboutOris />
        <CareComfort />
        <DentalTreatments />
        {/* <WhyOris /> */}
        <ParallaxSectionBreak />
        <Reviews />
        <PassionMeetPurpose />
        <BookAppointment />
      </div>
      <Footer />
    </OrisWrapper>
  );
}
