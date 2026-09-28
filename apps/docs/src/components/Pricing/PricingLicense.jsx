"use client";

import React from "react";
import SplitLine from "../WebsiteComps/SplitLine";
import LinkButton from "../WebsiteComps/LinkButton";
import LineReveal from "../Animations/LineReveal";

const cards = [
  {
    title: "Commercial use",
    body: "Free effects are commercial-friendly where marked in the license. Pro is built for production use on client sites, SaaS products, and internal tools alike.",
  },
  {
    title: "Ownership",
    body: "Every effect you install is source-first - the files land in your repository. You inspect, adapt, and maintain them like the rest of your front end, with no runtime dependency on Hyperiux.",
  },
  {
    title: "Team & agency use",
    body: "Pro is licensed per seat by default. Agencies and teams working across multiple client projects should use agency licensing rather than sharing one login.",
  },
  {
    title: "Cancellation",
    body: "Cancel anytime. Access continues until the end of your current billing period, then reverts to the free tier - code you've already shipped keeps working.",
  },
];

export default function PricingLicense() {
  return (
    <section className="w-full bg-[#0e0e0e] text-white px-[5vw] py-[8vw] max-[1025px]:px-[6vw] max-[1025px]:py-[16vw]">

      {/* Heading */}
      <LineReveal
        as="h2"
        className="text110 text-center w-[70vw] max-[1025px]:w-full mx-auto"
      >
        What you can do with Vault, in plain language.
      </LineReveal>

      {/* Subtext */}
      <SplitLine
        as="p"
        delay={0.15}
        className="text24 text-center mt-[1.5vw] mb-[5vw] w-[48vw] max-[1025px]:w-[88vw] max-[1025px]:mt-4 max-[1025px]:mb-[10vw] mx-auto leading-relaxed"
      >
        A summary of the terms that matter most before you buy - see the full license for the complete legal text.
      </SplitLine>

      {/* Cards grid */}
      <div className="mx-auto w-full max-w-[82vw] max-[1025px]:max-w-full grid grid-cols-2 gap-[1.5vw] max-[1025px]:grid-cols-1 max-[1025px]:gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-[1vw] max-[1025px]:rounded-[4vw] border border-white/8 bg-white/[0.03] p-[2.2vw] max-[1025px]:p-6 flex flex-col gap-[1.2vw] max-[1025px]:gap-4 fadeup"
          >
            <h3 className="text-[2vw] max-md:text-[7vw] max-[1025px]:text-[4.5vw] font-medium text-white/90">{card.title}</h3>
            <p className="text24 max-[1025px]:text-sm text-white/50 leading-relaxed">{card.body}</p>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <div className="text24 max-[1025px]:text-sm text-white/60 text-center mt-[4vw] max-[1025px]:mt-[10vw]">
        Need the complete legal text?{" "}
        
        <LinkButton
          href="#"
          text={"Read the full license"}
          showArrow={false}
          tilted={false}
          shimmer
        />
      </div>
    </section>
  );
}
