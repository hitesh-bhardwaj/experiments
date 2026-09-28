// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/dist/CustomEase";
import { SplitText } from "gsap/dist/SplitText";

gsap.registerPlugin(CustomEase, SplitText);

const hasEase = (name: string) => {
  try {
    return !!gsap.parseEase(name);
  } catch {
    return false;
  }
};
if (!hasEase("fluidGlide")) {
  CustomEase.create("fluidGlide", "M0,0 C0.3,0.9 0.1,1 1,1");
}
if (!hasEase("fluidSwing")) {
  CustomEase.create("fluidSwing", "M0,0 C0.7,0 0.16,1 1,1");
}
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).gsap = gsap;
}

const LINE_CLASS = "flx_body_line";

const LINE_STYLE = `.${LINE_CLASS}{overflow-x:visible;overflow-y:clip;padding-bottom:0.18em;margin-bottom:-0.18em}`;

const PANEL_RADIUS = 16;
const MOBILE_BREAKPOINT = 768;

const PAIR_GAP = 10;
const OPEN_MARGIN = 16;

export interface ElasticAccordionItem {
  id?: string | number;
  question: string;
  answer: string;
}

export interface ElasticAccordionProps {
  items?: ElasticAccordionItem[];
  startOpen?: number;
  multiple?: boolean;
  duration?: number;
  stagger?: number;
  goo?: number;
  ease?: string;
  bgColor?: string;
  panelColor?: string;
  textColor?: string;
  className?: string;
  onChange?: (index: number, isOpen: boolean) => void;
}

const DEFAULT_ITEMS: ElasticAccordionItem[] = [
  {
    question: "What ARIA pattern does Elastic Accordion need?",
    answer:
      "Use a button-controlled accordion: each question is a button, aria-expanded reflects state, and the answer is associated with the control. Do not use generic div toggles.",
  },
  {
    question: "Where does Elastic Accordion help conversion?",
    answer:
      "Place it near pricing, lead-capture, or product proof where visitors hesitate. It is strongest for objections, not generic educational content.",
  },
  {
    question: "Should FAQ answers be crawlable?",
    answer:
      "Yes. The answer text should exist as HTML so search engines, screen readers, and no-JS users can still access the information.",
  },
  {
    question: "How does it behave with reduced motion?",
    answer:
      "Motion collapses to a near-instant state change and the per-line reveal is disabled, so the same content is reachable without the elastic morph.",
  },
  {
    question: "Can Hyperiux adapt Elastic Accordion for a real brand system?",
    answer:
      "Yes. A custom version should define content structure, accessibility behavior, motion rules, reduced-motion behavior, source handoff, and implementation notes for the specific page job.",
  },
];

interface Row {
  el: HTMLDivElement;
  gooEl: HTMLDivElement;
  gooTrigger: HTMLDivElement;
  gooPanel: HTMLDivElement;
  crisp: HTMLDivElement;
  panelCrisp: HTMLDivElement;
  trigger: HTMLButtonElement;
  panel: HTMLDivElement;
  panelInner: HTMLDivElement;
  answer: HTMLParagraphElement;
  icon: SVGSVGElement;
  filterId: string;
  blurEl: SVGFEGaussianBlurElement | null;
  goo: { std: number };
  isOpen: boolean;
  triggerH: number;
  innerH: number;
  rowW: number;
  split: SplitText | null;
  answerTl: gsap.core.Timeline | null;
  tl: gsap.core.Timeline | null;
}

const ElasticAccordion: React.FC<ElasticAccordionProps> = ({
  items = DEFAULT_ITEMS,
  startOpen = 0,
  multiple = false,
  duration = 0.8,
  stagger = 0.05,
  goo = 9,
  ease = "elastic.out(1,0.82)",
  bgColor = "#ebebe9",
  panelColor = "#101010",
  textColor = "#fffaf2",
  className = "",
  onChange,
}) => {
  const uid = useId().replace(/:/g, "");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rowsRef = useRef<Row[]>([]);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const collect = useCallback(
    (i: number) =>
      (el: HTMLDivElement | null): void => {
        if (!el) return;
        const q = <T extends Element>(sel: string) =>
          el.querySelector(sel) as T | null;
        const gooEl = q<HTMLDivElement>("[data-fx-blob]");
        const gooTrigger = q<HTMLDivElement>(".flx_blob_head");
        const gooPanel = q<HTMLDivElement>(".flx_blob_drawer");
        const crisp = q<HTMLDivElement>(".flx_head_solid");
        const panelCrisp = q<HTMLDivElement>(".flx_drawer_solid");
        const trigger = q<HTMLButtonElement>("[data-fx-head]");
        const panel = q<HTMLDivElement>("[data-fx-drawer]");
        const panelInner = q<HTMLDivElement>(".flx_drawer_pad");
        const answer = q<HTMLParagraphElement>("[data-fx-body]");
        const icon = q<SVGSVGElement>("[data-fx-mark]");
        if (
          !gooEl ||
          !gooTrigger ||
          !gooPanel ||
          !crisp ||
          !panelCrisp ||
          !trigger ||
          !panel ||
          !panelInner ||
          !answer ||
          !icon
        ) {
          return;
        }
        rowsRef.current[i] = {
          el,
          gooEl,
          gooTrigger,
          gooPanel,
          crisp,
          panelCrisp,
          trigger,
          panel,
          panelInner,
          answer,
          icon,
          filterId: `flx-blob-${uid}-${i}`,
          blurEl: null,
          goo: { std: 0 },
          isOpen: false,
          triggerH: 0,
          innerH: 0,
          rowW: 0,
          split: null,
          answerTl: null,
          tl: null,
        };
      },
    [uid]
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const rows = rowsRef.current.filter(Boolean);
    if (!rows.length) return;

    const shapeEase = ease.indexOf("elastic") === 0 ? "fluidGlide" : ease;
    let dur = duration;
    let stag = stagger;

    rows.forEach((r) => {
      r.blurEl = stage.querySelector(
        `#${CSS.escape(r.filterId)} feGaussianBlur`
      );
    });

    const setFilter = (r: Row, on: boolean) => {
      r.gooEl.style.filter = on ? `url(#${r.filterId})` : "none";
    };
    const applyBlur = (r: Row) => {
      r.blurEl?.setAttribute("stdDeviation", String(r.goo.std));
    };
    const measure = (r: Row) => {
      r.triggerH = r.trigger.offsetHeight;
      r.innerH = r.panelInner.offsetHeight;
      r.rowW = r.el.offsetWidth;
    };
    const setClosedShape = (r: Row) => {
      gsap.set([r.gooPanel, r.panelCrisp], {
        x: 4,
        y: 4,
        width: r.rowW - 8,
        height: r.triggerH - 8,
        force3D: true,
      });
    };
    const setTriggerShape = (r: Row) => {
      gsap.set([r.gooTrigger, r.crisp], {
        height: r.triggerH,
        borderRadius:
          window.innerWidth <= MOBILE_BREAKPOINT
            ? PANEL_RADIUS
            : r.triggerH / 2,
      });
    };
    const setA11y = (r: Row, open: boolean) => {
      r.trigger.setAttribute("aria-expanded", open ? "true" : "false");
      r.panel.setAttribute("aria-hidden", open ? "false" : "true");
      if (open) r.panel.removeAttribute("inert");
      else r.panel.setAttribute("inert", "");
    };
    const killRow = (r: Row) => {
      if (r.tl) {
        r.tl.kill();
        r.tl = null;
      }
      gsap.killTweensOf([
        r.gooPanel,
        r.panelCrisp,
        r.panel,
        r.el,
        r.icon,
        r.goo,
        r.answer,
      ]);
    };
    const clearSplit = (r: Row) => {
      if (r.answerTl) {
        r.answerTl.kill();
        r.answerTl = null;
      }
      if (r.split?.revert) {
        r.split.revert();
        r.split = null;
      }
      gsap.set(r.answer, { autoAlpha: 0 });
    };
    const revealAnswer = (r: Row) => {
      clearSplit(r);
      gsap.set(r.answer, { autoAlpha: 1 });
      r.split = SplitText.create(r.answer, {
        type: "lines",
        mask: "lines",
        linesClass: LINE_CLASS,
        onSplit(self) {
          gsap.set(self.lines, { yPercent: 100, y: 0, force3D: true });
          r.answerTl = gsap.timeline();
          r.answerTl.to(self.lines, {
            yPercent: 0,
            y: 0,
            duration: 0.6,
            stagger: stag,
            ease: "fluidGlide",
            force3D: true,
          });
        },
      });
    };

    const close = (r: Row) => {
      r.isOpen = false;
      setA11y(r, false);
      killRow(r);
      const d = 0.65 * dur;
      setFilter(r, true);
      r.tl = gsap.timeline({ defaults: { force3D: true } });
      r.tl
        .to(r.goo, {
          std: goo,
          duration: 0.3 * d,
          ease: "power1.in",
          onUpdate: () => applyBlur(r),
        }, 0)
        .to([r.gooPanel, r.panelCrisp], {
          x: 4,
          y: 4,
          width: r.rowW - 8,
          height: r.triggerH - 8,
          duration: d,
          ease: shapeEase,
        }, 0)
        .to(r.panel, { height: 0, duration: d, ease: shapeEase }, 0)
        .to(r.el, { marginTop: 0, duration: d, ease: shapeEase }, 0)
        .to(r.icon, { rotation: 0, duration: 0.5, ease: "fluidSwing" }, 0)
        .to(r.answer, { autoAlpha: 0, duration: 0.15, ease: "power2.out" }, 0)
        .to(r.goo, {
          std: 0,
          duration: 0.3 * d,
          ease: "power1.out",
          onUpdate: () => applyBlur(r),
          onComplete: () => {
            setFilter(r, false);
            clearSplit(r);
          },
        }, 0.7 * d);
    };

    const open = (r: Row) => {
      r.isOpen = true;
      measure(r);
      setA11y(r, true);
      killRow(r);
      const panelH = PAIR_GAP + r.innerH + OPEN_MARGIN;
      setFilter(r, true);
      r.goo.std = goo;
      applyBlur(r);
      r.tl = gsap.timeline({ defaults: { force3D: true } });
      r.tl
        .to([r.gooPanel, r.panelCrisp], {
          x: 0,
          y: r.triggerH + PAIR_GAP,
          width: r.rowW,
          height: r.innerH,
          duration: dur,
          ease,
        }, 0)
        .to(r.panel, { height: panelH, duration: dur, ease }, 0)
        .to(r.el, { marginTop: OPEN_MARGIN, duration: dur, ease }, 0)
        .to(r.icon, { rotation: 135, duration: 0.5, ease: "fluidSwing" }, 0)
        .to(r.goo, {
          std: 0,
          duration: 0.25 * dur,
          ease: "power1.in",
          onUpdate: () => applyBlur(r),
          onComplete: () => setFilter(r, false),
        }, 0.4 * dur)
        .call(() => revealAnswer(r), undefined, 0.32 * dur);
    };

    const toggle = (i: number) => {
      const r = rows[i];
      if (!r) return;
      if (r.isOpen) {
        close(r);
        onChangeRef.current?.(i, false);
        return;
      }
      if (!multiple) {
        rows.forEach((other, n) => {
          if (n !== i && other.isOpen) close(other);
        });
      }
      open(r);
      onChangeRef.current?.(i, true);
    };

    const focusRow = (i: number, dir: number) => {
      const n = rows.length;
      if (!n) return;
      rows[(i + dir + n) % n].trigger.focus();
    };

    rows.forEach((r, i) => {
      measure(r);
      setTriggerShape(r);
      setClosedShape(r);
      setFilter(r, false);
      gsap.set(r.answer, { autoAlpha: 0 });
      gsap.set(r.panel, { height: 0 });
      gsap.set(r.el, { marginTop: 0 });
      gsap.set(r.icon, { rotation: 0 });
      const isOpen = i === startOpen;
      r.isOpen = isOpen;
      setA11y(r, isOpen);
      if (isOpen) {
        gsap.set([r.gooPanel, r.panelCrisp], {
          x: 0,
          y: r.triggerH + PAIR_GAP,
          width: r.rowW,
          height: r.innerH,
        });
        gsap.set(r.panel, { height: PAIR_GAP + r.innerH + OPEN_MARGIN });
        gsap.set(r.el, { marginTop: OPEN_MARGIN });
        gsap.set(r.icon, { rotation: 135 });
        revealAnswer(r);
      }
    });

    const clickHandlers: Array<() => void> = [];
    const keyHandlers: Array<(e: KeyboardEvent) => void> = [];
    rows.forEach((r, i) => {
      const onClick = () => toggle(i);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          focusRow(i, 1);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          focusRow(i, -1);
        }
      };
      clickHandlers[i] = onClick;
      keyHandlers[i] = onKey;
      r.trigger.addEventListener("click", onClick);
      r.trigger.addEventListener("keydown", onKey);
    });

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        rows.forEach((r) => {
          measure(r);
          setTriggerShape(r);
          if (r.isOpen) {
            gsap.set([r.gooPanel, r.panelCrisp], {
              x: 0,
              y: r.triggerH + PAIR_GAP,
              width: r.rowW,
              height: r.innerH,
            });
            gsap.set(r.panel, {
              height: PAIR_GAP + r.innerH + OPEN_MARGIN,
            });
            gsap.set(r.el, { marginTop: OPEN_MARGIN });
          } else {
            setClosedShape(r);
            gsap.set(r.el, { marginTop: 0 });
          }
        });
      }, 150);
    };
    window.addEventListener("resize", onResize);

    const onVisibility = () => {
      if (document.hidden) gsap.globalTimeline.pause();
      else gsap.globalTimeline.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => {
      const prevDur = dur;
      const prevStag = stag;
      dur = 0.01;
      stag = 0;
      return () => {
        dur = prevDur;
        stag = prevStag;
      };
    });

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(resizeTimer);
      mm.revert();
      rows.forEach((r, i) => {
        r.trigger.removeEventListener("click", clickHandlers[i]);
        r.trigger.removeEventListener("keydown", keyHandlers[i]);
        killRow(r);
        clearSplit(r);
      });
    };
  }, [items, startOpen, multiple, duration, stagger, goo, ease, collect]);

  return (
    <div
      className={`relative flex h-fit w-full items-center justify-center box-border p-10 max-[1025px]:p-8 max-md:p-5 antialiased ${className}`}
      style={{ backgroundColor: bgColor, fontFamily: '"Switzer", -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      <style>{LINE_STYLE}</style>
      <div
        className="relative w-full max-w-140 max-[1025px]:max-w-[92vw] max-md:max-w-full"
        ref={stageRef}
      >
        <svg
          className="absolute h-0 w-0 overflow-hidden pointer-events-none"
          width="0"
          height="0"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            {items.map((_, i) => (
              <filter
                key={i}
                id={`flx-blob-${uid}-${i}`}
                colorInterpolationFilters="sRGB"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="0"
                  result="flx_blur"
                />
                                <feColorMatrix
                  in="flx_blur"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
                  result="flx_blob"
                />
              </filter>
            ))}
          </defs>
        </svg>

        <div className="flex flex-col gap-2">
          {items.map((item, i) => {
            const key = item.id ?? i;
            const tid = `flx-head-${uid}-${i}`;
            const pid = `flx-drawer-${uid}-${i}`;
            return (
              <div className="flx_item group/item relative" key={key} ref={collect(i)}>
                <div
                  className="flx_blob absolute inset-0 z-0 pointer-events-none"
                  data-fx-blob
                  aria-hidden="true"
                >
                  <div
                    className="flx_blob_head absolute top-0 left-0 w-full will-change-transform"
                    style={{ backgroundColor: panelColor }}
                  />
                  <div
                    className="flx_blob_drawer absolute top-0 left-0 w-full will-change-transform"
                    style={{ backgroundColor: panelColor, borderRadius: PANEL_RADIUS }}
                  />
                </div>

                <button
                  className="flx_head relative z-4 flex w-full min-h-14 cursor-pointer items-center gap-3.5 border-0 bg-transparent py-4 px-5.5 text-left box-border font-[inherit] outline-none max-[1025px]:min-h-16 max-[1025px]:gap-4 max-[1025px]:py-[2vw] max-[1025px]:px-[2.5vw] max-md:min-h-14 max-md:gap-3 max-md:py-[4vw] max-md:px-[5vw] focus-visible:outline-2 focus-visible:outline-[#fd551d] focus-visible:outline-offset-2 focus-visible:rounded-full"
                  style={{ color: textColor }}
                  data-fx-head
                  id={tid}
                  aria-controls={pid}
                  aria-expanded="false"
                  type="button"
                >
                  <span
                    className="block max-md:hidden shrink-0 min-w-6 text-xs max-[1025px]:text-[1.4vw] font-medium"
                    style={{ color: textColor, opacity: 0.55 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="flex-1 text-base max-[1025px]:text-[2.5vw]  max-md:text-[4.2vw] leading-snug tracking-tight"
                    style={{ color: textColor, fontWeight: 380 }}
                  >
                    {item.question}
                  </span>
                  <svg
                    className="flx_mark size-4 max-[1025px]:size-5 max-md:size-5 shrink-0 origin-center will-change-transform"
                    style={{ color: textColor, opacity: 0.78 }}
                    data-fx-mark
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 1V15"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M1 8H15"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                <div
                  className="flx_head_solid absolute top-0 left-0 right-0 z-3 pointer-events-none transition-colors duration-300 ease-[cubic-bezier(0.7,0,0.16,1)] group-hover/item:bg-[#1e1e1c]"
                  style={{ backgroundColor: panelColor }}
                  aria-hidden="true"
                />
                <div
                  className="flx_drawer_solid absolute top-0 left-0 z-1 pointer-events-none will-change-transform"
                  style={{ backgroundColor: panelColor, borderRadius: PANEL_RADIUS }}
                  aria-hidden="true"
                />

                <div
                  className="flx_drawer relative z-2 h-0 overflow-hidden will-change-[height]"
                  data-fx-drawer
                  id={pid}
                  role="region"
                  aria-labelledby={tid}
                  aria-hidden="true"
                >
                  <div className="flx_drawer_pad mt-2.5 px-5.5 py-5 max-[1025px]:px-[6vw] max-[1025px]:py-[2.2vw] max-md:px-[5vw] max-md:py-[4.5vw]">
                    <p
                      className="flx_body m-0 text-sm max-[1025px]:text-[2vw] max-md:text-[3.8vw] leading-relaxed tracking-tight"
                      style={{ color: textColor, opacity: 0.78, fontWeight: 380 }}
                      data-fx-body
                      aria-label={item.answer}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ElasticAccordion;
