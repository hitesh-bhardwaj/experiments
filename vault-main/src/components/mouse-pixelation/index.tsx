/* eslint-disable react-hooks/immutability -- React Compiler / legacy-pattern rules: fixing risks changing animation timing (see eslint.config.mjs, issue #16); <img> kept for dynamic user-supplied sources. */
// Built using Hyperiux Vault: https://vault.hyperiux.com
'use client';
import { Canvas, extend, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

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


// ---- PixelCircle.tsx ----





gsap.registerPlugin(ScrollTrigger);

const INITIAL_POINTER = 0.5;
const DEFAULT_GRID_SIZE = 35;
const DEFAULT_LERP = 0.1;
const DEFAULT_BACKGROUND_COLOR = "#000000";
const DEFAULT_CIRCLE_COLOR_A = "#0080b3";
const DEFAULT_CIRCLE_COLOR_B = "#801acc";
const HOVER_LERP = 0.05;
const PLANE_WIDTH = 18;
const PLANE_HEIGHT = 12;
const PIXEL_CIRCLES_VERT = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PIXEL_CIRCLES_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uHover;
  uniform float uBasePixels;
  uniform float uDynamicRange;
  uniform float uNoiseStrength;
  uniform float uDisplacement;
  uniform float uColorBoost;
  uniform float uVignette;
  uniform vec2  uResolution;
  uniform vec2  uCircle1Center;
  uniform vec2  uCircle2Center;
  uniform vec3  uBackgroundColor;
  uniform vec3  uCircleColorA;
  uniform vec3  uCircleColorB;

  varying vec2 vUv;

  float noise2D(vec2 p) {
    vec2 ip = floor(p);
    vec2 f = fract(p);
    f = f * (3.0 - 2.0 * f);
    vec4 h = vec4(0.0, 1.0, 0.0, 1.0);
    vec4 n = h.xyzy * ip.x + h.xxzz * ip.y;
    n = sin(n * vec4(12.9898, 78.233, 45.164, 94.673));
    return dot(mix(n.xy, n.zw, f.y), mix(h.xz, h.yw, f.x)) * 0.1 + 0.5;
  }

  vec2 pixelate(vec2 uv, float pixels) {
    vec2 pixelUV = floor(uv * pixels) / pixels;
    float n = fract(sin(dot(floor(pixelUV * 10.0), vec2(12.9898, 78.233))) * 43758.5453)
      * uNoiseStrength
      * 0.9;
    return pixelUV + n * uHover;
  }

  void main() {
    vec2 uv = vUv;
    float dist = distance(uv, uMouse);
    float time = uTime * 2.0;
    float dynamicPixels = uBasePixels * (1.0 + sin(time) * uDynamicRange);
    float finalPixels = mix(
      uBasePixels,
      dynamicPixels,
      smoothstep(0.5, 0.0, dist) * uHover
    );

    vec2 disp = vec2(
      noise2D(uv + time),
      noise2D(uv * 3.0 + time + 1.0)
    ) * uDisplacement * uHover;

    vec2 pixelatedUV = mix(
      uv + disp,
      pixelate(uv + disp, finalPixels),
      smoothstep(0.20, 0.0, dist) * 3.0 * uHover
    );

    float c1 = smoothstep(0.5, 0.0, distance(pixelatedUV, uCircle1Center));
    float c2 = smoothstep(0.5, 0.0, distance(pixelatedUV, uCircle2Center));

    vec3 color = mix(
      uBackgroundColor,
      mix(uCircleColorA, uCircleColorB, c2),
      c1
    );

    float vig = 1.0 - smoothstep(0.3, 3.2, length(uv - 0.5) * 2.0);
    gl_FragColor = vec4(color * mix(1.0, vig, uVignette), 1.0);
  }
`;

class PixelCirclesMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(INITIAL_POINTER, INITIAL_POINTER) },
        uHover: { value: 0.7 },
        uBasePixels: { value: 35.0 },
        uDynamicRange: { value: 0.02 },
        uNoiseStrength: { value: 0.05 },
        uDisplacement: { value: 0.02 },
        uColorBoost: { value: 0.0 },
        uVignette: { value: 0.6 },
        uResolution: { value: new THREE.Vector2(2, 2) },
        uCircle1Center: { value: new THREE.Vector2(0.3, 0.5) },
        uCircle2Center: { value: new THREE.Vector2(0.7, 0.5) },
        uBackgroundColor: { value: new THREE.Color(DEFAULT_BACKGROUND_COLOR) },
        uCircleColorA: { value: new THREE.Color(DEFAULT_CIRCLE_COLOR_A) },
        uCircleColorB: { value: new THREE.Color(DEFAULT_CIRCLE_COLOR_B) },
      },
      vertexShader: PIXEL_CIRCLES_VERT,
      fragmentShader: PIXEL_CIRCLES_FRAG,
    });
  }
}

extend({ PixelCirclesMaterial });

// pixelCirclesMaterial is a custom shader material registered via extend(),
// so it isn't part of JSX.IntrinsicElements; reference it through an
// any-typed tag so JSX accepts it without changing what's rendered.
const PixelCirclesMaterialTag = "pixelCirclesMaterial" as any;

const DEFAULT_FIRST_LINE = {
  prefix: "Building ",
  highlight: "Interfaces.",
  highlightClassName: "font-light",
  className: "text-left",
};

const DEFAULT_SECOND_LINE = {
  prefix: "Shipping ",
  highlight: "Experiences.",
  highlightClassName: "font-medium",
  className: "text-right font-light max-md:text-left",
};

const DEFAULT_MOBILE_NOTICE =
  "Pro tip: this one's built for a mouse - try it on desktop for the cleanest pixel trail.";
const DEFAULT_DESCRIPTION =
  "The Vault is a curated collection of production-ready UI effects built to help developers ship polished interactions faster.";

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(max, Math.max(min, numericValue))
    : fallback;
}

function createShaderPalette(color: string) {
  const baseColor = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  baseColor.getHSL(hsl);

  if (hsl.l < 0.02 && hsl.s < 0.02) {
    return {
      background: baseColor,
      circleA: new THREE.Color(DEFAULT_CIRCLE_COLOR_A),
      circleB: new THREE.Color(DEFAULT_CIRCLE_COLOR_B),
    };
  }

  const hue = hsl.s < 0.02 ? 0.58 : hsl.h;
  const saturation = Math.max(0.45, hsl.s);
  const brightness = Math.max(0.34, Math.min(0.7, hsl.l + 0.18));

  return {
    background: baseColor,
    circleA: new THREE.Color().setHSL(hue, saturation, brightness),
    circleB: new THREE.Color().setHSL(
      (hue + 0.14) % 1,
      Math.min(1, saturation + 0.12),
      Math.min(0.74, brightness + 0.08)
    ),
  };
}

interface PixelCirclesPlaneProps {
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
  backgroundColor?: string;
}

function PixelCirclesPlane({
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
}: PixelCirclesPlaneProps) {
  const materialRef = useRef<PixelCirclesMaterial | null>(null);
  const pointerRef = useRef({
    target: { x: INITIAL_POINTER, y: INITIAL_POINTER },
    current: { x: INITIAL_POINTER, y: INITIAL_POINTER },
  });
  const isHoveredRef = useRef(false);
  const safeGridSize = clampNumber(gridSize, 8, 90, DEFAULT_GRID_SIZE);
  const safeLerp = clampNumber(lerp, 0.01, 0.6, DEFAULT_LERP);
  const paletteRef = useRef(createShaderPalette(backgroundColor));

  useEffect(() => {
    paletteRef.current = createShaderPalette(backgroundColor);
  }, [backgroundColor]);

  useEffect(() => {
    const onResize = () => {
      materialRef.current?.uniforms.uResolution.value.set(
        window.innerWidth,
        window.innerHeight
      );
    };

    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const onPointerEnter = () => {
    if (!mouseInteraction) {
      return;
    }

    isHoveredRef.current = true;
  };

  const onPointerLeave = () => {
    isHoveredRef.current = false;
  };

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!mouseInteraction || !event.uv) return;
    pointerRef.current.target = { x: event.uv!.x, y: event.uv!.y };
  };

  useFrame(({ clock }) => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    // Animation loop
    const time = clock.getElapsedTime();
    const { target, current } = pointerRef.current;
    const { uniforms } = material;

    uniforms.uTime.value = time;
    uniforms.uBasePixels.value = safeGridSize;
    uniforms.uBackgroundColor.value.copy(paletteRef.current.background);
    uniforms.uCircleColorA.value.copy(paletteRef.current.circleA);
    uniforms.uCircleColorB.value.copy(paletteRef.current.circleB);

    if (!mouseInteraction) {
      target.x = INITIAL_POINTER;
      target.y = INITIAL_POINTER;
    }

    current.x += (target.x - current.x) * safeLerp;
    current.y += (target.y - current.y) * safeLerp;
    uniforms.uMouse.value.set(current.x, current.y);
    uniforms.uHover.value +=
      ((mouseInteraction && isHoveredRef.current ? 1 : 0) -
        uniforms.uHover.value) *
      HOVER_LERP;
    uniforms.uCircle1Center.value.set(
      0.5 + 0.2 * Math.sin(time * 0.3),
      0.5 + 0.2 * Math.cos(time * 0.3)
    );
    uniforms.uCircle2Center.value.set(
      0.5 + 0.3 * Math.sin(time * 0.1),
      0.5 + 0.15 * Math.cos(time * 0.8)
    );
  });

  return (
    <mesh
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
    >
      <planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />
      <PixelCirclesMaterialTag ref={materialRef} />
    </mesh>
  );
}

interface PixelationLine {
  prefix?: string
  highlight?: string
  highlightClassName?: string
  className?: string
}

interface PixelationProps {
  firstLine?: PixelationLine;
  secondLine?: PixelationLine;
  mobileNotice?: string;
  description?: string;
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
  backgroundColor?: string;
}

function Pixelation({
  firstLine = DEFAULT_FIRST_LINE,
  secondLine = DEFAULT_SECOND_LINE,
  mobileNotice = DEFAULT_MOBILE_NOTICE,
  description = DEFAULT_DESCRIPTION,
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
}: PixelationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLElement | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");

  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? "always" : "never"),
    });
    setFrameloop(gate.isActive ? "always" : "never");
    return () => gate.destroy();
  }, []);

  // Simple text intro: each line fades up in turn (a plain fade with
  // reduced motion). Scoped to this section's own elements.
  useEffect(() => {
    const section = textRef.current;
    if (!section) return;
    const items = section.querySelectorAll("[data-v1-reveal]");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y: reduce ? 0 : 30 },
        { opacity: 1, y: 0, duration: reduce ? 0.6 : 1, ease: "power3.out", stagger: 0.15, delay: 0.2 }
      );
    }, section);
    return () => context.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative h-screen w-screen overflow-hidden">
      <div className="fixed left-0 top-0 h-full w-full overflow-hidden">
        <Canvas aria-hidden="true" frameloop={frameloop}>
          <color attach="background" args={[backgroundColor]} />
          <PixelCirclesPlane
            gridSize={gridSize}
            mouseInteraction={mouseInteraction}
            lerp={lerp}
            backgroundColor={backgroundColor}
          />
        </Canvas>
      </div>

      <section
        ref={textRef}
        className="pointer-events-none relative z-10 flex h-screen w-full flex-col justify-center gap-[4vw] px-[5vw] pt-[6vw] max-lg:gap-[6vw] max-lg:pt-[14vw] max-md:pt-[24vw]"
      >
        <h1 className="flex flex-col text-[8vw] font-medium leading-[1.1] text-white max-lg:text-[12vw] max-md:text-[14vw]">
          <span data-v1-reveal className={firstLine.className}>
            {firstLine.prefix}
            <span className={firstLine.highlightClassName}>
              {firstLine.highlight}
            </span>
          </span>
          <span data-v1-reveal className={secondLine.className}>
            {secondLine.prefix}
            <span className={secondLine.highlightClassName}>
              {secondLine.highlight}
            </span>
          </span>
        </h1>

        <p data-v1-reveal className="w-[32%] text-[1.4vw] leading-snug text-white/85 max-lg:w-[80%] max-lg:text-[3vw] max-md:w-full max-md:text-[4.5vw]">
          {description}
        </p>

        <p data-v1-reveal className="hidden font-medium tracking-wide text-white/60 max-lg:block max-lg:text-[2.6vw] max-md:text-[3.6vw]">
          {mobileNotice}
        </p>
      </section>
    </div>
  );
}


const PixelCircle = Pixelation;

// ---- PixelShift.tsx ----



const SHIFT_IMAGE_ASPECT_RATIO = 1920 / 1080;
const SHIFT_TABLET_MAX_WIDTH = 768;
const SHIFT_MOBILE_MAX_WIDTH = 640;
const SHIFT_VELOCITY_TARGET_SCALE = 35;
const SHIFT_VELOCITY_SMOOTH_LERP = 0.06;
const SHIFT_VELOCITY_DECAY = 0.96;
const SHIFT_MOVEMENT_TIMEOUT_MS = 300;
const SHIFT_MOVEMENT_STATE_LERP = 0.05;
const SHIFT_INITIAL_MOUSE = 0.5;
const SHIFT_INITIAL_VELOCITY_Y = 0.5;
const SHIFT_INITIAL_TIME = 2;
const SHIFT_DEFAULT_GRID_SIZE = 35;
const SHIFT_DEFAULT_LERP = 0.1;
const SHIFT_EFFECT_RADIUS = 0.3;
const SHIFT_EFFECT_INTENSITY = 1.8;
const SHIFT_DEFAULT_IMAGE_URL = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg";
const SHIFT_DEFAULT_NOTICE =
  "Heads up: the pixel-drift responds to cursor velocity - desktop is the sweet spot.";

function clampShiftNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(max, Math.max(min, numericValue))
    : fallback;
}

const SHIFT_PIXEL_SHIFT_VERT = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHIFT_PIXEL_SHIFT_FRAG = /* glsl */ `
  uniform vec2 uMouse;
  uniform vec2 uVelocity;
  uniform float uBlockSize;
  uniform float uRadius;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uIsMoving;
  uniform sampler2D uTexture;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    vec2 blockCoord = floor(uv / uBlockSize) * uBlockSize + (uBlockSize * 0.5);
    blockCoord += sin(uTime * 0.3) * 0.002 + cos(uTime * 0.4) * 0.001;

    float dist = distance(blockCoord, uMouse);
    float smoothDist = smoothstep(uRadius * 1.2, 0.0, dist);

    float influence = smoothDist * (1.0 - dist / (uRadius * 1.2));
    influence *= 1.0 + sin(uTime * 1.5) * 0.15 + cos(uTime * 2.3) * 0.05;
    influence *= smoothstep(0.0, 1.0, uIsMoving);

    vec2 vel = uVelocity;
    float smoothSignX = vel.x / (abs(vel.x) + 0.08);
    float smoothSignY = vel.y / (abs(vel.y) + 0.08);
    float blend = smoothstep(-0.05, 0.15, abs(vel.x) - abs(vel.y));

    vec2 dir = mix(
      vec2(0.0, smoothSignY),
      vec2(smoothSignX, 0.0),
      blend
    );

    vec2 displacement = dir * influence * uBlockSize * uIntensity;
    displacement *= 1.0 + sin(uTime * 0.8) * 0.2 + cos(uTime * 1.2) * 0.1;

    vec2 displacedUV = uv - displacement;
    displacedUV += sin(displacedUV.x * 8.0 + uTime) * 0.002
      + cos(displacedUV.y * 6.0 + uTime * 0.8) * 0.001;

    vec4 color = texture2D(uTexture, displacedUV);
    color.rgb *= 1.0 + influence * 0.1;

    gl_FragColor = color;
  }
`;

interface PlaneWithShaderProps {
  texture: THREE.Texture;
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
}

function PlaneWithShader({
  texture,
  gridSize = SHIFT_DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = SHIFT_DEFAULT_LERP,
}: PlaneWithShaderProps) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const isMovingRef = useRef(1);
  const lastMouseRef = useRef(new THREE.Vector2(SHIFT_INITIAL_MOUSE, SHIFT_INITIAL_MOUSE));
  const targetMouseRef = useRef(new THREE.Vector2(SHIFT_INITIAL_MOUSE, SHIFT_INITIAL_MOUSE));
  const targetVelocityRef = useRef(new THREE.Vector2(0, 0));
  const smoothedVelocityRef = useRef(new THREE.Vector2(0, 0));
  const { size, viewport } = useThree();
  const safeGridSize = clampShiftNumber(gridSize, 8, 90, SHIFT_DEFAULT_GRID_SIZE);
  const safeLerp = clampShiftNumber(lerp, 0.01, 0.6, SHIFT_DEFAULT_LERP);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMouse: { value: new THREE.Vector2(SHIFT_INITIAL_MOUSE, SHIFT_INITIAL_MOUSE) },
          uVelocity: { value: new THREE.Vector2(0, SHIFT_INITIAL_VELOCITY_Y) },
          uBlockSize: { value: 1 / SHIFT_DEFAULT_GRID_SIZE },
          uRadius: { value: SHIFT_EFFECT_RADIUS },
          uIntensity: { value: SHIFT_EFFECT_INTENSITY },
          uTime: { value: SHIFT_INITIAL_TIME },
          uIsMoving: { value: 1 },
          uTexture: { value: texture },
        },
        vertexShader: SHIFT_PIXEL_SHIFT_VERT,
        fragmentShader: SHIFT_PIXEL_SHIFT_FRAG,
        transparent: false,
      }),
    [texture]
  );

  useEffect(() => {
    shaderMaterialRef.current = shaderMaterial;
  }, [shaderMaterial]);

  useEffect(() => {
    shaderMaterial.uniforms.uBlockSize.value = 1 / safeGridSize;
  }, [safeGridSize, shaderMaterial]);

  useEffect(() => {
    if (!mouseInteraction) {
      targetMouseRef.current.set(SHIFT_INITIAL_MOUSE, SHIFT_INITIAL_MOUSE);
      targetVelocityRef.current.set(0, 0);
      smoothedVelocityRef.current.set(0, 0);
      isMovingRef.current = 0;
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const nextMouse = new THREE.Vector2(
        event.clientX / size.width,
        1 - event.clientY / size.height
      );
      const nextVelocity = nextMouse
        .clone()
        .sub(lastMouseRef.current)
        .multiplyScalar(SHIFT_VELOCITY_TARGET_SCALE);

      targetMouseRef.current.copy(nextMouse);
      targetVelocityRef.current.copy(nextVelocity);
      lastMouseRef.current.copy(nextMouse);
      isMovingRef.current = 1;

      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }

      moveTimeoutRef.current = setTimeout(() => {
        isMovingRef.current = 0;
      }, SHIFT_MOVEMENT_TIMEOUT_MS);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, [mouseInteraction, size.height, size.width]);

  useFrame(() => {
    const shader = shaderMaterialRef.current;

    if (!shader) {
      return;
    }

    // Animation loop
    shader.uniforms.uTime.value = clockRef.current.getElapsedTime();
    shader.uniforms.uMouse.value.lerp(targetMouseRef.current, safeLerp);
    smoothedVelocityRef.current.lerp(
      targetVelocityRef.current,
      SHIFT_VELOCITY_SMOOTH_LERP
    );
    shader.uniforms.uVelocity.value.lerp(
      smoothedVelocityRef.current,
      safeLerp
    );
    targetVelocityRef.current.multiplyScalar(SHIFT_VELOCITY_DECAY);
    shader.uniforms.uIsMoving.value = THREE.MathUtils.lerp(
      shader.uniforms.uIsMoving.value,
      isMovingRef.current,
      SHIFT_MOVEMENT_STATE_LERP
    );
  });

  const viewportAspectRatio = viewport.width / viewport.height;
  const isTabletViewport =
    size.width <= SHIFT_TABLET_MAX_WIDTH && size.width > SHIFT_MOBILE_MAX_WIDTH;
  let planeWidth: number;
  let planeHeight: number;

  // Plane sizing
  if (isTabletViewport || SHIFT_IMAGE_ASPECT_RATIO > viewportAspectRatio) {
    planeWidth = viewport.width;
    planeHeight = viewport.width / SHIFT_IMAGE_ASPECT_RATIO;
  } else {
    planeHeight = viewport.height;
    planeWidth = viewport.height * SHIFT_IMAGE_ASPECT_RATIO;
  }

  return (
    <mesh>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <primitive object={shaderMaterial} attach="material" ref={materialRef} />
    </mesh>
  );
}

function resolveImageSource(source: any) {
  if (typeof source === "string") return source;
  if (source?.src) return source.src;

  return source;
}

function resolveTextureSource(source: any) {
  const imageSource = resolveImageSource(source);

  if (!imageSource) return imageSource;
  if (imageSource.startsWith("/")) return imageSource;

  try {
    new URL(imageSource);

    // external URL - return as-is (ensure your image host sends CORS headers)
  } catch {
    return imageSource;
  }

  return imageSource;
}

function loadTextureBlobUrl(source: any): Promise<string> {
  const imageSource = resolveTextureSource(source);

  if (!imageSource) {
    return Promise.reject(new Error("A valid image URL is required."));
  }

  return fetch(imageSource, {
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Image request failed with ${response.status}`);
      }

      return response.blob();
    })
    .then((blob) => URL.createObjectURL(blob))
    .catch((error) => {
      throw new Error(
        `Unable to load PixelShift texture: ${imageSource}. Current origin is ${window.location.origin}. Make sure the public URL allows CORS for this site. ${error?.message || ""}`
      );
    });
}

interface PixelShiftSceneProps {
  img: unknown;
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
}

function Scene({
  img,
  gridSize = SHIFT_DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = SHIFT_DEFAULT_LERP,
}: PixelShiftSceneProps) {
  const resolvedImage = resolveImageSource(img) || SHIFT_DEFAULT_IMAGE_URL;
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | undefined;

    loadTextureBlobUrl(resolvedImage)
      .then((nextObjectUrl) => {
        objectUrl = nextObjectUrl;

        if (!isCancelled) {
          setTextureUrl(nextObjectUrl);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.warn(error?.message || error);
        }
      });

    return () => {
      isCancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedImage]);

  const texture = useMemo(() => {
    if (!textureUrl) return null;

    const loader = new THREE.TextureLoader();

    loader.setCrossOrigin("anonymous");

    const nextTexture = loader.load(
      textureUrl,
      undefined,
      undefined,
      (error) => {
        console.warn(
          `Unable to decode PixelShift texture: ${resolvedImage}.`,
          error
        );
      }
    );

    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;

    return nextTexture;
  }, [resolvedImage, textureUrl]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  if (!texture) return null;

  return (
    <PlaneWithShader
      texture={texture}
      gridSize={gridSize}
      mouseInteraction={mouseInteraction}
      lerp={lerp}
    />
  );
}

interface PixelShiftProps {
  img?: unknown;
  imageUrl?: unknown;
  notice?: string;
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
}

function PixelShift({
  img,
  imageUrl = img || SHIFT_DEFAULT_IMAGE_URL,
  notice = SHIFT_DEFAULT_NOTICE,
  gridSize = SHIFT_DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = SHIFT_DEFAULT_LERP,
}: PixelShiftProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");

  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? "always" : "never"),
    });
    setFrameloop(gate.isActive ? "always" : "never");
    return () => gate.destroy();
  }, []);

  return (
    <div ref={rootRef} className="relative h-screen w-full">
      <div className="pointer-events-none absolute left-1/2 top-40 z-10 hidden w-full -translate-x-1/2 px-5 max-lg:flex max-lg:justify-center max-md:left-0 max-md:block max-md:translate-x-0 max-md:pt-5">
        <p className="inline-flex max-w-[92vw] rounded-sm border border-white/15 bg-black/40 px-4 py-2 font-medium text-white/75 backdrop-blur max-lg:w-[80%] max-lg:text-center max-lg:text-[2.8vw] max-md:w-full max-md:text-[3.5vw]">
          {notice}
        </p>
      </div>

      <Canvas aria-hidden="true" camera={{ position: [0, 0, 5], fov: 45 }} frameloop={frameloop}>
        <color attach="background" args={["#000000"]} />
        <Scene
          img={imageUrl}
          gridSize={gridSize}
          mouseInteraction={mouseInteraction}
          lerp={lerp}
        />
      </Canvas>
    </div>
  );
}


// ---- EnhancedPixelCube.tsx ----




const CUBE_INITIAL_POINTER = 0.5;
const CUBE_MOVEMENT_THRESHOLD = 0.001;
const CUBE_DEFAULT_GRID_SIZE = 35;
const CUBE_DEFAULT_LERP = 0.1;
const CUBE_DEFAULT_CUBE_SIZE = 1;
const CUBE_DEFAULT_GRID_EMBOSSING = 1;
const CUBE_VELOCITY_BLEND_CURRENT = 0.8;
const CUBE_VELOCITY_BLEND_NEXT = 0.2;
const CUBE_ACTIVE_HOVER_LERP = 0.06;
const CUBE_IDLE_HOVER_LERP = 0.008;
const CUBE_TRAIL_STRENGTH_LERP = 0.1;
const CUBE_TRAIL_STRENGTH_SCALE = 50;
const CUBE_TRAIL_STRENGTH_BASE = 0.3;
const CUBE_MOVE_IDLE_MS = 500;
const CUBE_COLOR_INTERVAL_MIN_MS = 1200;
const CUBE_COLOR_INTERVAL_RANGE_MS = 5000;
const CUBE_COLOR_LERP = 0.1;
const CUBE_MAX_DIST = 2;
const CUBE_TIME_SCALE = 0.003;
const CUBE_WAVE_FREQUENCY = 8;
const CUBE_WAVE_SPEED = 3;
const CUBE_WAVE_STRENGTH = 0.15;
const CUBE_VELOCITY_INFLUENCE_SCALE = 100;
const CUBE_DEFORMATION_SCALE = 0.3;
const CUBE_PLANE_ARGS: [number, number, number, number] = [18, 12, 200, 200];
const CUBE_CUBE_ARGS: [number, number, number, number, number, number] = [1, 1, 1, 20, 20, 20];
const CUBE_BLOOM_INTENSITY = 1;
const CUBE_BLOOM_THRESHOLD = 1.5;
const CUBE_BLOOM_SMOOTHING = 0.5;
const CUBE_DEFAULT_NOTICE_TEXT =
  "Best on desktop: whip your mouse to see the trail snap, bloom, and bend the grid.";
const CUBE_DEFAULT_COLOR_OPTIONS = [
  {
    color: "#39FF14",
    emissive: "#39FF14",
  },
  {
    color: "aqua",
    emissive: "aqua",
  },
  {
    color: "#FFD600",
    emissive: "#FFD600",
  },
];

const CUBE_PIXEL_TRAIL_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;

  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uBasePixels;
  uniform vec2 uMouseVelocity;
  uniform float uTrailStrength;
  uniform float uGridEmbossing;

  float noise2D(vec2 p) {
    vec2 ip = floor(p);
    vec2 f = fract(p);
    f = f * (3.0 - 2.0 * f);
    float n00 = sin(dot(ip, vec2(12.9898, 78.233)));
    float n10 = sin(dot(ip + vec2(1.0, 0.0), vec2(12.9898, 78.233)));
    float n01 = sin(dot(ip + vec2(0.0, 1.0), vec2(12.9898, 78.233)));
    float n11 = sin(dot(ip + vec2(1.0, 1.0), vec2(12.9898, 78.233)));
    float nx0 = mix(n00, n10, f.x);
    float nx1 = mix(n01, n11, f.x);
    return mix(nx0, nx1, f.y) * 0.5 + 0.5;
  }

  float easeInOutCubic(float t) {
    return t < 0.5
      ? 4.0 * t * t * t
      : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  float trailDistance(vec2 point, vec2 mousePos, vec2 velocity) {
    vec2 toPoint = point - mousePos;
    float velocityMag = length(velocity);

    if (velocityMag < 0.001) {
      return length(toPoint);
    }

    vec2 velocityDir = normalize(velocity);
    float alongTrail = dot(toPoint, velocityDir);
    float perpDist = length(toPoint - velocityDir * alongTrail);
    float trailLength = velocityMag * 15.0;

    if (alongTrail > 0.0 && alongTrail < trailLength) {
      return perpDist;
    }

    if (alongTrail <= 0.0) {
      return length(toPoint);
    }

    return length(toPoint - velocityDir * trailLength);
  }

  void main() {
    vUv = uv;
    vPosition = position;

    vec3 pos = position;
    vec2 pixelUV = floor(uv * uBasePixels) / uBasePixels;
    float dist = trailDistance(pixelUV, uMouse, uMouseVelocity);
    float hoverRadius = 0.15 + length(uMouseVelocity) * 0.3;
    float hoverEffect = smoothstep(hoverRadius, 0.0, dist) * uHover * uTrailStrength;
    float noiseValue = noise2D(pixelUV * 8.0 + uTime * 0.3);
    float maxExtrusion = 0.8 * uGridEmbossing;
    float extrusion = hoverEffect * (0.6 + noiseValue * 0.4) * maxExtrusion;
    float animationDelay = dist * 2.0;
    float animatedHover = max(0.0, uHover - animationDelay * 0.1);

    hoverEffect = easeInOutCubic(hoverEffect);
    animatedHover = clamp(animatedHover * 1.5, 0.0, 1.0);
    extrusion *= easeInOutCubic(animatedHover);

    pos.z += extrusion;
    pos.x += sin(pixelUV.x * 40.0) * hoverEffect * 0.008;
    pos.y += cos(pixelUV.y * 40.0) * hoverEffect * 0.008;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const CUBE_PIXEL_TRAIL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uBasePixels;
  uniform vec2 uMouseVelocity;
  uniform float uTrailStrength;
  uniform float uGridEmbossing;

  varying vec2 vUv;
  varying vec3 vPosition;

  float trailDistance(vec2 point, vec2 mousePos, vec2 velocity) {
    vec2 toPoint = point - mousePos;
    float velocityMag = length(velocity);

    if (velocityMag < 0.001) {
      return length(toPoint);
    }

    vec2 velocityDir = normalize(velocity);
    float alongTrail = dot(toPoint, velocityDir);
    float perpDist = length(toPoint - velocityDir * alongTrail);
    float trailLength = velocityMag * 15.0;

    if (alongTrail > 0.0 && alongTrail < trailLength) {
      return perpDist;
    }

    if (alongTrail <= 0.0) {
      return length(toPoint);
    }

    return length(toPoint - velocityDir * trailLength);
  }

  float easeInOutCubic(float t) {
    return t < 0.5
      ? 4.0 * t * t * t
      : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    vec2 uv = vUv;
    vec2 pixelUV = floor(uv * uBasePixels) / uBasePixels;
    float dist = trailDistance(pixelUV, uMouse, uMouseVelocity);
    float hoverRadius = 0.15 + length(uMouseVelocity) * 0.3;
    float hoverEffect = smoothstep(hoverRadius, 0.0, dist) * uHover * uTrailStrength;
    float depthShading = 1.0 + vPosition.z * 0.3 * uGridEmbossing;
    vec3 topColor = vec3(0.0, 0.0, 0.0);
    vec3 sideColor = vec3(0.01, 0.01, 0.01);
    float topFaceFactor = smoothstep(0.7, 1.0, normalize(vPosition).z);
    vec3 cubeColor = mix(sideColor, topColor, topFaceFactor);
    float light = 0.5 + 0.5 * dot(
      normalize(vec3(0.3, 0.5, 1.0)),
      normalize(vPosition + vec3(0.0, 0.0, 1.0))
    );
    vec2 pixelCenter = (floor(uv * uBasePixels) + 0.5) / uBasePixels;
    vec2 pixelOffset = abs(uv - pixelCenter) * uBasePixels;
    float border = step(0.45, max(pixelOffset.x, pixelOffset.y));
    float vig = 1.0 - smoothstep(0.3, 3.2, length(uv - 0.5) * 2.0);

    hoverEffect = easeInOutCubic(hoverEffect);
    cubeColor *= light;
    cubeColor = mix(cubeColor, vec3(0.0), border * 0.9);
    cubeColor *= mix(1.0, vig, 0.6);

    gl_FragColor = vec4(cubeColor * depthShading, 1.0);
  }
`;

const CUBE_CUBE_DEFORM_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CUBE_CUBE_DEFORM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uEmissive;
  uniform float uEmissiveIntensity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 baseColor = uColor;
    vec3 litColor = baseColor * (0.3 + 0.7 * diff);
    vec3 finalColor = litColor + (uEmissive * uEmissiveIntensity * 0.9);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

class PixelTrailMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(CUBE_INITIAL_POINTER, CUBE_INITIAL_POINTER) },
        uHover: { value: 0.0 },
        uBasePixels: { value: 35.0 },
        uMouseVelocity: { value: new THREE.Vector2(0, 0) },
        uTrailStrength: { value: 0.0 },
        uGridEmbossing: { value: CUBE_DEFAULT_GRID_EMBOSSING },
      },
      vertexShader: CUBE_PIXEL_TRAIL_VERT,
      fragmentShader: CUBE_PIXEL_TRAIL_FRAG,
    });
  }
}

class CubeDeformMaterial extends THREE.ShaderMaterial {
  constructor(color: THREE.Color, emissive: THREE.Color) {
    super({
      uniforms: {
        uColor: { value: color },
        uEmissive: { value: emissive },
        uEmissiveIntensity: { value: 2.4 },
      },
      vertexShader: CUBE_CUBE_DEFORM_VERT,
      fragmentShader: CUBE_CUBE_DEFORM_FRAG,
    });
  }
}

extend({ PixelTrailMaterial, CubeDeformMaterial });

function clampCubeNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(max, Math.max(min, numericValue))
    : fallback;
}

// Custom shader materials registered via extend() aren't part of
// JSX.IntrinsicElements; reference them through any-typed tags so JSX
// accepts them without changing what's rendered.
const PixelTrailMaterialTag = "pixelTrailMaterial" as any;
const CubeDeformMaterialTag = "cubeDeformMaterial" as any;

interface PointerVec2Ref {
  mousePositionRef: RefObject<{ x: number, y: number }>
  mouseVelocityRef: RefObject<{ x: number, y: number }>
  trailStrengthRef: RefObject<number>
}

interface PixelGridProps extends PointerVec2Ref {
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
  gridEmbossing?: number;
}

function PixelGrid({
  mousePositionRef,
  mouseVelocityRef,
  trailStrengthRef,
  gridSize = CUBE_DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = CUBE_DEFAULT_LERP,
  gridEmbossing = CUBE_DEFAULT_GRID_EMBOSSING,
}: PixelGridProps) {
  const materialRef = useRef<PixelTrailMaterial | null>(null);
  const pointerTargetRef = useRef({ x: CUBE_INITIAL_POINTER, y: CUBE_INITIAL_POINTER });
  const pointerCurrentRef = useRef({ x: CUBE_INITIAL_POINTER, y: CUBE_INITIAL_POINTER });
  const lastPointerRef = useRef({ x: CUBE_INITIAL_POINTER, y: CUBE_INITIAL_POINTER });
  const isMovingRef = useRef(false);
  const lastMoveTimeRef = useRef(0);
  const safeGridSize = clampCubeNumber(gridSize, 8, 90, CUBE_DEFAULT_GRID_SIZE);
  const safeLerp = clampCubeNumber(lerp, 0.01, 0.6, CUBE_DEFAULT_LERP);
  const safeGridEmbossing = clampCubeNumber(
    gridEmbossing,
    0,
    2,
    CUBE_DEFAULT_GRID_EMBOSSING
  );

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!mouseInteraction || !event.uv) return;
    const [u, v] = [event.uv!.x, event.uv!.y];
    const currentTime = Date.now();
    const deltaX = Math.abs(u - lastPointerRef.current.x);
    const deltaY = Math.abs(v - lastPointerRef.current.y);
    const hasMoved =
      deltaX > CUBE_MOVEMENT_THRESHOLD || deltaY > CUBE_MOVEMENT_THRESHOLD;

    if (hasMoved) {
      pointerTargetRef.current.x = u;
      pointerTargetRef.current.y = v;
      lastPointerRef.current.x = u;
      lastPointerRef.current.y = v;
      lastMoveTimeRef.current = currentTime;
      isMovingRef.current = true;
    }

    mousePositionRef.current.x = u;
    mousePositionRef.current.y = v;
  };

  useFrame((state) => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    // Animation loop
    const time = state.clock.getElapsedTime();
    const currentTime = Date.now();
    const timeSinceLastMove = currentTime - lastMoveTimeRef.current;

    material.uniforms.uTime.value = time;
    material.uniforms.uBasePixels.value = safeGridSize;
    material.uniforms.uGridEmbossing.value = safeGridEmbossing;

    if (!mouseInteraction) {
      pointerTargetRef.current.x = CUBE_INITIAL_POINTER;
      pointerTargetRef.current.y = CUBE_INITIAL_POINTER;
      isMovingRef.current = false;
    }

    if (timeSinceLastMove > CUBE_MOVE_IDLE_MS) {
      isMovingRef.current = false;
    }

    const previousX = pointerCurrentRef.current.x;
    const previousY = pointerCurrentRef.current.y;

    pointerCurrentRef.current.x +=
      (pointerTargetRef.current.x - pointerCurrentRef.current.x) * safeLerp;
    pointerCurrentRef.current.y +=
      (pointerTargetRef.current.y - pointerCurrentRef.current.y) * safeLerp;

    const velocityX = pointerCurrentRef.current.x - previousX;
    const velocityY = pointerCurrentRef.current.y - previousY;

    mouseVelocityRef.current.x =
      mouseVelocityRef.current.x * CUBE_VELOCITY_BLEND_CURRENT +
      velocityX * CUBE_VELOCITY_BLEND_NEXT;
    mouseVelocityRef.current.y =
      mouseVelocityRef.current.y * CUBE_VELOCITY_BLEND_CURRENT +
      velocityY * CUBE_VELOCITY_BLEND_NEXT;

    material.uniforms.uMouse.value.set(
      pointerCurrentRef.current.x,
      pointerCurrentRef.current.y
    );
    material.uniforms.uMouseVelocity.value.set(
      mouseVelocityRef.current.x,
      mouseVelocityRef.current.y
    );

    const hoverValue = material.uniforms.uHover.value;
    const nextHover = isMovingRef.current ? 1 : 0;
    const hoverLerp = isMovingRef.current ? CUBE_ACTIVE_HOVER_LERP : CUBE_IDLE_HOVER_LERP;
    material.uniforms.uHover.value += (nextHover - hoverValue) * hoverLerp;

    const velocityMagnitude = Math.sqrt(
      velocityX * velocityX + velocityY * velocityY
    );
    const nextTrail = mouseInteraction
      ? Math.min(
          1,
          velocityMagnitude * CUBE_TRAIL_STRENGTH_SCALE + CUBE_TRAIL_STRENGTH_BASE
        )
      : 0;

    trailStrengthRef.current +=
      (nextTrail - trailStrengthRef.current) * CUBE_TRAIL_STRENGTH_LERP;
    material.uniforms.uTrailStrength.value = trailStrengthRef.current;

    mousePositionRef.current.x = pointerCurrentRef.current.x;
    mousePositionRef.current.y = pointerCurrentRef.current.y;
  });

  return (
    <mesh onPointerMove={onPointerMove}>
      <planeGeometry args={CUBE_PLANE_ARGS} />
      <PixelTrailMaterialTag ref={materialRef} />
    </mesh>
  );
}

interface DeformingCubeColorOption {
  color: string
  emissive?: string
}

interface DeformingCubeProps extends PointerVec2Ref {
  colorOptions: DeformingCubeColorOption[];
  mouseInteraction?: boolean;
  lerp?: number;
  cubeSize?: number;
  gridEmbossing?: number;
}

function DeformingCube({
  mousePositionRef,
  mouseVelocityRef,
  trailStrengthRef,
  colorOptions,
  mouseInteraction = true,
  lerp = CUBE_DEFAULT_LERP,
  cubeSize = CUBE_DEFAULT_CUBE_SIZE,
  gridEmbossing = CUBE_DEFAULT_GRID_EMBOSSING,
}: DeformingCubeProps) {
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<CubeDeformMaterial | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const parsedColorOptions = useMemo(
    () => {
      const palette = colorOptions.length ? colorOptions : CUBE_DEFAULT_COLOR_OPTIONS;

      return palette.map((option: DeformingCubeColorOption) => ({
        color: new THREE.Color(option.color),
        emissive: new THREE.Color(option.emissive ?? option.color),
      }));
    },
    [colorOptions]
  );
  const colorStateRef = useRef({
    current: parsedColorOptions[0].color.clone(),
    target: parsedColorOptions[0].color.clone(),
    currentEmissive: parsedColorOptions[0].emissive.clone(),
    targetEmissive: parsedColorOptions[0].emissive.clone(),
    lastSwitch: 0,
    interval: 0,
  });
  const { camera } = useThree();
  const safeLerp = clampCubeNumber(lerp, 0.01, 0.6, CUBE_DEFAULT_LERP);
  const safeCubeSize = clampCubeNumber(cubeSize, 0.5, 2.2, CUBE_DEFAULT_CUBE_SIZE);
  const safeGridEmbossing = clampCubeNumber(
    gridEmbossing,
    0,
    2,
    CUBE_DEFAULT_GRID_EMBOSSING
  );

  useEffect(() => {
    colorStateRef.current.current.copy(parsedColorOptions[0].color);
    colorStateRef.current.target.copy(parsedColorOptions[0].color);
    colorStateRef.current.currentEmissive.copy(parsedColorOptions[0].emissive);
    colorStateRef.current.targetEmissive.copy(parsedColorOptions[0].emissive);
  }, [parsedColorOptions]);

  useEffect(() => {
    if (colorStateRef.current.lastSwitch === 0) {
      colorStateRef.current.lastSwitch = Date.now();
    }

    if (colorStateRef.current.interval === 0) {
      colorStateRef.current.interval =
        CUBE_COLOR_INTERVAL_MIN_MS + Math.random() * CUBE_COLOR_INTERVAL_RANGE_MS;
    }
  }, []);

  useEffect(() => {
    if (!cubeRef.current) {
      return;
    }

    geometryRef.current = cubeRef.current.geometry;
    originalPositionsRef.current = cubeRef.current.geometry.attributes.position.array.slice() as Float32Array;
  }, []);

  useFrame(() => {
    if (!cubeRef.current || !geometryRef.current || !originalPositionsRef.current) {
      return;
    }

    // Color state
    const now = Date.now();
    if (now - colorStateRef.current.lastSwitch > colorStateRef.current.interval) {
      let nextIndex = Math.floor(Math.random() * parsedColorOptions.length);
      const currentIndex = parsedColorOptions.findIndex((option) =>
        option.emissive.equals(colorStateRef.current.targetEmissive)
      );

      if (nextIndex === currentIndex) {
        nextIndex = (nextIndex + 1) % parsedColorOptions.length;
      }

      colorStateRef.current.target.copy(parsedColorOptions[nextIndex].color);
      colorStateRef.current.targetEmissive.copy(
        parsedColorOptions[nextIndex].emissive
      );
      colorStateRef.current.lastSwitch = now;
      colorStateRef.current.interval =
        CUBE_COLOR_INTERVAL_MIN_MS + Math.random() * CUBE_COLOR_INTERVAL_RANGE_MS;
    }

    colorStateRef.current.current.lerp(
      colorStateRef.current.target,
      CUBE_COLOR_LERP
    );
    colorStateRef.current.currentEmissive.lerp(
      colorStateRef.current.targetEmissive,
      CUBE_COLOR_LERP
    );

    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value.copy(
        colorStateRef.current.current
      );
      materialRef.current.uniforms.uEmissive.value.copy(
        colorStateRef.current.currentEmissive
      );
    }

    // Rotation
    const mouseX = mouseInteraction
      ? mousePositionRef.current.x
      : CUBE_INITIAL_POINTER;
    const mouseY = mouseInteraction
      ? mousePositionRef.current.y
      : CUBE_INITIAL_POINTER;
    targetRotationRef.current.x = ((mouseY - 0.5) * Math.PI) / 2;
    targetRotationRef.current.y = ((mouseX - 0.5) * Math.PI) / 1.5;

    currentRotationRef.current.x +=
      (targetRotationRef.current.x - currentRotationRef.current.x) *
      safeLerp;
    currentRotationRef.current.y +=
      (targetRotationRef.current.y - currentRotationRef.current.y) *
      safeLerp;

    cubeRef.current.rotation.x = currentRotationRef.current.x;
    cubeRef.current.rotation.y = currentRotationRef.current.y;

    // Screen-space distance
    const cubeWorldPosition = new THREE.Vector3();
    cubeRef.current.getWorldPosition(cubeWorldPosition);
    cubeWorldPosition.project(camera);

    const cubeScreenX = (cubeWorldPosition.x + 1) / 2;
    const cubeScreenY = (cubeWorldPosition.y + 1) / 2;
    const distToCube = Math.sqrt(
      Math.pow(mousePositionRef.current.x - cubeScreenX, 2) +
        Math.pow(mousePositionRef.current.y - cubeScreenY, 2)
    );
    const deformStrength =
      Math.max(0, 1 - distToCube / CUBE_MAX_DIST) * trailStrengthRef.current;

    // Geometry deformation
    const positions = geometryRef.current.attributes.position.array;
    const time = Date.now() * CUBE_TIME_SCALE;

    for (let index = 0; index < positions.length; index += 3) {
      const x = originalPositionsRef.current[index];
      const y = originalPositionsRef.current[index + 1];
      const z = originalPositionsRef.current[index + 2];
      const distFromCenter = Math.sqrt(x * x + y * y + z * z);
      const wave =
        Math.sin(distFromCenter * CUBE_WAVE_FREQUENCY - time * CUBE_WAVE_SPEED) *
        CUBE_WAVE_STRENGTH;
      const ripple = wave * deformStrength;
      const velocityInfluence =
        (x * mouseVelocityRef.current.x + y * mouseVelocityRef.current.y) *
        CUBE_VELOCITY_INFLUENCE_SCALE;
      const deformation =
        (ripple + velocityInfluence * deformStrength) *
        CUBE_DEFORMATION_SCALE *
        safeGridEmbossing;

      positions[index] = x + x * deformation;
      positions[index + 1] = y + y * deformation;
      positions[index + 2] = z + z * deformation;
    }

    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.computeVertexNormals();
  });

  return (
    <mesh
      ref={cubeRef}
      position={[0, 0, 1]}
      scale={[safeCubeSize, safeCubeSize, safeCubeSize]}
      layers={1}
    >
      <boxGeometry args={CUBE_CUBE_ARGS} />
      <CubeDeformMaterialTag
        ref={materialRef}
        args={[new THREE.Color("#ffffff"), new THREE.Color("#ffffff")]}
      />
    </mesh>
  );
}

interface EnhancedPixelCubeProps {
  notice?: string;
  colorOptions?: DeformingCubeColorOption[];
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
  cubeSize?: number;
  gridEmbossing?: number;
}

function EnhancedPixelCube({
  notice = CUBE_DEFAULT_NOTICE_TEXT,
  colorOptions = CUBE_DEFAULT_COLOR_OPTIONS,
  gridSize = CUBE_DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = CUBE_DEFAULT_LERP,
  cubeSize = CUBE_DEFAULT_CUBE_SIZE,
  gridEmbossing = CUBE_DEFAULT_GRID_EMBOSSING,
}: EnhancedPixelCubeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");
  const mousePositionRef = useRef({ x: CUBE_INITIAL_POINTER, y: CUBE_INITIAL_POINTER });
  const mouseVelocityRef = useRef({ x: 0, y: 0 });
  const trailStrengthRef = useRef(0);

  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? "always" : "never"),
    });
    setFrameloop(gate.isActive ? "always" : "never");
    return () => gate.destroy();
  }, []);

  return (
    <div ref={rootRef} style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <div className="pointer-events-none absolute left-1/2 top-30 z-10 hidden w-full -translate-x-1/2 px-5 pt-5 max-lg:flex max-lg:justify-center max-md:left-0 max-md:block max-md:translate-x-0">
        <p className="inline-flex max-w-[92vw] rounded-sm border border-white/15 bg-black/40 px-4 py-2 font-medium text-white/75 backdrop-blur max-lg:text-center max-lg:text-[2.8vw] max-md:text-[3.5vw]">
          {notice}
        </p>
      </div>

      <Canvas
        aria-hidden="true"
        camera={{ position: [0, 0, 4], fov: 75 }}
        gl={{ antialias: true }}
        frameloop={frameloop}
        onCreated={({ gl, camera }) => {
          gl.setClearColor("#000000");
          camera.layers.enable(1);
        }}
      >
        <PixelGrid
          mousePositionRef={mousePositionRef}
          mouseVelocityRef={mouseVelocityRef}
          trailStrengthRef={trailStrengthRef}
          gridSize={gridSize}
          mouseInteraction={mouseInteraction}
          lerp={lerp}
          gridEmbossing={gridEmbossing}
        />

        <EffectComposer>
          <Bloom
            intensity={CUBE_BLOOM_INTENSITY}
            luminanceThreshold={CUBE_BLOOM_THRESHOLD}
            luminanceSmoothing={CUBE_BLOOM_SMOOTHING}
            height={0}
          />
        </EffectComposer>

        <DeformingCube
          mousePositionRef={mousePositionRef}
          mouseVelocityRef={mouseVelocityRef}
          trailStrengthRef={trailStrengthRef}
          colorOptions={colorOptions}
          mouseInteraction={mouseInteraction}
          lerp={lerp}
          cubeSize={cubeSize}
          gridEmbossing={gridEmbossing}
        />
      </Canvas>
    </div>
  );
}


// ---- index.tsx ----
// Built using Hyperiux Vault: https://vault.hyperiux.com

type MousePixelationVariant = 'pixel-circle' | 'pixel-shift' | 'enhanced-pixel-cube';

const MOUSE_DEMO_VARIANTS: Record<MousePixelationVariant, any> = {
  "pixel-circle": PixelCircle,
  "pixel-shift": PixelShift,
  "enhanced-pixel-cube": EnhancedPixelCube,
};

const MOUSE_DEMO_VERSIONS: { label: string, value: MousePixelationVariant }[] = [
  {
    label: "V1",
    value: "pixel-circle",
  },
  {
    label: "V2",
    value: "pixel-shift",
  },
  {
    label: "V3",
    value: "enhanced-pixel-cube",
  },
];

const MOUSE_DEMO_DEFAULT_PIXEL_SHIFT_IMAGE = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg";
const MOUSE_DEMO_DEFAULT_GRID_SIZE = 35;
const MOUSE_DEMO_DEFAULT_LERP = 0.1;
const MOUSE_DEMO_DEFAULT_BACKGROUND_COLOR = "#000000";
const MOUSE_DEMO_DEFAULT_CUBE_SIZE = 1;
const MOUSE_DEMO_DEFAULT_GRID_EMBOSSING = 1;

// Each version has its own settings (v1 = Pixel Circles, v2 = Pixel Shift,
// v3 = Pixel Cube) so tuning one never changes another.
interface MousePixelationProps {
  variant?: MousePixelationVariant;
  imageUrl?: string;
  v1NumberOfGrids?: number;
  v1Lerp?: number;
  v1BackgroundColor?: string;
  v2NumberOfGrids?: number;
  v2Lerp?: number;
  v3NumberOfGrids?: number;
  v3Lerp?: number;
  v3CubeSize?: number;
  v3GridEmbossing?: number;
}

export default function MousePixelation({
  variant = "pixel-shift",
  imageUrl = MOUSE_DEMO_DEFAULT_PIXEL_SHIFT_IMAGE,
  v1NumberOfGrids = MOUSE_DEMO_DEFAULT_GRID_SIZE,
  v1Lerp = MOUSE_DEMO_DEFAULT_LERP,
  v1BackgroundColor = MOUSE_DEMO_DEFAULT_BACKGROUND_COLOR,
  v2NumberOfGrids = MOUSE_DEMO_DEFAULT_GRID_SIZE,
  v2Lerp = MOUSE_DEMO_DEFAULT_LERP,
  v3NumberOfGrids = MOUSE_DEMO_DEFAULT_GRID_SIZE,
  v3Lerp = MOUSE_DEMO_DEFAULT_LERP,
  v3CubeSize = MOUSE_DEMO_DEFAULT_CUBE_SIZE,
  v3GridEmbossing = MOUSE_DEMO_DEFAULT_GRID_EMBOSSING,
}: MousePixelationProps) {
  const [activeVariant, setActiveVariant] = useState<MousePixelationVariant>(
    MOUSE_DEMO_VARIANTS[variant] ? variant : "pixel-shift"
  );

  const ActiveComponent = useMemo(() => {
    return MOUSE_DEMO_VARIANTS[activeVariant] || PixelShift;
  }, [activeVariant]);

  return (
    <>
      <VersionNav
        activeVariant={activeVariant}
        onVariantChange={setActiveVariant}
      />
      <CursorMoveCue />

      {activeVariant === "pixel-circle" ? (
        <ActiveComponent
          gridSize={v1NumberOfGrids}
          lerp={v1Lerp}
          backgroundColor={v1BackgroundColor}
        />
      ) : activeVariant === "pixel-shift" ? (
        <ActiveComponent
          imageUrl={imageUrl}
          img={imageUrl}
          gridSize={v2NumberOfGrids}
          lerp={v2Lerp}
        />
      ) : (
        <ActiveComponent
          gridSize={v3NumberOfGrids}
          lerp={v3Lerp}
          cubeSize={v3CubeSize}
          gridEmbossing={v3GridEmbossing}
        />
      )}

    </>
  );
}

function CursorMoveCue() {
  return (
    <div className="pointer-events-none fixed bottom-6 right-[-10%] z-9999 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-6 py-2 text-md font-medium text-white/80 max-lg:hidden backdrop-blur-md max-md:bottom-5 max-md:text-xs">

      <span>Move your cursor to see the pixelated effects</span>
    </div>
  );
}

export { PixelCircle, PixelShift, EnhancedPixelCube };

function VersionNav({ activeVariant, onVariantChange }: { activeVariant: string, onVariantChange: (value: MousePixelationVariant) => void }) {
  return (
    <nav className="fixed top-4 max-lg:top-5 max-md:top-18 left-1/2 z-9999 flex -translate-x-1/2 gap-1 rounded-full border border-white/20 bg-white/10 px-1.5 py-1.5 backdrop-blur-md  max-lg:px-3 max-lg:py-2  max-md:px-2 max-md:py-1.5">
      {MOUSE_DEMO_VERSIONS.map((variant) => {
        const isActive = activeVariant === variant.value;

        return (
          <button
            key={variant.value}
            type="button"
            onClick={() => onVariantChange(variant.value)}
            className={`rounded-full px-5 py-1.5 text-sm font-semibold tracking-widest transition-all duration-200 max-lg:text-lg max-md:text-sm ${
              isActive
                ? "bg-white text-black"
                : "text-white/70 hover:text-white"
            }`}
          >
            {variant.label}
          </button>
        );
      })}
    </nav>
  );
}
