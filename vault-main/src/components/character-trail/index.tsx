// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

const DEFAULT_ROOT_MARGIN = "256px";

type RafRoot = Element | null | { current: Element | null } | (() => Element | null);

function resolveElement(root: RafRoot): Element | null {
  if (!root) return null;
  if (typeof root === "function") return root() ?? null;
  if (typeof root === "object" && "current" in root) return root.current ?? null;
  return root;
}

interface VisibilityGateOptions {
  root?: RafRoot;
  rootMargin?: string;
  threshold?: number;
  observeTab?: boolean;
  observeOffscreen?: boolean;
  onChange?: (active: boolean) => void;
}

interface VisibilityGate {
  readonly isActive: boolean;
  observe: (nextRoot?: RafRoot) => void;
  destroy: () => void;
}

function createVisibilityGate({
  root = null,
  rootMargin = DEFAULT_ROOT_MARGIN,
  threshold = 0,
  observeTab = true,
  observeOffscreen = true,
  onChange,
}: VisibilityGateOptions = {}): VisibilityGate {
  let tabVisible =
    typeof document === "undefined" ? true : !document.hidden;
  // Match border-beam: assume onscreen until the observer reports otherwise.
  let onscreen = true;
  let destroyed = false;
  let observer: IntersectionObserver | null = null;

  const isActive = () => {
    if (destroyed) return false;
    if (observeTab && !tabVisible) return false;
    if (observeOffscreen && resolveElement(root) && !onscreen) return false;
    return true;
  };

  let lastActive = isActive();

  const emit = () => {
    if (destroyed) return;
    const next = isActive();
    if (next === lastActive) return;
    lastActive = next;
    onChange?.(next);
  };

  const onVisibilityChange = () => {
    tabVisible = !document.hidden;
    emit();
  };

  if (observeTab && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  const bindObserver = () => {
    if (!observeOffscreen || typeof IntersectionObserver === "undefined") {
      return;
    }

    const el = resolveElement(root);
    if (!el) return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          onscreen = entry.isIntersecting;
        }
        emit();
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
  };

  bindObserver();

  return {
    /** Whether the animation should currently run. */
    get isActive() {
      return isActive();
    },

    /**
     * Re-bind IntersectionObserver after the root element mounts late
     * (e.g. ref not ready on first call). Safe to call multiple times.
     */
    observe(nextRoot?: RafRoot) {
      if (destroyed) return;
      if (nextRoot != null) root = nextRoot;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      onscreen = true;
      bindObserver();
      emit();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (observeTab && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
  };
}

interface SuspendedRafOptions {
  onFrame: (time: number) => void;
  root?: RafRoot;
  rootMargin?: string;
  threshold?: number;
  observeTab?: boolean;
  observeOffscreen?: boolean;
}

interface SuspendedRaf {
  start: () => void;
  stop: () => void;
  readonly isRunning: boolean;
  readonly isActive: boolean;
  observe: (nextRoot?: RafRoot) => void;
  destroy: () => void;
}

/**
 * Owns a requestAnimationFrame loop that auto-pauses when the tab is hidden
 * or the root element is offscreen.
 */
function createSuspendedRaf({
  onFrame,
  root = null,
  rootMargin = DEFAULT_ROOT_MARGIN,
  threshold = 0,
  observeTab = true,
  observeOffscreen = true,
}: SuspendedRafOptions): SuspendedRaf {
  if (typeof onFrame !== "function") {
    throw new TypeError("createSuspendedRaf: onFrame is required");
  }

  let rafId: number | null = null;
  let running = false;
  let destroyed = false;

  const stopRaf = () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const tick = (time: number) => {
    rafId = null;
    if (destroyed || !running || !gate.isActive) return;
    onFrame(time);
    if (!destroyed && running && gate.isActive) {
      rafId = requestAnimationFrame(tick);
    }
  };

  const sync = () => {
    if (destroyed) return;
    if (running && gate.isActive) {
      if (rafId == null) {
        rafId = requestAnimationFrame(tick);
      }
    } else {
      stopRaf();
    }
  };

  const gate = createVisibilityGate({
    root,
    rootMargin,
    threshold,
    observeTab,
    observeOffscreen,
    onChange: sync,
  });

  return {
    /** Start (or resume) the loop when visibility allows. */
    start() {
      if (destroyed) return;
      running = true;
      sync();
    },

    /** Stop requesting frames (visibility listeners stay attached until destroy). */
    stop() {
      running = false;
      stopRaf();
    },

    /** Whether the caller has started the loop (may still be paused by visibility). */
    get isRunning() {
      return running;
    },

    /** Whether a frame is currently allowed to schedule. */
    get isActive() {
      return gate.isActive;
    },

    /** Re-attach offscreen observer to a (new) root element. */
    observe(nextRoot?: RafRoot) {
      gate.observe(nextRoot);
      sync();
    },

    /** Tear down listeners and cancel any pending frame. */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      stopRaf();
      gate.destroy();
    },
  };
}

export {
  createSuspendedRaf,
  createVisibilityGate,
  DEFAULT_ROOT_MARGIN,
};

const CELL_SIZE = 50;
const IDLE_TIMEOUT = 120;
const SPAWN_ANIMATION = 180;
const TURN_CELLS = 2;
const MOUSE_LERP = 0.09;

const DEFAULT_COLORS = ["#1a1a2e","#c8f752","#7D4E57","#5c3d8f","#2d2d2d","#c3dfe0"];
const DEFAULT_TEXT_COLORS = ["#ffffff","#1a1a2e","#ffffff","#ffffff","#ffffff","#1a1a2e"];
const HEX_COLOR_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const MAX_COLORS = DEFAULT_COLORS.length;

function normalizeHex(value?: string): string | null {
 const token = value?.trim();
 if (!token || !HEX_COLOR_RE.test(token)) return null;
 return token.startsWith("#") ? token : `#${token}`;
}

// Dark text on light fills, light text on dark fills.
function getReadableTextColor(hex: string): string {
 const raw = hex.replace("#","");
 const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
 const r = parseInt(full.slice(0, 2), 16);
 const g = parseInt(full.slice(2, 4), 16);
 const b = parseInt(full.slice(4, 6), 16);
 return (r * 299 + g * 587 + b * 114) / 1000 > 150 ?"#1a1a2e" :"#ffffff";
}

interface TrailCellColor {
 bg: string;
 text: string;
}

interface TrailCell {
 id: string;
 cellKey: string;
 col: number;
 row: number;
 char: string;
 color: TrailCellColor;
}

interface GridCell {
 col: number;
 row: number;
}

type TrailAxis = "x" | "y";

interface CharacterTrailCompProps {
 children?: ReactNode;
 characters?: string;
 trailLength?: number;
 fontSize?: number;
 textColor?: string;
 colorCount?: number;
 color1?: string;
 color2?: string;
 color3?: string;
 color4?: string;
 color5?: string;
 color6?: string;
 textColor1?: string;
 textColor2?: string;
 textColor3?: string;
 textColor4?: string;
 textColor5?: string;
 textColor6?: string;
 fadeDuration?: number;
}

function CharacterTrailComp({
 children,
 characters ="HYPERIUX",
 trailLength = 24,
 fontSize = 18,
 textColor,
 colorCount = MAX_COLORS,
 color1,
 color2,
 color3,
 color4,
 color5,
 color6,
 textColor1,
 textColor2,
 textColor3,
 textColor4,
 textColor5,
 textColor6,
 fadeDuration = 0.8,
}: CharacterTrailCompProps) {
 const [trail, setTrail] = useState<TrailCell[]>([]);
 const [fading, setFading] = useState(false);
 const resolvedCharacters = characters?.trim() || "HYPERIUX";
 const resolvedTrailLength = Math.max(0, Math.round(Number(trailLength) || 0));
 const resolvedFontSize = Math.max(0, Number(fontSize) || 0);
 const fadeDurationMs = Math.max(0, Number(fadeDuration) || 0) * 1000;
 const palette = (() => {
 // Each slot falls back to its default hex if left empty/invalid.
 const bgs = [color1, color2, color3, color4, color5, color6];
 const texts = [textColor1, textColor2, textColor3, textColor4, textColor5, textColor6];
 const list = bgs.map((value, index) => {
 const bg = normalizeHex(value) ?? DEFAULT_COLORS[index];
 // Per-color text color, then the shared textColor, then an auto-contrast pick.
 const text = normalizeHex(texts[index]) ?? normalizeHex(textColor) ?? getReadableTextColor(bg);
 return { bg, text };
 });
 const count = Math.round(Number(colorCount) || MAX_COLORS);
 return list.slice(0, Math.min(MAX_COLORS, Math.max(1, count)));
 })();
 const paletteKey = palette.map((entry) => `${entry.bg}/${entry.text}`).join("|");

 const lastCell = useRef<GridCell | null>(null);
 const activeAxis = useRef<TrailAxis | null>(null);
 const charIndexRef = useRef(0);
 const colorIndexRef = useRef(0);
 const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 const fadingRef = useRef(false);
 const trailCountRef = useRef(0);
 const mouseTarget = useRef<{x: number, y: number} | null>(null);
 const mouseFollower = useRef<{x: number, y: number} | null>(null);

 const getNextTrailCell = useCallback((col: number, row: number) => {
 const char = resolvedCharacters[charIndexRef.current % resolvedCharacters.length];
 const color = palette[colorIndexRef.current % palette.length];
 charIndexRef.current++;
 colorIndexRef.current++;

 return {
 id: `${Date.now()}-${charIndexRef.current}-${col}-${row}`,
 cellKey: `${col}:${row}`,
 col,
 row,
 char,
 color,
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [resolvedCharacters, paletteKey]);

 const getLineCells = useCallback((from: GridCell, to: GridCell, axis: TrailAxis, limit: number = Infinity) => {
 const cells: GridCell[] = [];
 const delta = axis ==="x" ? to.col - from.col : to.row - from.row;
 const direction = Math.sign(delta);
 const count = Math.min(Math.abs(delta), limit);

 for (let index = 1; index <= count; index++) {
 const col = axis ==="x" ? from.col + direction * index : from.col;
 const row = axis ==="y" ? from.row + direction * index : from.row;
 cells.push({ col, row });
 }

 return cells;
 }, []);

 const appendCells = useCallback((cells: GridCell[]) => {
 if (resolvedTrailLength <= 0) return;
 if (!cells.length) return;

 const nextCells = cells.map(({ col, row }) => getNextTrailCell(col, row));
 const activatedKeys = new Set(nextCells.map((cell) => cell.cellKey));

 setTrail((prev) => {
 const withoutDuplicates = prev.filter((cell) => !activatedKeys.has(cell.cellKey));
 return [...withoutDuplicates, ...nextCells].slice(-resolvedTrailLength);
 });
 }, [getNextTrailCell, resolvedTrailLength]);

 useEffect(() => {
 fadingRef.current = fading;
 }, [fading]);

 useEffect(() => {
 trailCountRef.current = trail.length;
 }, [trail]);

 
 const updateTrailPosition = useCallback((mx: number, my: number) => {
 if (fadingRef.current) {
 fadingRef.current = false;
 setFading(false);
 setTrail([]);
 charIndexRef.current = 0;
 colorIndexRef.current = 0;
 lastCell.current = null;
 activeAxis.current = null;
 }

 clearTimeout(idleTimer.current);
 clearTimeout(clearTimer.current);

 idleTimer.current = setTimeout(() => {
 setFading(true);
 fadingRef.current = true;
 // Each cell fades for half the duration, starting after its stagger
 // delay (see render), so the last cell finishes at
 // (count - 1) / count + 0.5 of the duration. Clearing any earlier would
 // cut the tail off mid-fade.
 const total = Math.max(trailCountRef.current, 1);
 const fullFadeMs = fadeDurationMs * ((total - 1) / total + 0.5);
 clearTimer.current = setTimeout(() => {
 setTrail([]);
 setFading(false);
 fadingRef.current = false;
 charIndexRef.current = 0;
 colorIndexRef.current = 0;
 lastCell.current = null;
 activeAxis.current = null;
 }, fullFadeMs + 50);
 }, IDLE_TIMEOUT);

 const target = {
 col: Math.floor(mx / CELL_SIZE),
 row: Math.floor(my / CELL_SIZE),
 };

 if (!lastCell.current) {
 lastCell.current = target;
 appendCells([target]);
 return;
 }

 const current = lastCell.current;
 const colDelta = target.col - current.col;
 const rowDelta = target.row - current.row;

 if (colDelta === 0 && rowDelta === 0) return;

 const dominantAxis = Math.abs(colDelta) >= Math.abs(rowDelta) ?"x" :"y";
 const targetAxis = colDelta === 0 ?"y" : rowDelta === 0 ?"x" : dominantAxis;
 const axis = activeAxis.current ?? targetAxis;
 const cells: GridCell[] = [];
 let cursor = current;

 const pushCells = (lineCells: GridCell[]) => {
 if (!lineCells.length) return;
 cells.push(...lineCells);
 cursor = lineCells[lineCells.length - 1];
 };

 if (axis ==="x" && colDelta !== 0) {
 pushCells(getLineCells(cursor, { col: target.col, row: cursor.row },"x"));

 if (target.row !== cursor.row) {
 pushCells(getLineCells(cursor, { col: cursor.col, row: target.row },"y", TURN_CELLS));
 activeAxis.current ="y";
 } else {
 activeAxis.current ="x";
 }
 } else if (axis ==="y" && rowDelta !== 0) {
 pushCells(getLineCells(cursor, { col: cursor.col, row: target.row },"y"));

 if (target.col !== cursor.col) {
 pushCells(getLineCells(cursor, { col: target.col, row: cursor.row },"x", TURN_CELLS));
 activeAxis.current ="x";
 } else {
 activeAxis.current ="y";
 }
 } else {
 pushCells(getLineCells(cursor, target, targetAxis, TURN_CELLS));
 activeAxis.current = targetAxis;
 }

 if (!cells.length) return;

 lastCell.current = cursor;
 appendCells(cells);
 }, [appendCells, fadeDurationMs, getLineCells]);

 const updateMouseFollower = useCallback(() => {
 if (!mouseTarget.current || !mouseFollower.current) return;

 const dx = Math.abs(mouseTarget.current.x - mouseFollower.current.x);
 const dy = Math.abs(mouseTarget.current.y - mouseFollower.current.y);

 if (dx <= 0.5 && dy <= 0.5) {
 mouseFollower.current = { ...mouseTarget.current };
 return;
 }

 mouseFollower.current.x += (mouseTarget.current.x - mouseFollower.current.x) * MOUSE_LERP;
 mouseFollower.current.y += (mouseTarget.current.y - mouseFollower.current.y) * MOUSE_LERP;

 updateTrailPosition(mouseFollower.current.x, mouseFollower.current.y);
 }, [updateTrailPosition]);

 const handleMouseMove = useCallback((e: MouseEvent) => {
 mouseTarget.current = { x: e.clientX, y: e.clientY };

 if (!mouseFollower.current) {
 mouseFollower.current = { ...mouseTarget.current };
 updateTrailPosition(mouseFollower.current.x, mouseFollower.current.y);
 }
 }, [updateTrailPosition]);

 useEffect(() => {
 const loop = createSuspendedRaf({
 root: null,
 observeOffscreen: false,
 onFrame: updateMouseFollower,
 });
 loop.start();

 window.addEventListener("mousemove", handleMouseMove);
 return () => {
 window.removeEventListener("mousemove", handleMouseMove);
 clearTimeout(idleTimer.current);
 clearTimeout(clearTimer.current);
 loop.destroy();
 };
 }, [handleMouseMove, updateMouseFollower]);

 return (
 <div className="relative w-full min-h-screen" >

 {trail.map((dot, index) => {
 const total = trail.length;
 // stagger delay - oldest cells (index 0) fade first
 const staggerDelay = fading
 ? index * (fadeDurationMs / Math.max(total, 1))
 : 0;
 const opacity = fading ? 0 : 1;

 return (
 <div
 key={dot.id}
 className="fixed pointer-events-none rounded-full flex items-center justify-center select-none font-extrabold z-9999 scale-100"
 style={{
 width: CELL_SIZE,
 height: CELL_SIZE,
 left: dot.col * CELL_SIZE,
 top: dot.row * CELL_SIZE,
 backgroundColor: dot.color.bg,
 color: dot.color.text,
 fontSize: resolvedFontSize,
 opacity,
 animation: fading
 ?"none"
 : `charTrailPop ${SPAWN_ANIMATION}ms cubic-bezier(0.2,0.8,0.2,1)`,
 transition: fading
 ? `opacity ${fadeDurationMs * 0.5}ms cubic-bezier(0.4,0,0.2,1) ${staggerDelay}ms`
 :"none",
 willChange:"opacity, transform",
 }}
 >
 {dot.char}
 </div>
 );
 })}

 {children}

 <style>{`
 @keyframes charTrailPop {
 from {
 transform: scale(0);
 }
 to {
 transform: scale(1);
 }
 }
 `}</style>
 </div>
 );
}

const Content = () => (
  <main className="relative min-h-screen max-md:h-screen w-full overflow-hidden bg-[#f4f4f1] text-black">

    <div className="absolute max-md:bottom-30 max-lg:bottom-30 max-lg:left-1/2 max-lg:-translate-x-1/2  hidden  max-md:w-full max-lg:w-[50%] mx-auto  max-lg:flex h-fit w-[90%] px-6 text-center text-white">
      <p className="rounded-full bg-black/10 px-5 py-3 leading-[1.2] max-md:text-base max-lg:text-xl text-black backdrop-blur-sm">
        Not just something to watch, something to move. Open on desktop
      </p>
    </div>

    {/* content */}
    <section className="flex min-h-screen items-center justify-center px-8 pb-8">
      <div>
        <h1 className="font-mono text-[12vh] max-lg:text-[13vw] max-md:w-full max-lg:w-[90%] max-md:text-[15vw] leading-[1.2]  font-black uppercase">
          Snake Cursor Trail
        </h1>

        <p className="mt-6 font-mono text-sm max-md:text-xs max-lg:text-sm text-center uppercase tracking-[0.25em] text-black/40">
          Sequential · Reactive · Grid Based
        </p>
      </div>
    </section>

    <p className="absolute bottom-8 right-8 max-w-105 text-right font-mono text-sm leading-relaxed text-black/55 max-lg:hidden">
      Wake the grid with your cursor. Draw slow corners, quick turns,
      little loops - the letters will stitch your path into a living trail.
    </p>

  </main>
)

const CharacterTrail = (props: ComponentProps<typeof CharacterTrailComp>) => {
     const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1025)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])
  return (
    <>
     {isMobile ? (
        <Content />
      ) : (
        <CharacterTrailComp {...props}>
          <Content />
        </CharacterTrailComp>
      )}
    </>
  )
}

export default CharacterTrail
