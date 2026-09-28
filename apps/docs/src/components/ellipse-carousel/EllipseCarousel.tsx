'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "@/lib/motion";

// Mirrors Tailwind's `max-md:` breakpoint (max-width: 767px).
const MOBILE_BREAKPOINT = 768;
const MOBILE_RADIUS_X_SCALE = 1.45;
const MOBILE_RADIUS_Y_SCALE = 0.82;
const MOBILE_CARD_SCALE = 0.75;

export interface EllipseCarouselItem {

  src?: string;
  alt?: string;
  bgColor?: string;
  textColor?: string;
  title?: string;
  subtitle?: string;
}

export interface EllipseCarouselProps {
  items?: EllipseCarouselItem[];
  backgroundColor?: string;
  /** Optional heading rendered in the centre of the ring. */
  centerLabel?: string;
  /** Show or hide the optional centre label. */
  showCenterLabel?: boolean;
  /** Card width in px at the biggest (rightmost / active) position. */
  cardWidth?: number;
  /** Card height in px at the biggest (rightmost / active) position. */
  cardHeight?: number;
  /** Card width / height. */
  cardAspect?: number;
  /** Size multiplier at the smallest (leftmost) position, 0-1. */
  minScale?: number;
  /** Ellipse radius on x, as a fraction of stage width. */
  radiusXRatio?: number;
  /** Ellipse radius on y, as a fraction of stage height. */
  radiusYRatio?: number;
  /** Step the ring forward by one card, on a timer, while untouched. */
  autoPlay?: boolean;
  /** Seconds each card stays active before the next one snaps in. */
  holdDuration?: number;
  /** Seconds the snap-to-next-card transition takes. */
  stepDuration?: number;
  /** Easing for the snap transition. */
  stepEase?: string;
  /** Pause the auto-advance while a pointer hovers the ring. */
  pauseOnHover?: boolean;
  /** Let a pointer drag the ring around by hand. */
  draggable?: boolean;
  /** Multiplier on the ring's natural 1:1 angular drag response. */
  dragSensitivity?: number;
  className?: string;
}

const EllipseCarousel = ({
  items = [],
  backgroundColor = "#eeeeee",
  centerLabel="Ellipse Carousel",
  showCenterLabel = true,
  cardWidth = 130,
  cardHeight=180,
  cardAspect = 0.9,
  minScale = 0.2,
  radiusXRatio = 0.25,
  radiusYRatio = 0.36,
  autoPlay = true,
  holdDuration = 1,
  stepDuration = 0.7, 
  stepEase = "power2.inOut",
  pauseOnHover = true,
  draggable = true,
  dragSensitivity = 1,
  className = "",
}: EllipseCarouselProps) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = usePrefersReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const total = items.length;

  // Radians. Grows/shrinks without bound; per-card angle wraps naturally
  // since it only ever feeds sin/cos.
  const rotationRef = useRef(0);
  const hoveredRef = useRef(false);
  const hoverCountRef = useRef(0);
  const draggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const dragOriginRef = useRef({ left: 0, top: 0 });
  const settleTweenRef = useRef<gsap.core.Tween | null>(null);
  const autoplayTweenRef = useRef<gsap.core.Tween | null>(null);
  const autoplayDelayRef = useRef<gsap.core.Tween | null>(null);
  const scheduleNextStepRef = useRef<() => void>(() => {});

  const geometryRef = useRef({
    cx: 0,
    cy: 0,
    radiusX: 320,
    radiusY: 260,
    cardW: cardWidth,
    cardH: cardHeight ?? cardWidth / cardAspect,
  });

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);

    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const width = stage.offsetWidth;
    const height = stage.offsetHeight;
    const cardScale = isMobile ? MOBILE_CARD_SCALE : 1;
    const radiusXScale = isMobile ? MOBILE_RADIUS_X_SCALE : 1;
    const radiusYScale = isMobile ? MOBILE_RADIUS_Y_SCALE : 1;

    geometryRef.current = {
      cx: width / 2,
      cy: height / 2,
      radiusX: width * radiusXRatio * radiusXScale,
      radiusY: height * radiusYRatio * radiusYScale,
      cardW: cardWidth * cardScale,
      cardH: (cardHeight ?? cardWidth / cardAspect) * cardScale,
    };
  }, [cardAspect, cardHeight, cardWidth, isMobile, radiusXRatio, radiusYRatio]);

  useLayoutEffect(() => {
    measure();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [measure]);

  // One pass around the ring: even angular spacing, position on the
  // ellipse, and a size that peaks at the rightmost point (theta = 0) and
  // bottoms out at the leftmost (theta = pi) - z-index rides the same
  // curve, so the biggest card is always the one stacked on top.
  const render = useCallback(() => {
    if (!total) return;
    const { cx, cy, radiusX, radiusY, cardW, cardH } = geometryRef.current;
    const rotation = rotationRef.current;
    const step = (Math.PI * 2) / total;

    for (let i = 0; i < total; i += 1) {
      const card = cardRefs.current[i];
      if (!card) continue;

      const theta = i * step + rotation;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const scale = minScale + (1 - minScale) * ((cosT + 1) / 2);
      const w = cardW * scale;
      const h = cardH * scale;

      const x = cx + radiusX * cosT - w / 2;
      const y = cy + radiusY * sinT - h / 2;

      card.style.width = `${w}px`;
      card.style.height = `${h}px`;
      card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      card.style.zIndex = `${Math.round(scale * 1000)}`;
    }
  }, [minScale, total]);

  const stopAutoplay = useCallback(() => {
    autoplayDelayRef.current?.kill();
    autoplayTweenRef.current?.kill();
    autoplayDelayRef.current = null;
    autoplayTweenRef.current = null;
  }, []);

  // Hold on the active card, then snap the ring forward by exactly one slot
  // so the next card lands dead-centre - a beat, not a drift.
  //
  // scheduleNextStep re-arms itself once the hold/tween finishes, so it needs
  // to call its own latest version from inside GSAP's deferred callbacks.
  // Referencing the useCallback binding directly for that is a TDZ risk as
  // far as the linter can prove (even though it's safe here, since GSAP only
  // ever invokes these after the assignment below completes) - going through
  const scheduleNextStep = useCallback(() => {
    if (!autoPlay || reducedMotion || !total) return;

    autoplayDelayRef.current = gsap.delayedCall(holdDuration, () => {
      if (draggingRef.current || (pauseOnHover && hoveredRef.current)) {
        scheduleNextStepRef.current();
        return;
      }

      const step = (Math.PI * 2) / total;
      const state = { r: rotationRef.current };
      autoplayTweenRef.current = gsap.to(state, {
        r: state.r - step,
        duration: stepDuration,
        ease: stepEase,
        onUpdate: () => {
          rotationRef.current = state.r;
          render();
        },
        onComplete: () => scheduleNextStepRef.current(),
      });
    });
  }, [autoPlay, holdDuration, pauseOnHover, reducedMotion, render, stepDuration, stepEase, total]);

  useLayoutEffect(() => {
    scheduleNextStepRef.current = scheduleNextStep;
  }, [scheduleNextStep]);

  useEffect(() => {
    render();
    scheduleNextStep();
    return () => stopAutoplay();
  }, [render, scheduleNextStep, stopAutoplay]);

  // Grab-and-spin: 1:1 pointer tracking while held, then a short eased tween
  // settles the ring onto whichever card ended up nearest the active slot -
  // same snap the auto-advance uses, just released from a hand-picked spot.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !draggable || !total) return;

    // Angle of the pointer around the ellipse centre, in the same terms as
    // a card's theta (cx/cy/radiusX/radiusY), so tracking it 1:1 keeps
    // whatever the pointer grabbed under the pointer - no matter which side
    // of the ring it's on. A flat pixels-to-radians drag looks fine near the
    // front card but visibly reverses direction once the grabbed point is
    // past the top/bottom of the ellipse, since horizontal pixel motion
    // there maps onto mostly-vertical arc motion.
    const pointerAngle = (e: PointerEvent) => {
      const { cx, cy, radiusX, radiusY } = geometryRef.current;
      const rect = dragOriginRef.current;
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      return Math.atan2((localY - cy) / radiusY, (localX - cx) / radiusX);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      stopAutoplay();
      settleTweenRef.current?.kill();
      settleTweenRef.current = null;
      draggingRef.current = true;
      const rect = stage.getBoundingClientRect();
      dragOriginRef.current = { left: rect.left, top: rect.top };
      lastAngleRef.current = pointerAngle(e);
      stage.setPointerCapture(e.pointerId);
      stage.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const angle = pointerAngle(e);
      let delta = angle - lastAngleRef.current;
      delta = ((delta + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      lastAngleRef.current = angle;
      rotationRef.current += delta * dragSensitivity;
      render();
    };

    const endDrag = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      stage.style.cursor = "grab";
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);

      const step = (Math.PI * 2) / total;
      const target = Math.round(rotationRef.current / step) * step;
      const state = { r: rotationRef.current };

      if (reducedMotion) {
        rotationRef.current = target;
        render();
        scheduleNextStep();
        return;
      }

      settleTweenRef.current = gsap.to(state, {
        r: target,
        duration: 0.5,
        ease: "power3.out",
        onUpdate: () => {
          rotationRef.current = state.r;
          render();
        },
        onComplete: () => {
          settleTweenRef.current = null;
          scheduleNextStep();
        },
      });
    };

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);

    return () => {
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", endDrag);
      stage.removeEventListener("pointercancel", endDrag);
      settleTweenRef.current?.kill();
    };
  }, [dragSensitivity, draggable, reducedMotion, render, scheduleNextStep, stopAutoplay, total]);

  // Autoplay should only pause for a card actually under the pointer, not
  // the empty space around/between cards on the stage - so hover is tracked
  // per card (via a count, since only the topmost overlapping card gets the
  // events) rather than on the stage as a whole.
  const onCardPointerEnter = useCallback(() => {
    hoverCountRef.current += 1;
    hoveredRef.current = true;
  }, []);

  const onCardPointerLeave = useCallback(() => {
    hoverCountRef.current = Math.max(0, hoverCountRef.current - 1);
    hoveredRef.current = hoverCountRef.current > 0;
  }, []);

  if (!total) return null;

  return (
    <section
      className={`relative h-dvh w-full overflow-hidden select-none ${className}`}
      style={{ backgroundColor }}
    >
      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-label="Circular card carousel"
        className={`absolute inset-0 touch-pan-y outline-none ${draggable ? "cursor-grab" : ""}`}
      >
        {showCenterLabel && centerLabel ? (
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
            <span className="text-[3.4vw] font-medium tracking-tight text-black/90">{centerLabel}</span>
          </div>
        ) : null}

        {items.map((item, i) => (
          <div
            key={i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            onPointerEnter={onCardPointerEnter}
            onPointerLeave={onCardPointerLeave}
            className="absolute left-0 top-0 overflow-hidden shadow-xl will-change-transform"
          >
            {item.src ? (
              <Image
                src={item.src}
                alt={item.alt ?? ""}
                fill
                sizes={`${Math.round(cardWidth * (isMobile ? MOBILE_CARD_SCALE : 1))}px`}
                draggable={false}
                className="pointer-events-none select-none object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center"
                style={{ backgroundColor: item.bgColor ?? "#111111", color: item.textColor ?? "#ffffff" }}
              >
                {item.title ? <span className="text-2xl font-black leading-none">{item.title}</span> : null}
                {item.subtitle ? (
                  <span className="text-[0.6rem] uppercase tracking-[0.2em] opacity-70">{item.subtitle}</span>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default EllipseCarousel;
