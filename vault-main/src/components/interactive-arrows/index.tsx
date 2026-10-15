// Built using Hyperiux Vault: https://vault.hyperiux.com
import React, { type RefObject, useCallback, useEffect, useRef, useState } from "react";

// ---- utils.ts ----
export class Point {
  x: number;
  y: number;

  constructor(x?: number, y?: number) {
    this.x = x || 0;
    this.y = y || 0;
  }
}

export function lerpAngle(current: number, target: number, ease: number) {
  let delta = target - current;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return current + delta * ease;
}


// ---- createSuspendedRaf.ts ----
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


// ---- arrows.tsx ----

class Arrow {
  pos: Point;
  arrowsRef: RefObject<Arrow[]>;
  dx: number;
  dy: number;
  angle: number;
  isHovered: boolean;
  originalPos: { x: number; y: number };
  targetPos: { x: number; y: number };

  constructor(position: Point, arrowsRef: RefObject<Arrow[]>) {
    this.pos = position;
    this.arrowsRef = arrowsRef;
    this.dx = 0;
    this.dy = 0;
    this.angle = 0;
    this.isHovered = false;
    this.originalPos = { ...position };
    this.targetPos = { ...position };
  }

  update(mouseX: number, mouseY: number, reactionRadius: number, angleSmoothing: number, positionSmoothing: number) {
    this.dx = mouseX - this.pos.x;
    this.dy = mouseY - this.pos.y;
    this.angle = lerpAngle(this.angle, Math.atan2(this.dy, this.dx) * 0.95, angleSmoothing);

    // Everything is measured from the fixed home position so displacement
    // never feeds back into hover or into the push itself.
    const hx = this.originalPos.x - mouseX;
    const hy = this.originalPos.y - mouseY;
    const dist = Math.hypot(hx, hy);
    this.isHovered = dist < reactionRadius;

    // One smooth radial push away from the cursor. The quadratic falloff is
    // gentler than 1:1 everywhere, so neighbours never cross or bunch up, and
    // the ease-in near the cursor avoids a direction flip when it sits on an arrow.
    const pushRadius = reactionRadius * (70 / 30);
    let pushX = 0;
    let pushY = 0;
    if (dist > 0 && dist < pushRadius) {
      const t = 1 - dist / pushRadius;
      const edge = Math.min(1, dist / (pushRadius * 0.3));
      const centre = edge * edge * (3 - 2 * edge);
      const mag = 20 * t * t * centre;
      pushX = (hx / dist) * mag;
      pushY = (hy / dist) * mag;
    }
    this.targetPos.x = this.originalPos.x + pushX;
    this.targetPos.y = this.originalPos.y + pushY;

    this.pos.x += (this.targetPos.x - this.pos.x) * positionSmoothing;
    this.pos.y += (this.targetPos.y - this.pos.y) * positionSmoothing;
  }

  draw(ctx: CanvasRenderingContext2D, arrowColor: string, activeColor: string) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.beginPath();

    ctx.moveTo(20, 0);
    ctx.lineTo(-20, 0);
    ctx.moveTo(20, 0);
    ctx.lineTo(5, -15);
    ctx.moveTo(20, 0);
    ctx.lineTo(5, 15);
    ctx.lineWidth = this.isHovered ? 3 : 2;
    ctx.strokeStyle = this.isHovered ? activeColor : arrowColor;
    ctx.stroke();
    ctx.restore();
  }
}

const Arrows = ({
  arrowCount = 50,
  arrowColor = "black",
  activeColor = "black",
  reactionRadius = 30,
  stiffness = 0.15,
}: {
  arrowCount?: number;
  arrowColor?: string;
  activeColor?: string;
  reactionRadius?: number;
  stiffness?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const arrowsRef = useRef<Arrow[]>([]);
  const controlsRef = useRef({ arrowColor, activeColor, reactionRadius, stiffness });

  useEffect(() => {
    controlsRef.current = { arrowColor, activeColor, reactionRadius, stiffness };
  }, [activeColor, arrowColor, reactionRadius, stiffness]);

  const initializeArrows = useCallback((canvas: HTMLCanvasElement) => {
    const arrows: Arrow[] = [];
    const count = Math.max(1, Number(arrowCount) || 50);
    const spacing = 50 * Math.sqrt(50 / count);
    const cols = Math.floor(canvas.width / spacing);
    const rows = Math.floor(canvas.height / spacing);
    const xPadding = (canvas.width - (cols * spacing)) / 2;
    const yPadding = (canvas.height - (rows * spacing)) / 2;
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        arrows.push(new Arrow(new Point(x * spacing + xPadding, y * spacing + yPadding), arrowsRef));
      }
    }
    return arrows;
  }, [arrowCount]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      arrowsRef.current = initializeArrows(canvas);
    }
  }, [initializeArrows]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const arrows = arrowsRef.current;
    const mouse = mouseRef.current;
    const controls = controlsRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const resolvedStiffness = controls.stiffness === 0.12 ? 0.15 : controls.stiffness;
    arrows.forEach(arrow => {
      arrow.update(mouse.x, mouse.y, controls.reactionRadius, resolvedStiffness, resolvedStiffness * (0.1 / 0.15));
      arrow.draw(ctx, controls.arrowColor, controls.activeColor);
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    arrowsRef.current = initializeArrows(canvas);
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: drawFrame,
    });
    loop.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      loop.destroy();
    };
  }, [drawFrame, handleMouseMove, handleResize, initializeArrows]);

  return (
    // <div className="w-full h-full bg-white">
      <canvas ref={canvasRef} className="w-full h-full" />
    // </div>
  );
};


// ---- ArrowsOpacity.tsx ----

class OpacityArrow {
  pos: Point;
  dx: number;
  dy: number;
  angle: number;
  dist: number;

  constructor(position: Point) {
    this.pos = position;
    this.dx = 0;
    this.dy = 0;
    this.angle = 0;
    this.dist = 0;
  }

  update(mx: number, my: number, stiffness: number) {
    this.dx = mx - this.pos.x;
    this.dy = my - this.pos.y;
    this.dist = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    const targetAngle = Math.atan2(this.dy, this.dx);
    this.angle += (targetAngle - this.angle) * stiffness;
  }

  draw(ctx: CanvasRenderingContext2D, arrowColor: string, activeColor: string, reactionRadius: number) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-20, 0);
    ctx.moveTo(20, 0);
    ctx.lineTo(5, -13);
    ctx.moveTo(20, 0);
    ctx.lineTo(5, 13);
    ctx.lineWidth = this.dist < reactionRadius ? 3 : 2;
    const alpha = 1 - (this.dist / 300);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.strokeStyle = this.dist < reactionRadius ? activeColor : arrowColor;
    ctx.stroke();
    ctx.restore();
  }
}

const ArrowsOpacity = ({
  arrowCount = 50,
  arrowColor = "black",
  activeColor = "black",
  reactionRadius = 30,
  stiffness = 0.12,
}: {
  arrowCount?: number;
  arrowColor?: string;
  activeColor?: string;
  reactionRadius?: number;
  stiffness?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const arrowArrRef = useRef<OpacityArrow[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const initializeArrows = (canvas: HTMLCanvasElement) => {
      arrowArrRef.current = [];
      const count = Math.max(1, Number(arrowCount) || 50);
      const spacing = 75 * Math.sqrt(50 / count);
      for (let y = 0; y < canvas.height / 20; y++) {
        for (let x = 0; x < canvas.width / 50; x++) {
          const arr = new OpacityArrow(new Point(x * spacing, y * spacing));
          arrowArrRef.current.push(arr);
        }
      }
    };

    const handleResize = () => {
      const canvas = canvasRef.current as HTMLCanvasElement;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initializeArrows(canvas);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
        mouseRef.current = { x: mouseX, y: mouseY };
      }
    };

    const canvas = canvasRef.current as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initializeArrows(canvas);
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: () => {
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const { x: mx, y: my } = mouseRef.current;
        for (let y = 0; y < canvas.height / 20; y++) {
          for (let x = 0; x < canvas.width / 50; x++) {
            const arrow = arrowArrRef.current[y * 10 + x];
            if (arrow) {
              arrow.update(mx, my, stiffness === 0.12 ? 1 : stiffness);
              arrow.draw(ctx, arrowColor, activeColor, reactionRadius);
            }
          }
        }
      },
    });
    loop.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      loop.destroy();
    };
  }, [activeColor, arrowColor, arrowCount, reactionRadius, stiffness]);

  return (
      <canvas ref={canvasRef} className="w-full h-full pointer-events-auto" />
  );
};


// ---- ArrowsLimit.tsx ----

class LimitArrow {
  pos: Point;
  dx: number;
  dy: number;
  angle: number;
  ease: number;

  constructor(position: Point) {
    this.pos = position;
    this.dx = 0;
    this.dy = 0;
    this.angle = 0;
    this.ease = 0.1;
  }

  update(mouseX: number, mouseY: number, stiffness: number) {
    const targetDx = mouseX - this.pos.x;
    const targetDy = mouseY - this.pos.y;
    this.dx += (targetDx - this.dx) * stiffness;
    this.dy += (targetDy - this.dy) * stiffness;
    this.angle = Math.atan2(this.dy, this.dx);
  }

  draw(ctx: CanvasRenderingContext2D, arrowColor: string, activeColor: string, mouseX: number, mouseY: number, reactionRadius: number) {
    const isActive = Math.hypot(mouseX - this.pos.x, mouseY - this.pos.y) < reactionRadius;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.beginPath();

    ctx.moveTo(50, 0);
    ctx.lineTo(-50, 0);
    ctx.moveTo(50, 0);
    ctx.lineTo(10, -40);
    ctx.moveTo(50, 0);
    ctx.lineTo(10, 40);
    ctx.lineWidth = 2;
    ctx.strokeStyle = isActive ? activeColor : arrowColor;
    ctx.stroke();

    ctx.restore();
  }
}

interface ArrowsLimitProps {
  rows?: number;
  columns?: number;
  arrowCount?: number;
  arrowColor?: string;
  activeColor?: string;
  reactionRadius?: number;
  stiffness?: number;
}

const ArrowsLimit = ({
  rows = 5,
  columns = 10,
  arrowCount = 50,
  arrowColor = "black",
  activeColor = "black",
  reactionRadius = 30,
  stiffness = 0.035,
}: ArrowsLimitProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const arrowsRef = useRef<LimitArrow[]>([]);

  const initializeArrows = useCallback((canvas: HTMLCanvasElement) => {
    const arrows: LimitArrow[] = [];
    const count = Math.max(1, Number(arrowCount) || 50);
    const scale = Math.sqrt(count / 50);
    const resolvedColumns = Math.max(1, Math.round(columns * scale));
    const resolvedRows = Math.max(1, Math.round(rows * scale));
    const spacingX = canvas.width / (resolvedColumns + 1);
    const spacingY = canvas.height / (resolvedRows + 1);
    
    for (let y = 1; y <= resolvedRows; y++) {
      for (let x = 1; x <= resolvedColumns; x++) {
        arrows.push(
          new LimitArrow(
            new Point(
              x * spacingX,
              y * spacingY
            )
          )
        );
      }
    }
    return arrows;
  }, [arrowCount, columns, rows]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      arrowsRef.current = initializeArrows(canvas);
    }
  }, [initializeArrows]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      mouseRef.current = {
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top,  
      };
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const arrows = arrowsRef.current;
    const mouse = mouseRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const resolvedStiffness = stiffness === 0.12 ? 0.035 : stiffness;

    arrows.forEach(arrow => {
      arrow.update(mouse.x, mouse.y, resolvedStiffness);
      arrow.draw(ctx, arrowColor, activeColor, mouse.x, mouse.y, reactionRadius);
    });
  }, [activeColor, arrowColor, reactionRadius, stiffness]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    arrowsRef.current = initializeArrows(canvas);
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: drawFrame,
    });
    loop.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      loop.destroy();
    };
  }, [drawFrame, handleMouseMove, handleResize, initializeArrows]); 

  return (
    <div className="w-full h-full">
      <canvas 
        ref={canvasRef}
        className="w-full h-full "
      />
    </div>
  );
};


// ---- ArrowsPlay.tsx ----

class PlayArrow {
  pos: Point;
  dx: number;
  dy: number;
  angle: number;
  rotationEase: number;

  constructor(position: Point) {
    this.pos = position;
    this.dx = 0;
    this.dy = 0;
    this.angle = 0;
    this.rotationEase = 0.12;
  }

  update(mouseX: number, mouseY: number, stiffness: number) {
    this.dx = mouseX - this.pos.x;
    this.dy = mouseY - this.pos.y;
    const targetAngle = Math.atan2(this.dy, this.dx);

    this.angle = lerpAngle(this.angle, targetAngle, stiffness);
  }

  draw(ctx: CanvasRenderingContext2D, arrowColor: string, activeColor: string, mouseX: number, mouseY: number, reactionRadius: number) {
    const isActive = Math.hypot(mouseX - this.pos.x, mouseY - this.pos.y) < reactionRadius;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(-30, 0);
    ctx.moveTo(30, 0);
    ctx.lineTo(10, -20);
    ctx.moveTo(30, 0);
    ctx.lineTo(10, 20);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isActive ? activeColor : arrowColor;
    ctx.stroke();
    ctx.restore();
  }
}

const ArrowsPlay = ({
  arrowCount = 50,
  arrowColor = "black",
  activeColor = "black",
  reactionRadius = 30,
  stiffness = 0.12,
}: {
  arrowCount?: number;
  arrowColor?: string;
  activeColor?: string;
  reactionRadius?: number;
  stiffness?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const arrowsRef = useRef<PlayArrow[]>([]);
  const divRef = useRef<HTMLDivElement | null>(null); // For the center div with text

  const initializeArrows = useCallback((canvas: HTMLCanvasElement) => {
    const arrows: PlayArrow[] = [];
    const count = Math.max(1, Number(arrowCount) || 50);
    const spacing = 120 * Math.sqrt(50 / count);

    const cols = Math.floor(canvas.width / spacing);
    const rows = Math.floor(canvas.height / spacing);

    const xPadding = (canvas.width - (cols * spacing)) / 2;
    const yPadding = (canvas.height - (rows * spacing)) / 2;

    // Get div position relative to canvas
    const divRect = (divRef.current as HTMLDivElement).getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    const divLeft = divRect.left - canvasRect.left;
    const divRight = divRect.right - canvasRect.left;
    const divTop = divRect.top - canvasRect.top;
    const divBottom = divRect.bottom - canvasRect.top;
  
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        const arrowPos = new Point(
          x * spacing + xPadding,
          y * spacing + yPadding
        );
  
        
        if (
          arrowPos.x >= divLeft &&
          arrowPos.x <= divRight &&
          arrowPos.y > divTop + spacing &&
          arrowPos.y < divBottom - spacing
        ) {
          continue;
        }
  
        arrows.push(new PlayArrow(arrowPos));
      }
    }
    return arrows;
  }, [arrowCount]);
  

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      arrowsRef.current = initializeArrows(canvas);
    }
  }, [initializeArrows]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();


    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      mouseRef.current = {
        x: e.clientX - rect.left,  
        y: e.clientY - rect.top, 
      };
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const arrows = arrowsRef.current;
    const mouse = mouseRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    arrows.forEach(arrow => {
      arrow.update(mouse.x, mouse.y, stiffness);
      arrow.draw(ctx, arrowColor, activeColor, mouse.x, mouse.y, reactionRadius);
    });
  }, [activeColor, arrowColor, reactionRadius, stiffness]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    mouseRef.current = {
      x: width / 2,
      y: height / 2,
    };

    arrowsRef.current = initializeArrows(canvas);
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: drawFrame,
    });
    loop.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      loop.destroy();
    };
  }, [drawFrame, handleMouseMove, handleResize, initializeArrows]);

  return (
    <div className="relative w-full h-full ">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
      />
      <div
        ref={divRef}
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center cursor-pointer h-[25vw] w-[32vw] bg-transparent"
      >
        <h1 className='text-center text-[15vw] leading-none transition-all duration-500 ease' style={{ color: arrowColor }}>
          Play
        </h1>
      </div>
    </div>
  );
};


// ---- lines.tsx ----

class LinePoint {
  x: number;
  y: number;

  constructor(x?: number, y?: number) {
    this.x = x || 0;
    this.y = y || 0;
  }

  draw(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number, lineLength: number, arrowColor: string, activeColor: string, reactionRadius: number) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const unitX = dx / distance;
    const unitY = dy / distance;
    const lineEndX = this.x + unitX * lineLength;
    const lineEndY = this.y + unitY * lineLength;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.strokeStyle = distance < reactionRadius ? activeColor : arrowColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

const Lines = ({
  arrowCount = 50,
  arrowColor = "black",
  activeColor = "black",
  reactionRadius = 30,
}: {
  arrowCount?: number;
  arrowColor?: string;
  activeColor?: string;
  reactionRadius?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const pointsRef = useRef<LinePoint[]>([]);
  const lineLength = 30;

  const initializePoints = useCallback((canvas: HTMLCanvasElement) => {
    const points: LinePoint[] = [];
    const count = Math.max(1, Number(arrowCount) || 50);
    const spacing = 60 * Math.sqrt(50 / count);
    const cols = Math.ceil(canvas.width / spacing);
    const rows = Math.ceil(canvas.height / spacing);

    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        points.push(new LinePoint(x * spacing, y * spacing));
      }
    }
    return points;
  }, [arrowCount]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      pointsRef.current = initializePoints(canvas);
    }
  }, [initializePoints]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRef.current.forEach(point => point.draw(ctx, mouseRef.current.x, mouseRef.current.y, lineLength, arrowColor, activeColor, reactionRadius));
  }, [activeColor, arrowColor, reactionRadius]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    pointsRef.current = initializePoints(canvas);
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: drawFrame,
    });
    loop.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      loop.destroy();
    };
  }, [drawFrame, handleMouseMove, handleResize, initializePoints]);

  return <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />;
};


// ---- index.tsx ----
// Built using Hyperiux Vault: https://vault.hyperiux.com

const variations = [
  {
    id: "dynamic-arrow",
    label: "Dynamic PlayArrow",
    frameClassName: "border-black/15 bg-white",
    component: Arrows,
  },
  {
    id: "dynamic-opacity",
    label: "Opacity",
    frameClassName: "border-black/15 bg-white",
    component: ArrowsOpacity,
  },
  // Temporarily hidden from the options:
  // {
  //   id: "smooth-response",
  //   label: "Smooth",
  //   frameClassName: "border-black/15 bg-white",
  //   component: ArrowsLimit,
  // },
  {
    id: "vector-lines",
    label: "Lines",
    frameClassName: "border-black/15 bg-white",
    component: Lines,
  },
  // Temporarily hidden from the options:
  // {
  //   id: "playful-arrows",
  //   label: "Play",
  //   frameClassName: "border-black/15 bg-white",
  //   component: ArrowsPlay,
  // },
];

const InteractiveArrows = (props: Record<string, unknown>) => {
  const [active, setActive] = useState(variations[0].id);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Tablet and mobile get the "Open on desktop" disclaimer instead of the effect.
    const mobileQuery = window.matchMedia("(max-width: 1025px)");
    const updateMobile = () => setIsMobile(mobileQuery.matches);

    updateMobile();
    mobileQuery.addEventListener("change", updateMobile);
    return () => mobileQuery.removeEventListener("change", updateMobile);
  }, []);

  const activeVariation =
    variations.find((variation) => variation.id === active) ?? variations[0];
  const ActiveComponent = activeVariation.component;

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white px-6 text-center text-black">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Open on desktop</h2>
          <p className="mt-3 text-sm leading-6 text-black/60">
            Interactive Arrows needs a desktop pointer for the full hover response.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-white text-black">
      <div className="flex min-h-screen flex-col px-8 py-8 max-md:px-6 max-md:py-6">
        <div className="mx-auto flex w-full max-w-350 justify-center">
          <div className="inline-flex flex-wrap  relative z-400 justify-center gap-2 rounded-full border p-2 backdrop-blur-sm border-black/10 bg-black/5">
            {variations.map((variation) => (
              <button
                key={variation.id}
                onClick={() => setActive(variation.id)}
                className={`cursor-pointer rounded-full px-5 py-2 text-sm transition-all duration-200 max-md:px-4 ${
                  active === variation.id
                    ? "bg-black text-white"
                    : "bg-transparent text-black/60 hover:text-black"
                }`}
              >
                {variation.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-8 max-md:py-6">
          <div
            className={`h-[78vh] w-full max-w-350 overflow-hidden rounded-[28px] border transition-colors duration-300 ${activeVariation.frameClassName}`}
          >
            <ActiveComponent {...props} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveArrows;
