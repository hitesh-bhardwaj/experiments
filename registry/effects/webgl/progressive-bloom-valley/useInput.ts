import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { createSuspendedRaf } from "./createSuspendedRaf";
import { prefersReducedMotion } from "./prefersReducedMotion";

interface UseInputOptions {
  scrollIntensity?: number
  autoSpeed?: number
  damping?: number
  loopPoint?: number
}

export default function useInput({
  scrollIntensity = 1,
  autoSpeed = 0.00004,
  damping = 0.5,
  loopPoint = 0.85,
}: UseInputOptions = {}) {
  const { gl } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  const velocity = useRef(0);
  const reduceMotionRef = useRef(prefersReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const onChange = (event: MediaQueryListEvent) => {
      reduceMotionRef.current = event.matches;
      if (event.matches) {
        velocity.current = 0;
      }
    };

    reduceMotionRef.current = mq.matches;
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const el = gl.domElement;

    const wrapScroll = () => {
      if (scroll.current >= loopPoint) {
        scroll.current = 0;
        velocity.current = 0;
      }
      if (scroll.current < 0) {
        scroll.current = loopPoint - 0.001;
        velocity.current = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Reduced-motion: apply scroll instantly (no velocity coast / autoplay feel).
      if (reduceMotionRef.current) {
        scroll.current += e.deltaY * 0.00008 * scrollIntensity;
        velocity.current = 0;
        wrapScroll();
        return;
      }

      velocity.current += e.deltaY * 0.00008 * scrollIntensity;
    };

    let lastTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - lastTouchY;
      lastTouchY = e.touches[0].clientY;

      if (reduceMotionRef.current) {
        scroll.current -= dy * 0.00015 * scrollIntensity;
        velocity.current = 0;
        wrapScroll();
        return;
      }

      velocity.current -= dy * 0.00015 * scrollIntensity;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [gl.domElement, scrollIntensity, loopPoint]);

  useEffect(() => {
    const loop = createSuspendedRaf({
      root: gl.domElement,
      onFrame: () => {
        if (reduceMotionRef.current) {
          // No auto-scroll / velocity coast - user wheel/touch already snaps scroll.
          velocity.current = 0;
          return;
        }

        // damping
        velocity.current *= damping;

        // clamp velocity
        const MAX_VEL = 0.005;
        velocity.current = Math.max(-MAX_VEL, Math.min(MAX_VEL, velocity.current));

        // update scroll
        scroll.current += velocity.current + autoSpeed;

        // Reset at loopPoint - the second valley copy fills the visual gap
        if (scroll.current >= loopPoint) {
          scroll.current = 0;
          velocity.current = 0;
        }
        if (scroll.current < 0) {
          scroll.current = loopPoint - 0.001;
          velocity.current = 0;
        }
      },
    });

    loop.start();
    return () => loop.destroy();
  }, [gl.domElement, autoSpeed, damping, loopPoint]);

  return { mouse, scroll };
}
