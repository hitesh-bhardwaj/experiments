"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import RemixerPanel from "@/components/remixer-panel/RemixerPanel";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { getGroupsFromRemixerControls } from "@/components/remixer-panel/RegistryRemixerDemo";
import { useRemixerControls } from "@/components/remixer-panel/useRemixerControls";
import { buildRemixerJsx } from "@/components/remixer-panel/build-remixer-code";
import gsap from "gsap";
import { useVaultLayout } from "@/components/layout/VaultLayout";
import { MEDIA } from "@/lib/breakpoints";

// Same message the preview chrome sends its device iframe (onEmbedValues)
const MSG = "vault-preview:values";
const EASE = "cubic-bezier(.16,1,.3,1)";
// 13px-equivalent text in vw: desktop · tablet (max-[1025px]) · mobile (max-md).
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

  const [view, setView] = useState("preview");
  // Opening the Playground closes the desktop sidebar to give the stage room. Only this
  // way round: reopening the sidebar leaves the Playground open.
  const { isSidebarOpen, toggleSidebar } = useVaultLayout();
  const openPlayground = () => {
    setView("play");
    if (isSidebarOpen && !window.matchMedia(MEDIA.tablet).matches) toggleSidebar(false);
  };
  const [frameKey, setFrameKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef(null);
  const tabsRef = useRef(null);
  // The stage sticks vertically centred while a long Playground scrolls past
  const stageRef = useRef(null);
  const [stickyTop, setStickyTop] = useState(96);

  // Opening the Playground narrows the stage by the panel's column, which would drop the
  // demo into its tablet layout. Instead the iframe keeps the full (Preview) width and is
  // scaled down to fit, so it always renders its desktop layout and never reflows while
  // the column animates. On phones the panel stacks below, so nothing is scaled there.
  const gridRef = useRef(null);
  const [frameBox, setFrameBox] = useState(null);
  useEffect(() => {
    const grid = gridRef.current;
    const stage = stageRef.current;
    if (!grid || !stage) return;
    const phone = window.matchMedia(MEDIA.mobile);
    const target = () => (phone.matches ? stage.clientWidth : grid.clientWidth);
    // While the layout animates (Playground column, sidebar) only the scale follows it;
    // the iframe's own width - what the demo lays itself out at - is updated once, after
    // the resizing has settled, so the demo doesn't re-layout on every frame.
    let width = target();
    let settle = 0;
    const apply = () => {
      const scale = width ? stage.clientWidth / width : 1;
      setFrameBox(width === stage.clientWidth ? null : { width, height: stage.clientHeight / scale, scale });
    };
    const measure = () => {
      if (phone.matches) width = target();
      else if (target() !== width) {
        clearTimeout(settle);
        settle = setTimeout(() => {
          width = target();
          apply();
        }, 200);
      }
      apply();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    ro.observe(stage);
    phone.addEventListener("change", measure);
    measure();
    return () => {
      clearTimeout(settle);
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
  const [pill, setPill] = useState({ x: 0, w: 0 });
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

  // Sliding accent pill under the active tab
  useLayoutEffect(() => {
    const btn = tabsRef.current?.querySelector(`[data-view="${view}"]`);
    if (btn) setPill({ x: btn.offsetLeft - 3, w: btn.offsetWidth });
  }, [view, hasPlayground]);

  const post = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: MSG, values: cloneable(values) }, location.origin);
  }, [values]);

  // Live props: every remixer change reaches the running effect
  useEffect(() => {
    if (loaded) post();
  }, [loaded, post]);

  const replay = () => {
    setLoaded(false);
    setFrameKey((k) => k + 1);
  };

  const copyCode = useMemo(
    () => () => buildRemixerJsx({ componentName: String(effect?.title ?? title ?? effect?.name ?? ""), values, groups }),
    [effect, title, values, groups],
  );

  const tabCls = (on) =>
    `relative z-1  px-5 py-2.5 font-medium  ${T13} transition-colors duration-400 ease-out ${on ? "text-black" : "text-white/60 hover:text-white"}`;
  const toolCls =
    `inline-flex items-center border border-white/20 backdrop-blur-lg gap-2 px-3.5 ${T13} text-[#cfcfcf] bg-[rgba(244,244,244,.06)] transition-colors duration-500 hover:bg-[rgba(244,244,244,.08)] hover:text-white`;

  return (
    <section aria-label="Interactive preview" className="w-full">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <div
            ref={tabsRef}
            role="tablist"
            className="relative isolate inline-flex bg-[rgba(244,244,244,.06)] border border-white/20 backdrop-blur-lg p-0.75"
          >
            <button role="tab" type="button" data-view="preview" aria-selected={view === "preview"} onClick={() => setView("preview")} className={tabCls(view === "preview")}>
              Preview
            </button>
            {hasPlayground && (
              <button role="tab" type="button" data-view="play" aria-selected={view === "play"} onClick={openPlayground} className={tabCls(view === "play")}>
                Playground
              </button>
            )}
            <i
              aria-hidden="true"
              className="absolute top-0.75 bottom-0.75 left-0.75 z-0 bg-primary"
              style={{ width: pill.w, transform: `translateX(${pill.x}px)`, transition: `transform .7s ${EASE}, width .7s ${EASE}` }}
            />
          </div>
          <button type="button" onClick={replay} className={toolCls}>
            ↺ Replay
          </button>

        </div>
        {/* items-stretch: Replay takes Live Preview's height (ButtonV3 scales with vw). */}
        <div className="flex items-stretch gap-2">

          {getCode}
          <ButtonV3 text="Demo " href={previewHref} target_blank variant="orange" className="shrink-0 border border-primary" />
        </div>
      </div>

      {/* Always two columns: the Playground column opens from 0 to --pg-w (same track
          count both ways, so grid-template-columns can animate), and the panel fades
          and slides in with it instead of mounting / unmounting in a jump.
          --pg-w: 18vw on desktop, 340px on tablet (18vw would be too narrow there). */}
      <div
        ref={gridRef}
        className="grid items-start [--pg-w:17.8vw] max-lg:[--pg-w:340px] max-md:grid-cols-1!"
        style={{
          gridTemplateColumns: play ? "minmax(0,1fr) var(--pg-w)" : "minmax(0,1fr) 0px",
          columnGap: play ? 14 : 0,
          transition: `grid-template-columns .8s ${EASE}, column-gap .8s ${EASE}`,
        }}
      >
        {/* Only in Playground: sticks centred on screen while the long panel scrolls past
            it, released where the panel ends. In Preview it's an ordinary block. */}
        <div
          ref={stageRef}
          style={play ? { top: stickyTop } : undefined}
          className={`${play ? "sticky" : "relative"} aspect-16/8.5 w-full overflow-hidden bg-black isolate max-md:relative max-md:aspect-4/5`}
        >
          <iframe
            key={frameKey}
            ref={frameRef}
            src={src}
            title={`${title || "Effect"} preview`}
            onLoad={() => setLoaded(true)}
            style={frameBox ? { width: frameBox.width, height: frameBox.height, transform: `scale(${frameBox.scale})`, transformOrigin: "0 0" } : undefined}
            className={`absolute inset-0 size-full border-0 transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
          {!loaded && (
            <div className="absolute bottom-4 right-4 z-10">
              <div aria-label="Loading preview" role="status" className="size-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            </div>
          )}
        </div>

        {hasPlayground && (
          <div
            aria-label="Playground"
            aria-hidden={!play}
            inert={!play}
            className={`flex min-w-0 flex-col overflow-hidden border border-[rgba(244,244,244,.08)] bg-[#141414] transition-[opacity,transform] duration-700 max-md:mt-3.5 ${panelCollapsed ? "h-0 border-0" : ""} ${play ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0 max-md:hidden"}`}
            style={{ transitionTimingFunction: EASE }}
          >
            {/* Fixed width: the column grows from 0 to --pg-w around it, so the controls
                never re-wrap mid-animation. */}
            <div ref={panelContentRef} className="flex w-(--pg-w) shrink-0 flex-col max-md:w-full">
              <p className={`px-4 py-2 ${T13} tracking-normal text-white bg-[#111111]`}>Tune the real props</p>
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
