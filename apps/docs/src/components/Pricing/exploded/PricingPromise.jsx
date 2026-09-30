"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { PROMISES } from "./plans";

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
