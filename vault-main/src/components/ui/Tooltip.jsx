"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

// Gap between the trigger and the tooltip.
const GAP = 10;
// Grace period before the tooltip closes, so moving to a neighbouring trigger glides instead of closing and reopening.
const CLOSE_DELAY = 90;

// One shared tooltip for the whole page: triggers only report which one is hovered, and
// <TooltipHost /> (mounted once in the root layout) draws it, sliding between triggers.
let state = null; // { id, label, position, rect } | null
let closeTimer = 0;
const listeners = new Set();

function setState(next) {
  state = next;
  listeners.forEach((fn) => fn());
}
function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const getSnapshot = () => state;
const getServerSnapshot = () => null;

let lastCenter = 0;
function open(next) {
  clearTimeout(closeTimer);
  const center = next.rect.left + next.rect.width / 2;
  // Which way the tooltip travels, so its text slides in from that side.
  const dir = center === lastCenter ? 1 : center > lastCenter ? 1 : -1;
  lastCenter = center;
  setState({ ...next, dir });
}
function close(id) {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    if (state && (id === undefined || state.id === id)) setState(null);
  }, CLOSE_DELAY);
}

function anchorFor(rect, position) {
  if (position === "right") return { x: rect.right + GAP, y: rect.top + rect.height / 2, shift: "translate(0, -50%)", origin: "left center" };
  if (position === "bottom") return { x: rect.left + rect.width / 2, y: rect.bottom + GAP, shift: "translate(-50%, 0)", origin: "top center" };
  return { x: rect.left + rect.width / 2, y: rect.top - GAP, shift: "translate(-50%, -100%)", origin: "bottom center" };
}

export function Tooltip({ label, children, className = "", position = "top", hideOnClick = false }) {
  const id = useId();
  const triggerRef = useRef(null);
  const labelRef = useRef(label);

  // Keep a live label (e.g. "Copy" -> "Copied") flowing into the open tooltip.
  useEffect(() => {
    labelRef.current = label;
    if (state?.id === id && state.label !== label) setState({ ...state, label });
  }, [label, id]);

  useEffect(() => () => close(id), [id]);

  function show() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    open({ id, label: labelRef.current, position, rect });
  }

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={() => close(id)}
      onFocus={show}
      onBlur={() => close(id)}
      onClickCapture={() => {
        if (hideOnClick) {
          clearTimeout(closeTimer);
          if (state?.id === id) setState(null);
        }
      }}
    >
      {children}
    </span>
  );
}

export function TooltipHost() {
  const tip = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mounted = typeof document !== "undefined";

  // Dismiss on resize: the stored rect would be stale.
  useEffect(() => {
    if (!tip) return undefined;
    const hide = () => setState(null);
    window.addEventListener("resize", hide);
    return () => window.removeEventListener("resize", hide);
  }, [tip]);

  if (!mounted) return null;

  let anchor = null;
  if (tip) {
    anchor = anchorFor(tip.rect, tip.position);
  }
  const fromBelow = tip?.position === "bottom" ? -6 : 6;

  return createPortal(
    <AnimatePresence>
      {tip && anchor && (
        <motion.div
          key="tooltip-host"
          // Position glides between triggers; only the very first open pops in at the spot.
          initial={{ x: anchor.x, y: anchor.y }}
          animate={{ x: anchor.x, y: anchor.y }}
          transition={{ type: "spring", stiffness: 500, damping: 36, mass: 0.7 }}
          className="pointer-events-none fixed left-0 top-0 z-9999 max-md:hidden max-lg:hidden"
        >
          <div style={{ transform: anchor.shift }}>
            <motion.div
              role="tooltip"
              initial={{ opacity: 0, scale: 0.85, y: fromBelow }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: fromBelow / 2, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 400, damping: 26, mass: 0.6 }}
              style={{ transformOrigin: anchor.origin }}
              // w-max: size to the label, not to the space left before the viewport edge; max-w still wraps long ones.
              className="relative w-max max-w-[20vw] max-h-30 overflow-hidden bg-[#2B2B2B] px-3 py-1.5 text-center text-xs font-medium text-white shadow-lg"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={`${tip.id}`}
                  initial={{ opacity: 0, x: tip.dir * 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tip.dir * -16 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {/* Same trigger, new label (Copy -> Copied): roll vertically instead. */}
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={typeof tip.label === "string" ? tip.label : "label"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {tip.label}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
