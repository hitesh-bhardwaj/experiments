"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { playStringPluck } from "./stringPluckAudio";

// Vertical space this needs around its 1px baseline - matches
// .string-line's own CSS in elenavoss.css (the <svg> is 100px tall,
// centered on the line via top:-50px). Not a prop: changing one without
// the other would misalign the curve against its own hit-box.
const SVG_HEIGHT = 100;
const CONTROL_X_RATIO = 0.5; // control point stays horizontally centered

interface LineProps {
  strokeColor?: string;
  strokeWidth?: number;
  /** Set false to keep the visual pluck but stay silent. */
  sound?: boolean;
}

function Line({ strokeColor = "#111111", strokeWidth = 2, sound = true }: LineProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  // Mutable animation state as refs, not plain `let`s in the component
  // body - a `let` re-initializes to its default every render (this
  // component would silently forget an in-flight pluck/animation on any
  // re-render), refs persist correctly regardless.
  const progressRef = useRef(0);
  const reqIdRef = useRef<number | null>(null);
  const timeRef = useRef(Math.PI / 2);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Deferred a frame so this isn't a synchronous setState call inside the
    // effect body itself (which forces a cascading extra render right after
    // mount) - matches the same pattern used elsewhere in this template.
    const frameId = window.requestAnimationFrame(() => setPrefersReducedMotion(mq.matches));
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      window.cancelAnimationFrame(frameId);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const setPath = (value: number) => {
    const path = pathRef.current;
    const wrapper = wrapperRef.current;
    if (!path || !wrapper) return;

    // offsetWidth (layout size), not getBoundingClientRect() - in
    // Awards.tsx this sits inside a scale-x-0 -> 1 scroll-reveal wrapper,
    // and getBoundingClientRect() reports the post-transform (possibly
    // still-collapsed) size, which would size the curve wrong while that
    // reveal is mid-animation. Measuring the wrapper itself (rather than
    // assuming a fixed fraction of window width, as the original did)
    // also makes this correct wherever it's placed, not just full-bleed.
    const width = wrapper.offsetWidth;
    const height = SVG_HEIGHT;
    const controlX = width * CONTROL_X_RATIO;

    path.setAttributeNS(
      null,
      "d",
      `M 0 ${height / 2} Q ${controlX} ${height / 2 + value} ${width} ${height / 2}`
    );
  };

  useEffect(() => {
    // Reduced motion: always redraw at 0 (a straight line, per setPath's
    // own math - the control point sits level with both endpoints) and
    // never anything else, since no handler below will ever call setPath
    // with a nonzero value while this is active.
    const target = prefersReducedMotion ? 0 : progressRef.current;
    setPath(target);

    const handleResize = () => setPath(prefersReducedMotion ? 0 : progressRef.current);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (reqIdRef.current != null) cancelAnimationFrame(reqIdRef.current);
    };
  }, [prefersReducedMotion]);

  const animateIn = () => {
    if (reqIdRef.current != null) {
      cancelAnimationFrame(reqIdRef.current);
      timeRef.current = Math.PI / 2;
    }
    reqIdRef.current = requestAnimationFrame(animateIn);
  };

  const manageMouseMove = (e: ReactMouseEvent<HTMLSpanElement>) => {
    progressRef.current += e.movementY / 2;
    setPath(progressRef.current);
  };

  const lerp = (from: number, to: number, amount: number) => from * (1 - amount) + to * amount;

  const animateOut = () => {
    const newProgress = progressRef.current * Math.sin(timeRef.current);
    setPath(newProgress);

    progressRef.current = lerp(progressRef.current, 0, 0.05);
    timeRef.current += 0.5;

    if (Math.abs(progressRef.current) > 0.1) {
      reqIdRef.current = requestAnimationFrame(animateOut);
    } else {
      timeRef.current = Math.PI / 2;
      progressRef.current = 0;
    }
  };

  const resetAnimation = () => {
    if (reqIdRef.current != null) cancelAnimationFrame(reqIdRef.current);
    // Sounded here rather than on enter: this is the instant the string is
    // released and actually starts vibrating, and progressRef still holds
    // how far it was bent, which is exactly the pluck's strength.
    if (sound) playStringPluck(progressRef.current);
    animateOut();
  };

  return (
    <div ref={wrapperRef} className="w-full">
      <div className="string-line lineDraw">
        {/* No hover handlers at all under reduced motion - the hit-box
            still exists but is inert, matching "just a simple straight
            line" rather than pluckable-but-motionless. */}
        <span
          onMouseEnter={prefersReducedMotion ? undefined : animateIn}
          onMouseLeave={prefersReducedMotion ? undefined : resetAnimation}
          onMouseMove={prefersReducedMotion ? undefined : manageMouseMove}
          className="box"
        />
        <svg width="100%" height={SVG_HEIGHT}>
          <path
            ref={pathRef}
            strokeWidth={strokeWidth}
            fill="none"
            style={{ stroke: strokeColor }}
          />
        </svg>
      </div>
    </div>
  );
}

export default Line;
