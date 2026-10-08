"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { FAQRow } from "@/homepage-v3/sections/FAQV3";

// Matches FAQRow's open / close (OPEN_DURATION 0.6s) plus a margin
const OPEN_TRANSITION_MS = 700;

// The homepage FAQ row (one question open at a time), in the community's
// two-column layout: heading on the left, questions on the right.
export default function CommunityFAQ({ items = [] }) {
  const rootRef = useRef(null);
  const [openId, setOpenId] = useState(items[0]?.id);

  useFadeUp(rootRef);

  // Pinned/scrubbed triggers further down need the new page height
  useEffect(() => {
    const timer = setTimeout(() => ScrollTrigger.refresh(), OPEN_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [openId]);

  return (
    <section ref={rootRef} className="mx-auto flex w-full max-w-[1536px] items-start justify-between gap-[2vw] px-[4.5vw] py-[7%] max-[1025px]:flex-col max-[1025px]:gap-[5vw] max-md:px-[6vw] max-md:py-24" id="faq">
      <LineReveal as="h2" className="text80 w-[32%] max-w-[10vw] font-aeonik font-normal max-[1025px]:w-full max-[1025px]:max-w-full">Frequently Asked Questions</LineReveal>
      <div className="w-[66%] max-[1025px]:w-full">
        {items.map((item, i) => (
          <div key={item.id} className="fadeup" data-fadeup-delay={i * 0.1}>
            <FAQRow
              item={item}
              index={i}
              isOpen={openId === item.id}
              onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
