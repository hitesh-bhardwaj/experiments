"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RemixerPanel from "@/components/remixer-panel/RemixerPanel";
import Button from "@/homepage/components/Button";
import { getGroupsFromRemixerControls } from "@/components/remixer-panel/RegistryRemixerDemo";
import { useRemixerControls } from "@/components/remixer-panel/useRemixerControls";
import { buildRemixerJsx } from "@/components/remixer-panel/build-remixer-code";
import gsap from "gsap";
import { MEDIA } from "@/lib/breakpoints";

// Same message the preview chrome sends its device iframe (onEmbedValues)
const MSG = "vault-preview:values";
const EASE = "cubic-bezier(.16,1,.3,1)";
// 13px-equivalent text in vw: desktop · tablet (max-lg) · mobile (max-md).
const DESKTOP_FRAME = { width: 1920, height: 1080 };

const T13 = "text-[1.1vw] max-lg:text-[1.6vw] max-md:text-[3.3vw]";

// JSON-safe copy, so the values can cross postMessage into the iframe
function cloneable(values) {
  try {
    return JSON.parse(JSON.stringify(values));
  } catch {
    return {};
  }
}

/**
 * Interactive stage for the effect detail page (GSAP Flip Card prototype):
 * Preview / Playground tabs, Replay and Live Preview. The stage is the
 * effect's own demo page in embed mode; the Playground is the demo pages'
 * remixer, and its values are posted straight into the stage.
 */
// getCode: the "Get code" dropdown (GetCodeMenu), shown beside Live Preview.
export default function EffectStage({ effect, title, previewHref, getCode = null }) {
  const remixer = effect?.remixer ?? {};
  const remixerGroups = remixer.groups ?? getGroupsFromRemixerControls(remixer.controls);
  const { groups, values, updateValue, resetValues } = useRemixerControls({
    groups: remixerGroups,
    props: effect?.props ?? [],
  });
  const hasPlayground = !!remixer.enabled && groups.some((g) => g.controls?.length);

  // The Preview / Playground tabs were removed from the toolbar, so the stage always
  // shows Preview; the Playground plumbing below stays for when it comes back.
  const [view] = useState("preview");
  const [frameKey, setFrameKey] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Click to interact: until the visitor clicks the stage, a transparent layer sits
  // over the iframe so wheel / touch scrolling keeps moving the page instead of being
  // swallowed by the demo. Leaving the stage (or tapping outside it) puts it back.
  const [interactive, setInteractive] = useState(false);
  const tipRef = useRef(null);
  const moveTip = (event) => {
    const tip = tipRef.current;
    if (!tip) return;
    const box = event.currentTarget.getBoundingClientRect();
    tip.style.left = `${event.clientX - box.left}px`;
    tip.style.top = `${event.clientY - box.top}px`;
  };
  useEffect(() => {
    if (!interactive) return undefined;
    const onDown = (event) => {
      if (!stageRef.current?.contains(event.target)) setInteractive(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [interactive]);

  // The iframe must only ever show this demo. Demo pages hand our own links to the
  // main window themselves (DemoHeader, embed mode); this catches anything else that
  // lands the iframe on a non-demo page (which would nest the whole site inside it):
  // the main window goes there instead and the iframe resets to the demo.
  const onFrameLoad = () => {
    try {
      const location = frameRef.current?.contentWindow?.location;
      if (location && location.origin === window.location.origin && !location.pathname.startsWith("/demo/")) {
        const url = new URL(location.href);
        url.searchParams.delete("embed");
        setFrameKey((k) => k + 1);
        window.location.assign(url.toString());
        return;
      }
    } catch {
      // Cross-origin page: nothing to read, leave it.
    }
    setLoaded(true);
  };
  const frameRef = useRef(null);
  // The stage sticks vertically centred while a long Playground scrolls past
  const stageRef = useRef(null);
  const [stickyTop, setStickyTop] = useState(96);

  // Desktop and tablet: the demo always renders at a real 1920x1080 desktop viewport,
  // scaled down to fit the (16:9) stage - so demos lay out exactly as on a full-HD screen
  // (at the stage's own ~1000px width some wrapped and overlapped), and opening the
  // Playground only changes the scale, never the demo's layout. Phones: no scaling, the
  // demo shows its mobile layout in a taller stage.
  const gridRef = useRef(null);
  const [frameBox, setFrameBox] = useState(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const phone = window.matchMedia(MEDIA.mobile);
    const measure = () => {
      if (phone.matches || !stage.clientWidth) return setFrameBox(null);
      setFrameBox({ ...DESKTOP_FRAME, scale: stage.clientWidth / DESKTOP_FRAME.width });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    phone.addEventListener("change", measure);
    measure();
    return () => {
      ro.disconnect();
      phone.removeEventListener("change", measure);
    };
  }, []);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const update = () => setStickyTop(Math.max(96, (window.innerHeight - el.offsetHeight) / 2));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  const play = hasPlayground && view === "play";

  // In Preview the hidden Playground column collapses to zero height (once its
  // close animation is done), so the stage block is its normal height and nothing
  // gives it room to stick. Opening un-collapses it straight away.
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  useEffect(() => {
    if (play) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPanelCollapsed(false);
      return undefined;
    }
    const id = setTimeout(() => setPanelCollapsed(true), 700);
    return () => clearTimeout(id);
  }, [play]);

  // The panel's content keeps a fixed width (--pg-w; the column reveals it rather
  // than squeezing it), and its rows ease in one after another once it's open.
  const panelContentRef = useRef(null);
  useEffect(() => {
    const root = panelContentRef.current;
    if (!play || !root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const rows = root.querySelectorAll(':scope > p, aside section, aside [class*="codeBlock"]');
    const tween = gsap.fromTo(
      rows,
      { autoAlpha: 0, x: 18 },
      { autoAlpha: 1, x: 0, duration: 0.6, ease: "expo.out", stagger: 0.05, delay: 0.3, clearProps: "opacity,visibility,transform" },
    );
    return () => tween.kill();
  }, [play]);

  const src = `${previewHref}?embed=1`;

  const post = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: MSG, values: cloneable(values) }, location.origin);
  }, [values]);

  // Live props: every remixer change reaches the running effect
  useEffect(() => {
    if (loaded) post();
  }, [loaded, post]);

  const copyCode = useMemo(
    () => () => buildRemixerJsx({ componentName: String(effect?.title ?? title ?? effect?.name ?? ""), values, groups }),
    [effect, title, values, groups],
  );

  return (
    <section aria-label="Interactive preview" className="flex w-full flex-col gap-[1vw] max-md:gap-[3.5vw]">
      {/* Get Code + Demo (the Preview / Playground tabs and Replay were removed). */}
      <div className="mb-6 flex flex-wrap items-center justify-end gap-[1vw] max-md:justify-start max-md:gap-[3vw]">
        {/* items-stretch: Get Code takes Demo's height. */}
        <div className="flex items-stretch gap-[0.5vw] max-md:gap-[2vw]">

          {getCode}
          {/* T13 text, 13px padding: the toolbar's button size. */}
          <Button text="Demo" href={previewHref} target_blank variant="orange" className="shrink-0 border border-primary py-3.25! text-[1.1vw]! max-lg:text-[1.6vw]! max-md:text-[3.3vw]! max-md:[--btn-arrow:3.3vw]! max-md:[--btn-square:1.8vw]!" />
        </div>
      </div>

      {/* Stage + Playground side by side: the Playground opens from 0 to --pg-w (its
          width animates, through --pg-col) and fades and slides in with it instead of
          mounting / unmounting in a jump. --pg-w: 17.65vw desktop. On tablet and phones
          the panel stacks below the stage at full width (side by side, the stage
          shrank to half the screen with a sticky gap above it). */}
      <div
        ref={gridRef}
        className="flex items-start [--pg-w:17.65vw] max-lg:flex-col max-lg:gap-y-[2vw] max-md:gap-y-[3.5vw] "
        style={{ columnGap: play ? "1vw" : "0vw", transition: `column-gap .8s ${EASE}` }}
      >
        {/* Only in Playground: sticks centred on screen while the long panel scrolls past
            it, released where the panel ends. In Preview it's an ordinary block. */}
        <div
          ref={stageRef}
          style={play ? { top: stickyTop } : undefined}
          onPointerLeave={(event) => event.pointerType === "mouse" && setInteractive(false)}
          // Phones get a taller (4:5) stage: the demo renders its mobile layout there.
          className={`${play ? "sticky" : "relative"} isolate aspect-video w-full min-w-0 flex-1 overflow-hidden bg-black max-lg:relative max-lg:top-auto! max-md:aspect-4/5`}
        >
          <iframe
            key={frameKey}
            ref={frameRef}
            src={src}
            title={`${title || "Effect"} preview`}
            onLoad={onFrameLoad}
            style={frameBox ? { width: frameBox.width, height: frameBox.height, transform: `scale(${frameBox.scale})`, transformOrigin: "0 0" } : undefined}
            className={`absolute inset-0 size-full border-0 transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
          {!interactive && (
            <button
              type="button"
              aria-label="Click to interact with the preview"
              onClick={() => setInteractive(true)}
              onPointerMove={moveTip}
              className="group/interact absolute inset-0 z-5 cursor-pointer"
            >
              {/* Hidden until the cursor enters the stage, then follows it. Touch screens
                  (no hover) show it centred as a hint. */}
              <span
                ref={tipRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 opacity-0 transition-opacity duration-300 group-hover/interact:opacity-100 [@media(hover:none)]:opacity-100 -translate-x-1/2 -translate-y-[calc(100%+0.8vw)] bg-background/80 px-3 py-1.5 text-[0.9vw] whitespace-nowrap text-foreground ring-1 ring-inset ring-foreground/15 backdrop-blur-lg max-lg:text-[1.6vw] max-md:-translate-y-1/2 max-md:text-[3.3vw]"
              >
                Click to interact
              </span>
            </button>
          )}
          {!loaded && (
            <div className="absolute bottom-4 right-4 z-10">
              <div aria-label="Loading preview" role="status" className="size-8 animate-spin rounded-full border-2 border-foreground/25 border-t-foreground" />
            </div>
          )}
        </div>

        {hasPlayground && (
          <div
            aria-label="Playground"
            aria-hidden={!play}
            inert={!play}
            className={`flex w-(--pg-col) shrink-0 flex-col overflow-hidden border border-foreground/8 bg-dark-card transition-[width,opacity,transform] duration-700 max-lg:w-full! ${panelCollapsed ? "h-0 border-0" : ""} ${play ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0 max-lg:hidden"}`}
            style={{ "--pg-col": play ? "var(--pg-w)" : "0vw", transitionTimingFunction: EASE }}
          >
            {/* Fixed width: the column grows from 0 to --pg-w around it, so the controls
                never re-wrap mid-animation. */}
            <div ref={panelContentRef} className="flex w-(--pg-w) shrink-0 flex-col max-lg:w-full">
              <p className={`bg-background px-4 py-2 ${T13} tracking-normal text-foreground`}>Tune the real props</p>
              <div className="min-h-0 flex-1 [&>aside]:h-full">
                <RemixerPanel
                  compact
                  isExpanded
                  groups={groups}
                  values={values}
                  onChange={updateValue}
                  onCopyCode={copyCode}
                  onReset={resetValues}
                  defaultOpenGroupId={remixer.defaultOpenGroupId}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
