
// Built using Hyperiux Vault: https://vault.hyperiux.com

import { FadeUp } from "../../gsapAnimations";
import MaskTextReveal from "../mask-text-reveal";
import {
  FAQContent,
  FAQGroup,
  FAQTitle,
  FAQWrapper,
} from "./AnimatedFaqComp";
import { type ReactNode } from "react";

export { FAQContent, FAQGroup, FAQTitle, FAQWrapper };

interface FAQItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  defaultOpen: boolean;
}

const faqItems: FAQItem[] = [
  {
    id: "faq-1",
    title: "Where is Lumera Heights located?",
    content: (
      <>
       Lumera Heights is located in Business Bay, Dubai, offering convenient access to Downtown Dubai, Dubai Mall, Burj Khalifa and the city’s major business and lifestyle destinations.
      </>
    ),
    defaultOpen: true,
  },
  {
    id: "faq-2",
    title: "What types of residences are available?",
    content: (
      <>
       The development offers a collection of 1, 2 and 3-bedroom apartments, along with a limited selection of penthouses, designed with spacious layouts, floor-to-ceiling windows and contemporary finishes.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-3",
    title: "What amenities are available to residents?",
    content: (
      <>
        Residents can enjoy a 65-foot lap pool, wellness spa, fully equipped fitness studio, relaxation lounge, landscaped terrace, residents’ lounge and dedicated children’s play area.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-4",
    title: "What is the starting price?",
    content: (
      <>
        Residences at Lumera Heights start from AED 1.85 million, with pricing varying according to residence type, floor level, size and view.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "faq-5",
    title: "Is there a payment plan available?",
    content: (
      <>
        Yes. Lumera Heights offers a flexible 60/40 payment plan, with 60% payable during construction and the remaining 40% due upon handover.
      </>
    ),
    defaultOpen: false,
  },
];

export default function AnimatedFaq() {
  const defaultOpenItems = faqItems
    .filter((item) => item.defaultOpen)
    .map((item) => item.id);

  return (
    <section className="py-[5%] max-md:pt-[20%]" id="faq">
      <div className="w-full ml-auto max-md:w-full max-[1025px]:w-full px-[5%] max-md:px-[6%]">
        <MaskTextReveal>

        <h2 data-para-anim className="font-neue-montreal text-[#1C1B1A] max-md:mb-[10vw] font-medium! text-[3.8vw] leading-[1.2] max-[1025px]:text-[6.8vw] max-md:text-[8.8vw] mb-[5vw]">
          FAQs
        </h2>
        </MaskTextReveal>
        <FadeUp>

        <div className="w-full ">
          <FAQGroup allowMultiple={false} defaultOpenItems={defaultOpenItems}>
       
            {faqItems.map((item) => (
              <FAQWrapper
                key={item.id}
                itemId={item.id}
                className="group relative mb-[1.1vw] overflow-hidden rounded-md border border-[#111111] transition-colors duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] aria-expanded:border-[#E0D4C6] max-md:mb-[4vw] max-md:rounded-[4.5vw] max-[1025px]:mb-[2vw] max-[1025px]:rounded-[2.5vw]"
                titleClassName="relative z-2 text-[1.5vw] font-medium text-black max-md:text-[5vw] max-[1025px]:text-[3.5vw]"
                contentClassName="relative z-2"
                iconClassName="relative flex h-[2.6vw] w-[2.6vw] items-center justify-center rounded-full border border-black text-black max-md:h-[9vw] max-md:w-[9vw] max-[1025px]:h-[6vw] max-[1025px]:w-[6vw]"
                iconSize={18}
                iconStrokeWidth={1.8}
                duration={0.5}
              >
                <div className="absolute inset-0 origin-top scale-y-0 bg-[#E0D4C6] transition-transform duration-500 ease-[cubic-bezier(0.215,0.61,0.355,1)] group-aria-expanded:scale-y-100" />
                <FAQTitle
                  className="gap-[2vw] font-neue-montreal py-[1.6vw] pl-[2.2vw] pr-[1.6vw] text-left max-md:py-[5vw] max-md:pl-[6vw] max-md:pr-[5vw] max-[1025px]:py-[3vw] max-[1025px]:pl-[4vw] max-[1025px]:pr-[3vw] [&>div:first-child]:max-md:w-[80%]"
                  iconMode="plus"
                >
                  {item.title}
                </FAQTitle>

                <FAQContent className="w-[65%] space-y-[1.5vw] pl-[2.2vw] pb-[1.8vw] text-[1.15vw] leading-normal font-normal text-black max-md:w-[80%] max-md:space-y-[4vw] max-md:pl-[6vw] max-md:pb-[6vw] max-md:text-[4vw] max-[1025px]:w-[90%] max-[1025px]:pl-[4vw] max-[1025px]:pb-[3vw] max-[1025px]:text-[2.7vw]">
                  <p data-para-anim>{item.content}</p>
                </FAQContent>
              </FAQWrapper>
            ))}
          </FAQGroup>
        </div>
         </FadeUp>
      </div>
    </section>
  );
}
