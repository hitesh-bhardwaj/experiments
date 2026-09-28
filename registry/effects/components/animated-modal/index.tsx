// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useState } from "react";
import ScrollablePopupContent, { type PopupSection } from "./ScrollablePopupContent";
import AnimatedModalContent from "./AnimatedModalContent";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

const popupSections: PopupSection[] = [
  {
    heading: "Project Overview",
    paragraph:
      "This development is envisioned as a premium mixed-use destination, combining residential comfort, retail convenience, and elevated lifestyle experiences in one cohesive ecosystem.",
    list: [
      "Prime urban location with excellent access",
      "Integrated amenities for work, wellness, and leisure",
      "Architecture focused on long-term livability",
    ],
  },
  {
    heading: "Design Philosophy",
    paragraph:
      "Every detail has been planned to create an experience that feels contemporary, intuitive, and timeless. The emphasis is on spatial openness, natural light, and refined materials.",
    list: [
      "Open-plan living concepts",
      "Daylight-first spatial planning",
      "Contemporary material palette",
    ],
  },
  {
    heading: "Investment Potential",
    paragraph:
      "With strong connectivity, growing infrastructure, and a carefully positioned offering, the project is designed to appeal to both end-users and long-term investors seeking sustained value.",
    list: [
      "High-demand micro-market",
      "Future-forward development strategy",
      "Strong long-term appreciation potential",
    ],
  },
  {
    heading: "Lifestyle Experience",
    paragraph:
      "The experience extends beyond residences, offering amenities and shared spaces that promote wellness, community, and a more balanced urban lifestyle.",
    list: [
      "Curated leisure and wellness zones",
      "Community-first shared spaces",
      "Elevated everyday convenience",
    ],
  },
];

export default function AnimatedModal({
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  size = 72,
  overlayOpacity = 0.82,
  duration = 0.5,
  backgroundColor = "#ffffff",
  textColor = "#111111",
  roundedness = 24,
}) {
  const [isContentOpen, setIsContentOpen] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      <button
        type="button"
        onClick={() => {
          setIsContentOpen(true);
        }}
        className="
          cursor-pointer rounded-full border-0 bg-[#111111] px-[2vw] py-[1vw]
          text-white transition-all duration-300 hover:scale-[1.03]
          text-[1vw]
          max-[1025px]:px-[4vw] max-[1025px]:py-[2vw] max-[1025px]:text-[2.2vw]
          max-md:px-[6vw] max-md:py-[3.5vw] max-md:text-[4vw]
        "
      >
        Open Modal
      </button>

      <AnimatedModalContent
        className="h-full backdrop-blur-none "
        isOpen={isContentOpen}
        onClose={() => setIsContentOpen(false)}
        showCloseButton={showCloseButton}
        closeOnBackdrop={closeOnBackdrop}
        closeOnEsc={closeOnEsc}
        overlayOpacity={overlayOpacity}
        duration={duration}
      >
        <ScrollablePopupContent
          title="A Deeper Look at the Project"
          subtitle="Explore the thinking, design strategy, and long-term value proposition behind the development."
          sections={popupSections}
          size={size}
          backgroundColor={backgroundColor}
          textColor={textColor}
          roundedness={roundedness}
        />
      </AnimatedModalContent>

      {prefersReducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-black/10 bg-[#F8F8F3] p-3 text-center"
        >
          <h2 className="text-sm leading-none text-[#111111]">
            The modal fades, not slides.
          </h2>
          <p className="mt-2 text-xs leading-5 text-black/65">
            Animated Modal already keeps its open and close transition to a
            simple opacity fade, so it stays comfortable with reduced motion
            enabled.
          </p>
        </div>
      )}
    </div>
  );
}
