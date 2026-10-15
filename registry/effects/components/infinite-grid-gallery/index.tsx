// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";

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
    get isActive() {
      return isActive();
    },

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
    start() {
      if (destroyed) return;
      running = true;
      sync();
    },

    stop() {
      running = false;
      stopRaf();
    },

    get isRunning() {
      return running;
    },

    get isActive() {
      return gate.isActive;
    },

    observe(nextRoot?: RafRoot) {
      gate.observe(nextRoot);
      sync();
    },

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

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(Math.max(number, min), max);
}

interface GridSource {
    src: string;
    caption: string;
}

interface GridItemBase {
    src: string;
    caption: string;
    sourceIndex: number;
    x: number;
    y: number;
    w: number;
    h: number;
}

interface GridItemEl extends HTMLDivElement {
    __gridItem?: { base: GridItemBase, itemImage: HTMLDivElement };
}

interface GridItem {
    el: GridItemEl;
    container: HTMLDivElement;
    wrapper: HTMLDivElement;
    img: HTMLImageElement;
    x: number;
    y: number;
    w: number;
    h: number;
    extraX: number;
    extraY: number;
    rect: DOMRect;
    ease: number;
    depth: number;
}

interface InfiniteGridClickPayload {
    index: number;
    src: string;
    caption: string;
    rect: { left: number, top: number, width: number, height: number };
}

interface InfiniteGridOptions {
    el: HTMLElement;
    sources: GridSource[];
    data?: any;
    originalSize?: any;
    onItemClick?: (payload: InfiniteGridClickPayload) => void;
    columns?: number;
    gap?: number;
    speed?: number;
    imageScale?: number;
}

interface TileSize {
    w: number;
    h: number;
    tileW: number;
    tileH: number;
    gap: number;
    halfGap: number;
    leftOffset: number;
    topOffset: number;
}

interface WrapSize {
    w: number;
    h: number;
}

interface AxisValue {
    t: number;
    c: number;
}

interface ScrollState {
    ease: number;
    current: { x: number, y: number };
    target: { x: number, y: number };
    last: { x: number, y: number };
    delta: { x: AxisValue, y: AxisValue };
}

interface DragState {
    startX: number;
    startY: number;
    scrollX: number;
    scrollY: number;
}

interface MouseState {
    x: AxisValue;
    y: AxisValue;
    press: AxisValue;
}

interface LayoutConfig {
    cols: number;
    rows: number;
    gap: number;
    margin: number;
    aspect: number;
}

class InfiniteGrid {
    $container: HTMLElement;
    sources: GridSource[];
    data: any;
    originalSize: any;
    onItemClick?: (payload: InfiniteGridClickPayload) => void;
    enabled: boolean;
    speed: number;
    imageScale: number;

    winW: number;
    winH: number;
    tileSize: TileSize;
    wrapSize: WrapSize;
    layout: LayoutConfig;
    scroll: ScrollState;

    isDragging: boolean;
    activePointerId: number | null;
    drag: DragState;
    dragMoved: boolean;
    pressedItem: any;

    mouse: MouseState;

    items: GridItem[];

    reduceMotion: boolean;
    _onReduceMotionChange: (event: MediaQueryListEvent) => void;
    _reduceMotionMq: MediaQueryList | undefined;

    _loop: ReturnType<typeof createSuspendedRaf> | null;

    constructor({
        el,
        sources,
        data,
        originalSize,
        onItemClick,
        columns = 4,
        gap = 44,
        speed = 1,
        imageScale = 1,
    }: InfiniteGridOptions) {
        this.$container = el;
        this.sources = sources;
        this.data = data;
        this.originalSize = originalSize;
        this.onItemClick = onItemClick;
        this.enabled = true;
        this.speed = clampNumber(speed, 0.05, 5, 1);
        this.imageScale = clampNumber(imageScale, 0.5, 2, 1);

        this.winW = 0;
        this.winH = 0;
        this.tileSize = { w: 0, h: 0, tileW: 0, tileH: 0, gap: 0, halfGap: 0, leftOffset: 0, topOffset: 0 };
        this.wrapSize = { w: 0, h: 0 };

        this.layout = {
            cols: Math.round(clampNumber(columns, 1, 8, 4)),
            rows: 3,
            gap: clampNumber(gap, 0, 100, 44),
            margin: 40,
            aspect: 3 / 4,
        };

        this.scroll = {
            ease: 0.1,
            current: { x: 0, y: 0 },
            target: { x: 0, y: 0 },
            last: { x: 0, y: 0 },
            delta: { x: { c: 0, t: 0 }, y: { c: 0, t: 0 } }
        };

        this.isDragging = false;
        this.activePointerId = null;
        this.drag = { startX: 0, startY: 0, scrollX: 0, scrollY: 0 };
        this.dragMoved = false;
        this.pressedItem = null;

        this.mouse = {
            x: { t: 0.5, c: 0.5 },
            y: { t: 0.5, c: 0.5 },
            press: { t: 0, c: 0 },
        };

        this.items = [];

        this.reduceMotion =
            typeof window !== "undefined" &&
            (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
                false);
        this._onReduceMotionChange = (event: MediaQueryListEvent) => {
            this.reduceMotion = event.matches;
            if (event.matches) {
                this.scroll.current.x = this.scroll.target.x;
                this.scroll.current.y = this.scroll.target.y;
                this.scroll.last.x = this.scroll.current.x;
                this.scroll.last.y = this.scroll.current.y;
                this.scroll.delta.x.t = this.scroll.delta.x.c = 0;
                this.scroll.delta.y.t = this.scroll.delta.y.c = 0;
            }
        };
        this._reduceMotionMq = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)"
        );
        this._reduceMotionMq?.addEventListener?.(
            "change",
            this._onReduceMotionChange
        );

        this.onResize = this.onResize.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.render = this.render.bind(this);

        window.addEventListener('resize', this.onResize);
        window.addEventListener('wheel', this.onWheel, { passive: false });
        window.addEventListener('pointermove', this.onPointerMove, { passive: false });
        this.$container.addEventListener('pointerdown', this.onPointerDown, { passive: false });
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
        this.$container.style.touchAction = 'none';

        this._loop = createSuspendedRaf({
            root: this.$container,
            onFrame: this.render,
        });

        this.onResize();
        this._loop.start();
    }

    onResize() {
        this.winW = window.innerWidth;
        this.winH = window.innerHeight;

        const isMobile = this.winW <= 768;
        const isTablet = !isMobile && this.winW <= 1025;

        const cols = isMobile ? 2 : isTablet ? 3 : this.layout.cols;
        const rows = isMobile ? 5 : isTablet ? 4 : this.layout.rows;
        const gap = isMobile
            ? Math.max(this.winW * 0.045, 12)
            : isTablet
                ? Math.max(this.winW * 0.03, 20)
                : this.layout.gap;
        const margin = isMobile
            ? Math.max(this.winW * 0.04, 12)
            : isTablet
                ? Math.max(this.winW * 0.025, 20)
                : this.layout.margin;

        const tileW =
            (this.winW - margin * 2 - gap * (cols - 1)) / cols;
        const tileH = tileW * this.layout.aspect;
        const halfGap = gap / 2;

        const outerW = tileW + gap;
        const outerH = tileH + gap;

        const setW = cols * outerW;
        const setH = rows * outerH;

        const topOffset = Math.max(margin, (this.winH - setH) / 2);
        const leftOffset = Math.max(margin, (this.winW - setW) / 2);

        this.tileSize = { w: setW, h: setH, tileW, tileH, gap, halfGap, leftOffset, topOffset };

        this.scroll.current = { x: 0, y: 0 };
        this.scroll.target = { x: 0, y: 0 };
        this.scroll.last = { x: 0, y: 0 };

        this.$container.innerHTML = '';

        const baseItems: GridItemBase[] = [];
        const total = cols * rows;

        for (let i = 0; i < total; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const source = this.sources[i % this.sources.length];

            baseItems.push({
                src: source.src,
                caption: source.caption,
                sourceIndex: i % this.sources.length,
                x: leftOffset + col * outerW,
                y: topOffset + row * outerH,
                w: tileW,
                h: tileH,
            });
        }

        this.items = [];
        const repsX = [0, this.tileSize.w];
        const repsY = [0, this.tileSize.h];

        baseItems.forEach(base => {
            repsX.forEach(offsetX => {
                repsY.forEach(offsetY => {
                    const el: GridItemEl = document.createElement('div');
                    el.classList.add('item');
                    el.style.padding = `${this.tileSize.halfGap}px`;
                    el.style.width = `${base.w + this.tileSize.gap}px`;
                    el.style.height = `${base.h + this.tileSize.gap}px`;

                    const wrapper = document.createElement('div');
                    wrapper.classList.add('item-wrapper');
                    el.appendChild(wrapper);

                    const itemImage = document.createElement('div');
                    itemImage.classList.add('item-image');
                    itemImage.style.width = `${base.w}px`;
                    itemImage.style.height = `${base.h}px`;
                    wrapper.appendChild(itemImage);

                    const img = new Image();
                    img.decoding = 'async';
                    img.referrerPolicy = 'no-referrer';
                    img.src = base.src;
                    img.alt = base.caption;
                    if (img.complete) {
                        img.classList.add('is-loaded');
                    } else {
                        const reveal = () => img.classList.add('is-loaded');
                        img.addEventListener('load', reveal, { once: true });
                        img.addEventListener('error', reveal, { once: true });
                    }
                    itemImage.appendChild(img);

                    const caption = document.createElement('small');
                    caption.classList.add('caption');
                    caption.textContent = base.caption;
                    wrapper.appendChild(caption);

                    if (typeof this.onItemClick === 'function') {
                        el.style.cursor = 'pointer';
                        el.__gridItem = { base, itemImage };
                    }

                    this.$container.appendChild(el);

                    this.items.push({
                        el,
                        container: itemImage,
                        wrapper,
                        img,
                        x: base.x + offsetX,
                        y: base.y + offsetY,
                        w: base.w,
                        h: base.h,
                        extraX: 0,
                        extraY: 0,
                        rect: el.getBoundingClientRect(),
                        ease: Math.random() * 0.5 + 0.5,
                        depth: Math.random() * 0.75 + 0.25,
                    });
                });
            });
        });

        this.wrapSize = { w: this.tileSize.w * 2, h: this.tileSize.h * 2 };

        this.scroll.current.x = this.scroll.target.x = this.scroll.last.x = -this.winW * 0.1;
        this.scroll.current.y = this.scroll.target.y = this.scroll.last.y = -this.winH * 0.1;
    }

    onWheel(e: WheelEvent) {
        if (!this.enabled) return;
        e.preventDefault();
        const factor = 0.9 * this.speed;
        this.scroll.target.x -= e.deltaX * factor;
        this.scroll.target.y -= e.deltaY * factor;
    }

    onPointerDown(e: PointerEvent) {
        if (!this.enabled) return;
        e.preventDefault();
        this.isDragging = true;
        this.activePointerId = e.pointerId;
        this.dragMoved = false;
        this.pressedItem = e.target instanceof Element ? e.target.closest('.item') : null;
        document.documentElement.classList.add('dragging');
        this.mouse.press.t = 1;
        this.drag.startX = e.clientX;
        this.drag.startY = e.clientY;
        this.drag.scrollX = this.scroll.target.x;
        this.drag.scrollY = this.scroll.target.y;
        this.$container.setPointerCapture?.(e.pointerId);
    }

    onPointerUp(e?: PointerEvent) {
        if (e && this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
        const wasDragging = this.isDragging;
        const dragMoved = this.dragMoved;
        const pressedItem = this.pressedItem;

        this.isDragging = false;
        if (e && this.activePointerId !== null) {
            this.$container.releasePointerCapture?.(this.activePointerId);
        }
        this.activePointerId = null;
        this.pressedItem = null;
        document.documentElement.classList.remove('dragging');
        this.mouse.press.t = 0;

        if (!e || e.type !== 'pointerup') return;
        if (!wasDragging || dragMoved || !pressedItem || !this.enabled) return;
        if (typeof this.onItemClick !== 'function') return;

        const released = document.elementFromPoint(e.clientX, e.clientY);
        const releasedItem = released instanceof Element ? released.closest('.item') : null;
        if (releasedItem !== pressedItem) return;

        const meta = pressedItem.__gridItem;
        if (!meta) return;

        const rect = meta.itemImage.getBoundingClientRect();
        this.onItemClick({
            index: meta.base.sourceIndex,
            src: meta.base.src,
            caption: meta.base.caption,
            rect: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
            },
        });
    }

    onPointerMove(e: PointerEvent) {
        if (!this.enabled) return;
        this.mouse.x.t = e.clientX / this.winW;
        this.mouse.y.t = e.clientY / this.winH;

        if (this.isDragging) {
            if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
            e.preventDefault();
            const dx = e.clientX - this.drag.startX;
            const dy = e.clientY - this.drag.startY;
            if (!this.dragMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                this.dragMoved = true;
            }
            this.scroll.target.x = this.drag.scrollX + dx * this.speed;
            this.scroll.target.y = this.drag.scrollY + dy * this.speed;
        }
    }

    render() {
        if (this.reduceMotion) {
            this.scroll.current.x = this.scroll.target.x;
            this.scroll.current.y = this.scroll.target.y;
            this.scroll.delta.x.t = this.scroll.delta.x.c = 0;
            this.scroll.delta.y.t = this.scroll.delta.y.c = 0;
            this.mouse.x.c = this.mouse.x.t;
            this.mouse.y.c = this.mouse.y.t;
            this.mouse.press.c = this.mouse.press.t;
        } else {
            this.scroll.current.x += (this.scroll.target.x - this.scroll.current.x) * this.scroll.ease;
            this.scroll.current.y += (this.scroll.target.y - this.scroll.current.y) * this.scroll.ease;

            this.scroll.delta.x.t = this.scroll.current.x - this.scroll.last.x;
            this.scroll.delta.y.t = this.scroll.current.y - this.scroll.last.y;
            this.scroll.delta.x.c += (this.scroll.delta.x.t - this.scroll.delta.x.c) * 0.04;
            this.scroll.delta.y.c += (this.scroll.delta.y.t - this.scroll.delta.y.c) * 0.04;
            this.mouse.x.c += (this.mouse.x.t - this.mouse.x.c) * 0.04;
            this.mouse.y.c += (this.mouse.y.t - this.mouse.y.c) * 0.04;
            this.mouse.press.c += (this.mouse.press.t - this.mouse.press.c) * 0.04;
        }

        const dirX = this.scroll.current.x > this.scroll.last.x ? 'right' : 'left';
        const dirY = this.scroll.current.y > this.scroll.last.y ? 'down' : 'up';

        this.items.forEach(item => {
            const newX = 0;
            const newY = 0;
            const scrollX = this.scroll.current.x;
            const scrollY = this.scroll.current.y;
            const posX = item.x + scrollX + item.extraX + newX;
            const posY = item.y + scrollY + item.extraY + newY;

            const beforeX = posX > this.winW;
            const afterX = posX + item.rect.width < 0;
            if (dirX === 'right' && beforeX) item.extraX -= this.wrapSize.w;
            if (dirX === 'left' && afterX) item.extraX += this.wrapSize.w;

            const beforeY = posY > this.winH;
            const afterY = posY + item.rect.height < 0;
            if (dirY === 'down' && beforeY) item.extraY -= this.wrapSize.h;
            if (dirY === 'up' && afterY) item.extraY += this.wrapSize.h;

            const fx = item.x + scrollX + item.extraX + newX;
            const fy = item.y + scrollY + item.extraY + newY;
            item.el.style.transform = `translate(${fx}px, ${fy}px)`;

            item.img.style.transform = `translate(0px, 0px) scale(${1.04 * this.imageScale})`;
        });

        this.scroll.last.x = this.scroll.current.x;
        this.scroll.last.y = this.scroll.current.y;
    }

    destroy() {
        this._loop?.destroy();
        this._loop = null;
        this._reduceMotionMq?.removeEventListener?.(
            "change",
            this._onReduceMotionChange
        );
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('pointermove', this.onPointerMove);
        this.$container.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
    }

    setEnabled(next: any) {
        this.enabled = Boolean(next);
        if (!this.enabled) {
            this.isDragging = false;
            this.dragMoved = false;
            this.pressedItem = null;
            this.mouse.press.t = 0;
            document.documentElement.classList.remove('dragging');
        }
    }
}

const OVERLAY_ASPECT_RATIO = 16 / 9;

function getOverlayMetrics(vw: number, vh: number) {
  const isMobile = vw <= 768;
  const isTablet = !isMobile && vw <= 1025;

  let thumbsH: number;
  let maxW: number;
  let maxH: number;

  if (isMobile) {
    thumbsH = 132;
    maxW = vw * 0.92;
    maxH = vh - thumbsH - 56;
  } else if (isTablet) {
    thumbsH = 148;
    maxW = vw * 0.82;
    maxH = vh - thumbsH - 64;
  } else {
    thumbsH = 156;
    maxW = vw * 0.72;
    maxH = vh - thumbsH - 72;
  }

  let targetW = maxW;
  let targetH = targetW / OVERLAY_ASPECT_RATIO;

  if (targetH > maxH) {
    targetH = maxH;
    targetW = targetH * OVERLAY_ASPECT_RATIO;
  }

  return {
    thumbsH,
    targetW: Math.round(targetW),
    targetH: Math.round(targetH),
  };
}
function getCenteredOverlayTop(vw: number, vh: number, targetH: number) {
  return Math.round((vh - targetH) / 2);
}

interface ExpandedState {
  index: number;
  rect: { left: number, top: number, width: number, height: number };
  vw: number;
  vh: number;
  target: { left: number, top: number, width: number, height: number };
  thumbsH: number;
}

interface SlideState {
  from: number;
  to: number;
  dir: number;
}

interface InfiniteGridGalleryImage {
  src?: string;
  url?: string;
  caption?: string;
  title?: string;
}

interface InfiniteGridGalleryProps {
  images?: Array<string | InfiniteGridGalleryImage>;
  columns?: number;
  gap?: number;
  speed?: number;
  imageScale?: number;
}

export default function InfiniteGridGallery({
  images,
  columns = 4,
  gap = 44,
  speed = 1,
  imageScale = 1,
}: InfiniteGridGalleryProps) {
  const imagesRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<InfiniteGrid | null>(null);

  const expandThumbsRef = useRef<HTMLDivElement | null>(null);
  const expandThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const thumbClickIndexRef = useRef<number | null>(null);

  const thumbDragRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const [expanded, setExpanded] = useState<ExpandedState | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [displayIndex, setDisplayIndex] = useState<number | null>(null);
  const [slide, setSlide] = useState<SlideState | null>(null);
  const [isThumbDragging, setIsThumbDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const closeTimerRef = useRef<number | undefined>(undefined);
  const slideTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const slideDurationMs = reduceMotion ? 0 : 600;
  const openCloseDurationMs = reduceMotion ? 0 : 750;
  const isAnimating = isOpening || isClosing || Boolean(slide);

  const unsplashPool = useMemo(
    () => [
      {
        src: "https://picsum.photos/seed/v01/1600/1200",
        title: "Velora Drift",
      },
      {
        src: "https://picsum.photos/seed/v02/1600/1200",
        title: "Zentha Bloom",
      },
      {
        src: "https://picsum.photos/seed/v03/1600/1200",
        title: "Auralis Fade",
      },
      {
        src: "https://picsum.photos/seed/v04/1600/1200",
        title: "Nyxara Flow",
      },
      {
        src: "https://picsum.photos/seed/v05/1600/1200",
        title: "Solune Mist",
      },
      {
        src: "https://picsum.photos/seed/v06/1600/1200",
        title: "Cryon Pulse",
      },
      {
        src: "https://picsum.photos/seed/v07/1600/1200",
        title: "Luneth Glow",
      },
      {
        src: "https://picsum.photos/seed/v08/1600/1200",
        title: "Virel Shift",
      },
      {
        src: "https://picsum.photos/seed/v09/1600/1200",
        title: "Orvyn Haze",
      },
      {
        src: "https://picsum.photos/seed/v10/1600/1200",
        title: "Draxen Veil",
      },
      {
        src: "https://picsum.photos/seed/h01/1600/1200",
        title: "Kaelis Tone",
      },
      {
        src: "https://picsum.photos/seed/h02/1600/1200",
        title: "Myra Flux",
      },
      {
        src: "https://picsum.photos/seed/h03/1600/1200",
        title: "Zypher Blend",
      },
      {
        src: "https://picsum.photos/seed/h06/1600/1200",
        title: "Elyon Sweep",
      },
      {
        src: "https://picsum.photos/seed/h05/1600/1200",
        title: "Thyra Wave",
      },
    ],
    []
  );

  const sources = useMemo(() => {
    const sourcePool: Array<string | InfiniteGridGalleryImage> =
      Array.isArray(images) && images.length ? images : unsplashPool;

    return Array.from({ length: 120 }, (_, i) => {
        const pick = sourcePool[i % sourcePool.length];
        const src = typeof pick === "string" ? pick : pick.src ?? pick.url ?? unsplashPool[i % unsplashPool.length].src;
        const title = typeof pick === "string" ? `Image ${i + 1}` : pick.caption ?? pick.title;

        return {
          src,
          caption: (() => {
            if (title) return title;
            const adjectives = [
              "Silent",
              "Soft",
              "Luminous",
              "Velvet",
              "Electric",
              "Drifting",
              "Infinite",
              "Neon",
              "Golden",
              "Hidden",
              "Crystal",
              "Midnight",
              "Warm",
              "Icy",
              "Dusty",
              "Liquid",
              "Misty",
              "Aurora",
              "Calm",
              "Vivid",
            ];

            const nouns = [
              "Horizon",
              "Gradient",
              "Bloom",
              "Echo",
              "Field",
              "Wave",
              "Ridge",
              "Atlas",
              "Canvas",
              "Spectrum",
              "Orbit",
              "Shoreline",
              "Valley",
              "Glade",
              "Tide",
              "Mirage",
              "Pulse",
              "Drift",
              "Skylight",
              "Cascade",
            ];

            const a = adjectives[i % adjectives.length];
            const b = nouns[(i * 7) % nouns.length];
            return `${a} ${b}`;
          })(),
        };
      });
  }, [images, unsplashPool]);

  const data = useMemo(() => {
    const cols = 3;
    const rows = 3;

    const itemW = 400;
    const itemH = 270;
    const gap = 40;
    const startX = 71;
    const startY = 58;

    return Array.from({ length: cols * rows }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      return {
        x: startX + col * (itemW + gap),
        y: startY + row * (itemH + gap),
        w: itemW,
        h: itemH,
      };
    });
  }, []);

  useEffect(() => {
    const el = imagesRef.current;
    if (!el) return;

    const setRvw = () => {
      document.documentElement.style.setProperty(
        "--rvw",
        `${document.documentElement.clientWidth / 100}px`
      );
    };

    setRvw();
    window.addEventListener("resize", setRvw);

    gridRef.current = new InfiniteGrid({
      el,
      sources,
      data,
      originalSize: { w: 1422, h: 1006 },
      columns,
      gap,
      speed,
      imageScale,
      onItemClick: ({ index, rect }) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const { thumbsH, targetW, targetH } = getOverlayMetrics(vw, vh);

        const targetLeft = Math.round((vw - targetW) / 2);
        const targetTop = getCenteredOverlayTop(vw, vh, targetH);

        setIsClosing(false);
        setIsOpening(true);
        setExpanded({
          index,
          rect,
          vw,
          vh,
          target: {
            left: targetLeft,
            top: targetTop,
            width: targetW,
            height: targetH,
          },
          thumbsH,
        });
        setDisplayIndex(index);
        setSlide(null);
      },
    });

    return () => {
      window.removeEventListener("resize", setRvw);
      gridRef.current?.destroy?.();
      gridRef.current = null;
    };
  }, [columns, data, gap, imageScale, sources, speed]);

  const active = expanded ? sources[expanded.index] : null;
  const display = displayIndex === null ? null : sources[displayIndex];

  const centerActiveThumb = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const container = expandThumbsRef.current;
    const activeThumb = expandThumbRefs.current[index];

    if (!container || !activeThumb) return;

    const left =
      activeThumb.offsetLeft -
      container.clientWidth / 2 +
      activeThumb.clientWidth / 2;

    container.scrollTo({ left, behavior });
  }, []);

  const navigateTo = useCallback((nextIndex: number) => {
    if (!expanded) return;
    if (isAnimating) return;

    if (nextIndex === expanded.index) {
      centerActiveThumb(nextIndex, reduceMotion ? "auto" : "smooth");
      return;
    }

    const n = sources.length;
    const currentIndex = expanded.index;
    const forward = (nextIndex - currentIndex + n) % n;
    const backward = (currentIndex - nextIndex + n) % n;
    const dir = forward <= backward ? 1 : -1;

    window.clearTimeout(slideTimerRef.current);

    setSlide({ from: currentIndex, to: nextIndex, dir });
    setExpanded((s) => (!s ? s : { ...s, index: nextIndex }));

    slideTimerRef.current = window.setTimeout(() => {
      setDisplayIndex(nextIndex);
      setSlide(null);
    }, slideDurationMs);
  }, [centerActiveThumb, expanded, isAnimating, sources.length, slideDurationMs, reduceMotion]);

  const closeExpanded = useCallback(() => {
    if (!expanded || isClosing) return;

    setIsClosing(true);
    setIsOpening(false);
    setSlide(null);

    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setExpanded(null);
      setIsClosing(false);
      setDisplayIndex(null);
    }, openCloseDurationMs);
  }, [expanded, isClosing, openCloseDurationMs]);

  useEffect(() => {
    gridRef.current?.setEnabled?.(!expanded);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const id = requestAnimationFrame(() => setIsOpening(false));
    return () => cancelAnimationFrame(id);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    requestAnimationFrame(() => {
      centerActiveThumb(expanded.index, reduceMotion ? "auto" : "smooth");
    });
  }, [centerActiveThumb, expanded, reduceMotion]);

  useEffect(() => {
    return () => {
      window.clearTimeout(slideTimerRef.current);
      window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExpanded();

      if (e.key === "ArrowLeft") {
        navigateTo((expanded.index - 1 + sources.length) % sources.length);
      }

      if (e.key === "ArrowRight") {
        navigateTo((expanded.index + 1) % sources.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeExpanded, expanded, navigateTo, sources.length]);

  const onThumbPointerDown = (e: ReactPointerEvent) => {
    const container = expandThumbsRef.current;
    if (!container) return;

    const button = (e.target as HTMLElement).closest("[data-thumb-index]");

    thumbClickIndexRef.current = button
      ? Number(button.getAttribute("data-thumb-index"))
      : null;

    thumbDragRef.current.active = true;
    thumbDragRef.current.pointerId = e.pointerId;
    thumbDragRef.current.startX = e.clientX;
    thumbDragRef.current.startScrollLeft = container.scrollLeft;
    thumbDragRef.current.moved = false;

    setIsThumbDragging(true);
    container.setPointerCapture?.(e.pointerId);
  };

  const onThumbPointerMove = (e: ReactPointerEvent) => {
    if (!thumbDragRef.current.active) return;
    if (thumbDragRef.current.pointerId !== e.pointerId) return;

    const container = expandThumbsRef.current;
    if (!container) return;

    const dx = e.clientX - thumbDragRef.current.startX;

    if (!thumbDragRef.current.moved && Math.abs(dx) > 3) {
      thumbDragRef.current.moved = true;
    }

    container.scrollLeft = thumbDragRef.current.startScrollLeft - dx;
  };

  const endThumbDrag = (e: ReactPointerEvent) => {
    if (!thumbDragRef.current.active) return;
    if (thumbDragRef.current.pointerId !== e.pointerId) return;

    const container = expandThumbsRef.current;
    container?.releasePointerCapture?.(e.pointerId);

    const clickedIndex = thumbClickIndexRef.current;
    const wasDragged = thumbDragRef.current.moved;

    thumbDragRef.current.active = false;
    thumbDragRef.current.pointerId = null;
    thumbClickIndexRef.current = null;

    setIsThumbDragging(false);

    if (!wasDragged && Number.isInteger(clickedIndex)) {
      navigateTo(clickedIndex as number);
    }

    window.setTimeout(() => {
      thumbDragRef.current.moved = false;
    }, 0);
  };

  const onThumbWheel = (e: ReactWheelEvent) => {
    const container = expandThumbsRef.current;
    if (!container) return;

    e.preventDefault();
    container.scrollLeft += e.deltaX || e.deltaY;
  };

  return (
    <>
      <section className="infinite-grid-gallery-root h-screen w-full cursor-grab overflow-hidden bg-white font-mono text-black select-none">
        <div ref={imagesRef} className="infinite-grid-gallery-images relative inline-block h-full w-full overflow-hidden whitespace-nowrap bg-white" />

        {active && expanded && display ? (
          <div
            className={`fixed inset-0 z-60 cursor-default bg-white transition-opacity duration-750 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none motion-reduce:duration-0 ${isOpening ? "opacity-0" : ""
              } ${isClosing ? "opacity-0" : ""
              } ${!isOpening && !isClosing ? "opacity-100" : ""}`}
            role="dialog"
            aria-modal="true"
            onMouseDown={() => closeExpanded()}
          >
            <div
              className="fixed inset-0 mt-[-3%] flex flex-col items-center justify-start"
              style={{

                "--thumbsH": `${expanded.thumbsH}px`,
              } as CSSProperties & Record<string, string | number>}
            >
              <div
                className="absolute origin-top-left overflow-hidden bg-[rgba(0,0,0,0.06)] will-change-transform"
                aria-hidden="true"
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  left: expanded.target.left,
                  top: expanded.target.top,
                  width: expanded.target.width,
                  height: expanded.target.height,
                  aspectRatio: "16 / 9",
                  transform:
                    isOpening || isClosing
                      ? `translate(${expanded.rect.left - expanded.target.left}px, ${expanded.rect.top - expanded.target.top
                      }px) scale(${expanded.rect.width / expanded.target.width}, ${expanded.rect.height / expanded.target.height
                      })`
                      : "translate(0px, 0px) scale(1, 1)",
                  transition: reduceMotion
                    ? "none"
                    : "transform 750ms cubic-bezier(0.785, 0.135, 0.15, 0.86)",
                }}
              >
                {slide ? (
                  <>
                    <img
                      className={`absolute inset-0 h-full w-full object-cover backface-hidden ${slide.dir > 0
                        ? "infinite-grid-gallery-slide-left-from"
                        : "infinite-grid-gallery-slide-right-from"
                        }`}
                      src={sources[slide.from].src}
                      alt={sources[slide.from].caption ?? ""}
                    />

                    <img
                      className={`absolute inset-0 h-full w-full object-cover backface-hidden ${slide.dir > 0
                        ? "infinite-grid-gallery-slide-left-to"
                        : "infinite-grid-gallery-slide-right-to"
                        }`}
                      src={sources[slide.to].src}
                      alt={sources[slide.to].caption ?? ""}
                    />
                  </>
                ) : (
                  <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src={display.src}
                    alt={display.caption ?? ""}
                  />
                )}
              </div>

              <button
                type="button"
                className="fixed left-(--nav-left) top-(--nav-top) z-4 grid h-13.5 w-13.5  -translate-y-1/2 place-items-center rounded-full border border-black/12 bg-white/90 text-[30px] leading-none text-black shadow-[0_18px_60px_rgba(0,0,0,0.12)] transition-opacity disabled:cursor-not-allowed disabled:opacity-35 max-lg:left-[calc(50%-70px)] max-lg:top-auto max-lg:bottom-[calc(var(--thumbsH)+55px)] max-lg:h-15 max-lg:w-15 max-lg:translate-y-0 max-lg:text-2xl max-md:left-[calc(50%-70px)] max-md:bottom-[calc(var(--thumbsH)+55px)] max-md:h-15 max-md:w-15 max-md:text-xl"
                style={{
                  "--nav-left": `${Math.max(16, expanded.target.left - 72)}px`,
                  "--nav-top": `${expanded.target.top + expanded.target.height / 2}px`,
                } as CSSProperties & Record<string, string | number>}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() =>
                  navigateTo((expanded.index - 1 + sources.length) % sources.length)
                }
                aria-label="Previous"
                disabled={isAnimating}
              >
                ‹
              </button>

              <button
                type="button"
                className="fixed right-(--nav-right) top-(--nav-top) z-4 grid h-13.5 w-13.5 -translate-y-1/2 place-items-center rounded-full border border-black/12 bg-white/90 text-[30px] leading-none text-black shadow-[0_18px_60px_rgba(0,0,0,0.12)] transition-opacity disabled:cursor-not-allowed disabled:opacity-35 max-lg:right-[calc(50%-70px)] max-lg:top-auto max-lg:bottom-[calc(var(--thumbsH)+55px)] max-lg:h-15 max-lg:w-15 max-lg:translate-y-0 max-lg:text-2xl max-md:right-[calc(50%-70px)] max-md:bottom-[calc(var(--thumbsH)+55px)] max-md:h-15 max-md:w-15 max-md:text-xl"
                style={{
                  "--nav-right": `${Math.max(
                    16,
                    window.innerWidth - (expanded.target.left + expanded.target.width) - 72
                  )}px`,
                  "--nav-top": `${expanded.target.top + expanded.target.height / 2}px`,
                } as CSSProperties & Record<string, string | number>}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => navigateTo((expanded.index + 1) % sources.length)}
                aria-label="Next"
                disabled={isAnimating}
              >
                ›
              </button>

              <div
                className="fixed inset-x-0 bottom-0 grid h-(--thumbsH) grid-cols-1 items-center gap-3 bg-white px-3.5 pb-3.5 max-lg:gap-2.5 max-lg:px-3 max-lg:pb-3 max-md:px-2.5 max-md:pb-2.5 max-md:gap-2"
                aria-label="All images"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center pt-2.5" aria-hidden="true">
                  <h2 className="mt-[0%] max-w-[min(860px,calc(100vw-40px))] overflow-hidden text-ellipsis whitespace-nowrap px-0 py-1.5 text-center text-[30px] font-medium leading-[1.1] tracking-tighter text-black select-none max-lg:max-w-[92vw] max-lg:text-2xl max-md:max-w-[94vw] max-md:text-lg">
                    {display.caption}
                  </h2>
                </div>
                <div
                  className={`relative w-full border-t border-black/12 pt-3 select-none max-lg:pt-2.5 max-md:pt-2 ${isThumbDragging ? "cursor-grabbing" : "cursor-grab"
                    }`}
                  onPointerDown={onThumbPointerDown}
                  onPointerMove={onThumbPointerMove}
                  onPointerUp={endThumbDrag}
                  onPointerCancel={endThumbDrag}
                  onPointerLeave={endThumbDrag}
                  onWheel={onThumbWheel}
                >
                  <div
                    ref={expandThumbsRef}
                    className={`flex gap-2.5 overflow-x-auto  px-1 scrollbar-none  overscroll-x-contain [touch-action:pan-x] max-lg:gap-[1vw] max-lg:px-0.5 max-md:gap-[2vw] max-md:px-0 ${isThumbDragging ? "cursor-grabbing scroll-auto" : "cursor-grab scroll-smooth"
                      }`}
                    role="list"
                    aria-label="All images"
                  >
                    {sources.map((item, idx) => {
                      const isActive = idx === expanded.index;

                      return (
                        <button
                          key={`${idx}-${item.src}`}
                          type="button"
                          role="listitem"
                          data-thumb-index={idx}
                          className={`relative box-border h-17.5 w-22.5 shrink-0 overflow-hidden border bg-black/4 p-0 transition-all duration-400 ease-out   max-lg:h-15 max-lg:w-20 max-md:h-12 max-md:w-18 ${isActive ? "border-black" : "border-transparent"
                            }`}
                          ref={(el) => {
                            expandThumbRefs.current[idx] = el;
                          }}
                          aria-label={`Open ${item.caption}`}
                        >
                          <img
                            className={`absolute inset-0 h-full w-full object-cover transition-[filter] duration-300 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] ${isActive ? "brightness-105" : "brightness-[0.8]"}`}
                            src={item.src}
                            alt={item.caption ?? ""}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <style jsx global>{`
 html.dragging .infinite-grid-gallery-root {
   cursor: grabbing;
 }

 .infinite-grid-gallery-images .item {
   position: absolute;
   top: 0;
   left: 0;
   will-change: transform;
   white-space: normal;
 }

 .infinite-grid-gallery-images .item-wrapper {
   position: relative;
   height: 100%;
   width: 100%;
   will-change: transform;
 }

 .infinite-grid-gallery-images .item-image {
   overflow: hidden;
   border: 1px solid rgba(0, 0, 0, 0.12);
   background: rgba(0, 0, 0, 0.04);
   transform-origin: 50% 50%;
   transition:
     box-shadow 350ms cubic-bezier(0.785, 0.135, 0.15, 0.86),
     transform 350ms cubic-bezier(0.785, 0.135, 0.15, 0.86);
 }

 .infinite-grid-gallery-images .item:hover .item-image {
   box-shadow: 0 18px 60px rgba(0, 0, 0, 0.12);
   transform: scale(1.015);
 }

 .infinite-grid-gallery-images .item:hover {
   z-index: 2;
 }

 .infinite-grid-gallery-images .item-image img {
   width: 100%;
   height: 100%;
   overflow: hidden;
   object-fit: cover;
   will-change: transform;
   opacity: 0;
   transition: opacity 300ms cubic-bezier(0.785, 0.135, 0.15, 0.86);
 }

 .infinite-grid-gallery-images .item-image img.is-loaded {
   opacity: 1;
 }

 .infinite-grid-gallery-images .caption {
   position: absolute;
   right: 0;
   bottom: 0;
   left: 0;
   display: block;
   width: 100%;
   height: auto;
   padding: 10px;
   font-size: 15px;
   line-height: 1.2;
   letter-spacing: -0.04em;
   opacity: 0;
   white-space: normal;
   user-select: none;
   color: #ffffff;
   background: rgba(255, 255, 255, 0.38);
   backdrop-filter: blur(5px);
   border: 1px solid rgba(0, 0, 0, 0.08);
   transform: translateY(12px);
   transition:
     opacity 350ms cubic-bezier(0.785, 0.135, 0.15, 0.86),
     transform 350ms cubic-bezier(0.785, 0.135, 0.15, 0.86);
   pointer-events: none;
 }

 .infinite-grid-gallery-images .item:hover .caption {
   opacity: 1;
   transform: translateY(0);
 }

 .infinite-grid-gallery-opening-media {
   transform: translate(var(--dx), var(--dy)) scale(var(--sx), var(--sy));
 }

 .infinite-grid-gallery-closing-media {
   transform: translate(var(--dx), var(--dy)) scale(var(--sx), var(--sy));
   transition-duration: 750ms;
 }

 .infinite-grid-gallery-slide-left-from {
   animation: infinite-grid-gallery-slide-from-left 600ms ease-in-out forwards;
 }

 .infinite-grid-gallery-slide-left-to {
   animation: infinite-grid-gallery-slide-to-left 600ms ease-in-out forwards;
 }

 .infinite-grid-gallery-slide-right-from {
   animation: infinite-grid-gallery-slide-from-right 600ms ease-in-out forwards;
 }

 .infinite-grid-gallery-slide-right-to {
   animation: infinite-grid-gallery-slide-to-right 600ms ease-in-out forwards;
 }

 @keyframes infinite-grid-gallery-slide-from-left {
   from {
     transform: translate3d(0%, 0, 0);
   }
   to {
     transform: translate3d(-100%, 0, 0);
   }
 }

 @keyframes infinite-grid-gallery-slide-to-left {
   from {
     transform: translate3d(100%, 0, 0);
   }
   to {
     transform: translate3d(0%, 0, 0);
   }
 }

 @keyframes infinite-grid-gallery-slide-from-right {
   from {
     transform: translate3d(0%, 0, 0);
   }
   to {
     transform: translate3d(100%, 0, 0);
   }
 }

 @keyframes infinite-grid-gallery-slide-to-right {
   from {
     transform: translate3d(-100%, 0, 0);
   }
   to {
     transform: translate3d(0%, 0, 0);
   }
 }

 @media (prefers-reduced-motion: reduce) {
   .infinite-grid-gallery-images .item-image,
   .infinite-grid-gallery-images .item-image img,
   .infinite-grid-gallery-images .caption {
     transition: none !important;
   }

   .infinite-grid-gallery-images .item:hover .item-image {
     transform: none;
   }

   .infinite-grid-gallery-images .item:hover .caption {
     transform: none;
   }

   .infinite-grid-gallery-closing-media {
     transition-duration: 0ms !important;
   }

   .infinite-grid-gallery-slide-left-from,
   .infinite-grid-gallery-slide-left-to,
   .infinite-grid-gallery-slide-right-from,
   .infinite-grid-gallery-slide-right-to {
     animation: none !important;
   }
 }
 `}</style>
    </>
  );
}
