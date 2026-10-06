"use client";
import gsap from "gsap";
import React, { useEffect } from "react";

// How many extra relay groups to add on each side, beyond the single
// existing prev/current/next-above-text and -below-text group.
const EXTRA_GROUPS_PER_SIDE = 6;

// Same 3-paragraph structure as the existing hand-written above/below
// blocks, just parameterized on the className suffix so the 12 extra groups
// below don't have to repeat this markup by hand.
function RelayGroup({ suffix }: { suffix: string }) {
  return (
    <div
      className="relative w-[40vw] h-fit"
      style={{ transformStyle: "preserve-3d", perspective: "2000px" }}
    >
      <p
        className={`text-[4vw] font-semibold text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-y-[-80deg] prev-${suffix}-text backface-hidden`}
      >
        MARKETING
      </p>
      <p
        className={`text-[4vw] font-semibold text-center current-${suffix}-text absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 backface-hidden`}
      >
        DESIGN
      </p>
      <p
        className={`text-[4vw] font-semibold text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-y-[80deg] next-${suffix}-text backface-hidden`}
      >
        DEVELOPMENT{" "}
      </p>
    </div>
  );
}

const MultiTextScroll = () => {
  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#multi-text",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        // markers: true,
      },
    });
    gsap.set(".prev-center-text", { rotationY: 0 });
    gsap.set(".current-center-text", { rotationY: 80, x: "10vw" });
    gsap.set(".next-center-text", { rotationY: 80, x: "10vw" });

    tl.to(".prev-center-text", {
      rotationY: -80,
      x: "-20vw",
      ease: "power3.inOut",
      duration: 1,
    });
    tl.to(".current-center-text", {
      rotationY: 0,
      x: "0vw",
      // delay: 0.1,
      ease: "power3.inOut",
      duration: 1,
    });
    tl.to(".current-center-text", {
      rotationY: -80,
      x: "-10vw",
      ease: "power3.inOut",
      duration: 1,
    });
    tl.to(".next-center-text", {
      rotationY: 0,
      x: "0vw",
      // delay:0.1,
      ease: "power3.inOut",
      duration: 1,
    });

    // Above/below stacks: identical rotationY/x targets, ease, and duration
    // to the center relay above - only the timeline position differs, so
    // they trail center by a small stagger instead of moving in lockstep.
    // Added after all four center tl.to() calls (not interleaved with them)
    // and always given an explicit absolute position, so none of this can
    // shift where the center tweens above land - those already had their
    // start times locked in the instant each call above ran.
    gsap.set(".prev-above-text", { rotationY: 0 });
    gsap.set(".current-above-text", { rotationY: 80, x: "10vw" });
    gsap.set(".next-above-text", { rotationY: 80, x: "10vw" });

    gsap.set(".prev-below-text", { rotationY: 0 });
    gsap.set(".current-below-text", { rotationY: 80, x: "10vw" });
    gsap.set(".next-below-text", { rotationY: 80, x: "10vw" });

    const ABOVE_STAGGER = 0.12;
    const BELOW_STAGGER = 0.24;

    tl.to(".prev-above-text", { rotationY: -80, x: "-20vw", ease: "power3.inOut", duration: 1 }, 0 + ABOVE_STAGGER);
    tl.to(".current-above-text", { rotationY: 0, x: "0vw", ease: "power3.inOut", duration: 1 }, 1 + ABOVE_STAGGER);
    tl.to(".current-above-text", { rotationY: -80, x: "-10vw", ease: "power3.inOut", duration: 1 }, 2 + ABOVE_STAGGER);
    tl.to(".next-above-text", { rotationY: 0, x: "0vw", ease: "power3.inOut", duration: 1 }, 3 + ABOVE_STAGGER);

    tl.to(".prev-below-text", { rotationY: -80, x: "-20vw", ease: "power3.inOut", duration: 1 }, 0 + BELOW_STAGGER);
    tl.to(".current-below-text", { rotationY: 0, x: "0vw", ease: "power3.inOut", duration: 1 }, 1 + BELOW_STAGGER);
    tl.to(".current-below-text", { rotationY: -80, x: "-10vw", ease: "power3.inOut", duration: 1 }, 2 + BELOW_STAGGER);
    tl.to(".next-below-text", { rotationY: 0, x: "0vw", ease: "power3.inOut", duration: 1 }, 3 + BELOW_STAGGER);

    // 6 more relay groups on each side, each just continuing the same
    // stagger step outward (level 2 = 2x the base stagger, level 3 = 3x,
    // etc.) - same rotationY/x/ease/duration as every relay above, so the
    // whole stack reads as one continuous cascade the further it is from
    // center, rather than the two original groups being special-cased.
    for (let level = 2; level <= EXTRA_GROUPS_PER_SIDE + 1; level += 1) {
      const aboveSuffix = `above-${level}`;
      const aboveStagger = ABOVE_STAGGER * level;
      gsap.set(`.prev-${aboveSuffix}-text`, { rotationY: 0 });
      gsap.set(`.current-${aboveSuffix}-text`, { rotationY: 80, x: "10vw" });
      gsap.set(`.next-${aboveSuffix}-text`, { rotationY: 80, x: "10vw" });

      tl.to(`.prev-${aboveSuffix}-text`, { rotationY: -80, x: "-20vw", ease: "power3.inOut", duration: 1 }, 0 + aboveStagger);
      tl.to(`.current-${aboveSuffix}-text`, { rotationY: 0, x: "0vw", ease: "power3.inOut", duration: 1 }, 1 + aboveStagger);
      tl.to(`.current-${aboveSuffix}-text`, { rotationY: -80, x: "-10vw", ease: "power3.inOut", duration: 1 }, 2 + aboveStagger);
      tl.to(`.next-${aboveSuffix}-text`, { rotationY: 0, x: "0vw", ease: "power3.inOut", duration: 1 }, 3 + aboveStagger);

      const belowSuffix = `below-${level}`;
      const belowStagger = BELOW_STAGGER * level;
      gsap.set(`.prev-${belowSuffix}-text`, { rotationY: 0 });
      gsap.set(`.current-${belowSuffix}-text`, { rotationY: 80, x: "10vw" });
      gsap.set(`.next-${belowSuffix}-text`, { rotationY: 80, x: "10vw" });

      tl.to(`.prev-${belowSuffix}-text`, { rotationY: -80, x: "-20vw", ease: "power3.inOut", duration: 1 }, 0 + belowStagger);
      tl.to(`.current-${belowSuffix}-text`, { rotationY: 0, x: "0vw", ease: "power3.inOut", duration: 1 }, 1 + belowStagger);
      tl.to(`.current-${belowSuffix}-text`, { rotationY: -80, x: "-10vw", ease: "power3.inOut", duration: 1 }, 2 + belowStagger);
      tl.to(`.next-${belowSuffix}-text`, { rotationY: 0, x: "0vw", ease: "power3.inOut", duration: 1 }, 3 + belowStagger);
    }
  }, []);

  return (
    <>
      <div
        className="w-screen h-[300vh] bg-[#FFBF00] text-[#111111] "
        id="multi-text"
      >
        <div className="w-[40%] h-screen sticky top-0 left-1/2 -translate-x-1/2 flex flex-col justify-center items-center">
          {/* transformStyle: preserve-3d keeps every line's independent
            rotateY below in the same 3D space instead of each one flattening
            onto this wrapper's own plane. gap-6 is what actually separates
            the center line from the two rotated stacks - it's a standalone
            element between them, not part of either array. */}
          <div
            className="flex flex-col items-center gap-16"
            style={{ transformStyle: "preserve-3d", perspective: "800px" }}
          >
            {/* 6 extra above groups, farthest from center first (largest
              stagger) so they stack outward from the existing above-1
              group below in the same order the timeline staggers them. */}
            {Array.from({ length: EXTRA_GROUPS_PER_SIDE }, (_, i) => EXTRA_GROUPS_PER_SIDE + 1 - i).map(
              (level) => (
                <RelayGroup key={`above-${level}`} suffix={`above-${level}`} />
              )
            )}

            <div
              className="relative w-[40vw] h-fit bg-red-500"
              style={{ transformStyle: "preserve-3d", perspective: "2000px" }}
            >
              <p className="text-[4vw] font-semibold text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-y-[-80deg] prev-center-text backface-hidden">
                MARKETING
              </p>
              <p className="text-[4vw] font-semibold text-center current-center-text absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2  backface-hidden">
                DESIGN
              </p>
              <p className="text-[4vw] font-semibold text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-y-[80deg] next-center-text backface-hidden">
                DEVELOPMENT{" "}
              </p>
            </div>

            {/* 6 extra below groups, closest to center first (smallest
              extra stagger), stacking outward below the existing below-1
              group above in the same order the timeline staggers them. */}
            {Array.from({ length: EXTRA_GROUPS_PER_SIDE }, (_, i) => i + 2).map((level) => (
              <RelayGroup key={`below-${level}`} suffix={`below-${level}`} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default MultiTextScroll;
