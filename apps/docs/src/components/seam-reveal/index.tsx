"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// ── The jaw ────────────────────────────────────────────────────────────────
// Six points, not four. The extra vertices are the whole trick: one corner
// stays anchored at `100% 50%` - the right-hand hinge - while the left edge
// splits open independently along its top and bottom. A four-point polygon
// can't do that, because its left side is a single edge that can only slide.
//
// Reading the points in order: right-hinge, then around the top-left, down
// the left edge, and back along the bottom.
//
//   CLOSED  every point collapsed onto the 50% midline - a hairline.
//   SPLIT   the left edge tears open top and bottom while the right stays
//           pinched at the hinge, so the shape reads as a wedge.
//   OPEN    the top-right and bottom-right corners arrive; full rectangle.
//
// The panel itself never moves. Only the mask animates, so the content behind
// it stays put and is uncovered rather than carried into place.
const CLOSED = "polygon(100% 50%, 0% 50%, 0% 50%, 0% 50%, 0% 50%, 0% 50%)";
const SPLIT = "polygon(100% 50%, 0% 0%, 0% 0%, 0% 48%, 0% 100%, 0% 100%)";
const OPEN = "polygon(100% 50%, 100% 0%, 0% 0%, 0% 48%, 0% 100%, 100% 100%)";

export interface SeamRevealProps {
  image?: string;
  imageAlt?: string;
  text?: string;
  subtext?: string;
  /** Where the article button points. */
  articleHref?: string;
  /** Backdrop the wedge is cut out of. */
  backdropColor?: string;
  /** Fill of the revealed panel. */
  panelColor?: string;
  /**
   * Scroll distance the reveal takes, as a multiple of viewport height.
   * Higher means a slower, longer unfold.
   */
  scrollLength?: number;
  className?: string;
}

function SeamReveal({
  image = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg",
  imageAlt = "",
  text = "Built for the moment it matters",
  subtext = "Every detail planned, rehearsed, and delivered on the day.",
  articleHref = "/effects",
  backdropColor = "#091540",
  panelColor = "#ffffff",
  scrollLength = 2.5,
  className = "",
}: SeamRevealProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;

      if (prefersReducedMotion()) {
        gsap.set(panel, { clipPath: OPEN });
        gsap.set(contentRef.current, { autoAlpha: 1 });
        return;
      }

      // The panel never moves - only its mask opens. Translating it would drag
      // the revealed content along with it.
      gsap.set(panel, { clipPath: CLOSED });
      // Hidden through the hairline frames, so the wedge reads as a solid
      // shape before there is room to hold any copy.
      gsap.set(contentRef.current, { autoAlpha: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: outerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        //   markers: true,
          invalidateOnRefresh: true,
        },
      });

      // Beat one: the wedge tears open from the midline.
      tl.to(panel, { clipPath: SPLIT, duration: 1 }, 0);
      // The content fades up once the mask is 30% open - position 0.3 of the
      // two-beat (duration 1 + 1) timeline.
      tl.to(contentRef.current, { autoAlpha: 1, duration: 0.5 }, 0.3);
      // Beat two: the right-hand corners arrive and the rectangle completes.
      tl.to(panel, { clipPath: OPEN, duration: 1 });
    },
    { scope: outerRef },
  );

  return (
    // Tall outer container + sticky inner viewport: the scroll length lives
    // here, so the reveal scrubs without GSAP pin.
    <section
      ref={outerRef}
      className={`relative z-0 w-full ${className}`}
      style={{
        height: `${scrollLength * 100}vh`,
        backgroundColor: backdropColor,
      }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div
          ref={panelRef}
          className="h-full w-full text-black"
          style={{ backgroundColor: panelColor, clipPath: CLOSED }}
        >
          <div
            ref={contentRef}
            className="mx-auto flex h-full w-full  items-center justify-center px-[clamp(1.5rem,5vw,5rem)] py-[6vh]"
          >
            {/* min-h-0 lets both columns shrink inside the h-screen panel
                instead of pushing past it on short viewports. */}
            <div className="flex h-full min-h-0 w-full items-stretch gap-[clamp(3rem,8vw,9rem)] max-md:flex-col max-md:gap-[4vh]">
              {/* Sizing lives on the wrapper; the Image just fills it. */}
              <div className=" min-h-0 w-[40%] h-[60vh] my-auto  overflow-hidden max-md:h-[34vh] max-md:flex-none">
                <Image
                  src={image}
                  alt={imageAlt}
                  width={1600}
                  height={1600}
                  className="h-full w-full object-cover hover:scale-105 duration-300 transition-all ease-in-out"
                />
              </div>

              {/* Heading pinned to the top, subheading to the bottom. */}
              <div className="flex min-h-0 w-[50%] flex-col justify-center py-[1vh] max-md:justify-start gap-10 max-md:gap-[3vh] max-md:py-0">
                <h2 className=" text-[3.5vw] leading-[0.8]!">
                  {text}
                </h2>
                <p className="max-w-[26ch] text-[clamp(1rem,1.3vw,1.5rem)] leading-tight tracking-[-0.015em] opacity-70 max-md:text-[clamp(0.95rem,4vw,1.25rem)]">
                  {subtext}
                </p>

                {/* Black fill that swaps to white on hover - the border is
                    always there, so the shape doesn't shift on the flip. */}
                <div className="flex flex-wrap items-center gap-[1vw] max-md:gap-[3vw]">
                  <Link
                    href="/effects"
                    className="rounded-full border border-black bg-black px-[1.6vw] py-[1.4vh] text-[0.85vw] uppercase tracking-widest text-white transition-colors duration-300 ease-out hover:bg-transparent hover:text-black max-[1025px]:text-[1.4vw] max-md:px-[6vw] max-md:py-[1.6vh] max-md:text-[3vw]"
                  >
                    Browse effects
                  </Link>
                  <Link
                    href={articleHref}
                    className="rounded-full border border-black bg-black px-[1.6vw] py-[1.4vh] text-[0.85vw] uppercase tracking-widest text-white transition-colors duration-300 ease-out hover:bg-transparent hover:text-black max-[1025px]:text-[1.4vw] max-md:px-[6vw] max-md:py-[1.6vh] max-md:text-[3vw]"
                  >
                    Read article
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SeamReveal;
export { SeamReveal };
