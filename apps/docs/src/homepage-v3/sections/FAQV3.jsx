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
import { ChevronRight } from "lucide-react";
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

function FAQRow({ item, isOpen, onToggle, index }) {
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
      className={`faq-v3-row group cursor-pointer border-grey px-[2.5vw] py-[2vw] max-[1025px]:px-[3.5vw] max-[1025px]:py-[3vw] max-[1025px]:px-[4vw] max-[1025px]:py-[4vw] max-md:px-[6vw] max-md:py-[6vw] ${index > 0 ? "border-t" : ""
        } ${index >= INITIAL_COUNT ? "faq-v3-row-extra" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      aria-controls={contentId}
      id={buttonId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full items-start gap-[1.5vw] max-[1025px]:gap-[2.5vw] max-[1025px]:gap-[3vw] max-md:gap-[4vw]">
        <ChevronRight
          size={18}
          strokeWidth={1.5}
          aria-hidden="true"
          className={`mt-[0.55vw] shrink-0 transition-[rotate,color] duration-500 ease-out group-hover:text-white motion-reduce:transition-none max-[1025px]:mt-[1vw] max-[1025px]:mt-[1vw] max-md:mt-[1.5vw] ${isOpen ? "rotate-90 text-white" : "rotate-0 text-light-grey"
            }`}
        />

        <h3 className="text-[1.55vw] font-neue-haas flex-1 leading-tight max-[1025px]:text-[3.4vw] max-md:text-[5.2vw]">
          {item.question}
        </h3>
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
          className="pt-[1.2vw] pl-[2.8vw] max-[1025px]:pt-[2vw] max-[1025px]:pl-[5vw] max-[1025px]:pt-[2.5vw] max-[1025px]:pl-[7vw] max-md:pt-[4vw] max-md:pl-[8vw]"
        >
          <p className="text22 font-neue-haas w-[85%] text-white leading-[1.45] max-[1025px]:w-full max-[1025px]:w-[90%] max-[1025px]:text-[2.2vw] max-md:w-full max-md:text-[4vw]">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQV3({ faqItems, translateTop = true }) {
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

      gsap.fromTo(
        rows,
        { opacity: 0, y: "2vw" },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: container.current,
            start: "top 80%",
            once: true,
          },
        },
      );
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
        { opacity: 0, y: "2vw" },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" },
      );
    },
    { scope: container, dependencies: [isExpanded] },
  );

  return (
    <section
      ref={container}
      id="faq"
      className={`h-fit w-full self-padd ${translateTop ? "translate-y-[-35vw] max-[1025px]:translate-y-[-80vw]!" : ""} relative  max-[1025px]:mt-0!  my-[7vw]  text-white max-[1025px]:py-[15vw] max-md:py-[22vw]`}
    >


      <LineReveal
        as="h2"
        className="t96 text-center font-neue-haas mb-[7vw] max-[1025px]:mt-[30vw]  relative z-110 max-[1025px]:mb-[8vw]  max-md:mb-[12vw] max-[1025px]:w-full"
      >
        Questions, <span className="gradient-text-animate">Answered.</span>
      </LineReveal>


      <div className="w-[90%] max-[1025px]:w-full max-[1025px]:w-full mx-auto border border-grey">
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
        <div className="flex w-full items-center  justify-center mt-[3vw] max-[1025px]:mt-[5vw] max-[1025px]:mt-[7vw] max-md:mt-[10vw]">
          <LinkButton
            href="#"
            onClick={() => setIsExpanded(true)}
            shimmer
            tilted={false}
          underline={true}
            showArrow
            text="View More"
            className="max-md:text34"
          />
        </div>
      )}
    </section>
  );
}
