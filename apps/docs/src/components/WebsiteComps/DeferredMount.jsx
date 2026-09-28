"use client";

import { useEffect, useRef, useState } from "react";

// Keeps heavy children (WebGL scenes) out of the critical path.
// strategy="idle": mounts after window load + first idle period.
// strategy="visible": mounts when the wrapper nears the viewport.
export default function DeferredMount({
  children,
  strategy = "idle",
  rootMargin = "600px 0px",
  className = "",
  fallback = null,
}) {
  const [ready, setReady] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (strategy === "visible") {
      const el = wrapperRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setReady(true);
            observer.disconnect();
          }
        },
        { rootMargin }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }

    let idleId = null;
    let cancelled = false;
    const arm = () => {
      if (cancelled) return;
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => setReady(true), { timeout: 3000 });
      } else {
        idleId = window.setTimeout(() => setReady(true), 300);
      }
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", arm);
      if (idleId !== null) {
        if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
        else window.clearTimeout(idleId);
      }
    };
  }, [strategy, rootMargin]);

  if (strategy === "visible") {
    return (
      <div ref={wrapperRef} className={className}>
        {ready ? children : fallback}
      </div>
    );
  }

  return ready ? children : fallback;
}
