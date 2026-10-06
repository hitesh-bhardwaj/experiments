// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import {
  FAQContent,
  FAQGroup,
  FAQTitle,
  FAQWrapper,
} from "./effects/animated-faq/AnimatedFaqComp";
import { type ReactNode } from "react";

import { FadeUp, ParaAnim, lineDraw } from "./Animations/gsapAnim";
interface FAQItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  defaultOpen: boolean;
}

const faqItems: FAQItem[] = [
  {
    id: "faq-1",
    title: "What exactly does Kyntra do?",
    content: (
      <>
        <p>
          Kyntra is a home-management app that combines maintenance, service
          bookings, appliance records, warranties, invoices and professional
          support inside one home profile.
        </p>
        <p>
          Instead of starting from zero every time something needs attention,
          Kyntra carries the history forward.
        </p>
      </>
    ),
    defaultOpen: true,
  },
  {
    id: "faq-2",
    title: "Do I need to add every appliance manually?",
    content: (
      <p>
        No. You can start with just the essentials and let Kyntra fill in the
        rest as services happen - each visit, part and invoice is attached
        to the right appliance automatically.
      </p>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-3",
    title: "Can Kyntra actually book professionals for me?",
    content: (
      <p>
        Yes. Describe the problem and Kyntra identifies the service, shows the
        expected cost and connects you with a trusted professional you can
        schedule in a few taps.
      </p>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-4",
    title: "What happens if the same problem comes back?",
    content: (
      <p>
        Kyntra keeps the full repair history, so a recurring issue is flagged
        with everything that was done last time - the professional starts
        with context instead of guessing.
      </p>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-5",
    title: "Can I manage more than one property?",
    content: (
      <p>
        Yes. Add as many homes as you need and switch between them - each
        property keeps its own appliances, warranties, service history and
        professionals.
      </p>
    ),
    defaultOpen: false,
  },
];

export default function KyntraFaq() {
  lineDraw();

  const defaultOpenItems = faqItems
    .filter((item) => item.defaultOpen)
    .map((item) => item.id);

  return (
    <section
      id="faq"
      className="kyntra-container relative w-full bg-white text-black"
    >
      <div className="mx-auto max-w-400">
        <ParaAnim
          as="h2"
          className="font-helvetica-neue mb-[4vw] leading-[1.15] font-normal tracking-[-0.02em] max-[1025px]:mb-[8vw] max-[1025px]:text-[6vw] max-md:text-[8vw]"
        >
          Frequently Asked Questions
        </ParaAnim>

        <FAQGroup allowMultiple={false} defaultOpenItems={defaultOpenItems}>
          {faqItems.map((item) => (
            <FAQWrapper
              key={item.id}
              itemId={item.id}
              className="group relative rounded-lg  transition-[padding,color] duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] aria-expanded:py-3 has-[+[aria-expanded=true]]:[&_[data-line-draw]]:opacity-0 max-md:rounded-[4.5vw]"
              titleClassName="relative z-2 font-helvetica-neue text-[1.6vw] font-normal text-black transition-colors duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] group-aria-expanded:text-white max-[1025px]:text-[3.4vw] max-md:text-[5vw]"
              contentClassName="relative z-2"
              iconClassName="flex h-[2.4vw] w-[2.4vw] items-center justify-center rounded-full bg-kyntra-primary text-white transition-colors duration-500 max-md:h-[9vw] max-md:w-[9vw] max-[1025px]:h-[6vw] max-[1025px]:w-[6vw]"
              iconSize={18}
              iconStrokeWidth={1.8}
              duration={0.5}
            >
      
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
              >
                <div className="absolute inset-0 origin-top  scale-y-0 bg-kyntra-primary transition-transform duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none group-aria-expanded:scale-y-100" />
              </div>
              {/* Hairline, hidden once card fills */}
              <div
                data-line-draw
                className="absolute right-[1.3vw] bottom-0 left-[1.3vw] z-2 h-px bg-black transition-opacity duration-300 group-aria-expanded:opacity-0 max-md:right-0 max-md:left-0"
              />
              <FAQTitle
                className="gap-[2vw] pl-6 text-[1.65vw] max-[1025px]:text-[5vw] max-md:text-[6vw]! py-[1.6vw] pr-[1.4vw]  text-left max-md:py-[5vw] max-md:pr-[5vw] max-md:pl-[5vw] max-[1025px]:py-[3vw] max-[1025px]:pr-[3vw] max-[1025px]:pl-[3vw]"
                iconMode="plus"
              >
                <FadeUp>{item.title}</FadeUp>
              </FAQTitle>

              <FAQContent className="w-[70%] pl-7 space-y-[1vw] pr-[2vw] pb-[1.8vw]  text-22 leading-[1.6] font-normal text-white/90 max-md:w-[90%] max-md:space-y-[4vw] max-md:pr-[6vw] max-md:pb-[6vw] max-md:pl-[5vw] max-md:text-[4vw] max-[1025px]:w-[90%] max-[1025px]:pr-[4vw] max-[1025px]:pb-[3vw] max-[1025px]:pl-[3vw] max-[1025px]:text-[2.7vw]">
                <FadeUp>{item.content}</FadeUp>
              </FAQContent>
            </FAQWrapper>
          ))}
        </FAQGroup>
      </div>
    </section>
  );
}
