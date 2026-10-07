"use client";

import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import LineReveal from "@/components/Animations/LineReveal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const INITIAL_COUNT = 6;
const OPEN_DURATION = 0.6;

// const faqItems = [
//   {
//     id: "faq-v3-1",
//     question: "Is Hyperiux Vault a UI kit?",
//     answer:
//       "No. Vault is the interaction layer around your UI kit. Use it beside your design system, shadcn, Tailwind, Radix, or custom components.",
//   },
//   {
//     id: "faq-v3-2",
//     question: "What do I get for free?",
//     answer:
//       "30+ free effects, installable with the CLI and usable in real projects. No account gymnastics, no trial timer, no watermark.",
//   },
//   {
//     id: "faq-v3-3",
//     question: "What does Pro unlock?",
//     answer:
//       "The full library: advanced scroll systems, WebGL scenes, page transitions, complete packs, and every new drop while your plan is active.",
//   },
//   {
//     id: "faq-v3-4",
//     question: "How much does Pro cost?",
//     answer:
//       "$20/month billed monthly, or $179/year billed annually. Annual works out to $14.92/month and saves $61 over monthly billing.",
//   },
//   {
//     id: "faq-v3-5",
//     question: "Can I use Vault commercially?",
//     answer:
//       "Yes. Free and Pro terms are separated clearly in the license. Free effects are commercial-friendly where marked, and Pro is built for production work by developers, teams, founders, and agencies.",
//   },
//   {
//     id: "faq-v3-6",
//     question: "Do I own the code?",
//     answer:
//       "Yes. Vault is source-first. Effects land in your project as real, inspectable files you can read, customize, and maintain locally.",
//   },
//   {
//     id: "faq-v3-7",
//     question: "Does Vault work with Next.js?",
//     answer:
//       "Yes. Vault is built for modern React and Next.js. Some browser-heavy effects need client-side boundaries, and the docs explain exactly how to handle them.",
//   },
//   {
//     id: "faq-v3-8",
//     question: "Will these effects hurt performance?",
//     answer:
//       "Motion has to earn its place. Effects are written with modern performance practices, but the final number depends on your page, your assets, and how much you stack. Test on real devices.",
//   },
//   {
//     id: "faq-v3-9",
//     question: "Do you support reduced motion?",
//     answer:
//       "Effects respect motion-sensitive users with reduced-motion fallbacks, and critical content never depends on an animation running.",
//   },
// ];

// Also used by the Community FAQ
export function FAQRow({ item, isOpen, onToggle, index }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const hasMounted = useRef(false);

  const contentId = useId();
  const buttonId = useId();

  // Resting state for the very first paint (and SSR), so a default-open row
  // renders open instead of popping in on hydration.
  const [initiallyOpen] = useState(isOpen);

  useIsomorphicLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // First pass only sets the resting state, so a default-open row does not
    // animate itself open on load.
    if (!hasMounted.current) {
      hasMounted.current = true;
      gsap.set(outer, {
        height: isOpen ? "auto" : 0,
        overflow: isOpen ? "visible" : "hidden",
      });
      gsap.set(inner, { opacity: isOpen ? 1 : 0, y: isOpen ? 0 : "0.5vw" });
      return;
    }

    const duration = prefersReducedMotion() ? 0 : OPEN_DURATION;

    // `to` (not `fromTo`) so an interrupted row keeps its current height
    // instead of snapping back to 0 / full height for a frame.
    gsap.set(outer, { overflow: "hidden" });

    gsap.to(outer, {
      height: isOpen ? inner.offsetHeight : 0,
      duration,
      ease: "power3.inOut",
      overwrite: "auto",
      onComplete: () => {
        if (!isOpen) return;
        // Back to auto so the row keeps up with resizes and reflowed text.
        gsap.set(outer, { height: "auto", overflow: "visible" });
      },
    });

    gsap.to(inner, {
      opacity: isOpen ? 1 : 0,
      y: isOpen ? 0 : "0.5vw",
      duration: isOpen ? duration : duration * 0.6,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [isOpen]);

  const handleClick = (event) => {
    if (event.target.closest("a, button, input, textarea, select")) return;
    onToggle();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onToggle();
  };

  return (
    <div
      className={`faq-v3-row group relative cursor-pointer px-[0.5vw] py-[2vw] text-background max-md:px-[6vw] max-md:py-[6vw] ${index >= INITIAL_COUNT ? "faq-v3-row-extra" : ""}`}
      role="button"
      tabIndex={0}
      data-sound-click
      aria-expanded={isOpen}
      aria-controls={contentId}
      id={buttonId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full items-start justify-between gap-[1.5vw] max-md:gap-[4vw]">
        <h3 className="text-[1.55vw] font-avenir flex-1 leading-tight max-md:text-[5.2vw]">
          {item.question}
        </h3>
        <span
          aria-hidden="true"
          className={`relative mt-[0.55vw] size-[1.1vw] shrink-0 transition-[color,transform] duration-700 ease-out group-hover:rotate-180 group-hover:text-primary motion-reduce:transition-none max-md:mt-[1.5vw] max-md:size-[4vw] ${isOpen ? "rotate-180 text-primary" : "rotate-0 text-background/45"
            }`}
        >
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
          <span
            className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-transform duration-700 ease-out motion-reduce:transition-none ${isOpen ? "rotate-90" : "rotate-0"
              }`}
          />
        </span>
      </div>

      <div
        id={contentId}
        ref={outerRef}
        role="region"
        aria-labelledby={buttonId}
        style={{
          height: initiallyOpen ? "auto" : 0,
          overflow: initiallyOpen ? "visible" : "hidden",
        }}
      >
        <div
          ref={innerRef}
          style={{ opacity: initiallyOpen ? 1 : 0 }}
          className="pt-[1.2vw] pr-[2.8vw] max-md:pt-[4vw] max-md:pr-[8vw]"
        >
          <p className="text22 font-avenir text-[1.1vw]! leading-[1.6]! max-md:text-[2.2vw]! max-sm:text-[4.1vw]! w-[85%] text-background/70 max-md:w-full">
            {item.answer}
          </p>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-background/18"
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-primary transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:scale-x-100 ${isOpen ? "scale-x-100" : "scale-x-0"
          }`}
      />
    </div>
  );
}

export default function FAQV3({ faqItems, translateTop = true}) {
  const container = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [openId, setOpenId] = useState(faqItems[0].id);

  const visibleItems = isExpanded ? faqItems : faqItems.slice(0, INITIAL_COUNT);

  // Rows rise into place once, as the list scrolls in.
  useGSAP(
    () => {
      const rows = gsap.utils.toArray(".faq-v3-row");

      if (prefersReducedMotion()) {
        gsap.set(rows, { opacity: 1, y: 0 });
        return;
      }

      // Same fade-up as the rest of the page: each row rises as it reaches the viewport
      gsap.set(rows, { opacity: 0, y: 50 });
      rows.forEach((row) => {
        gsap.to(row, {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: { trigger: row, start: "top 90%", once: true },
        });
      });
    },
    { scope: container },
  );

  // Rows revealed by "View More" get the same entrance, without re-running the first batch.
  useGSAP(
    () => {
      if (!isExpanded) return;

      const rows = gsap.utils.toArray(".faq-v3-row-extra");
      if (!rows.length) return;

      if (prefersReducedMotion()) {
        gsap.set(rows, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        rows,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2, stagger: 0.08, ease: "power3.out" },
      );
    },
    { scope: container, dependencies: [isExpanded] },
  );

  return (
    <section
      ref={container}
      id="faq"
      data-sound-flow="off"
      className="relative z-10 h-fit px-[4.5vw] w-full bg-foreground py-[7%] text-background max-md:mt-0! max-md:px-[5vw] max-sm:px-[7vw]"
    >
      <div className="mx-auto w-full max-w-[1536px]">


      <LineReveal
        as="h2"
        className="text64 font-aeonik text-[4.6vw]! max-md:text-[6vw]! max-sm:text-[9vw]! text-center mb-[7vw]  relative z-110  max-md:mb-[12vw] max-md:w-full"
      >
        Questions, <span className="gradient-text-animate">Answered.</span>
      </LineReveal>


      <div className="mx-auto  max-w-[1536px] max-md:w-full px-[5vw]">
        {visibleItems.map((item, index) => (
          <FAQRow
            key={item.id}
            item={item}
            index={index}
            isOpen={openId === item.id}
            onToggle={() =>
              setOpenId((current) => (current === item.id ? null : item.id))
            }
          />
        ))}
      </div>

      {!isExpanded && faqItems.length > INITIAL_COUNT && (
        <div className="faq-v3-row flex w-full items-center  justify-center mt-[3vw] max-md:mt-[10vw]">
          <LinkButton
            href="#"
            onClick={() => setIsExpanded(true)}
            tilted={false}
          underline={true}
            showArrow
            text="View More"
            underlineClassName="mt-0.5"
            shimmer
            shimmerBaseColor="var(--primary)"
            shimmerColor="#ffe2c8"
            className="text-primary! hover:text-primary-hover! transition-colors duration-300 max-md:text34"
          />
        </div>
      )}
      </div>
    </section>
  );
}
