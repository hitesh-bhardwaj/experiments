"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { FAQRow } from "@/homepage-v3/sections/FAQV3";
import { COMMUNITY_FAQ } from "./community-data";

// Matches FAQRow's open / close (OPEN_DURATION 0.6s) plus a margin
const OPEN_TRANSITION_MS = 700;

// The homepage FAQ row (one question open at a time), in the community's
// two-column layout: heading on the left, questions on the right.
export default function CommunityFAQ() {
  const rootRef = useRef(null);
  const [openId, setOpenId] = useState(COMMUNITY_FAQ[0].id);

  useFadeUp(rootRef);

  // Pinned/scrubbed triggers further down need the new page height
  useEffect(() => {
    const timer = setTimeout(() => ScrollTrigger.refresh(), OPEN_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [openId]);

  return (
    <section ref={rootRef} className="mx-auto grid max-w-[1536px] grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)] items-start gap-8 px-[clamp(1.25rem,3vw,3rem)] pt-[clamp(7rem,16vh,10rem)] pb-[clamp(7rem,18vh,11rem)] max-[1025px]:grid-cols-1 max-md:pt-24 max-md:pb-24" id="faq">
      <div className="grid content-start gap-[18px]">
        {/* <p className="eyebrow label fadeup">Questions</p> */}
        <h2 className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] fadeup max-w-[10vw] max-[1025px]:max-w-full text-[clamp(2.2rem,4.6vw,4.6rem)]`} data-fadeup-delay="0.1">Frequently Asked Questions</h2>
      </div>
      <div>
        {COMMUNITY_FAQ.map((item, i) => (
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
