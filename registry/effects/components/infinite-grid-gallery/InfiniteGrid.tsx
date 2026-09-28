import { createSuspendedRaf } from "./createSuspendedRaf";

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

export default class InfiniteGrid {
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

        // Fixed grid layout (non-overlapping) like the reference.
        this.layout = {
            cols: Math.round(clampNumber(columns, 1, 8, 4)),
            rows: 3,
            gap: clampNumber(gap, 0, 100, 44),
            margin: 40,
            aspect: 3 / 4, // height = width * aspect (4:3 card)
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

        // Keep tiles fitting the viewport so we never visually"eat" the gaps.
        const tileW =
            (this.winW - margin * 2 - gap * (cols - 1)) / cols;
        const tileH = tileW * this.layout.aspect;
        const halfGap = gap / 2;

        // Effective outer size per tile includes the gap padding on both sides.
        const outerW = tileW + gap;
        const outerH = tileH + gap;

        // Total set size across the visible grid (outer tiles abut each other).
        const setW = cols * outerW;
        const setH = rows * outerH;

        
        const topOffset = margin;
        const leftOffset = margin;

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
                    // Add internal padding so gaps stay visually consistent even with borders/hover.
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
                    // Tiles wrap in from offscreen, so a deferred load would expose the
                    // card background until the image decodes. Load eagerly and reveal
                    // once decoded; cached sources resolve synchronously via `complete`.
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
                        // Activation is driven from pointerup (see onPointerUp) rather than
                        // a click listener: pointer capture retargets click to $container.
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

        // The repeated grid spans 2x in each axis (we created copies at +setW/+setH).
        // Wrapping by the full 2-set span prevents the duplicates from collapsing
        // onto each other (which can visually eliminate gaps).
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

        // Pointer capture retargets the synthesized click, so resolve the tile under
        // the release point ourselves and require it to match the pressed one.
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
            // Snap pan - no ease / coast between target and current.
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
            // No parallax: keep tiles rigid in the grid.
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

            // No parallax (keep a tiny scale for coverage).
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
