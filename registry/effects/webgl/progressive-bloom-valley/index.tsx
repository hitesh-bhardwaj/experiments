// Built using Hyperiux Vault: https://vault.hyperiux.com
import { PerspectiveCamera, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type WebGLRenderer, type WebGLRenderTarget, Uniform, Vector2 } from "three";

// ---- prefersReducedMotion.ts ----
/**
 * True when the user has asked the OS to minimise animation.
 * Safe during SSR / first render: returns false until the client mounts.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}


// ---- FilmGrainEffect.tsx ----



/**
 * Fix for stretched film grain:
 * - Takes screen resolution as a uniform so UV remains aspect-correct.
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uAmount;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uResolution;

float hash21(vec2 p) {
 p = fract(p * vec2(123.34, 456.21));
 p += dot(p, p + 45.32);
 return fract(p.x * p.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
 // Aspect-correct the uv so pixel grains are square
 // Reference: use the shorter axis as base; expand the other to keep squares
 vec2 aspectUV = uv;
 float aspect = uResolution.x / uResolution.y;
 if (aspect > 1.0) {
 // Widescreen: stretch x
 aspectUV.x = (uv.x - 0.5) * aspect + 0.5;
 } else {
 // Tall: stretch y
 aspectUV.y = (uv.y - 0.5) / aspect + 0.5;
 }

 float dotPixelSize = 0.0015;
 vec2 grainUV = floor(aspectUV * uScale / dotPixelSize) * dotPixelSize / uScale;
 // Use fract(time * prime) to keep hash seed in a small range - prevents precision loss over time
 float n = hash21(grainUV + fract(uTime * 60.0));

 float g = (n - 0.5) * uAmount;
 vec3 col = inputColor.rgb + vec3(g);

 outputColor = vec4(mix(inputColor.rgb, col, uOpacity), inputColor.a);
}
`;

interface FilmGrainEffectImplOptions {
 amount?: number
 scale?: number
 opacity?: number
 resolution?: [number, number]
}

class FilmGrainEffectImpl extends Effect {
 _time: number;
 _reduceMotion: boolean;

 constructor({ amount = 0.12, scale = 900.0, opacity = 0.25, resolution = [1280, 720] }: FilmGrainEffectImplOptions = {}) {
 const uniforms = new Map<string, Uniform<any>>([
 ["uTime", new Uniform(0)],
 ["uAmount", new Uniform(amount)],
 ["uScale", new Uniform(scale)],
 ["uOpacity", new Uniform(opacity)],
 ["uResolution", new Uniform(new Vector2(resolution[0], resolution[1]))],
 ]);
 super("FilmGrainEffect", fragmentShader, { uniforms });
 this._time = 0;
 this._reduceMotion = false;
 }

 setResolution(width: number, height: number) {
 const uRes = this.uniforms.get("uResolution");
 if (uRes) {
 uRes.value.set(width, height);
 }
 }

 update(renderer: WebGLRenderer, _inputBuffer: WebGLRenderTarget, deltaTime?: number) {
 if (this._reduceMotion) {
 // Keep grain static - still sync resolution for aspect-correct dots.
 if (renderer && renderer.getSize) {
 const size = renderer.getSize(new Vector2());
 this.setResolution(size.x, size.y);
 }
 return;
 }

 this._time += deltaTime ?? 0;
 // Wrap time to prevent float precision loss - keeps grain as dots, not rain streaks
 if (this._time > 1000) this._time -= 1000;
 const uTime = this.uniforms.get("uTime");
 if (uTime) uTime.value = this._time;

 // Defensive: Only access renderer.getSize if renderer exists and has getSize (in R3F it will)
 if (renderer && renderer.getSize) {
 const size = renderer.getSize(new Vector2());
 this.setResolution(size.x, size.y);
 }
 }
}

function FilmGrainEffect({ amount = 0.12, scale = 900, opacity = 0.7 }: { amount?: number, scale?: number, opacity?: number } = {}) {
 const effect = useMemo(() => {
 // Get initial resolution (SSR safe fallback)
 let width = 1280, height = 720;
 if (typeof window !=="undefined") {
 width = window.innerWidth;
 height = window.innerHeight;
 }
 return new FilmGrainEffectImpl({ amount, scale, opacity, resolution: [width, height] });
 }, [amount, scale, opacity]);

 useEffect(() => {
 const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
 if (!mq) {
 effect._reduceMotion = prefersReducedMotion();
 return;
 }

 const apply = (enabled: boolean) => {
 effect._reduceMotion = enabled;
 };
 apply(mq.matches);
 const onChange = (event: MediaQueryListEvent) => apply(event.matches);
 mq.addEventListener?.("change", onChange);
 return () => mq.removeEventListener?.("change", onChange);
 }, [effect]);

 // If client, keep uResolution uniform in sync with window resize
 useEffect(() => {
 if (typeof window ==="undefined") return;
 const update = () => {
 effect.setResolution(window.innerWidth, window.innerHeight);
 };
 window.addEventListener("resize", update);
 update();
 return () => window.removeEventListener("resize", update);
 }, [effect]);

 return <primitive object={effect} dispose={null} />;
}


// ---- EdgeBlurEffect.tsx ----



/**
 * Both shaders share the same blur logic, but the output differs:
 * - classic: pure blur, no frosted white overlay
 * - frosted: blur + white, semi-transparent veil toward edges
 */

const classicBlurFragmentShader = /* glsl */ `
uniform float uBlurStrength;
uniform float uBlurStart;
uniform vec2 uResolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
 vec2 center = uv - 0.5;
 float dist = length(center);

 float blurAmount = smoothstep(uBlurStart, 0.75, dist) * uBlurStrength;

 if (blurAmount < 0.001) {
 outputColor = inputColor;
 return;
 }

 float aspect = uResolution.x / uResolution.y;
 vec2 texelSize = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);

 const int TAPS = 12;
 vec2 offsets[12];
 offsets[0] = vec2(-0.326, -0.406);
 offsets[1] = vec2(-0.840, -0.074);
 offsets[2] = vec2(-0.696, 0.457);
 offsets[3] = vec2(-0.203, 0.621);
 offsets[4] = vec2( 0.962, -0.195);
 offsets[5] = vec2( 0.473, -0.480);
 offsets[6] = vec2( 0.519, 0.767);
 offsets[7] = vec2( 0.185, -0.893);
 offsets[8] = vec2( 0.507, 0.064);
 offsets[9] = vec2( 0.896, 0.412);
 offsets[10] = vec2(-0.322, -0.933);
 offsets[11] = vec2(-0.792, -0.598);

 float radius = blurAmount * 12.0;

 vec4 blurred = inputColor;
 float totalWeight = 1.0;

 for (int i = 0; i < TAPS; i++) {
 vec2 offset = offsets[i] * radius * texelSize;
 vec4 s = texture2D(inputBuffer, uv + offset);
 blurred += s;
 totalWeight += 1.0;
 }

 blurred /= totalWeight;

 outputColor = blurred;
}
`;

const frostedBlurFragmentShader = /* glsl */ `
uniform float uBlurStrength;
uniform float uBlurStart;
uniform vec2 uResolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
 vec2 center = uv - 0.5;
 float dist = length(center);

 float blurAmount = smoothstep(uBlurStart, 0.75, dist) * uBlurStrength;

 if (blurAmount < 0.001) {
 outputColor = inputColor;
 return;
 }

 float aspect = uResolution.x / uResolution.y;
 vec2 texelSize = vec2(1.0 / uResolution.x, 1.0 / uResolution.y);

 const int TAPS = 12;
 vec2 offsets[12];
 offsets[0] = vec2(-0.326, -0.406);
 offsets[1] = vec2(-0.840, -0.074);
 offsets[2] = vec2(-0.696, 0.457);
 offsets[3] = vec2(-0.203, 0.621);
 offsets[4] = vec2( 0.962, -0.195);
 offsets[5] = vec2( 0.473, -0.480);
 offsets[6] = vec2( 0.519, 0.767);
 offsets[7] = vec2( 0.185, -0.893);
 offsets[8] = vec2( 0.507, 0.064);
 offsets[9] = vec2( 0.896, 0.412);
 offsets[10] = vec2(-0.322, -0.933);
 offsets[11] = vec2(-0.792, -0.598);

 float radius = blurAmount * 12.0;

 vec4 blurred = inputColor;
 float totalWeight = 1.0;

 for (int i = 0; i < TAPS; i++) {
 vec2 offset = offsets[i] * radius * texelSize;
 vec4 s = texture2D(inputBuffer, uv + offset);
 blurred += s;
 totalWeight += 1.0;
 }

 blurred /= totalWeight;

 // White, semi-transparent veil for frosted-edge effect.
 vec3 white = vec3(1.0, 1.0, 1.0);
 float veilAlpha = 0.4 * blurAmount; // Max 0.4 opacity at the strongest blur

 // Correct GLSL: mix(vec3, vec3, float)
 vec3 outRgb = mix(blurred.rgb, white, veilAlpha);
 float outAlpha = blurred.a;

 outputColor = vec4(outRgb, outAlpha);
}
`;

interface EdgeBlurEffectImplOptions {
 blurStrength?: number
 blurStart?: number
 resolution?: [number, number]
 frag?: string
}

class EdgeBlurEffectImpl extends Effect {
 constructor({
 blurStrength = 1.0,
 blurStart = 0.25,
 resolution = [1280, 720],
 frag = frostedBlurFragmentShader,
 }: EdgeBlurEffectImplOptions = {}) {
 const uniforms = new Map<string, Uniform<any>>([
 ["uBlurStrength", new Uniform(blurStrength)],
 ["uBlurStart", new Uniform(blurStart)],
 ["uResolution", new Uniform(new Vector2(resolution[0], resolution[1]))],
 ]);
 super("EdgeBlurEffect", frag, { uniforms });
 }

 setResolution(width: number, height: number) {
 const uRes = this.uniforms.get("uResolution");
 if (uRes) uRes.value.set(width, height);
 }

 update(renderer: WebGLRenderer) {
 if (renderer && renderer.getSize) {
 const size = renderer.getSize(new Vector2());
 this.setResolution(size.x, size.y);
 }
 }
}

interface EdgeBlurEffectProps {
 blurType?: 'classic' | 'frosted'
 blurStrength?: number
 blurStart?: number
}

function EdgeBlurEffect({
 blurType ="classic", //"frosted" |"classic"
 blurStrength = 1.0,
 blurStart = 0.25,
}: EdgeBlurEffectProps) {
 const frag =
 blurType ==="classic"
 ? classicBlurFragmentShader
 : frostedBlurFragmentShader;

 const effect = useMemo(() => {
 let width = 1280,
 height = 720;
 if (typeof window !=="undefined") {
 width = window.innerWidth;
 height = window.innerHeight;
 }
 return new EdgeBlurEffectImpl({
 blurStrength,
 blurStart,
 resolution: [width, height],
 frag,
 });
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [blurStrength, blurStart, frag]);

 useEffect(() => {
 if (typeof window ==="undefined") return;
 const update = () => effect.setResolution(window.innerWidth, window.innerHeight);
 window.addEventListener("resize", update);
 update();
 return () => window.removeEventListener("resize", update);
 }, [effect]);

 return <primitive object={effect} dispose={null} />;
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


// ---- useInput.ts ----


interface UseInputOptions {
  scrollIntensity?: number
  autoSpeed?: number
  damping?: number
  loopPoint?: number
}

function useInput({
  scrollIntensity = 1,
  autoSpeed = 0.00004,
  damping = 0.5,
  loopPoint = 0.85,
}: UseInputOptions = {}) {
  const { gl } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  const velocity = useRef(0);
  const reduceMotionRef = useRef(prefersReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const onChange = (event: MediaQueryListEvent) => {
      reduceMotionRef.current = event.matches;
      if (event.matches) {
        velocity.current = 0;
      }
    };

    reduceMotionRef.current = mq.matches;
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const el = gl.domElement;

    const wrapScroll = () => {
      if (scroll.current >= loopPoint) {
        scroll.current = 0;
        velocity.current = 0;
      }
      if (scroll.current < 0) {
        scroll.current = loopPoint - 0.001;
        velocity.current = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Reduced-motion: apply scroll instantly (no velocity coast / autoplay feel).
      if (reduceMotionRef.current) {
        scroll.current += e.deltaY * 0.00008 * scrollIntensity;
        velocity.current = 0;
        wrapScroll();
        return;
      }

      velocity.current += e.deltaY * 0.00008 * scrollIntensity;
    };

    let lastTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - lastTouchY;
      lastTouchY = e.touches[0].clientY;

      if (reduceMotionRef.current) {
        scroll.current -= dy * 0.00015 * scrollIntensity;
        velocity.current = 0;
        wrapScroll();
        return;
      }

      velocity.current -= dy * 0.00015 * scrollIntensity;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [gl.domElement, scrollIntensity, loopPoint]);

  useEffect(() => {
    const loop = createSuspendedRaf({
      root: gl.domElement,
      onFrame: () => {
        if (reduceMotionRef.current) {
          // No auto-scroll / velocity coast - user wheel/touch already snaps scroll.
          velocity.current = 0;
          return;
        }

        // damping
        velocity.current *= damping;

        // clamp velocity
        const MAX_VEL = 0.005;
        velocity.current = Math.max(-MAX_VEL, Math.min(MAX_VEL, velocity.current));

        // update scroll
        scroll.current += velocity.current + autoSpeed;

        // Reset at loopPoint - the second valley copy fills the visual gap
        if (scroll.current >= loopPoint) {
          scroll.current = 0;
          velocity.current = 0;
        }
        if (scroll.current < 0) {
          scroll.current = loopPoint - 0.001;
          velocity.current = 0;
        }
      },
    });

    loop.start();
    return () => loop.destroy();
  }, [gl.domElement, autoSpeed, damping, loopPoint]);

  return { mouse, scroll };
}


// ---- CameraRig.tsx ----




function CameraRig({ curve, cameraProps, scrollConfig = {} }: { curve?: any, cameraProps?: any, scrollConfig?: any }) {
  const container = useRef<THREE.Group | null>(null);
  const breath = useRef<THREE.Group | null>(null);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const intro = useRef({ angle: Math.PI / 2, done: false, started: false });
  const animMouse = useRef({ x: 0, y: 0 });
  const { mouse, scroll } = useInput(scrollConfig);
  const progress = useRef(0);
  const reduceMotionRef = useRef(prefersReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const onChange = (event: MediaQueryListEvent) => {
      reduceMotionRef.current = event.matches;
      if (event.matches) {
        intro.current.angle = 0;
        intro.current.done = true;
        intro.current.started = true;
        if (breath.current) {
          breath.current.rotation.x = 0;
          breath.current.position.y = 0;
          breath.current.position.z = 1;
        }
      }
    };

    reduceMotionRef.current = mq.matches;
    if (mq.matches) {
      intro.current.angle = 0;
      intro.current.done = true;
      intro.current.started = true;
    }

    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const baseRotation = useMemo(() => {
    const r = cameraProps?.rotation;
    if (Array.isArray(r) && r.length === 3) return r;
    return [0, 0, 0];
  }, [cameraProps]);

  useFrame((state, delta) => {
    if (!curve || !container.current || !breath.current) return;
    const camera = camRef.current;
    if (!camera) return;

    const reduceMotion = reduceMotionRef.current;

    if (reduceMotion) {
      // Snap along the path - no lerp coast, breath, intro, or mouse parallax.
      progress.current = ((scroll.current % 1) + 1) % 1;
      const p = curve.getPointAt(progress.current);
      const t = curve.getTangentAt(progress.current);

      container.current.position.copy(p);
      container.current.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(
          p,
          p.clone().add(t.clone().multiplyScalar(1)),
          new THREE.Vector3(0, 1, 0)
        )
      );

      breath.current.rotation.x = 0;
      breath.current.position.y = 0;
      breath.current.position.z = 1;
      camera.rotation.set(baseRotation[0], baseRotation[1], baseRotation[2]);
      return;
    }

    // Smooth lerp toward scroll target (handles wrapping)
    let diff = scroll.current - progress.current;
    if (diff > 0.5) diff -= 1;
    if (diff < -0.5) diff += 1;
    progress.current =
      ((progress.current + diff * (scrollConfig.lerpSpeed ?? 0.05)) % 1 + 1) % 1;
    const p = curve.getPointAt(progress.current);
    const t = curve.getTangentAt(progress.current);

    container.current.position.copy(p);

    // Compute new quaternion for the container group to smoothly orient along the path
    // The target"look-at" direction is -t (i.e., looking down the curve, not up)
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(
        p,
        p.clone().add(t.clone().multiplyScalar(1)),
        new THREE.Vector3(0, 1, 0)
      )
    );
    container.current.quaternion.slerp(targetQuat, 0.1);

    if (!intro.current.started) {
      breath.current.rotation.x = intro.current.angle;
      camera.rotation.set(baseRotation[0], baseRotation[1], baseRotation[2]);
      intro.current.started = true;
    }
    if (!intro.current.done) {
      intro.current.angle += (0 - intro.current.angle) * Math.min(1, 2 * delta);
      breath.current.rotation.x = intro.current.angle;
      if (Math.abs(intro.current.angle) < 0.003) {
        intro.current.angle = 0;
        intro.current.done = true;
      }
    }

    const elapsed = state.clock.elapsedTime;
    breath.current.position.y = 0.02 * Math.cos(1.1 * elapsed);
    breath.current.position.z = 1 + 0.12 * Math.cos(1.1 * elapsed);

    const ml = Math.min(1, 5 * delta);
    // Mouse parallax from useInput
    animMouse.current.x += (mouse.current.x - animMouse.current.x) * ml;
    animMouse.current.y += (mouse.current.y - animMouse.current.y) * ml;

    const maxRX = 3 * (Math.PI / 180);
    const maxRY = 2 * (Math.PI / 180);
    camera.rotation.y += (-maxRX * animMouse.current.x - camera.rotation.y) * 0.1;
    camera.rotation.x += (-maxRY * animMouse.current.y - camera.rotation.x) * 0.1;
  });

  return (
    <group ref={container}>
      <group ref={breath}>
        <PerspectiveCamera
          ref={camRef}
          makeDefault
          fov={cameraProps?.fov ?? 60}
          near={cameraProps?.near ?? 0.1}
          far={cameraProps?.far ?? 200}
          rotation={baseRotation as any}
          position={[0, 2, 0]}
        />
      </group>
    </group>
  );
}


// ---- useValleyData.ts ----


function clampVal(v: number, lo: number, hi: number) {
 return Math.max(lo, Math.min(hi, v));
}

const SPRITE_COLS = 8;
const SPRITE_ROWS = 7;

function smoothNoise(x: number, z: number, scale = 0.2) {
 return (
 Math.sin(x * scale) * 0.5 +
 Math.sin(z * scale * 1.3) * 0.5 +
 Math.sin((x + z) * scale * 0.7) * 0.5
 ) * 0.5 + 0.5; // normalize 0 → 1
}



function extractCameraPath(gltf: any) {
 if (!gltf) {
 return fallbackCurve();
 }

 if (gltf.animations?.length > 0) {
 const clip = gltf.animations[0];
 const posTrack = clip.tracks.find((t: any) => t.name.includes("position"));

 if (posTrack && posTrack.values.length >= 6) {
 const pts = [];
 for (let i = 0; i < posTrack.values.length; i += 3) {
 pts.push(
 new THREE.Vector3(
 posTrack.values[i],
 posTrack.values[i + 1],
 posTrack.values[i + 2]
 )
 );
 }
 const filtered = [pts[0]];
 for (let i = 1; i < pts.length; i++) {
 if (pts[i].distanceTo(filtered[filtered.length - 1]) > 0.01) {
 filtered.push(pts[i]);
 }
 }
 if (filtered.length >= 2) return new THREE.CatmullRomCurve3(filtered);
 }
 }

 gltf.scene.updateWorldMatrix(true, true);
 const verts: THREE.Vector3[] = [];
 gltf.scene.traverse((child: any) => {
 if (child.geometry?.attributes?.position) {
 const pos = child.geometry.attributes.position;
 for (let i = 0; i < pos.count; i++) {
 const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
 v.applyMatrix4(child.matrixWorld);
 verts.push(v);
 }
 }
 });
 if (verts.length >= 2) return new THREE.CatmullRomCurve3(verts);

 return fallbackCurve();
}

function fallbackCurve() {
 return new THREE.CatmullRomCurve3(
 Array.from({ length: 80 }, (_, i) => {
 const t = i / 79;
 return new THREE.Vector3(
 Math.sin(t * Math.PI * 2) * 4,
 Math.sin(t * Math.PI) * 1.5,
 -i * 3
 );
 })
 );
}

function buildTerrainPixels(img: any) {
 if (!img?.width || !img?.height) return null;
 const c = document.createElement("canvas");
 c.width = img.width;
 c.height = img.height;
 const ctx = c.getContext("2d");
 if (!ctx) return null;
 ctx.drawImage(img, 0, 0);
 return {
 data: ctx.getImageData(0, 0, img.width, img.height).data,
 w: img.width,
 h: img.height,
 };
}

function generateValleyFlowers(curve: THREE.CatmullRomCurve3, terrain: any, config: any) {
 const baseCount = config.rows * config.perRow;
 const MAX = baseCount * 2; // We can have up to 2x particles due to overlaying flowers on grass

 const positions = new Float32Array(MAX * 3);
 const colorCoords = new Float32Array(MAX * 2);
 const scales = new Float32Array(MAX);
 const seeds = new Float32Array(MAX);
 const growNoise = new Float32Array(MAX);

 const worldUp = new THREE.Vector3(0, 1, 0);
 const right = new THREE.Vector3();
 const localUp = new THREE.Vector3();

 const WIDTH = 5;
 const MIN_LAT = 0.;
 const SLOPE = .7;

 let pIdx = 0;

 for (let row = 0; row < config.rows; row++) {
 const t = row / (config.rows - 1);
 const pt = curve.getPointAt(t);
 const tan = curve.getTangentAt(t);

 right.crossVectors(tan, worldUp);
 if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
 right.normalize();
 localUp.crossVectors(right, tan).normalize();

 for (let f = 0; f < config.perRow; f++) {
 const side = f < config.perRow / 2 ? -1 : 1;

 const rawLat = Math.pow(Math.random(), 0.6);
 const lat = (MIN_LAT + rawLat * (WIDTH - MIN_LAT)) * side;
 const absLat = Math.abs(lat);
 const slopeH = absLat * SLOPE;

 let tMod = 1;
 if (terrain?.data) {
 const tx = clampVal(
 Math.floor(t * (terrain.w - 1)),
 0,
 terrain.w - 1
 );
 const tv = clampVal(
 Math.floor(((lat + WIDTH) / (2 * WIDTH)) * (terrain.h - 1)),
 0,
 terrain.h - 1
 );
 tMod = terrain.data[(tv * terrain.w + tx) * 4] / 255;
 }

 const yOff = (Math.random() - 0.3) * 1.2 * tMod;
 const zOff = (Math.random() - 0.5) * 2.5;
 const h = slopeH + yOff;

 const px = pt.x + right.x * lat + localUp.x * h + tan.x * zOff;
 const py = pt.y + right.y * lat + localUp.y * h + tan.y * zOff;
 const pz = pt.z + right.z * lat + localUp.z * h + tan.z * zOff;

 const distFactor = clampVal(absLat / 1.5, 0.2, 1);
 const baseScale = (config.minScale + Math.random() * config.maxScaleRandom) * distFactor * config.globalScale;
 const baseSeed = Math.random();
 const baseGrow = 0.3 + Math.random() * 0.7;

 // 🌿 STEP 1: ALWAYS GRASS
 positions[pIdx * 3] = px;
 positions[pIdx * 3 + 1] = py;
 positions[pIdx * 3 + 2] = pz;

 const grassRow = 1 + Math.floor(Math.random() * 2);
 let grassCol = Math.floor(Math.random() * SPRITE_COLS);

 // The user requested removing white flowers from grass rows (Rows 5 & 6 top-down, which is Row 2 bottom-up)
 // Row 2, columns 5 and 6 contain the white grass daisies. Filter them out!
 if (grassRow === 2 && (grassCol === 5 || grassCol === 6)) {
 grassCol = Math.floor(Math.random() * 5); // Remap to safe green grass
 }

 colorCoords[pIdx * 2] = (grassCol + 0.5) / SPRITE_COLS;
 colorCoords[pIdx * 2 + 1] = (grassRow + 0.5) / SPRITE_ROWS;

 const grassScaleMult = config.grassScaleMult ?? 0.8;
 scales[pIdx] = baseScale * grassScaleMult; // grass a bit smaller
 seeds[pIdx] = baseSeed;
 growNoise[pIdx] = baseGrow;

 pIdx++;

 // 🌸 STEP 2: FLOWER OVERLAY
 const FLOWER_THRESHOLD = config.flowerThreshold ?? 0.82;
 const FLOWER_DENSITY = config.flowerDensity ?? 0.25;
 const flowerNoise = smoothNoise(px, pz, config.patchScale || 0.15);

 if (flowerNoise > FLOWER_THRESHOLD && Math.random() < FLOWER_DENSITY) {
 // duplicate index (new particle)
 positions[pIdx * 3] = px;
 const flowerYOffset = config.flowerYOffset ?? -0.02;
 positions[pIdx * 3 + 1] = py + flowerYOffset; // embedded in grass
 positions[pIdx * 3 + 2] = pz;

 const colorNoise = smoothNoise(px + 100, pz - 50, 0.3);
 let fRow;
 if (colorNoise < 0.25) fRow = 3;
 else if (colorNoise < 0.5) fRow = 4;
 else if (colorNoise < 0.75) fRow = 5;
 else fRow = 6;

 let fCol = Math.floor(Math.random() * SPRITE_COLS);

 // Remove white daisy from row 4 (far right)
 if (fRow === 4 && fCol === 7) fCol = 0;
 // Remove white/pale daisies from row 6 (far right)
 if (fRow === 6 && fCol >= 6) fCol = 0;

 colorCoords[pIdx * 2] = (fCol + 0.5) / SPRITE_COLS;
 colorCoords[pIdx * 2 + 1] = (fRow + 0.5) / SPRITE_ROWS;

 const flowerScaleMult = config.flowerScaleMult ?? 1.4;
 scales[pIdx] = baseScale * flowerScaleMult; // flower bigger
 seeds[pIdx] = baseSeed + 0.1;
 growNoise[pIdx] = baseGrow;

 pIdx++;
 }
 }
 }

 return {
 positions: positions.slice(0, pIdx * 3),
 colorCoords: colorCoords.slice(0, pIdx * 2),
 scales: scales.slice(0, pIdx),
 seeds: seeds.slice(0, pIdx),
 growNoise: growNoise.slice(0, pIdx),
 count: pIdx
 };
}

function useValleyData(gltf: any, terrainTex: any, config: any) {
 const curve = useMemo(() => {
 if (!gltf) return null;
 return extractCameraPath(gltf);
 }, [gltf]);

 const terrain = useMemo(() => {
 const img = terrainTex?.image;
 if (!img) return null;
 return buildTerrainPixels(img);
 }, [terrainTex]);

 const flowers = useMemo(() => {
 if (!curve || !terrain || !config) return null;
 return generateValleyFlowers(curve, terrain, config);
 }, [curve, terrain, config]);

 // Compute the path displacement vector (end - start)
 const pathOffset = useMemo(() => {
 if (!curve) return [0, 0, 0];
 const start = curve.getPointAt(0);
 const end = curve.getPointAt(0.999); // just before the very end
 return [end.x - start.x, end.y - start.y, end.z - start.z];
 }, [curve]);

 return { curve, terrain, flowers, pathOffset };
}


// ---- shaders.tsx ----
export const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uCamFar;
uniform vec2 uMouse;
uniform float uAspect;
uniform float uHoverIntensity;

uniform float uHoverMagneticStrength;
uniform float uHoverMagneticDirection;
uniform float uHoverZPull;

attribute float aSpriteScale;
attribute vec2 aColorCoordinate;
attribute float aRandomSeed;
attribute float aGrowNoise;

varying vec2 vColorCoord;
varying float vAlpha;
varying float vSeed;
varying float vHoverGlow;

void main() {
 vec3 pos = position;

 float phase = uTime * 0.5 + aRandomSeed * 6.2831;
 pos.x += sin(phase) * 0.04 * aGrowNoise;
 pos.y += cos(phase * 0.7) * 0.025 * aGrowNoise;
 pos.z += sin(phase * 0.3) * 0.015 * aGrowNoise;

 vec4 worldPos = modelMatrix * vec4(pos, 1.0);
 vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  // calculate temporary position just to find screen coordinates
 vec4 tempPos = projectionMatrix * mv;

 // Screen-space mouse tracking:  // Convert gl_Position into 0..1 screen coordinates
 vec2 screenPos = (tempPos.xy / tempPos.w) * 0.5 + 0.5;
 vec2 rawDiff = screenPos - uMouse;
  vec2 diff = rawDiff;
 // Aspect-correct the distance so the glow circle is perfectly round, not stretched
 diff.x *= uAspect;
  float distToMouse = length(diff);
  // The sprite sheet has 7 rows. Grass is row 1-2, Flowers are row 3-6.
 float spriteRow = floor(aColorCoordinate.y * 7.0);
 float isFlower = step(2.5, spriteRow); // 0.0 for grass, 1.0 for flowers

 // Reduced size (0.15 screen width) and applied a power curve for an exceptionally soft, dreamy tail
 // Multiply by isFlower so ONLY flowers get the glow/puff interaction
 // MULTIPLY by uHoverIntensity so the glow visually fades out completely when mouse is perfectly still
 vHoverGlow = pow(1.0 - smoothstep(0.0, 0.35, distToMouse), 1.5) * isFlower * uHoverIntensity;

 // Calculate the base distance for accurate non-scaled sizing
 float baseD = -mv.z;

 // physically pull hovered flowers closer to the camera!
 mv.z += vHoverGlow * uHoverZPull;

 // RECOMPUTE actual screen position with the new 3D depth pop applied
 gl_Position = projectionMatrix * mv;

 // MAGNETIC EFFECT: Pull the flower perfectly towards the exact mouse cursor pixels
 gl_Position.x -= rawDiff.x * 2.0 * vHoverGlow * uHoverMagneticStrength * uHoverMagneticDirection * gl_Position.w;
 gl_Position.y -= rawDiff.y * 2.0 * vHoverGlow * uHoverMagneticStrength * uHoverMagneticDirection * gl_Position.w;

 // Organic Camera Distance Growth (Shrink flowers to 0 in the distance)
 // We offset the perceived depth randomly.
 // By using [45.0, 22.0] as boundaries, even the absolute latest-blooming flower
 // finishes scaling to 100% long before it reaches the near plane.
 float randomDepthOffset = (aRandomSeed - 0.5) * 20.0;
 float flowerGrowth = smoothstep(45.0, 22.0, baseD + randomDepthOffset);
  // Grass is always fully grown (1.0). Flowers use the growth variable.
 float scaleMultiplier = mix(1.0, flowerGrowth, isFlower);

 float nearFade = smoothstep(0.1, 3.0, baseD);
 float farFade = 1.0 - smoothstep(uCamFar * 0.35, uCamFar, baseD);
 vAlpha = nearFade * farFade;
 if (baseD < 0.0) vAlpha = 0.0;

 // Multiply the final point size by our organic depth scaleMultiplier
 gl_PointSize = clamp(aSpriteScale * scaleMultiplier * 1100.0 / max(baseD, 0.3), 0.5, 440.0);
  vColorCoord = aColorCoordinate;
 vSeed = aRandomSeed;
}
`;

export const FRAGMENT = /* glsl */ `
uniform sampler2D uSpriteSheet;
uniform float uBrightness;
uniform float uSaturation;
uniform float uTime;
uniform vec3 uColorTint;

uniform float uDefaultFlowerBloom;
uniform float uHoverGlowMultiplier;

varying vec2 vColorCoord;
varying float vAlpha;
varying float vSeed;
varying float vHoverGlow;

void main() {
 if (vAlpha < 0.01) discard;

 // The sprite sheet is an 8x7 grid (56 textures)
 vec2 GRID = vec2(8.0, 7.0);
 vec2 cell = 1.0 / GRID;

 // Determine which tile we're in from the seeded coordinate.
 vec2 tile = floor(vColorCoord * GRID);
 float col = tile.x;
 float row = tile.y;

 // Sprite UV inside the atlas
 vec2 pc = gl_PointCoord;
 // Flip point coord Y to match expected texture orientation
 pc.y = 1.0 - pc.y;

 vec2 uv;
 uv.x = cell.x * pc.x + col * cell.x;
 uv.y = cell.y * pc.y + row * cell.y;

 // Clamp to tile bounds to prevent bleeding
 vec2 minUV = vec2(col, row) * cell + 0.001;
 vec2 maxUV = minUV + cell - 0.002;
 uv = clamp(uv, minUV, maxUV);

 vec4 tex = texture2D(uSpriteSheet, uv);
 if (tex.a < 0.01) discard;

 float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
 vec3 color = mix(vec3(lum), tex.rgb, uSaturation) * uBrightness;

 color *= 0.9 + 0.1 * sin(uTime * 1.5 + vSeed * 40.0);
  // Apply our custom color tint
 color *= uColorTint;

 // MAGIC HAPPENS HERE
 // We first establish a baseline glow depending on whether it's grass or a flower!
 // If it's a flower, the baseline multiplier is uDefaultFlowerBloom (so flowers always faintly glow).
 float isFlowerFrag = step(2.5, floor(vColorCoord.y * 7.0));
 float baseBloom = mix(1.0, uDefaultFlowerBloom, isFlowerFrag);

 // Then we mix from that baseline up to the massive hover multiplier based on vHoverGlow
 float bloomBoost = mix(baseBloom, uHoverGlowMultiplier, vHoverGlow);
 color *= bloomBoost;

 float a = tex.a * vAlpha;
 if (a < 0.01) discard;

 // Tone-mapping is handled by three fiber/renderer, but outputting >1.0 triggers bloom exactly where we want it.
 gl_FragColor = vec4(color, a);
 #include <colorspace_fragment>
}
`;


// ---- Flower.tsx ----



interface FlowerProps {
  data: any;
  sprite: THREE.Texture;
  config: any;
  bloomStrength?: number;
}

function Flower({ data, sprite, config, bloomStrength = 1.2 }: FlowerProps) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const targetMouse = useRef(new THREE.Vector2(0.5, 0.5));
  const currentMouse = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseUniform = useMemo(() => new THREE.Vector2(0.5, 0.5), []);
  const targetIntensity = useRef(0.0);
  const currentIntensity = useRef(0.0);
  const lastRawMouse = useRef(new THREE.Vector2(-999, -999));
  const reduceMotionRef = useRef(prefersReducedMotion());

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCamFar: { value: 77 },
        uBrightness: { value: 4.5 },
        uSaturation: { value: 1.5 },
        uSpriteSheet: { value: sprite },
        uColorTint: { value: config?.colorTint },
        uMouse: { value: mouseUniform },
        uAspect: { value: 1.0 },
        uHoverIntensity: { value: 0.0 },
        // Custom Hover Configs sent to shaders
        uDefaultFlowerBloom: { value: (config?.defaultFlowerBloom ?? 1.5) * bloomStrength },
        uHoverGlowMultiplier: { value: (config?.hoverGlowMultiplier ?? 6.0) * bloomStrength },
        uHoverMagneticStrength: { value: config?.hoverMagneticStrength ?? 0.6 },
        uHoverMagneticDirection: { value: config?.hoverMagneticDirection ?? 1.0 },
        uHoverZPull: { value: config?.hoverZPull ?? 2.5 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }, [sprite, config, mouseUniform]);

  useEffect(() => {
    materialRef.current = material;
    return () => {
      material.dispose();
      if (materialRef.current === material) {
        materialRef.current = null;
      }
    };
  }, [material]);

  useEffect(() => {
    const runtimeMaterial = materialRef.current;
    if (!runtimeMaterial) return;

    runtimeMaterial.uniforms.uDefaultFlowerBloom.value =
      (config?.defaultFlowerBloom ?? 1.5) * bloomStrength;
    runtimeMaterial.uniforms.uHoverGlowMultiplier.value =
      (config?.hoverGlowMultiplier ?? 6.0) * bloomStrength;
  }, [bloomStrength, config]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const applyReduced = (enabled: boolean) => {
      reduceMotionRef.current = enabled;
      const runtimeMaterial = materialRef.current;
      if (!runtimeMaterial) return;

      if (enabled) {
        runtimeMaterial.uniforms.uHoverIntensity.value = 0;
        runtimeMaterial.uniforms.uHoverMagneticStrength.value = 0;
        runtimeMaterial.uniforms.uHoverZPull.value = 0;
        targetIntensity.current = 0;
        currentIntensity.current = 0;
      } else {
        runtimeMaterial.uniforms.uHoverMagneticStrength.value =
          config?.hoverMagneticStrength ?? 0.6;
        runtimeMaterial.uniforms.uHoverZPull.value = config?.hoverZPull ?? 2.5;
      }
    };

    applyReduced(mq.matches);
    const onChange = (event: MediaQueryListEvent) => applyReduced(event.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [config]);

  // Track raw mouse position in NDC (-1 to 1) and calculate velocity/intensity
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (reduceMotionRef.current) return;

      targetMouse.current.x = e.clientX / window.innerWidth;
      targetMouse.current.y = 1.0 - e.clientY / window.innerHeight;
      // Calculate raw pixel distance moved
      const dx = e.clientX - lastRawMouse.current.x;
      const dy = e.clientY - lastRawMouse.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // If moved appreciably, spike target intensity to 1.0
      if (lastRawMouse.current.x !== -999 && dist > 1.0) {
        targetIntensity.current = 1.0;
      }
      lastRawMouse.current.set(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  useFrame((state, delta) => {
    const runtimeMaterial = materialRef.current;
    if (!runtimeMaterial) return;

    runtimeMaterial.uniforms.uAspect.value =
      state.size.width / state.size.height;

    if (reduceMotionRef.current) {
      // Freeze sway / bloom pulse - keep uTime still and hover off.
      runtimeMaterial.uniforms.uHoverIntensity.value = 0;
      return;
    }

    runtimeMaterial.uniforms.uTime.value = state.clock.elapsedTime;

    // EXTREME SMOOTHNESS: The actual mathematical center of the interaction heavily lags behind the  // physical cursor, creating a syrupy, organic drag (reduced from 8.0 to 3.0)
    currentMouse.current.lerp(targetMouse.current, Math.min(1.0, delta * 3.0));
    mouseUniform.copy(currentMouse.current);

    // Slowly decay the target intensity if not moving (fades completely in ~3 seconds for"smoothest more duration")
    targetIntensity.current = Math.max(0.0, targetIntensity.current - delta * 0.35);
    // EXTREME SMOOTHNESS: The elasticity of the magnetic pull and bloom fade-in/fade-out
    // is slowed down drastically (reduced from 2.5 to 1.5)
    currentIntensity.current +=
      (targetIntensity.current - currentIntensity.current) *
      Math.min(1.0, delta * 1.5);
    runtimeMaterial.uniforms.uHoverIntensity.value = currentIntensity.current;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          {...({
            attach: "attributes-position",
            array: data.positions,
            count: data.count,
            itemSize: 3,
          } as any)}
        />
        <bufferAttribute
          {...({
            attach: "attributes-aColorCoordinate",
            array: data.colorCoords,
            count: data.count,
            itemSize: 2,
          } as any)}
        />
        <bufferAttribute
          {...({
            attach: "attributes-aSpriteScale",
            array: data.scales,
            count: data.count,
            itemSize: 1,
          } as any)}
        />
        <bufferAttribute
          {...({
            attach: "attributes-aRandomSeed",
            array: data.seeds,
            count: data.count,
            itemSize: 1,
          } as any)}
        />
        <bufferAttribute
          {...({
            attach: "attributes-aGrowNoise",
            array: data.growNoise,
            count: data.count,
            itemSize: 1,
          } as any)}
        />
      </bufferGeometry>
      <primitive attach="material" object={material} />
    </points>
  );
}


// ---- ExperienceComp.tsx ----



// Tweak these values to change the look of the valley
const FLOWER_CONFIG = {
 flowerProbability: 1.0, // Controls how many flower patches appear (0.0 to 1.0)
 patchScale: 0.1, // How large the patches are (smaller number = larger patches)
 globalScale: .9, // Overall scale multiplier for all sprites
 minScale: 0.1, // Minimum random scale
 maxScaleRandom: 1.5, // Maximum additional random scale
 flowerThreshold: 0.1, // Threshold for spawning flower patches (> 0 defaults to grass)
 flowerDensity: 0.35, // Density of flowers within a patch
 grassScaleMult: 0.8, // Scale multiplier specifically for base grass
 flowerScaleMult: 1.2, // Scale multiplier specifically for flowers
 flowerYOffset: -0.02, // How much higher flowers sit above the base grass (negative embeds them in grass)
 colorTint: new THREE.Color(0.1, 0.1, 0.1), // brighten tint for"little light"
 rows: 300, // Number of rows along the path
 perRow: 360, // Number of sprites per row
 // Hover Interaction Config
 defaultFlowerBloom: 1.5, // Constant ambient brightness multiplier for flowers ONLY
 hoverGlowMultiplier: 5.0, // Max brightness multiplier for the bloom
 hoverMagneticStrength: 0.1, // How aggressively flowers are sucked towards the mouse (0 to 1+)
 hoverMagneticDirection: 1.0, // 1 is pull to cursor, -1 is repel away from cursor
 hoverZPull: .2 // How far flowers leap towards the camera lens in 3D
};

interface ExperienceProps {
 bloomStrength?: number;
 cameraSpeed?: number;
}

function Experience({
 bloomStrength = 1.2,
 cameraSpeed = 1,
}: ExperienceProps) {
 const gltf = useGLTF("https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/camera-path07.glb");
 const sprite = useTexture("https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/pool_summer.png");
 const terrainTex = useTexture("https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/terrain.png");

 const flowerSprite = useMemo(() => {
 const nextSprite = sprite.clone();
 nextSprite.colorSpace = THREE.SRGBColorSpace;
 nextSprite.minFilter = THREE.LinearFilter;
 nextSprite.magFilter = THREE.LinearFilter;
 nextSprite.needsUpdate = true;
 return nextSprite;
 }, [sprite]);

 useEffect(() => {
 return () => {
 flowerSprite.dispose();
 };
 }, [flowerSprite]);

 const cameraProps = useMemo(() => {
 const scene = gltf?.scene;
 if (!scene) return null;
 const cam = (
 scene.getObjectByName("Camera") ||
 scene.getObjectByProperty("type","PerspectiveCamera") ||
 gltf.cameras?.[0]
 ) as THREE.PerspectiveCamera;
 if (!cam) return null;

 return {
 fov: cam.fov,
 near: cam.near,
 far: cam.far,
 rotation: [cam.rotation.x, cam.rotation.y, cam.rotation.z],
 };
 }, [gltf]);
 const { curve, flowers, pathOffset } = useValleyData(gltf, terrainTex, FLOWER_CONFIG);

 if (!curve || !flowers) return null;

 return (
 <>
 <CameraRig curve={curve} cameraProps={cameraProps} scrollConfig={{
 scrollIntensity: 0.1 * cameraSpeed,
 autoSpeed: 0.00015 * cameraSpeed,
 damping: 0.97,
 lerpSpeed: 0.03,
 loopPoint: 0.85,
 }} />
 {/* Copy 1: flowers at original position */}
 <Flower data={flowers} sprite={flowerSprite} config={FLOWER_CONFIG} bloomStrength={bloomStrength} />
 {/* Copy 2: same flowers shifted forward - fills the gap at the end */}
 <group position={pathOffset as any}>
 <Flower data={flowers} sprite={flowerSprite} config={FLOWER_CONFIG} bloomStrength={bloomStrength} />
 </group>
 </>
 );
}

useGLTF.preload("https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/camera-path07.glb");


// ---- index.tsx ----
// Built using Hyperiux Vault: https://vault.hyperiux.com




function clampNumber(value: unknown, min: number, max: number, fallback: number) {
 const number = Number(value);
 return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
}

interface ProgressiveBloomValleyProps {
 bloomStrength?: number;
 bloomRadius?: number;
 cameraSpeed?: number;
 backgroundColor?: string;
}

export default function ProgressiveBloomValley({
 bloomStrength = 1.2,
 bloomRadius = 0.4,
 cameraSpeed = 1,
 backgroundColor = "#000000",
}: ProgressiveBloomValleyProps) {
 const rootRef = useRef<HTMLDivElement | null>(null);
 const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");
 const resolvedBloomStrength = clampNumber(bloomStrength, 0, 4, 1.2);
 const resolvedBloomRadius = clampNumber(bloomRadius, 0, 1, 0.4);
 const resolvedCameraSpeed = clampNumber(cameraSpeed, 0.05, 5, 1);

 useEffect(() => {
 const gate = createVisibilityGate({
 root: rootRef,
 onChange: (active) => setFrameloop(active ? "always" : "never"),
 });
 setFrameloop(gate.isActive ? "always" : "never");
 return () => gate.destroy();
 }, []);

 return (
 <div ref={rootRef} className="h-screen w-full relative" style={{ backgroundColor }}>

 <Canvas
 dpr={[1, 1.5]}
 flat
 frameloop={frameloop}
 gl={{
 powerPreference:"high-performance",
 outputColorSpace: THREE.SRGBColorSpace,
 }}

 >
 <color attach="background" args={[backgroundColor]} />
 <Suspense fallback={null}>
 <Experience
 bloomStrength={resolvedBloomStrength}
 cameraSpeed={resolvedCameraSpeed}
 />
 </Suspense>

 <EffectComposer {...({ disableNormalPass: true } as any)}>
 {/* Mipmap blur creates an extremely soft, diffused glow without harsh edges */}
 {/* Threshold ensures only the hovered (multiplied) pixels bloom, preserving details elsewhere */}
  <EdgeBlurEffect
 blurStrength={0.8 + resolvedBloomRadius * 1.4}
 blurStart={0.35 - resolvedBloomRadius * 0.2}
 />
 <FilmGrainEffect amount={0.05} scale={1} />
 <Vignette

 offset={0.3}
 darkness={.7}
 />
 </EffectComposer>
 </Canvas>
 </div>
 );
}
