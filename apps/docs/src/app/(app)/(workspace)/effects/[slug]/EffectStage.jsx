"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import RemixerPanel from "@/components/remixer-panel/RemixerPanel";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { getGroupsFromRemixerControls } from "@/components/remixer-panel/RegistryRemixerDemo";
import { useRemixerControls } from "@/components/remixer-panel/useRemixerControls";
import { buildRemixerJsx } from "@/components/remixer-panel/build-remixer-code";

// Same message the preview chrome sends its device iframe (onEmbedValues)
const MSG = "vault-preview:values";
const EASE = "cubic-bezier(.16,1,.3,1)";

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
export default function EffectStage({ effect, title, previewHref }) {
  const remixer = effect?.remixer ?? {};
  const remixerGroups = remixer.groups ?? getGroupsFromRemixerControls(remixer.controls);
  const { groups, values, updateValue, resetValues } = useRemixerControls({
    groups: remixerGroups,
    props: effect?.props ?? [],
  });
  const hasPlayground = !!remixer.enabled && groups.some((g) => g.controls?.length);

  const [view, setView] = useState("preview");
  const [frameKey, setFrameKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef(null);
  const tabsRef = useRef(null);
  // The stage sticks vertically centred while a long Playground scrolls past
  const stageRef = useRef(null);
  const [stickyTop, setStickyTop] = useState(96);
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
    `relative z-1 h-9 px-[18px] text-[13px] uppercase tracking-[.08em] transition-colors duration-600 ${on ? "text-[#141414]" : "text-[#a9a9a9] hover:text-white"}`;
  const toolCls =
    "inline-flex items-center gap-2 h-9 px-3.5 text-[13px] uppercase tracking-[.08em] text-[#cfcfcf] shadow-[inset_0_0_0_1px_rgba(244,244,244,.12)] transition-colors duration-500 hover:bg-[rgba(244,244,244,.08)] hover:text-white";

  return (
    <section aria-label="Interactive preview" className="w-full">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-4">
        <div
          ref={tabsRef}
          role="tablist"
          className="relative isolate inline-flex bg-[rgba(244,244,244,.06)] p-[3px] shadow-[inset_0_0_0_1px_rgba(244,244,244,.08)]"
        >
          <button role="tab" type="button" data-view="preview" aria-selected={view === "preview"} onClick={() => setView("preview")} className={tabCls(view === "preview")}>
            Preview
          </button>
          {hasPlayground && (
            <button role="tab" type="button" data-view="play" aria-selected={view === "play"} onClick={() => setView("play")} className={tabCls(view === "play")}>
              Playground
            </button>
          )}
          <i
            aria-hidden="true"
            className="absolute top-[3px] bottom-[3px] left-[3px] z-0 bg-primary"
            style={{ width: pill.w, transform: `translateX(${pill.x}px)`, transition: `transform .7s ${EASE}, width .7s ${EASE}` }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={replay} className={toolCls}>
            ↺ Replay
          </button>
          <ButtonV3 text="Live Preview" href={previewHref} target_blank variant="orange" className="shrink-0" />
        </div>
      </div>

      {/* Always two columns: the Playground column opens from 0 to 340px (same track
          count both ways, so grid-template-columns can animate), and the panel fades
          and slides in with it instead of mounting / unmounting in a jump. */}
      <div
        className="grid items-start max-md:grid-cols-1!"
        style={{
          gridTemplateColumns: play ? "minmax(0,1fr) 340px" : "minmax(0,1fr) 0px",
          columnGap: play ? 14 : 0,
          transition: `grid-template-columns .8s ${EASE}, column-gap .8s ${EASE}`,
        }}
      >
        {/* Sticks centred on screen while a long Playground scrolls past it, released where the Playground ends */}
        <div ref={stageRef} style={{ top: stickyTop }} className="sticky aspect-16/8.5 w-full overflow-hidden bg-black isolate max-md:static max-md:aspect-4/5">
          <iframe
            key={frameKey}
            ref={frameRef}
            src={src}
            title={`${title || "Effect"} preview`}
            onLoad={() => setLoaded(true)}
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
            className={`flex min-w-0 flex-col overflow-hidden border border-[rgba(244,244,244,.08)] bg-[#141414] transition-[opacity,transform] duration-700 max-md:mt-3.5 ${play ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0 max-md:hidden"}`}
            style={{ transitionTimingFunction: EASE }}
          >
            <p className="px-[22px] pt-[22px] pb-2 text-[13px] uppercase tracking-[.08em] text-[#8a8a8a]">Tune the real props</p>
            <div className="min-h-0 flex-1 [&>aside]:h-full">
              <RemixerPanel
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
        )}
      </div>
    </section>
  );
}
