"use client";
import Image, { type StaticImageData } from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { motion, AnimatePresence } from "motion/react";
import Testimonial1 from "./assets/testimonial-1.webp";
import Testimonial2 from "./assets/testimonial-2.webp";
import Testimonial3 from "./assets/testimonial-3.webp";
import Testimonial4 from "./assets/testimonial-4.webp";
import Testimonial5 from "./assets/testimonial-5.webp";
import OverflowTextReveal from "./effects/overflow-text-reveal";

gsap.registerPlugin(ScrollTrigger);

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  image: StaticImageData;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "Working with Elena completely transformed our brand's digital presence. Our conversions jumped by 87%. Her thoughtful design approach and seamless communication made the collaboration effortless. Elena doesn't just design websites, she gives your entire brand a confident new voice.",
    name: "Maria Jones",
    role: "Head of Marketing, Adobe",
    image: Testimonial1,
  },
  {
    quote:
      "Elena has an incredible eye for detail. She took a rough brand brief and turned it into a site that finally feels like us. Every scroll, every hover - it all just clicks, and our team barely had to explain what we wanted twice.",
    name: "Marcus Reed",
    role: "Founder, Northline Studio",
    image: Testimonial5,
  },
  {
    quote:
      "We came in with a tight deadline and a messy set of assets. Elena organized everything, proposed a direction we hadn't considered, and shipped a site that outperformed every launch benchmark we set for the quarter.",
    name: "Priya Nair",
    role: "VP Growth, Fielder",
    image: Testimonial3,
  },
  {
    quote:
      "The best part of working with Elena wasn't even the final product - it was how clearly she communicated trade-offs along the way. We always knew why a decision was made, and the result speaks for itself.",
    name: "Daniel Ortiz",
    role: "Creative Director, Wolfframe",
    image: Testimonial4,
  },
  {
    quote:
      "Our old site felt like a brochure. What Elena built feels like a product. Session time is up, bounce rate is down, and for the first time our design and our positioning actually agree with each other.",
    name: "Hannah Kim",
    role: "CEO, Loop & Co",
    image: Testimonial2,
  },
];

// How far a drag has to travel before it counts as a swipe rather than a
// stray pointer movement on the card.
const SWIPE_THRESHOLD = 100;

// The card is a fixed height rather than one that fits its content: quotes
// range from ~200 to ~280 characters, so an auto height visibly jumps as you
// move between them - and because the card is what the thumbnails and arrows
// are positioned against, everything below it shifts too. Sized to hold the
// longest quote at each breakpoint, with the content centred inside so the
// shorter ones sit balanced rather than top-aligned against empty space.
const CARD_HEIGHT = "h-[30vw] max-[1025px]:h-[52vw] max-md:h-[95vw]";

type SwipeDirection = "next" | "prev";

const TestimonialCard = ({
  item,
  onSwipe,
}: {
  item: Testimonial;
  onSwipe: (direction: SwipeDirection) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 0 }}
      transition={{ duration: 0.25 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_event, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) {
          onSwipe("prev");
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
          onSwipe("next");
        }
      }}
      className="pt-[8vw] pb-[4vw] px-[6vw] w-full h-full flex flex-col items-center justify-center gap-[2.5vw] text-center max-[1025px]:pt-[14vw] max-[1025px]:px-[8vw] max-[1025px]:gap-[4vw] max-md:pt-[22vw] max-md:px-[7vw] max-md:pb-[8vw] max-md:gap-[6vw]"
    >
      <div className="flex flex-col gap-[0.4vw] max-md:gap-2">
        <p className="text-[2.6vw] text-[#ff6b00] max-[1025px]:text-[4vw] max-md:text-[6vw]">
          {item.name}
        </p>
        <p className="text-[1.145vw] text-white max-[1025px]:text-[2.2vw] max-md:text-[3.6vw]">
          {item.role}
        </p>
      </div>

      <p className="text-[1.145vw] leading-[1.6] text-white/70 w-[82%] max-[1025px]:text-[2.2vw] max-[1025px]:w-full max-md:text-[3.6vw]">
        &ldquo;{item.quote}&rdquo;
      </p>
    </motion.div>
  );
};

const Testimonials = () => {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);

  const total = testimonials.length;

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = gsap.utils.toArray<HTMLElement>(".testimonial-fade");

    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    const tween = gsap.fromTo(
      targets,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          once: true,
        },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  const handleNext = useCallback(() => {
    setActive((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    setActive((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Thumbnails are laid out with CSS `order` rather than by reordering the
  // array, so each button keeps its identity (and its own transition) while
  // the row rotates around whichever one is active - the active thumb always
  // resolves to order 0, with the rest fanning out to either side of it.
  const getThumbOrder = (index: number) => {
    const half = Math.floor(total / 2);
    const relativeIndex = (index - active + total) % total;
    return relativeIndex <= half ? relativeIndex : relativeIndex - total;
  };

  return (
    <section
      ref={sectionRef}
      className="w-screen bg-[#070707] py-[7vw] px-[4vw] max-[1025px]:px-[5vw] max-[1025px]:py-[12vw]"
      id="testimonials"
    >
      <div className="w-full flex flex-col gap-[6vw] max-[1025px]:gap-[12vw]">
        <div className="w-[65%] mx-auto max-[1025px]:w-full">
          <OverflowTextReveal stagger={0.015}>
            <h2 className="text-[5.2vw] leading-[1.2]! text-center max-[1025px]:text-[7vw] max-md:text-[9vw]">
              Don&apos;t Take It from Us, Take It from Our Clients
            </h2>
          </OverflowTextReveal>
        </div>

        <div className="relative max-md:mt-10">
          <div className={`testimonial-fade opacity-0 relative w-3/5 mx-auto rounded-[2vw] border border-white/10 bg-white/5 overflow-hidden max-[1025px]:w-full max-[1025px]:rounded-[5vw] ${CARD_HEIGHT}`}>
            {/* mode="wait" so the outgoing card finishes before the next
                one enters - crossfading them overlaps two blocks of centred
                text and reads as a flicker. */}
            <AnimatePresence mode="wait">
              <TestimonialCard
                key={testimonials[active].name}
                item={testimonials[active]}
                onSwipe={(direction) => {
                  if (direction === "next") handleNext();
                  if (direction === "prev") handlePrev();
                }}
              />
            </AnimatePresence>
          </div>

          <div className="testimonial-fade opacity-0 flex w-full justify-center items-center absolute -top-[2vw] left-1/2 -translate-x-1/2 max-md:-top-[6vw]">
            {testimonials.map((item, index) => {
              const order = getThumbOrder(index);
              const isActive = order === 0;

              return (
                <motion.button
                  key={item.name}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show testimonial from ${item.name}`}
                  aria-current={isActive}
                  // `layout` turns the order/margin swap below into a FLIP
                  // animation - Motion measures each thumb's position
                  // before and after `active` changes and smoothly
                  // interpolates between them, instead of the flex reorder
                  // just snapping the new active thumb into place. `scale`
                  // is driven from `animate` rather than a Tailwind class
                  // for the same reason: Motion needs to own the
                  // `transform` property itself to merge the FLIP
                  // repositioning and the scale into one animation - a
                  // separate CSS transform class here would fight it.
                  layout
                  animate={{ scale: isActive ? 1.6 : 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  // z-index falls off with distance from the active thumb
                  // (rather than following DOM/array order) so whichever
                  // thumb is visually closer to center - the one the fanned
                  // layout implies is "in front" - is the one that
                  // consistently wins the pointer/hover in the sliver where
                  // two overlapping circles meet, instead of flickering
                  // between both.
                  style={{ order, zIndex: isActive ? 10 : total - Math.abs(order) }}
                  className={`w-[5vw] h-[5vw] rounded-full overflow-hidden [clip-path:circle(50%)] cursor-pointer max-[1025px]:w-[9vw] max-[1025px]:h-[9vw] max-md:w-[12vw] max-md:h-[12vw] ${
                    isActive
                      ? "bg-linear-to-r from-[#F16B0D] to-[#E61416] p-[0.3vw] mx-[2vw] max-md:mx-[4vw]"
                      : // Thumbs left of active pull toward it via -mr, thumbs
                        // right of active pull toward it via -ml - both sides
                        // close the same 1vw gap against the active thumb's
                        // own symmetric mx-[2vw], instead of only the right
                        // side closing it (which is what made the left side
                        // read as having extra, unbalanced space).
                        `opacity-60 hover:opacity-100 ${order < 0 ? "-mr-[1vw]" : "-ml-[1vw]"}`
                  }`}
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={120}
                    height={120}
                    className="w-full h-full object-cover object-top rounded-full"
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Same circle + gradient-fill treatment as the original arrows
              elsewhere in this template, so the controls stay consistent. */}
          <div className="testimonial-fade opacity-0 flex justify-center gap-3 mt-[3vw] max-md:mt-[8vw]">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous testimonial"
              className="size-12 rounded-full border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer relative group overflow-hidden max-md:size-10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative z-2">
                <path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="absolute inset-0 w-full h-full bg-linear-to-r from-[#F16B0D] to-[#E61416] group-hover:scale-100 scale-0 ease-in-out origin-center rounded-full duration-300" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next testimonial"
              className="size-12 rounded-full border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer relative group overflow-hidden max-md:size-10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="relative z-2">
                <path
                  d="M5 12H19M19 12L12 5M19 12L12 19"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="absolute inset-0 w-full h-full bg-linear-to-r from-[#F16B0D] to-[#E61416] group-hover:scale-100 scale-0 ease-in-out origin-center rounded-full duration-300" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
