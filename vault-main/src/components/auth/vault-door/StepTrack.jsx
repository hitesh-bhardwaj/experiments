"use client";

import { AnimatePresence, motion } from "motion/react";
import { FOCUS_RING_CLASS } from "./constants";
import { padStep } from "./utils";
import ButtonArrowIcon from "@/components/ui/ButtonArrowIcon";

// Smooth in-out, so a step glides across rather than snapping in
const EASE = [0.65, 0, 0.35, 1];
const DURATION = 0.45;
// A step enters from the right and leaves to the left going forward; the reverse going back.
// 110%: fully past the window's padding, so nothing of the waiting step peeks in.
// The step number rolls like a counter: forward it rolls up, on Back it rolls down.
const ROLL = {
  enter: (direction) => ({ y: direction > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { y: "0%", opacity: 1 },
  exit: (direction) => ({ y: direction > 0 ? "-100%" : "100%", opacity: 0 }),
};
const SLIDE = {
  enter: (direction) => ({ x: direction > 0 ? "110%" : "-110%", opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? "-110%" : "110%", opacity: 0 }),
};

/**
 * The auth forms' step header and sliding window: Back, the "01 / 04" count and a
 * progress bar, then the current step (`children`, keyed by `stepKey`) in an
 * overflow-hidden window - the next step slides in from the right while the previous
 * one slides out to the left (`direction` 1), and the other way on Back (-1).
 */
export function StepTrack({ stepIndex, total, direction, stepKey, onBack, busy = false, children }) {
  const step = stepIndex + 1;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[calc(var(--cvw)*1.4)] max-lg:gap-5">
      <div className="grid gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            disabled={busy || stepIndex === 0}
            aria-label="Back to the previous step"
            // Arrow only; the -ml lines the arrow up with the form's left edge
            className={`group -ml-[calc(var(--cvw)*0.4)] grid cursor-pointer place-items-center p-[calc(var(--cvw)*0.4)] text-white/80 transition-[color,opacity] duration-300 hover:text-primary disabled:pointer-events-none disabled:opacity-0 max-lg:-ml-1.5 max-lg:p-1.5 ${FOCUS_RING_CLASS}`}
          >
            <ButtonArrowIcon className="size-[calc(var(--cvw)*1)] -scale-x-100 transition-transform duration-300 group-hover:-translate-x-1 max-lg:size-4" />
          </button>
          <span className="text24 font-aeonik tracking-[-.02em] text-primary" aria-live="polite">
            <span className="sr-only">
              {padStep(step)} / {padStep(total)}
            </span>
            <span aria-hidden="true" className="inline-flex items-baseline">
              {/* overflow-hidden clips the roll to one line; the invisible copy keeps the width */}
              <span className="relative inline-block overflow-hidden leading-[1.15]">
                <span className="invisible">{padStep(step)}</span>
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                  <motion.span
                    key={step}
                    custom={direction}
                    variants={ROLL}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.45, ease: EASE }}
                    className="absolute inset-0 block"
                  >
                    {padStep(step)}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="whitespace-pre"> / {padStep(total)}</span>
            </span>
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
          className="h-0.5 overflow-hidden bg-white/10"
        >
          <div
            className="h-full origin-left bg-primary transition-transform duration-700 ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none"
            style={{ transform: `scaleX(${step / total})` }}
          />
        </div>
      </div>

      {/* The sliding window. The padding (cancelled by the negative margin) keeps the
          fields' focus rings inside the clip. */}
      <div className="relative -m-1.5 overflow-hidden p-1.5">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={stepKey}
            custom={direction}
            variants={SLIDE}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: DURATION, ease: EASE }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
