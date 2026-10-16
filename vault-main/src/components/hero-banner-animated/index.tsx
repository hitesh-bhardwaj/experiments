// Built using Hyperiux Vault: https://vault.hyperiux.com
'use client';
import Link from "next/link";
import { Center, Environment, MeshReflectorMaterial, shaderMaterial, useGLTF, useTexture, useVideoTexture } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import gsap from "gsap";
import { Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Effect } from "postprocessing";
import React, { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type WebGLRenderer, type WebGLRenderTarget, Uniform, Vector2 } from "three";
import { degToRad } from "three/src/math/MathUtils.js";

// ---- RoomModel.tsx ----





// =========================
// 🎬 PREMIUM TV SHADER
// =========================
const TVTransitionMaterial = shaderMaterial(
 {
 uTexA: null,
 uTexB: null,
 uProgress: 0,
 uOffset: new THREE.Vector2(),
 uTime: 0,
 uResolution: new THREE.Vector2(1, 1),
 },

 // vertex
 `
 varying vec2 vUv;
 void main() {
 vUv = uv;
 gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
 }
 `,

 // fragment
 `
 uniform sampler2D uTexA;
 uniform sampler2D uTexB;
 uniform float uProgress;
 uniform float uTime;
 uniform vec2 uOffset;
 varying vec2 vUv;

 // Function to quantize uv for pixelation
 vec2 pixelate(vec2 uv, float pixelSize) {
 return floor(uv / pixelSize) * pixelSize + pixelSize * 0.5;
 }

 void main() {
 vec2 uv = vUv;
 float p = clamp(uProgress, 0.0, 1.0);

 // ⚡️ Subtle Parallax
 uv += uOffset * 0.05;

 // --- Pixelation transition ---
 // Progressively increase pixel size from 0 (sharp) to 0.07 (chunky) on texA as p goes 0→1
 // And from 0.07→0 (sharp) on texB
 float maxPixelSize = 0.2;
 float pixelSizeA = maxPixelSize * p;
 float pixelSizeB = maxPixelSize * (1.0 - p);

 // Optionally add smoothstep for smoother appearance near edges
 pixelSizeA = mix(0.0, maxPixelSize, smoothstep(0.0, 1.0, p));
 pixelSizeB = mix(maxPixelSize, 0.0, smoothstep(0.0, 1.0, p));

 // Clean zoom effect (for subtle motion, optional)
 vec2 uvA = (uv - 0.5) * (1.0 + p * 0.05) + 0.5;
 vec2 uvB = (uv - 0.5) * (1.05 - p * 0.05) + 0.5;

 // Apply pixelation
 uvA = pixelate(uvA, max(pixelSizeA, 0.0001));
 uvB = pixelate(uvB, max(pixelSizeB, 0.0001));

 vec4 texA = texture2D(uTexA, uvA);
 vec4 texB = texture2D(uTexB, uvB);

 // Use p as the crossfade (replace with a different blend if you want softness at the edge)
 float fade = smoothstep(0.0, 1.0, p);

 vec4 col = mix(texA, texB, fade);

 gl_FragColor = col;

 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }
 `
);



extend({ TVTransitionMaterial });

// tVTransitionMaterial is a custom shader material registered via extend(),
// so it isn't part of JSX.IntrinsicElements; reference it through an
// any-typed tag so JSX accepts it without changing what's rendered.
const TVTransitionMaterialTag = "tVTransitionMaterial" as any;


// =========================
// 🎯 MAIN COMPONENT
// =========================
interface RoomModelOwnProps {
 onClick: (e: any) => void
 isZoomed: boolean
 mouseMovement?: boolean
 videoRef: React.RefObject<HTMLVideoElement | null>
}

function RoomModel({ onClick, isZoomed, mouseMovement = true, videoRef, ...props }: RoomModelOwnProps & Record<string, any>) {

 const groupRef = useRef<THREE.Group | null>(null);
 const tvMatRef = useRef<any>(null);
 const { gl } = useThree();

 const { nodes } = useGLTF("https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/finall.glb") as any;


 // =========================
 // 📺 TEXTURES
 // =========================
 const tvTextureSource = useTexture("https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/tvtexture.png");
 const TVtexture = useMemo(() => {
 const texture = tvTextureSource.clone();
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.flipY = false;
 texture.needsUpdate = true;
 return texture;
 }, [tvTextureSource]);

 const videoTextureSource = useVideoTexture(
"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/hero-banner-animated-showreel.mp4",
 { start: false }
 );
 const videoTexture = useMemo(() => {
 const texture = videoTextureSource.clone();
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.flipY = false;
 texture.needsUpdate = true;
 return texture;
 }, [videoTextureSource]);
 const videoElement = videoTextureSource.image;

 useEffect(() => {
 return () => {
 TVtexture.dispose();
 videoTexture.dispose();
 };
 }, [TVtexture, videoTexture]);


 // =========================
 // 🎬 VIDEO CONTROL
 // =========================
 useEffect(() => {
 if (!videoElement) return;

 videoRef.current = videoElement;

 if (isZoomed) {
 const timeout = setTimeout(() => {
 // play() returns a promise that rejects if the browser blocks
 // playback - retry muted/inline instead of failing silently.
 videoElement.playsInline = true;
 videoElement.play()?.catch(() => {
 videoElement.muted = true;
 videoElement.play()?.catch(() => {});
 });
 }, 300);
 return () => clearTimeout(timeout);
 } else {
 videoElement.pause();
 }

 }, [isZoomed, videoElement, videoRef]);


 // =========================
 // ⚡ SMOOTH PROGRESS
 // =========================
 const progressRef = useRef({ value: 0 });
 const animate = useRef<((value: number) => any) | undefined>(undefined);

 useEffect(() => {
 animate.current = gsap.quickTo(progressRef.current,"value", {
 duration: 1.5,
 ease:"power4.inOut"
 });
 }, []);

 useEffect(() => {
 animate.current?.(isZoomed ? 1 : 0);
 }, [isZoomed]);


 // =========================
 // 🖱 MOUSE TILT + PARALLAX
 // =========================
 const targetRot = useRef({ x: 0, y: 0 });
 const targetOffset = useRef({ x: 0, y: 0 });
 const offsetRef = useRef({ x: 0, y: 0 });

 // We want to only update rotation/offset from mouse if not zoomed
 const handlePointerMove = useCallback(
 (e: MouseEvent) => {
 if (isZoomed || !mouseMovement) return;
 const rect = gl.domElement.getBoundingClientRect();

 const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
 const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

 targetRot.current.x = -y * 0.05;
 targetRot.current.y = x * 0.15;

 targetOffset.current.x = x * 0.04;
 targetOffset.current.y = y * 0.02;
 },
 [gl, isZoomed, mouseMovement]
 );

 useEffect(() => {
 if (!mouseMovement) return;
 gl.domElement.addEventListener("mousemove", handlePointerMove);
 return () => gl.domElement.removeEventListener("mousemove", handlePointerMove);
 }, [handlePointerMove, gl, mouseMovement]);

 // Additionally, immediately reset to neutral rotation/offset when zoomed
 useEffect(() => {
 if (isZoomed || !mouseMovement) {
 // Optionally quickly animate to zero for smoothness
 gsap.to(targetRot.current, {
 x: 0,
 y: 0,
 duration: 0.5,
 overwrite: true,
 ease:"power3.out",
 });
 gsap.to(targetOffset.current, {
 x: 0,
 y: 0,
 duration: 0.5,
 overwrite: true,
 ease:"power3.out",
 });
 }
 }, [isZoomed, mouseMovement]);

 // =========================
 // 🎞 FRAME LOOP
 // =========================
 useFrame((_, delta) => {
 // rotation
 if (groupRef.current) {
 groupRef.current.rotation.x += (targetRot.current.x - groupRef.current.rotation.x) * 0.05;
 groupRef.current.rotation.y += (targetRot.current.y - groupRef.current.rotation.y) * 0.05;
 }

 // offset lerp
 offsetRef.current.x += (targetOffset.current.x - offsetRef.current.x) * 0.08;
 offsetRef.current.y += (targetOffset.current.y - offsetRef.current.y) * 0.08;

 // shader update
 if (tvMatRef.current) {
 // Fix: Access uniforms as direct properties on the material instance
 // and use .set() for Vector2 uniforms.
 tvMatRef.current.uOffset.set(offsetRef.current.x, offsetRef.current.y);
 tvMatRef.current.uTime += delta;
 tvMatRef.current.uProgress = progressRef.current.value;
 }
 });

 // =========================
 // 🎨 MATERIALS
 // =========================
 const normalMapSource = useTexture("https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/normal.webp");
 const normalMap = useMemo(() => {
 const texture = normalMapSource.clone();
 texture.colorSpace = THREE.NoColorSpace;
 texture.needsUpdate = true;
 return texture;
 }, [normalMapSource]);

 const baseMat = useMemo(() => ({
 color:"#000",
 normalMap,
 normalScale: new THREE.Vector2(0.3, 0.3),
 roughness: 10.,
 side: THREE.DoubleSide
 }), [normalMap]);


 const roughnessMapSource = useTexture(
"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/bathroom-floor-roughness.png"
 );
 const roughnessMap = useMemo(() => {
 const texture = roughnessMapSource.clone();
 texture.wrapS = THREE.RepeatWrapping;
 texture.wrapT = THREE.RepeatWrapping;
 texture.repeat.set(4, 4);
 texture.needsUpdate = true;
 return texture;
 }, [roughnessMapSource]);

 useEffect(() => {
 return () => {
 normalMap.dispose();
 roughnessMap.dispose();
 };
 }, [normalMap, roughnessMap]);


 // =========================
 // 🧱 JSX
 // =========================
 return (
 <group ref={groupRef} {...props} dispose={null}>

 <mesh geometry={nodes.room.geometry}>
 <meshStandardMaterial {...baseMat} />
 </mesh>

 <mesh geometry={nodes.Door.geometry}>
 <meshStandardMaterial {...baseMat} />
 </mesh>

 {/* <mesh geometry={nodes.switch.}><meshStandardMaterial {...baseMat} /></mesh> */}

 <mesh  position={[0, 0, 1]}
 geometry={nodes.ladder.geometry}
 >
 <meshStandardMaterial {...baseMat} />
 </mesh>

 <mesh
 geometry={nodes.Body4002.geometry}
 >
 <meshStandardMaterial {...baseMat} />
 </mesh>
 <mesh
 geometry={nodes.Body4002_1.geometry}
 >
 <meshStandardMaterial {...baseMat} />
 </mesh>
 <mesh
 geometry={nodes.Body4002_2.geometry}
 >
 <meshStandardMaterial {...baseMat} />
 </mesh>



 {/* 📺 TV */}
 <group
 >
 <mesh geometry={nodes.screen.geometry}>
 <meshStandardMaterial {...baseMat} />
 </mesh>

 <mesh geometry={nodes.tv.geometry}>
 <TVTransitionMaterialTag
 ref={tvMatRef}
 uTexA={TVtexture}
 uTexB={videoTexture}
 />
 </mesh>
 </group>



 {/* 🪞 FLOOR */}
 <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
 <planeGeometry args={[4.2, 10]} />
 <MeshReflectorMaterial
 resolution={1024}
 blur={[200, 50]}
 mixBlur={2}
 mixStrength={100}
 roughness={0.1}
 distortionMap={roughnessMap}
 distortion={0.0}
 reflectorOffset={0}
 color="#111"
 metalness={.9}
 />
 </mesh>

 </group>
 );
}


// ---- CustomGrainNoise.tsx ----



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
 }

 setResolution(width: number, height: number) {
 const uRes = this.uniforms.get("uResolution");
 if (uRes) {
 uRes.value.set(width, height);
 }
 }

 update(renderer: WebGLRenderer, _inputBuffer: WebGLRenderTarget, deltaTime?: number) {
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

function CustomGrainNoise({ amount = 0.12, scale = 900, opacity = 0.7 }: { amount?: number, scale?: number, opacity?: number } = {}) {
 const effect = useMemo(() => {
 // Get initial resolution (SSR safe fallback)
 let width = 1280, height = 720;
 if (typeof window !=="undefined") {
 width = window.innerWidth;
 height = window.innerHeight;
 }
 return new FilmGrainEffectImpl({ amount, scale, opacity, resolution: [width, height] });
 }, [amount, scale, opacity]);

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


// ---- VideoUI.tsx ----

interface VideoUIProps {
 isZoomed: boolean
 setIsZoomed: (value: boolean) => void
 videoRef: RefObject<HTMLVideoElement | null>
}

const VideoUI = ({ isZoomed, setIsZoomed, videoRef }: VideoUIProps) => {
 const progressRef = useRef<HTMLDivElement | null>(null);

 useEffect(() => {
 const loop = createSuspendedRaf({
 root: null,
 observeOffscreen: false,
 onFrame: () => {
 const video = videoRef?.current;
 const bar = progressRef.current;

 if (bar && video && video.duration > 0 && !isNaN(video.duration)) {
 const pct = (video.currentTime / video.duration) * 100;
 bar.style.width = `${pct}%`;
 }
 },
 });

 loop.start();
 return () => loop.destroy();
 }, [videoRef]);

 return (
 <>
 <p className={`absolute top-[2vw] left-1/2 -translate-x-1/2 uppercase text-white/50 transition-opacity duration-1000 text-xs ${isZoomed ?'opacity-100 pointer-events-auto' :'opacity-0 pointer-events-none'}`}>[ESC] to back</p>
 <div className={`absolute bottom-0 left-0 w-full p-8 flex justify-between items-center text-white/50 text-xs font-mono transition-opacity duration-1000 ${isZoomed ?'opacity-100 pointer-events-auto' :'opacity-0 pointer-events-none'}`}>

 {/* Left */}
 <div className="flex items-center gap-2">
 <span className="uppercase">HYPERIUX IMMERSION LABS</span>
 </div>

 {/* Center */}
 <button
 onClick={() => setIsZoomed(false)}
 className="hover:text-white transition-colors cursor-pointer"
 >
 GO BACK
 </button>

 {/* Progress Bar (Bottom Line) */}
 <div className="absolute bottom-0 left-0 h-[5px] bg-orange-500/20 w-full">
 <div
 ref={progressRef}
 className="h-full bg-orange-500"
 style={{ width:'0%', transition:'none' }}
 />
 </div>
 </div>
 </>

 );
};


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


// ---- index.tsx ----
// Built using Hyperiux Vault: https://vault.hyperiux.com






// 🌟 CONFIGURATION - tweak these for env intensity levels 🌟
const ENV_INTENSITY_CONFIG = {
  zoomed: 0,
  out: 0.1,
  lightZoomed: 0,
  lightOut: 3
}


// Camera z positions for zoomed / out states per device
const CAMERA_CONFIG = {
  desktop: { zoomedZ: 2.5, outZ: 4.8 },
  tablet:  { zoomedZ: 4.5, outZ: 5.6 },
  mobile:  { zoomedZ: 6.0, outZ: 7.9 }
}

type DeviceType = 'desktop' | 'tablet' | 'mobile'

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.min(max, Math.max(min, next))
}

interface MovingPointLightProps {
  lightRef: React.RefObject<THREE.PointLight | null>
  enabled?: boolean
  lerp?: number
}

function MovingPointLight({ lightRef, enabled = true, lerp = 0.1 }: MovingPointLightProps) {
  const { gl } = useThree()
  const targetRef = useRef({ x: 0, y: 0 })
  const safeLerp = clampNumber(lerp, 0.01, 1, 0.1)

  const handlePointerMove = useCallback((event: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect()
    targetRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    targetRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }, [gl])

  useEffect(() => {
    if (!enabled) {
      targetRef.current.x = 0
      targetRef.current.y = 0
      return
    }
    const dom = gl.domElement
    dom.addEventListener('mousemove', handlePointerMove)
    return () => dom.removeEventListener('mousemove', handlePointerMove)
  }, [gl, handlePointerMove, enabled])

  useFrame(() => {
    const light = lightRef.current
    if (!light) return
    const basePos = { x: 0, y: -1.3, z: -2 }
    const spread = { x: 1.8, y: 0.0, z: 0.08 }
    const tx = enabled ? basePos.x + targetRef.current.x * spread.x : basePos.x
    const tz = enabled ? basePos.z + targetRef.current.y * spread.z : basePos.z
    light.position.x += (tx - light.position.x) * safeLerp
    light.position.z += (tz - light.position.z) * safeLerp
  })

  return (
    <pointLight
      ref={lightRef}
      castShadow
      position={[0, -1.3, -2]}
      distance={100}
      decay={0.7}
      color="#fff"
    />
  )
}

interface SceneContentProps {
  isZoomed: boolean
  setIsZoomed: (value: boolean | ((prev: boolean) => boolean)) => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  deviceType: DeviceType
  mouseMovement: boolean
  intensity: number
  lerp: number
}

function SceneContent({ isZoomed, setIsZoomed, videoRef, deviceType, mouseMovement, intensity, lerp }: SceneContentProps) {
  const groupRef = useRef<THREE.Group | null>(null)
  const lightRef = useRef<THREE.PointLight | null>(null)
  const { camera } = useThree()
  const [environmentIntensity, setEnvironmentIntensity] = useState(ENV_INTENSITY_CONFIG.out)
  const safeIntensity = clampNumber(intensity, 0, 10, 3)
  const latestIntensityRef = useRef(safeIntensity)

  const intensityState = useRef({
    env: ENV_INTENSITY_CONFIG.out,
    light: safeIntensity
  })

  const handleModelClick = useCallback((e: any) => {
    e?.stopPropagation()
    setIsZoomed(prev => !prev)
  }, [setIsZoomed])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsZoomed(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setIsZoomed])

  useEffect(() => {
    const duration = 1.5
    const ease = 'power3.inOut'
    const cfg = CAMERA_CONFIG[deviceType] ?? CAMERA_CONFIG.desktop

    gsap.killTweensOf(camera.position)
    if (groupRef.current) gsap.killTweensOf(groupRef.current.rotation)

    if (isZoomed) {
      gsap.to(camera.position, { x: 0, y: 0.05, z: cfg.zoomedZ, duration, ease })
      gsap.to((groupRef.current as THREE.Group).rotation, { x: 0, y: 0, z: 0, duration, ease })
    } else {
      gsap.to(camera.position, { x: 0, y: 0, z: cfg.outZ, duration, ease })
      gsap.to((groupRef.current as THREE.Group).rotation, { x: 0, y: 0, z: degToRad(-5), duration, ease })
    }

    gsap.to(intensityState.current, {
      env: isZoomed ? ENV_INTENSITY_CONFIG.zoomed : ENV_INTENSITY_CONFIG.out,
      light: isZoomed ? ENV_INTENSITY_CONFIG.lightZoomed : latestIntensityRef.current,
      duration,
      ease,
      onUpdate: () => setEnvironmentIntensity(intensityState.current.env),
    })
  }, [isZoomed, camera, deviceType])

  useEffect(() => {
    latestIntensityRef.current = safeIntensity
    if (!isZoomed) {
      intensityState.current.light = safeIntensity
    }
  }, [isZoomed, safeIntensity])

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.intensity = intensityState.current.light
    }
  })

  return (
    <>
      <MovingPointLight lightRef={lightRef} enabled={mouseMovement} lerp={lerp} />

      <Environment
        background={false}
        files='https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/1k/wooden_studio_08_1k.exr'
        environmentIntensity={environmentIntensity}
        environmentRotation={[0, degToRad(40), 0]}
      />

      <group ref={groupRef} rotation={[0, 0, degToRad(-5)]}>
        <RoomModel
          onClick={handleModelClick}
          isZoomed={isZoomed}
          mouseMovement={mouseMovement}
          videoRef={videoRef}
        />
      </group>
    </>
  )
}

interface HeroBannerAnimatedProps {
  mouseMovement?: boolean
  intensity?: number
  lerp?: number
  accentColor?: string
}

export default function HeroBannerAnimated({
  mouseMovement = true,
  intensity = 3,
  lerp = 0.1,
  accentColor = "#ECE4B4",
}: HeroBannerAnimatedProps = {}) {
  const rootRef = useRef<HTMLElement | null>(null)
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>('always')
  const [isZoomed, setIsZoomed] = useState(false)
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  // The room scene is desktop-only; phones and tablets get the
  // "open on desktop" message instead.
  const isMobile = deviceType !== 'desktop'


  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? 'always' : 'never'),
    })
    setFrameloop(gate.isActive ? 'always' : 'never')
    return () => gate.destroy()
  }, [])

  useEffect(() => {
    const tabletMq = window.matchMedia('(max-width: 1025px)')
    const mobileMq = window.matchMedia('(max-width: 767px)')

    const update = () => {
      if (mobileMq.matches) {
        setDeviceType('mobile')
        return
      }

      if (tabletMq.matches) {
        setDeviceType('tablet')
        return
      }

      setDeviceType('desktop')
    }

    update()
    tabletMq.addEventListener('change', update)
    mobileMq.addEventListener('change', update)

    return () => {
      tabletMq.removeEventListener('change', update)
      mobileMq.removeEventListener('change', update)
    }
  }, [])

  return (
    <>

      <section
        ref={rootRef}
        className="w-full h-screen bg-black relative"
        style={{ "--hero-accent-color": accentColor } as React.CSSProperties}
      >
        <AnimatePresence>
          {!isZoomed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
              className='absolute py-[5vw] px-[4vw] z-999 pointer-events-none top-0 left-0 text-[var(--hero-accent-color)] w-full h-full max-md:py-[8vw] max-md:px-[5vw]'
            >
              <div className='flex items-start max-xl:hidden pt-[2vw] gap-[2vw] max-xl:pt-[10vw] max-xl:gap-[4vw]'>
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
                  className='text-[15vw] font-semibold leading-[0.6]! tracking-tight max-xl:text-[28vw]'
                >
                  HXR
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
                  className='uppercase w-[25vw] translate-y-[-6vw] text-[1vw]  flex items-center justify-center text-left max-lg:w-[45vw] max-xl:w-[45vw] max-lg:text-[2vw] max-xl:text-[2.8vw] max-xl:translate-y-[-8vw]'
                >
                  Hyperiux immersion labs is an independent design agency in india.
                  <span className='w-6 h-3 flex mt-[1.5vw] bg-[var(--hero-accent-color)] max-md:hidden items-center justify-center mr-[3vw] max-md:mt-[3vw]'>
                    <span className='w-1 h-1 bg-black rounded-full block'></span>
                  </span>
                </motion.p>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className='text-[15vw] max-xl:hidden max-xl:pt-auto pt-[30vh] max-xl:pt-[50vh] font-semibold tracking-tight text-right w-full max-xl:text-[28vw]'
              >
                UI
              </motion.p>

             <motion.p
 initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 1, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
  className='absolute flex items-center justify-center gap-5 bottom-[2vw] uppercase text-[1vw] left-1/2 -translate-x-1/2 w-full text-center text-xs z-1 max-lg:text-[2.5vw] max-xl:text-[3vw] max-xl:bottom-[30%] max-md:bottom-[40%] pointer-events-auto'
>
  <Link href="/effects" className='pointer-events-auto'>
    Explore All Effects
  </Link>
  <Play className='w-4 h-4 max-xl:hidden' fill='var(--hero-accent-color)' />
  


</motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className='flex absolute bottom-[6vw] left-[2vw] items-center gap-[2vw] max-xl:bottom-[10vw] max-xl:left-[3vw]'
              >
                <div className='w-[.3vw] ml-[3vw] space-y-[.2vw] h-[5vw] max-md:w-[.6vw] max-md:ml-[4vw] max-md:h-[9vw] max-md:space-y-[.5vw]'>
                  <div className='w-full h-[.7vw] max-md:h-[1.4vw]' style={{ backgroundColor: "color-mix(in srgb, var(--hero-accent-color) 30%, transparent)" }} />
                  <div className='w-full h-full bg-[var(--hero-accent-color)]' />
                  <div className='w-full h-[.7vw] max-md:h-[1.4vw]' style={{ backgroundColor: "color-mix(in srgb, var(--hero-accent-color) 30%, transparent)" }} />
                  <div className='w-full h-[.7vw] max-md:h-[1.4vw]' style={{ backgroundColor: "color-mix(in srgb, var(--hero-accent-color) 30%, transparent)" }} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isMobile && (
          <>
            <Canvas
              // The whole banner toggles the zoom + showreel (not just the
              // small TV mesh), so any click on the scene plays the video.
              onClick={() => setIsZoomed((prev) => !prev)}
              style={{ cursor: 'pointer' }}
              aria-hidden="true"
              dpr={[1, 2]}
              camera={{ position: [0, 0, CAMERA_CONFIG[deviceType].outZ], fov: 55 }}
              frameloop={frameloop}
            >
              <Center>
                <SceneContent
                  isZoomed={isZoomed}
                  setIsZoomed={setIsZoomed}
                  videoRef={videoRef}
                  deviceType={deviceType}
                  mouseMovement={mouseMovement}
                  intensity={intensity}
                  lerp={lerp}
                />
              </Center>

              <EffectComposer>
                <EdgeBlurEffect blurType="classic" blurStrength={1.5} blurStart={0.4} />
                <CustomGrainNoise amount={0.01} scale={1.5} opacity={0.9} />
              </EffectComposer>
            </Canvas>

            <VideoUI
              videoRef={videoRef}
              isZoomed={isZoomed}
              setIsZoomed={setIsZoomed}
            />
          </>
        )}

        {isMobile && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-8 text-center pointer-events-none">
            <div className="flex max-w-sm flex-col items-center gap-3 text-[var(--hero-accent-color)]">
              <p className="text-[8vw] font-light leading-none tracking-tight uppercase">
                Open on desktop
              </p>            
              <p className="text-sm leading-relaxed opacity-60">
                For the full room, video, and immersive motion experience, view this scene on a larger screen.
              </p>
            </div>
          </div>
        )}

      </section>
    </>
  )
}
