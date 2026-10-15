// Built using Hyperiux Vault: https://vault.hyperiux.com
'use client';
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
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


// ---- CurvedSwiperHorizontal.tsx ----


// GLSL shaders with proper horizontal deformation only
const vertexShader = `
uniform vec2 uOffset;
varying vec2 vUv;

#define M_PI 3.1415926535897932384626433832795

void main() {
   vUv = uv;
   vec3 newPosition = position;
   
   // Only deform horizontally based on x position (left/right edges)
   float edgeIntensity = abs(uv.x - 0.5) * 2.0;
   
   // Apply horizontal deformation (left/right bulge)
   newPosition.x += sin(uv.y * M_PI) * uOffset.x * edgeIntensity;
   
   gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uTexture;
uniform float uAlpha;
uniform vec2 uTextureSize;
uniform vec2 uMeshSize;
varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 textureSize, vec2 meshSize) {
    float rs = meshSize.x / meshSize.y;        // mesh aspect ratio
    float rt = textureSize.x / textureSize.y;  // texture aspect ratio
    
    vec2 newUv = uv;
    
    if (rs > rt) {
        // Mesh is wider → scale texture by height
        float scale = rs / rt;
        newUv.x = uv.x * scale - (scale - 1.0) * 0.5;
    } else {
        // Mesh is taller → scale texture by width
        float scale = rt / rs;
        newUv.y = uv.y * scale - (scale - 1.0) * 0.5;
    }
    
    return newUv;
}

void main() {
   vec2 coveredUv = coverUv(vUv, uTextureSize, uMeshSize);
   
   // Scale the image by 1.2x (zoom in effect)
   vec2 center = vec2(0.5, 0.5);
   float scaleAmount = 1.5;
   coveredUv = center + (coveredUv - center) / scaleAmount;
   
   vec4 texColor = texture2D(uTexture, coveredUv);
   gl_FragColor = vec4(texColor.rgb, texColor.a * uAlpha);
}
`;

const imagesArr = [
  "https://picsum.photos/seed/curved0/600/900",
  "https://picsum.photos/seed/curved1/600/900",
  "https://picsum.photos/seed/curved2/600/900",
  "https://picsum.photos/seed/curved3/600/900",
  "https://picsum.photos/seed/curved4/600/900",

];

// ========== CONTROL PANEL ==========
const SWIPER_VISIBLE_IMAGES = 3;
const FIXED_IMAGE_WIDTH = 320;
const FIXED_IMAGE_HEIGHT = 320;

// DEFORMATION CONTROLS
const DEFORMATION_INTENSITY = 8;
const DEFORMATION_SENSITIVITY = 0.02;
const DEFORMATION_SMOOTHNESS = 0.15;

// DRAG CONTROLS
const DRAG_SENSITIVITY = 2.0;
const MOMENTUM_FRICTION = 0.94;
const SCROLL_SMOOTHNESS = 0.12;

// MAX VALUES
const MAX_SCROLL_VELOCITY = 0.5;
const MAX_DEFORMATION = 0.05;
const MAX_SCROLL_DEFORMATION = 0.02; // New: Higher max for scroll deformation

function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return clamp(number, min, max);
}

// Proper modulo function that handles negative numbers
function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

interface CurvedPlaneHorizontalProps {
  speed?: number;
  curveValue?: number;
  gap?: number;
  imageSize?: number;
}

const CurvedPlaneHorizontal = ({
  speed = 1,
  curveValue = 1,
  gap = 1,
  imageSize = 1,
}: CurvedPlaneHorizontalProps) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const meshesRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[]>([]);
  const sceneRef = useRef<THREE.Scene | undefined>(undefined);
  const cameraRef = useRef<THREE.PerspectiveCamera | undefined>(undefined);
  const rendererRef = useRef<THREE.WebGLRenderer | undefined>(undefined);
  const texturesRef = useRef<(THREE.Texture | null)[]>([]);

  const offsetRef = useRef(0);
  const targetOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const deformationRef = useRef(0);
  const targetDeformationRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const scrollIntensityRef = useRef(0); // New: Track scroll intensity
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const reduceMotionRef = useRef(
    typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
  const controlsRef = useRef({
    speed: clampNumber(speed, 0, 3, 1),
    curveValue: clampNumber(curveValue, 0, 3, 1),
    gap: clampNumber(gap, 0.5, 2, 1),
    imageSize: clampNumber(imageSize, 0.5, 2, 1),
  });

  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    controlsRef.current.speed = clampNumber(speed, 0, 3, 1);
    controlsRef.current.curveValue = clampNumber(curveValue, 0, 3, 1);
    controlsRef.current.gap = clampNumber(gap, 0.5, 2, 1);
    controlsRef.current.imageSize = clampNumber(imageSize, 0.5, 2, 1);
  }, [curveValue, gap, imageSize, speed]);

  // Load Textures
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let loaded = 0;

    imagesArr.forEach((src, idx) => {
      loader.load(
        src,
        (tex) => {
          texturesRef.current[idx] = tex;
          if (++loaded === imagesArr.length) setImagesLoaded(true);
        },
        undefined,
        (err) => {
          console.error("Failed to load texture:", err);
          texturesRef.current[idx] = null;
          if (++loaded === imagesArr.length) setImagesLoaded(true);
        }
      );
    });
  }, []);

  useEffect(() => {
    if (!imagesLoaded) return;

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onReduceMotionChange = (event: MediaQueryListEvent) => {
      reduceMotionRef.current = event.matches;
      if (event.matches) {
        velocityRef.current = 0;
        scrollVelocityRef.current = 0;
        scrollIntensityRef.current = 0;
        targetDeformationRef.current = 0;
        deformationRef.current = 0;
        offsetRef.current = targetOffsetRef.current;
      }
    };
    if (mq) {
      reduceMotionRef.current = mq.matches;
      mq.addEventListener?.("change", onReduceMotionChange);
    }

    const container = containerRef.current as HTMLElement;
    const viewHeight = window.innerHeight * 0.8;
    const viewWidth = window.innerWidth;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      (180 * (2 * Math.atan(viewHeight / 2 / 1000))) / Math.PI,
      viewWidth / viewHeight,
      1,
      3000
    );
    camera.position.z = 1000;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(viewWidth, viewHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const geometry = new THREE.PlaneGeometry(1, 1, 50, 50);
    const meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];

    // Create more meshes for better buffering (visible + 4 buffer)
    const totalMeshes = SWIPER_VISIBLE_IMAGES + 4;

    for (let i = 0; i < totalMeshes; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: null },
          uOffset: { value: new THREE.Vector2(0, 0) },
          uAlpha: { value: 1 },
          uTextureSize: { value: new THREE.Vector2(1, 1) },
          uMeshSize: { value: new THREE.Vector2(FIXED_IMAGE_WIDTH, FIXED_IMAGE_HEIGHT) },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
      });

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.scale.set(FIXED_IMAGE_WIDTH, FIXED_IMAGE_HEIGHT, 1);
      scene.add(mesh);
      meshes.push(mesh);
    }

    meshesRef.current = meshes;

    const updateMeshes = () => {
      const offset = offsetRef.current;
      const baseIndex = Math.floor(offset);
      const fractional = offset - baseIndex;
      const currentImageWidth = FIXED_IMAGE_WIDTH * controlsRef.current.imageSize;
      const currentImageHeight = FIXED_IMAGE_HEIGHT * controlsRef.current.imageSize;
      const spacing = currentImageWidth + 60 * controlsRef.current.gap;

      meshes.forEach((mesh, i) => {
        // Calculate proper image index with buffer offset
        const meshIndex = baseIndex + i - 2;
        const imgIndex = mod(meshIndex, imagesArr.length);
        const texture = texturesRef.current[imgIndex];

        if (texture) {
          mesh.material.uniforms.uTexture.value = texture;
          // Update texture size for cover function
          mesh.material.uniforms.uTextureSize.value = new THREE.Vector2(
            (texture.image as HTMLImageElement).width,
            (texture.image as HTMLImageElement).height
          );
        }

        // Calculate position with proper centering
        const centerOffset = i - totalMeshes / 2 + 0.5;
        const xPos = (centerOffset - fractional) * spacing;

        mesh.position.x = xPos;
        mesh.scale.set(currentImageWidth, currentImageHeight, 1);

        // Smooth transition from 1.0 (center) to 0.8 (extreme edges)
        const distFromCenter = Math.min(1.0, Math.abs(xPos) / (viewWidth / 2));

        // Using a smooth S-curve (smoothstep logic) for the transition
        const t = distFromCenter;
        const smoothFactor = t * t * (3 - 2 * t);
        const opacity = 1.0 - smoothFactor * 0.25;

        mesh.material.uniforms.uAlpha.value = opacity;

        // Apply deformation based on drag velocity and scroll intensity
        const deform = deformationRef.current;
        mesh.material.uniforms.uMeshSize.value.set(currentImageWidth, currentImageHeight);
        mesh.material.uniforms.uOffset.value.x =
          deform * DEFORMATION_INTENSITY * controlsRef.current.curveValue;
      });
    };

    const loop = createSuspendedRaf({
      root: container,
      onFrame: () => {
        if (reduceMotionRef.current) {
          // Snap carousel - no inertia, scroll coast, or curve deformation.
          velocityRef.current = 0;
          scrollVelocityRef.current = 0;
          scrollIntensityRef.current = 0;
          targetDeformationRef.current = 0;
          deformationRef.current = 0;
          offsetRef.current = targetOffsetRef.current;
          updateMeshes();
          renderer.render(scene, camera);
          return;
        }

        // Apply scroll velocity with lerp
        if (Math.abs(scrollVelocityRef.current) > 0.0001) {
          targetOffsetRef.current += scrollVelocityRef.current * controlsRef.current.speed;
          scrollVelocityRef.current = lerp(scrollVelocityRef.current, 0, 0.05);
        }

        // Decay scroll intensity more slowly
        scrollIntensityRef.current = lerp(scrollIntensityRef.current, 0, 0.02);

        // Momentum for drag
        if (!dragging.current && Math.abs(velocityRef.current) > 0.001) {
          targetOffsetRef.current += velocityRef.current * controlsRef.current.speed;
          velocityRef.current *= MOMENTUM_FRICTION;
        }

        // Only reset deformation when not dragging and scroll intensity is very low
        if (!dragging.current) {
          targetDeformationRef.current = lerp(targetDeformationRef.current, 0, 0.05);
        }

        // Smooth interpolation
        offsetRef.current = lerp(
          offsetRef.current,
          targetOffsetRef.current,
          SCROLL_SMOOTHNESS
        );
        deformationRef.current = lerp(
          deformationRef.current,
          targetDeformationRef.current,
          DEFORMATION_SMOOTHNESS
        );

        updateMeshes();
        renderer.render(scene, camera);
      },
    });
    loop.start();

    const onResize = () => {
      const viewHeight = window.innerHeight * 0.8;
      const viewWidth = window.innerWidth;

      camera.aspect = viewWidth / viewHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(viewWidth, viewHeight);
    };
    window.addEventListener("resize", onResize);

    const getPointerX = (e: MouseEvent | TouchEvent) => ("touches" in e ? e.touches[0].clientX : e.clientX);

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      dragging.current = true;
      lastX.current = getPointerX(e);
      lastTime.current = Date.now();
      velocityRef.current = 0;
      dom.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      e.preventDefault();
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;

      const currentX = getPointerX(e);
      const currentTime = Date.now();
      const dx = currentX - lastX.current;
      const dt = Math.max(currentTime - lastTime.current, 1);
      const currentImageWidth = FIXED_IMAGE_WIDTH * controlsRef.current.imageSize;
      const spacing = currentImageWidth + 60 * controlsRef.current.gap;

      const delta = (dx / spacing) * DRAG_SENSITIVITY * controlsRef.current.speed;
      targetOffsetRef.current -= delta;

      if (reduceMotionRef.current) {
        velocityRef.current = 0;
        targetDeformationRef.current = 0;
        deformationRef.current = 0;
        offsetRef.current = targetOffsetRef.current;
        lastX.current = currentX;
        lastTime.current = currentTime;
        e.preventDefault();
        return;
      }

      // Calculate velocity for momentum and deformation
      const instantVelocity = dx / dt;

      // Apply max velocity cap
      velocityRef.current = Math.max(
        -MAX_SCROLL_VELOCITY,
        Math.min(MAX_SCROLL_VELOCITY, -delta / (dt / 16))
      );

      // Set deformation based on drag velocity with max cap
      const deformIntensity = Math.max(
        -MAX_DEFORMATION,
        Math.min(MAX_DEFORMATION, instantVelocity * DEFORMATION_SENSITIVITY)
      );
      targetDeformationRef.current = deformIntensity;

      lastX.current = currentX;
      lastTime.current = currentTime;
      e.preventDefault();
    };

    const onPointerUp = () => {
      dragging.current = false;
      dom.style.cursor = "grab";
      document.body.style.userSelect = "";
    };

    // Enhanced scroll handler with intensity-based deformation
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rawScrollDelta = e.deltaY;

      if (reduceMotionRef.current) {
        targetOffsetRef.current += rawScrollDelta * 0.0004 * controlsRef.current.speed;
        velocityRef.current = 0;
        scrollVelocityRef.current = 0;
        scrollIntensityRef.current = 0;
        targetDeformationRef.current = 0;
        deformationRef.current = 0;
        offsetRef.current = targetOffsetRef.current;
        return;
      }

      // Calculate scroll intensity based on deltaY magnitude
      const scrollIntensity = Math.abs(rawScrollDelta) * 0.002;

      // Update scroll intensity (accumulate for sustained scrolling)
      scrollIntensityRef.current = Math.min(1.0, scrollIntensityRef.current + scrollIntensity);

      // Accumulate scroll velocity (reduced speed)
      const scrollDelta = rawScrollDelta * 0.0004 * controlsRef.current.speed;
      scrollVelocityRef.current += scrollDelta;

      // Clamp scroll velocity
      scrollVelocityRef.current = Math.max(
        -MAX_SCROLL_VELOCITY * 0.3,
        Math.min(MAX_SCROLL_VELOCITY * 0.3, scrollVelocityRef.current)
      );

      // Set deformation based on scroll intensity (not velocity)
      const intensityBasedDeformation = scrollIntensityRef.current * 0.03;
      const deformIntensity = Math.max(
        -MAX_SCROLL_DEFORMATION,
        Math.min(MAX_SCROLL_DEFORMATION, Math.sign(rawScrollDelta) * intensityBasedDeformation)
      );

      targetDeformationRef.current = deformIntensity;
    };

    const dom = renderer.domElement;

    dom.addEventListener("mousedown", onPointerDown);
    dom.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);
    dom.addEventListener("touchstart", onPointerDown, { passive: false });
    dom.addEventListener("touchmove", onPointerMove, { passive: false });
    document.addEventListener("touchend", onPointerUp);
    dom.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      loop.destroy();
      mq?.removeEventListener?.("change", onReduceMotionChange);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("mousedown", onPointerDown);
      dom.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseup", onPointerUp);
      dom.removeEventListener("touchstart", onPointerDown);
      dom.removeEventListener("touchmove", onPointerMove);
      document.removeEventListener("touchend", onPointerUp);
      dom.removeEventListener("wheel", onWheel);

      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [imagesLoaded]);

  return (
    <main
      ref={containerRef}
      className="w-screen h-screen relative overflow-hidden flex items-center justify-center"
      style={{ background: "#f5f5f5", touchAction: "none" }}
    >
      {!imagesLoaded && (
        <div className="absolute text-gray-800 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-light">
          Loading...
        </div>
      )}
    </main>
  );
};


// ---- CurvedSwiperVertical.tsx ----


// GLSL Shaders
const verticalVertexShader = `
uniform vec2 uOffset;
varying vec2 vUv;

#define M_PI 3.1415926535897932384626433832795

void main() {
  vUv = uv;
  vec3 newPosition = position;

  float edgeIntensity = abs(uv.y - 0.5) * 2.0;
  newPosition.y += sin(uv.x * M_PI) * uOffset.y * edgeIntensity;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const verticalFragmentShader = `
uniform sampler2D uTexture;
uniform float uAlpha;
uniform vec2 uTextureSize;
uniform vec2 uMeshSize;
varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 textureSize, vec2 meshSize) {
    float rs = meshSize.x / meshSize.y;
    float rt = textureSize.x / textureSize.y;
    
    vec2 newUv = uv;
    
    if (rs > rt) {
        float scale = rs / rt;
        newUv.x = uv.x * scale - (scale - 1.0) * 0.5;
    } else {
        float scale = rt / rs;
        newUv.y = uv.y * scale - (scale - 1.0) * 0.5;
    }
    
    return newUv;
}

void main() {
   vec2 coveredUv = coverUv(vUv, uTextureSize, uMeshSize);
   
   vec2 center = vec2(0.5, 0.5);
   float scaleAmount = 2.0;
   coveredUv = center + (coveredUv - center) / scaleAmount;
   
   vec4 texColor = texture2D(uTexture, coveredUv);
   gl_FragColor = vec4(texColor.rgb, texColor.a * uAlpha);
}
`;

const column1Images = [
  "https://picsum.photos/seed/curved0/600/900",
  "https://picsum.photos/seed/curved1/600/900",
  "https://picsum.photos/seed/curved2/600/900",
  "https://picsum.photos/seed/curved3/600/900",
  "https://picsum.photos/seed/curved4/600/900",
];

const column2Images = [
  "https://picsum.photos/seed/curved5/600/900",
  "https://picsum.photos/seed/curved6/600/900",
  "https://picsum.photos/seed/curved7/600/900",
  "https://picsum.photos/seed/curved8/600/900",
  "https://picsum.photos/seed/curved9/600/900",
];

const column3Images = [
  "https://picsum.photos/seed/curved10/600/900",
  "https://picsum.photos/seed/curved11/600/900",
  "https://picsum.photos/seed/curved12/600/900",
  "https://picsum.photos/seed/curved13/600/900",
  "https://picsum.photos/seed/curved14/600/900",
];

const columnImages = [column1Images, column2Images, column3Images];
const allImages = [...column1Images, ...column2Images, ...column3Images];

const VERTICAL_VISIBLE_ROWS = 6;
const VERTICAL_NUM_COLUMNS = 3;
const VERTICAL_FIXED_IMAGE_WIDTH = 280;
const VERTICAL_FIXED_IMAGE_HEIGHT = 380;
const VERTICAL_SPACING_X = VERTICAL_FIXED_IMAGE_WIDTH + 150;
const VERTICAL_SPACING_Y = VERTICAL_FIXED_IMAGE_HEIGHT + 80;

const VERTICAL_DEFORMATION_INTENSITY = 8;
const VERTICAL_DEFORMATION_SENSITIVITY = 0.02;
const VERTICAL_DEFORMATION_SMOOTHNESS = 0.12;
const VERTICAL_DRAG_SENSITIVITY = 2.2;
const VERTICAL_MOMENTUM_FRICTION = 0.90;        // reduced from 0.94
const VERTICAL_SCROLL_SMOOTHNESS = 0.05;        // reduced from 0.08
const VERTICAL_MAX_SCROLL_VELOCITY = 0.05;      // reduced from 0.1
const VERTICAL_MAX_DEFORMATION = .1;

function verticalLerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

const verticalClamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function verticalClampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return verticalClamp(number, min, max);
}

interface CurvedPlaneVerticalProps {
  routes?: unknown;
  speed?: number;
  curveValue?: number;
  gap?: number;
  imageSize?: number;
}

const CurvedPlaneVertical = ({
  routes,
  speed = 1,
  curveValue = 1,
  gap = 1,
  imageSize = 1,
}: CurvedPlaneVerticalProps) => {
  const uid = useId().replace(/:/g, "");
  const sectionId = `curved-swiper-vertical-${uid}`;
  const containerRef = useRef<HTMLElement | null>(null);
  const sceneRef = useRef<THREE.Scene | undefined>(undefined);
  const cameraRef = useRef<THREE.PerspectiveCamera | undefined>(undefined);
  const rendererRef = useRef<THREE.WebGLRenderer | undefined>(undefined);
  const meshesRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[]>([]);
  const texturesRef = useRef<(THREE.Texture | null)[]>([]);
  const lastScrollTime = useRef(0);
  const offsetRef = useRef(0);
  const targetOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const deformationRef = useRef(0);
  const targetDeformationRef = useRef(0);
  const dragging = useRef(false);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const reduceMotionRef = useRef(
    typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
  const controlsRef = useRef({
    speed: verticalClampNumber(speed, 0, 3, 1),
    curveValue: verticalClampNumber(curveValue, 0, 3, 1),
    gap: verticalClampNumber(gap, 0.5, 2, 1),
    imageSize: verticalClampNumber(imageSize, 0.5, 2, 1),
  });

  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    controlsRef.current.speed = verticalClampNumber(speed, 0, 3, 1);
    controlsRef.current.curveValue = verticalClampNumber(curveValue, 0, 3, 1);
    controlsRef.current.gap = verticalClampNumber(gap, 0.5, 2, 1);
    controlsRef.current.imageSize = verticalClampNumber(imageSize, 0.5, 2, 1);
  }, [curveValue, gap, imageSize, speed]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    let loaded = 0;

    allImages.forEach((src, idx) => {
      loader.load(
        src,
        (tex) => {
          texturesRef.current[idx] = tex;
          if (++loaded === allImages.length) setImagesLoaded(true);
        },
        undefined,
        (err) => {
          console.error("Failed to load texture:", err);
          texturesRef.current[idx] = null;
          if (++loaded === allImages.length) setImagesLoaded(true);
        }
      );
    });
  }, []);

  useEffect(() => {
    if (!imagesLoaded) return;

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onReduceMotionChange = (event: MediaQueryListEvent) => {
      reduceMotionRef.current = event.matches;
      if (event.matches) {
        velocityRef.current = 0;
        targetDeformationRef.current = 0;
        deformationRef.current = 0;
        offsetRef.current = targetOffsetRef.current;
      }
    };
    if (mq) {
      reduceMotionRef.current = mq.matches;
      mq.addEventListener?.("change", onReduceMotionChange);
    }

    const container = containerRef.current as HTMLElement;
    const viewHeight = window.innerHeight;
    const viewWidth = window.innerWidth;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      (180 * (2 * Math.atan(viewHeight / 2 / 1000))) / Math.PI,
      viewWidth / viewHeight,
      1,
      3000
    );
    camera.position.z = 1000;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(viewWidth, viewHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const geometry = new THREE.PlaneGeometry(1, 1, 50, 50);
    const meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
    const totalMeshes = (VERTICAL_VISIBLE_ROWS + 2) * VERTICAL_NUM_COLUMNS;

    for (let i = 0; i < totalMeshes; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: null },
          uOffset: { value: new THREE.Vector2(0, 0) },
          uAlpha: { value: 1 },
          uTextureSize: { value: new THREE.Vector2(1, 1) },
          uMeshSize: { value: new THREE.Vector2(VERTICAL_FIXED_IMAGE_WIDTH, VERTICAL_FIXED_IMAGE_HEIGHT) },
        },
        vertexShader: verticalVertexShader,
        fragmentShader: verticalFragmentShader,
        transparent: true,
      });

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.scale.set(VERTICAL_FIXED_IMAGE_WIDTH, VERTICAL_FIXED_IMAGE_HEIGHT, 1);
      scene.add(mesh);
      meshes.push(mesh);
    }

    meshesRef.current = meshes;

    const isTablet = () => viewWidth >= 768 && viewWidth <= 1024;

    const updateMeshes = () => {
      const offset = offsetRef.current;
      const deform = deformationRef.current;
      const tablet = isTablet();
      const currentImageWidth = VERTICAL_FIXED_IMAGE_WIDTH * controlsRef.current.imageSize;
      const currentImageHeight = VERTICAL_FIXED_IMAGE_HEIGHT * controlsRef.current.imageSize;
      const spacingX = currentImageWidth + 150 * controlsRef.current.gap;
      const spacingY = currentImageHeight + 80 * controlsRef.current.gap;

      meshes.forEach((mesh, i) => {
        const col = i % VERTICAL_NUM_COLUMNS;
        const row = Math.floor(i / VERTICAL_NUM_COLUMNS);

        if (tablet && col === 1) {
          mesh.visible = false;
          return;
        } else {
          mesh.visible = true;
        }

        const currentColumnImages = columnImages[col];
        
        const scrollPosition = offset + row;
        const imgIndex = Math.floor(scrollPosition) % currentColumnImages.length;
        const normalizedIndex = imgIndex < 0 ? imgIndex + currentColumnImages.length : imgIndex;

        const globalTextureIndex = column1Images.length * col + normalizedIndex;
        const texture = texturesRef.current[globalTextureIndex];
        
        if (texture) {
          mesh.material.uniforms.uTexture.value = texture;
          const img = texture.image as HTMLImageElement;
          mesh.material.uniforms.uTextureSize.value.set(
            img.naturalWidth || img.width,
            img.naturalHeight || img.height
          );
        }

        let xPos: number | undefined;
        if (tablet) {
          if (col === 0) {
            xPos = -spacingX / 2;
          } else if (col === 2) {
            xPos = spacingX / 2;
          }
        } else {
          xPos = (col - 1) * spacingX;
        }
        
        const baseY = (row - VERTICAL_VISIBLE_ROWS / 2) * spacingY;
        const yOffset = (offset - Math.floor(offset)) * spacingY;
        
        const direction = col === 1 ? -1 : 1;
        const yPos = (baseY - yOffset) * direction;

        mesh.position.set(xPos as number, yPos, 0);
        mesh.scale.set(currentImageWidth, currentImageHeight, 1);

        // Always full opacity - no fading
        mesh.material.uniforms.uAlpha.value = 1.0;

        const deformDirection = direction;
        mesh.material.uniforms.uMeshSize.value.set(currentImageWidth, currentImageHeight);
        mesh.material.uniforms.uOffset.value.set(
          0,
          deform * VERTICAL_DEFORMATION_INTENSITY * deformDirection * controlsRef.current.curveValue
        );
      });
    };

    const loop = createSuspendedRaf({
      root: container,
      onFrame: () => {
        if (reduceMotionRef.current) {
          // Snap columns - no inertia or curve deformation.
          velocityRef.current = 0;
          targetDeformationRef.current = 0;
          deformationRef.current = 0;
          offsetRef.current = targetOffsetRef.current;
          updateMeshes();
          renderer.render(scene, camera);
          return;
        }

        if (!dragging.current && Math.abs(velocityRef.current) > 0.001) {
          targetOffsetRef.current += velocityRef.current * controlsRef.current.speed;
          velocityRef.current *= VERTICAL_MOMENTUM_FRICTION;
        }

        const now = Date.now();
        const isRecentlyScrolled = now - lastScrollTime.current < 100;

        if (!dragging.current && !isRecentlyScrolled) {
          targetDeformationRef.current = 0;
        }

        offsetRef.current = verticalLerp(
          offsetRef.current,
          targetOffsetRef.current,
          VERTICAL_SCROLL_SMOOTHNESS
        );
        deformationRef.current = verticalLerp(
          deformationRef.current,
          targetDeformationRef.current,
          VERTICAL_DEFORMATION_SMOOTHNESS
        );

        updateMeshes();
        renderer.render(scene, camera);
      },
    });
    loop.start();

    const onResize = () => {
      const viewHeight = window.innerHeight;
      const viewWidth = window.innerWidth;
      camera.aspect = viewWidth / viewHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(viewWidth, viewHeight);
    };
    window.addEventListener("resize", onResize);

    const getPointerY = (e: MouseEvent | TouchEvent) => ("touches" in e ? e.touches[0].clientY : e.clientY);

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      dragging.current = true;
      lastY.current = getPointerY(e);
      lastTime.current = Date.now();
      velocityRef.current = 0;
      dom.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      e.preventDefault();
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const currentY = getPointerY(e);
      const currentTime = Date.now();
      const dy = currentY - lastY.current;
      const dt = Math.max(currentTime - lastTime.current, 1);
      const currentImageHeight = VERTICAL_FIXED_IMAGE_HEIGHT * controlsRef.current.imageSize;
      const spacingY = currentImageHeight + 80 * controlsRef.current.gap;

      const delta = (dy / spacingY) * VERTICAL_DRAG_SENSITIVITY * controlsRef.current.speed;
      targetOffsetRef.current -= delta;

      if (reduceMotionRef.current) {
        velocityRef.current = 0;
        targetDeformationRef.current = 0;
        deformationRef.current = 0;
        offsetRef.current = targetOffsetRef.current;
        lastY.current = currentY;
        lastTime.current = currentTime;
        e.preventDefault();
        return;
      }

      const instantVelocity = dy / dt;
      velocityRef.current = Math.max(
        -VERTICAL_MAX_SCROLL_VELOCITY,
        Math.min(VERTICAL_MAX_SCROLL_VELOCITY, -delta / (dt / 16))
      );

      const deformIntensity = Math.max(
        -VERTICAL_MAX_DEFORMATION,
        Math.min(VERTICAL_MAX_DEFORMATION, instantVelocity * VERTICAL_DEFORMATION_SENSITIVITY)
      );
      targetDeformationRef.current = deformIntensity;

      lastY.current = currentY;
      lastTime.current = currentTime;
      e.preventDefault();
    };

    const onPointerUp = () => {
      dragging.current = false;
      dom.style.cursor = "grab";
      document.body.style.userSelect = "";
    };

    const onWheel = (e: WheelEvent) => {
      const delta = e.deltaY / 100;
      targetOffsetRef.current += delta * 0.12 * controlsRef.current.speed;   // reduced from 0.25

      if (reduceMotionRef.current) {
        velocityRef.current = 0;
        targetDeformationRef.current = 0;
        deformationRef.current = 0;
        offsetRef.current = targetOffsetRef.current;
        lastScrollTime.current = Date.now();
        return;
      }

      velocityRef.current = Math.max(
        -VERTICAL_MAX_SCROLL_VELOCITY,
        Math.min(VERTICAL_MAX_SCROLL_VELOCITY, delta * 0.15 * controlsRef.current.speed)  // reduced from 0.4
      );

      const deformIntensity = Math.max(
        -VERTICAL_MAX_DEFORMATION,
        Math.min(VERTICAL_MAX_DEFORMATION, delta * VERTICAL_DEFORMATION_SENSITIVITY)
      );
      targetDeformationRef.current = deformIntensity;

      lastScrollTime.current = Date.now();
    };

    const dom = renderer.domElement;
    
    dom.addEventListener("mousedown", onPointerDown);
    dom.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);
    dom.addEventListener("touchstart", onPointerDown, { passive: false });
    dom.addEventListener("touchmove", onPointerMove, { passive: false });
    document.addEventListener("touchend", onPointerUp);
    dom.addEventListener("wheel", onWheel);

    return () => {
      loop.destroy();
      mq?.removeEventListener?.("change", onReduceMotionChange);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("mousedown", onPointerDown);
      dom.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseup", onPointerUp);
      dom.removeEventListener("touchstart", onPointerDown);
      dom.removeEventListener("touchmove", onPointerMove);
      document.removeEventListener("touchend", onPointerUp);
      dom.removeEventListener("wheel", onWheel);

      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [imagesLoaded]);

  return (
    <main
      ref={containerRef}
      className="w-screen h-screen relative overflow-hidden flex items-center justify-center"
      id={sectionId}
      style={{ background: "white", touchAction: "none" }}
    >
{!imagesLoaded && (
        <div className="absolute text-black left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-light">
          Loading...
        </div>
      )}
    </main>
  );
};


// ---- index.tsx ----
// Built using Hyperiux Vault: https://vault.hyperiux.com

type CurvedPlaneVariant = 'horizontal' | 'vertical';

const VARIANTS: Record<CurvedPlaneVariant, any> = {
  horizontal: CurvedPlaneHorizontal,
  vertical: CurvedPlaneVertical,
};

const VERSIONS: { label: string, value: CurvedPlaneVariant }[] = [
  {
    label: "V1",
    value: "horizontal",
  },
  {
    label: "V2",
    value: "vertical",
  },
];

interface CurvedPlaneProps {
  variant?: CurvedPlaneVariant;
  speed?: number;
  curveValue?: number;
  gap?: number;
  imageSize?: number;
}

export default function CurvedPlane({
  variant = "horizontal",
  speed = 1,
  curveValue = 1,
  gap = 1,
  imageSize = 1,
}: CurvedPlaneProps) {
  const [activeVariant, setActiveVariant] = useState<CurvedPlaneVariant>(
    VARIANTS[variant] ? variant : "horizontal"
  );

  const ActiveComponent = useMemo(() => {
    return VARIANTS[activeVariant] || CurvedPlaneHorizontal;
  }, [activeVariant]);

  return (
    <>
      <VersionNav
        activeVariant={activeVariant}
        onVariantChange={setActiveVariant}
      />
      <ActiveComponent
        speed={speed}
        curveValue={curveValue}
        gap={gap}
        imageSize={imageSize}
      />
    </>
  );
}

function VersionNav({ activeVariant, onVariantChange }: { activeVariant: string, onVariantChange: (value: CurvedPlaneVariant) => void }) {
  return (
    <nav className="fixed bottom-8 h-fit  max-lg:bottom-28 left-1/2 z-9999 flex -translate-x-1/2 gap-1 rounded-full border border-white/20 bg-black/8 px-1.5 py-1.5 backdrop-blur-md  max-lg:px-3 max-lg:py-2  max-md:px-2 max-md:py-1.5">
      {VERSIONS.map((variant) => {
        const isActive = activeVariant === variant.value;

        return (
          <button
            key={variant.value}
            type="button"
            onClick={() => onVariantChange(variant.value)}
            className={`rounded-full px-5 py-1.5 text-sm font-semibold tracking-widest transition-all duration-200 max-lg:text-lg max-md:text-sm ${
              isActive
                ? "bg-black text-white"
                : "text-black/65 hover:text-black"
            }`}
          >
            {variant.label}
          </button>
        );
      })}
    </nav>
  );
}
