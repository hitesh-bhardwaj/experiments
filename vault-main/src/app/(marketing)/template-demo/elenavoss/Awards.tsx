"use client";
import { Fragment, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import portfolio1Img from './assets/portfolio-img-1.webp'
import portfolio2Img from './assets/portfolio-img-2.webp'
import portfolio3Img from './assets/portfolio-img-3.webp'
import portfolio4Img from './assets/portfolio-img-4.webp'
import OverflowTextReveal from "./effects/overflow-text-reveal";
import Line from "./Line";

gsap.registerPlugin(ScrollTrigger);

const AWARD_ITEMS = [
  { title: "Honorable Mention", meta: "2026 - AWWARDS", imgSrc: portfolio1Img },
  { title: "Site of the Day", meta: "2026 - AWWARDS", imgSrc: portfolio2Img },
  {
    title: "The Webby Awards",
    meta: "2026 - OFFICIAL SELECTION",
    imgSrc: portfolio3Img,
  },
  { title: "FWA", meta: "2026 - FWA OF THE DAY", imgSrc: portfolio4Img },
];

// The "pill" container snaps to whichever row is hovered, using its real
// measured position (not a crude cursor-relative offset) - a springy ease
// gives it the snap/settle feel of a physical pill locking onto a tab.
const PILL_SNAP_DURATION = 0.65;
const PILL_SNAP_EASE = "back.out(1.6)";

// Each hovered block's image grows in from its own center (scale 0 -> 1),
// stacking on top of whichever ones came before rather than replacing a
// single shared element - so if you hover quickly, you genuinely see
// multiple images scaling up over one another. Every card keeps its own
// tween untouched when a different one is hovered - nothing gets killed
// or reset - so a still-growing previous image just keeps growing
// underneath the newest one instead of snapping away. Scale-only, no
// opacity - every card stays fully opaque throughout, so the growth
// itself is what's visible the whole time.
//
// Duration matters a lot here: at 0.9s, rapidly hopping across rows
// (each getting maybe 100-150ms of dwell time) meant every interrupted
// card only ever reached ~30-40% scale before the next one covered it -
// none of them ever grew large enough to cover the frame's edges, so
// only a small flickering thumbnail changed in the center while
// everything around it stayed on whatever was last fully grown, well
// before the rapid sequence even started. That reads as "static," not
// smooth. Short duration + a fast-out ease lets each reveal actually
// finish (or get close) even under quick successive hovers.
const IMAGE_REVEAL_DURATION = 0.45;
const IMAGE_REVEAL_EASE = "power2.out";
// The resting/revealed scale - slightly over 1 so the image reads as a
// subtle zoomed-in crop rather than sitting flush at its container's exact
// edges.
const IMAGE_ACTIVE_SCALE = 1.05;

// How long the whole image-container fades in/out as the cursor
// enters/leaves the row list (.awards-container).
const CONTAINER_FADE_DURATION = 0.4;

const Awards = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Strictly increasing with every reveal, so the most-recently-hovered
  // card is *always* guaranteed a higher z-index than every card before
  // it - two fixed values (like "10"/"20") can tie once more than two
  // cards have been through a cycle, and ties resolve by DOM order
  // rather than recency, which is what caused the old "wrong image on
  // top" glitch. A monotonic counter makes that class of bug impossible.
  const zIndexCounterRef = useRef(AWARD_ITEMS.length);
  const prefersReducedMotionRef = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  // Which row the geometry-based hover tracker (updateActiveRowAt below)
  // last activated - null once the cursor has left the list entirely.
  const activeRowIndexRef = useRef<number | null>(null);
  // Live cursor position, tracked globally (see the window mousemove effect
  // below) rather than only while a React onMouseMove fires from inside the
  // list - client coordinates don't change when the page scrolls under a
  // stationary cursor, so re-running the same row lookup against this on
  // every scroll tick (see the scroll listener below) is what makes the
  // image follow whichever row has scrolled under the cursor, even when
  // only the page, not the mouse, is moving.
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    gsap.set(containerRef.current, { y: 0 });
    gsap.set(cardRefs.current, { opacity: 1 });
    cardRefs.current.forEach((card, i) => {
      gsap.set(card, { zIndex: i + 1 });
    });
    gsap.set(cardRefs.current[0], { scale: IMAGE_ACTIVE_SCALE });
    cardRefs.current.slice(1).forEach((card) => {
      gsap.set(card, { scale: 0 });
    });
  }, []);

  // Each row divider draws in from the left as it individually scrolls up
  // to 70% of the viewport - a per-line trigger (not one shared trigger
  // for the whole list) so they draw one at a time as you scroll past
  // them, not all at once.
  useEffect(() => {
    const lines = lineRefs.current.filter(Boolean) as HTMLDivElement[];

    // The dividers are authored at scale-x-0 and only become visible as this
    // tween runs, so this can't simply be skipped under reduced motion -
    // they'd stay invisible. They're drawn immediately at full width instead,
    // which is the finished state without the sweep.
    if (prefersReducedMotionRef.current) {
      gsap.set(lines, { scaleX: 1 });
      return;
    }

    const tweens = lines.map((line) =>
      gsap.to(line, {
        scaleX: 1,
        duration: 0.8,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: line,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      })
    );

    return () => {
      tweens.forEach((tween) => tween.scrollTrigger?.kill());
      tweens.forEach((tween) => tween.kill());
    };
  }, []);

  // Gates the whole image-container behind cursor presence over the row
  // list (.awards-container) - everything inside it (pill snap, per-card
  // scale reveal) is untouched, this just fades the container itself.
  const handleListEnter = () => {
    // Still shown/hidden under reduced motion - which image is visible is
    // real information, not decoration - just without the crossfade.
    gsap.to(imageContainerRef.current, {
      opacity: 1,
      duration: prefersReducedMotionRef.current ? 0 : CONTAINER_FADE_DURATION,
      ease: "power2.out",
    });
  };

  const handleListLeave = () => {
    activeRowIndexRef.current = null;
    gsap.to(imageContainerRef.current, {
      opacity: 0,
      duration: prefersReducedMotionRef.current ? 0 : CONTAINER_FADE_DURATION,
      ease: "power2.out",
    });
  };

  // useCallback (stable identity across renders, since it only closes over
  // refs and constants) so the mousemove/scroll effects below can safely
  // declare it as a dependency instead of only capturing whichever version
  // existed on mount.
  const handleRowEnter = useCallback((index: number) => {
    // Snap the pill to the hovered row's real position every time,
    // even re-hovering the already-active row, so the pill always
    // tracks properly rather than only reacting to a change of index.
    // The container's rest position (with y backed out) is remeasured
    // live on every hover instead of once at mount - getBoundingClientRect
    // is viewport-relative, so a stale mount-time measurement (captured
    // before the page ever scrolled to this section) would be miles off
    // once the user actually scrolls down and the viewport frame shifts.
    const rowEl = rowRefs.current[index];
    const container = containerRef.current;
    if (rowEl && container) {
      const currentY = gsap.getProperty(container, "y") as number;
      const containerRect = container.getBoundingClientRect();
      const containerRestCenterY =
        containerRect.top + containerRect.height / 2 - currentY;
      const rowRect = rowEl.getBoundingClientRect();
      const rowCenterY = rowRect.top + rowRect.height / 2;
      const targetY = rowCenterY - containerRestCenterY;
      if (prefersReducedMotionRef.current) {
        // The springy travel between rows is the most motion-heavy part of
        // this section; the panel still moves to the right row, immediately.
        gsap.set(container, { y: targetY });
      } else {
        gsap.to(container, {
          y: targetY,
          duration: PILL_SNAP_DURATION,
          ease: PILL_SNAP_EASE,
        });
      }
    }

    const incoming = cardRefs.current[index];
    if (!incoming) return;

    zIndexCounterRef.current += 1;
    gsap.set(incoming, { zIndex: zIndexCounterRef.current });

    // Every hover (mouseenter only fires once per actual entry, so
    // this never retriggers from just moving around inside the same
    // row) restarts THIS card's reveal from scratch - scale snapped
    // back to 0 first, then regrown - regardless of whether it was
    // already fully visible or still mid-transition. That's the
    // point: entering a block should always generate its image from
    // center again, not just bring an already-grown one back to
    // front. Other cards are untouched - whatever they're doing
    // (including a previous reveal still in flight) just keeps
    // playing out underneath this one.
    gsap.killTweensOf(incoming);
    if (prefersReducedMotionRef.current) {
      gsap.set(incoming, { scale: IMAGE_ACTIVE_SCALE });
    } else {
      gsap.set(incoming, { scale: 0 });
      gsap.to(incoming, {
        scale: IMAGE_ACTIVE_SCALE,
        duration: IMAGE_REVEAL_DURATION,
        ease: IMAGE_REVEAL_EASE,
      });
    }
  }, []);

  // Which row is "hovered" is computed here from raw geometry (a point vs.
  // each row's own getBoundingClientRect), not from onMouseEnter/
  // onMouseLeave on the row elements - the divider between rows (.box in
  // elenavoss.css) has a deliberately oversized pluck hit-region (40px by
  // default, growing to 150px on its own hover) that visually overlaps
  // whichever row(s) sit next to it. Relying on the browser's own
  // mouseenter/mouseleave there meant hovering that overlap either
  // mis-triggered the wrong row (when the divider was nested inside one
  // row) or repeatedly flickered the row's own reveal on and off (when the
  // divider sat between rows as a sibling) - both are just symptoms of
  // hit-testing an element that was never meant to represent "which row is
  // active." Recomputing straight from each row's real rect sidesteps the
  // divider's hit-box entirely, and only calls handleRowEnter when the
  // computed index actually changes, so moving around within the same
  // row's own bounds never re-triggers it. Checks both axes (not just Y) -
  // this now runs off a WINDOW-level position, not one scoped to the list,
  // so a point that's vertically level with a row but horizontally
  // somewhere else on the page entirely must not count as hovering it.
  const updateActiveRowAt = useCallback((clientX: number, clientY: number) => {
    const rows = rowRefs.current;
    let nextIndex: number | null = null;
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i]?.getBoundingClientRect();
      if (
        rect &&
        clientY >= rect.top &&
        clientY < rect.bottom &&
        clientX >= rect.left &&
        clientX < rect.right
      ) {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex === null || nextIndex === activeRowIndexRef.current) return;
    activeRowIndexRef.current = nextIndex;
    handleRowEnter(nextIndex);
  }, [handleRowEnter]);

  // Cursor position is tracked with a WINDOW-level listener, not the row
  // list's own onMouseMove - a listener scoped to the list only fires while
  // a real mousemove event happens to land inside it, which stayed stale
  // (or never updated at all if the list's own onMouseEnter/onMouseLeave
  // boundary was ever slightly off) the moment the page scrolled under a
  // stationary cursor instead of the cursor itself moving. Tracking
  // globally means the scroll listener below always has the actual live
  // position to re-check against, regardless of list hover state.
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
      updateActiveRowAt(event.clientX, event.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [updateActiveRowAt]);

  // Re-checks the row-under-the-cursor on every scroll tick too, not just
  // on mousemove - without this, scrolling the page with the mouse resting
  // still over the list would leave the image stuck on whatever row was
  // last actually moused over, instead of following whichever row has
  // scrolled to that same on-screen position. Plain native scroll (not
  // Lenis's own callback form) - Lenis doesn't suppress native scroll
  // dispatch, and this only needs a resting position re-check, not a
  // per-frame velocity/progress feed.
  useEffect(() => {
    const handleScroll = () => {
      const pos = lastMousePosRef.current;
      if (!pos) return;
      updateActiveRowAt(pos.x, pos.y);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [updateActiveRowAt]);

  return (
    <section
      className="relative w-screen bg-[#070707] text-white py-[7vw]"
      id="awards"
    >
      <div className="w-screen flex items-center px-[4vw] gap-[4vw]  max-[1025px]:px-[5vw]">
        <div className="w-full">
          <OverflowTextReveal stagger={0.015}>
            <h2 className="text-[5.5vw] leading-[1.2]  mb-[4vw] max-[1025px]:text-[7vw] max-md:text-[9vw]">
              Awards and Industry
              <br />
              Recognition
            </h2>
          </OverflowTextReveal>

          <div onMouseEnter={handleListEnter} onMouseLeave={handleListLeave}>
   
            {AWARD_ITEMS.map((item, i) => (
              <Fragment key={item.title}>
                {i !== 0 && (
                  <div
                    ref={(el) => {
                      lineRefs.current[i - 1] = el;
                    }}
                    className="relative h-px w-full origin-left scale-x-0"
                  >
                    <Line strokeColor="rgba(255, 255, 255, 0.4)" />
                  </div>
                )}
                <div
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  className="relative py-8 awards-container"
                >
                  <OverflowTextReveal splitBy="lines">

                  <h3 className="text-[1.8vw] font-normal max-[1025px]:text-[3.4vw] max-md:text-[5.5vw]">{item.title}</h3>
                  </OverflowTextReveal>
                  <OverflowTextReveal splitBy="lines">

                  <p className="text-[1.25vw] tracking-wide text-white/30 mt-3 max-[1025px]:text-[2.2vw] max-md:text-[3.6vw]">
                    {item.meta}
                  </p>
                  </OverflowTextReveal>
                </div>
              </Fragment>
            ))}
            <div
              ref={(el) => {
                lineRefs.current[AWARD_ITEMS.length - 1] = el;
              }}
              className="relative h-px w-full origin-left scale-x-0"
            >
              <Line strokeColor="rgba(255, 255, 255, 0.4)" />
            </div>
          </div>
        </div>

        {/* Hover-to-reveal is a desktop-only interaction (nothing to hover
            on touch), and this panel is absolutely positioned overlapping
            the list - at narrower widths there isn't room for both, so it's
            hidden and the list takes the full row instead. */}
        <div
          ref={imageContainerRef}
          className="w-[40vw] flex justify-center absolute right-[10%] pointer-events-none opacity-0 max-[1025px]:hidden image-container"
        >
          <div
            ref={containerRef}
            className="w-[40vw] h-[22vw] relative bg-[#070707] rounded-lg overflow-hidden shadow-2xl will-change-transform"
          >
            {AWARD_ITEMS.map((item, i) => (
              <div
                key={item.title}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="absolute inset-0"
              >
                <Image
                  src={item.imgSrc}
                  alt="awards-image"
                  className="w-full h-full object-cover rounded-lg "
                  width={600}
                  height={400}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Awards;
