"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { COMMUNITY_FAQ } from "./community-data";

// Matches the .ans grid-rows transition in community.css
const OPEN_TRANSITION_MS = 950;

// Accordion on the light sheet. Rows expand with a grid-rows transition, so
// the page only grows below the clicked row and nothing above it moves.
export default function CommunityFAQ() {
  const rootRef = useRef(null);
  const [open, setOpen] = useState([COMMUNITY_FAQ[0].id]);

  useFadeUp(rootRef);

  // Pinned/scrubbed triggers further down need the new page height
  useEffect(() => {
    const timer = setTimeout(() => ScrollTrigger.refresh(), OPEN_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const toggle = (id) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <section ref={rootRef} className="faq cm-faq" id="faq">
      <p className="eyebrow label fadeup">Questions</p>
      <div>
        {COMMUNITY_FAQ.map((item, i) => {
          const isOpen = open.includes(item.id);
          return (
            <div key={item.id} className={`qa fadeup${isOpen ? " open" : ""}`} data-fadeup-delay={i * 0.1}>
              <h3>
                <button type="button" aria-expanded={isOpen} aria-controls={`${item.id}-a`} id={`${item.id}-q`} onClick={() => toggle(item.id)}>
                  {item.question}
                  <span className="pm" aria-hidden="true" />
                </button>
              </h3>
              <div className="ans" id={`${item.id}-a`} role="region" aria-labelledby={`${item.id}-q`}>
                <div><p>{item.answer}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
