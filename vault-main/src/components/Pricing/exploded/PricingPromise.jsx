"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

const PROMISES = [
  {
    title: "Ownership",
    text: "Every effect you install lands in your repository as source. No runtime dependency on Hyperiux. Cancel, and your code stays exactly where it is.",
  },
  {
    title: "Commercial use",
    text: "Free effects are commercial-friendly where marked in the license. Pro is built for production: client sites, SaaS products and internal tools alike.",
  },
  {
    title: "Teams & agencies",
    text: "Pro is licensed per seat. Working across client projects?",
    link: { text: "Talk to us about agency licensing", href: "mailto:hello@hyperiux.com" },
  },
];

export default function PricingPromise() {
  const rootRef = useRef(null);
  useFadeUp(rootRef);

  return (
    <section ref={rootRef} className="promise">
      <LineReveal as="h2" className="display d2">
        Cancel anytime. <span className="gradient-text-animate">Keep everything.</span>
      </LineReveal>
      <div className="pm-grid">
        {PROMISES.map((p) => (
          <div key={p.title} className="pm-c fadeup">
            <h3>{p.title}</h3>
            <p>
              {p.text}
              {p.link && (
                <>
                  {" "}
                  <a className="cta3" href={p.link.href}><span className="t3">{p.link.text}</span></a>
                </>
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
