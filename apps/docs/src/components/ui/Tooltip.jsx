"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Gap between the trigger and the tooltip, replacing the old CSS offsets
// (-top-9 etc.) now that position is computed from the trigger's real
// bounding rect instead of an absolute-positioned CSS sibling.
const GAP = 10;

function computeCoords(rect, position) {
  if (position === "right") {
    return {
      top: rect.top + rect.height / 2,
      left: rect.right + GAP,
      transform: "translateY(-50%)",
    };
  }

  if (position === "bottom") {
    return {
      top: rect.bottom + GAP,
      left: rect.left + rect.width / 2,
      transform: "translateX(-50%)",
    };
  }

  return {
    top: rect.top - GAP,
    left: rect.left + rect.width / 2,
    transform: "translate(-50%, -100%)",
  };
}

// Portaled to <body> with a position computed from the trigger's bounding
// rect, rather than a CSS-absolute sibling of the trigger - a CSS-absolute
// tooltip gets silently clipped by any ancestor with overflow-hidden, which
// is common here (code blocks, the install-command box, a collapsed
// sidebar), so it needs to escape the DOM tree entirely to reliably show up
// regardless of what contains the trigger. Desktop-only: the touch
// breakpoints this matters on don't have hover in the first place.
export function Tooltip({
  label,
  children,
  className = "",
  position = "top",
  hideOnClick = false,
}) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef(null);

  // SSR-safe mounted flag - `mounted` gates a createPortal() call further
  // down, which needs document.body and so can only run after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function show() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setCoords(computeCoords(rect, position));
    setVisible(true);
  }

  function hide() {
    setVisible(false);
  }

  useEffect(() => {
    if (!visible) return undefined;

    // The portaled tooltip isn't a DOM descendant of the trigger anymore,
    // so it won't track a window resize underneath it - dismiss rather than
    // recompute position continuously for a hover-only UI. Scroll used to
    // dismiss it too, but pages that programmatically adjust scroll while
    // hovering (ScrollTrigger.refresh, layout-shifting grid animations,
    // etc.) fired that on effectively every hover, hiding the tooltip the
    // instant it appeared and reading as a flicker.
    window.addEventListener("resize", hide);

    return () => {
      window.removeEventListener("resize", hide);
    };
  }, [visible]);

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClickCapture={() => {
        if (hideOnClick) hide();
      }}
    >
      {children}

      {mounted &&
        visible &&
        coords &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: coords.transform,
            }}
            className="pointer-events-none z-9999  max-w-[20vw] max-h-30  text-center  bg-[#2B2B2B] px-3 py-1.5 text-xs font-medium text-white shadow-lg max-md:hidden max-[1025px]:hidden"
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
