// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import Lenis from "lenis";
import { useEffect, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";

import Image from "next/image";
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

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);
  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot() {
  return false;
}

// React hook form, for JSX output that depends on the preference. Safe to
// call during render - returns false on the server.
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

function getViewportConfig(zoomFactorMultiplier = 1) {
  const width = window.innerWidth;
  const isMobile = width < 768;
  const isTablet = width <= 1025;

  return {
    isMobile,
    isTablet,
    initialRadius: isMobile ? 22 : isTablet ? 28 : 35,
    planeWidthFactor: isMobile ? 0.85 : isTablet ? 0.82 : 0.5,
    baseRadius: isMobile ? 20 : isTablet ? 26 : 35,
    maxRadius: isMobile ? 30 : isTablet ? 42 : 55,
    zoomFactor: (isMobile ? 0.7 : isTablet ? 1.05 : 1.5) * zoomFactorMultiplier,
  };
}

interface PortfolioSliderItem {
  url: string;
  description: string;
}

interface PortfolioSliderProps {
  items: PortfolioSliderItem[];
  zoomFactor?: number;
  scrollSpeed?: number;
  showCaption?: boolean;
}

function PortfolioSlider({
  items,
  zoomFactor = 1,
  scrollSpeed = 0.01,
  showCaption = true,
}: PortfolioSliderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const circleRef = useRef<HTMLDivElement | null>(null);
  const textContainerRef = useRef<HTMLDivElement | null>(null);
  const activeTextRef = useRef<HTMLDivElement | null>(null);
  const prevRawIndexRef = useRef(0);
  const controlsRef = useRef({ zoomFactor, scrollSpeed });
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);

  useEffect(() => {
    controlsRef.current = { zoomFactor, scrollSpeed };
  }, [zoomFactor, scrollSpeed]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let planes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];

    let currentRadius = getViewportConfig(zoomFactor).initialRadius;

    const container = containerRef.current as HTMLDivElement;

    const lenis = new Lenis({
      infinite: true,
      lerp: 0.1,
    });

    scene = new THREE.Scene();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const viewportConfig = getViewportConfig(zoomFactor);

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    // IMAGE SETUP
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    // FULLSCREEN CALC
    const frustumHeight =
      2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const frustumWidth = frustumHeight * camera.aspect;

    const planeWidth = frustumWidth * viewportConfig.planeWidthFactor;
    const planeHeight = frustumHeight;
    const spacing = planeWidth;
    const planeAspect = planeWidth / planeHeight;

    items.forEach((item, i) => {
      // uImageAspect starts equal to the plane's own aspect (no crop) and
      // is corrected once the texture's real size is known below - without
      // this, the image is mapped straight onto the plane's UVs and gets
      // stretched to whatever aspect the plane happens to be, instead of
      // being cropped to fill it (CSS object-cover).
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: null as THREE.Texture | null },
          uZoom: { value: 1.2 },
          uPlaneAspect: { value: planeAspect },
          uImageAspect: { value: planeAspect },
        },
        vertexShader: `
 varying vec2 vUv;
 void main() {
 vUv = uv;
 gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
 }
 `,
        fragmentShader: `
 uniform sampler2D uTexture;
 uniform float uZoom;
 uniform float uPlaneAspect;
 uniform float uImageAspect;
 varying vec2 vUv;

 void main() {
 // Cover-fit: crop the longer axis instead of stretching either one to
 // match the plane, then apply the existing centered zoom on top.
 vec2 ratio = vec2(
 min(uPlaneAspect / uImageAspect, 1.0),
 min(uImageAspect / uPlaneAspect, 1.0)
 );
 vec2 uv = vec2(
 (vUv.x - 0.5) * ratio.x + 0.5,
 (vUv.y - 0.5) * ratio.y + 0.5
 );
 uv = (uv - 0.5) / uZoom + 0.5;
 gl_FragColor = texture2D(uTexture, uv);
 }
 `,
      });

      const texture = loader.load(item.url, (loadedTexture) => {
        const image = loadedTexture.image as { width: number; height: number };
        if (image?.width && image?.height) {
          material.uniforms.uImageAspect.value = image.width / image.height;
        }
      });
      texture.minFilter = THREE.LinearFilter;
      material.uniforms.uTexture.value = texture;

      const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 32, 32);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = i * spacing;

      scene.add(mesh);
      planes.push(mesh);
    });

    const totalWidth = spacing * items.length;

    let offset = 0;
    let prevScroll: number | null = null;
    let isSnapping = false;
    let snapTimeout: ReturnType<typeof setTimeout> | null = null;
    let snapObj = { offset: 0 };

    // COMBINED RAF + RENDER LOOP (visibility-gated)
    const loop = createSuspendedRaf({
      root: null,
      observeTab: false,
      observeOffscreen: false,
      onFrame: (time: number) => {
        lenis.raf(time);

        // Delta
        const currentScroll = lenis.scroll;
        const limit = lenis.limit;

        let delta = 0;
        if (prevScroll !== null && limit > 0) {
          delta = currentScroll - prevScroll;
          // Correct for wrap-around
          if (delta > limit / 2) delta -= limit;
          if (delta < -limit / 2) delta += limit;
          if (!isSnapping) {
            offset += delta;
          }
        }
        prevScroll = currentScroll;

        if (!isSnapping && Math.abs(delta) < 0.5) {
          if (!snapTimeout) {
            snapTimeout = setTimeout(() => {
              const liveScrollSpeed = controlsRef.current.scrollSpeed;
              const currentScrollOffset = offset * liveScrollSpeed;
              const targetScrollOffset =
                Math.round(currentScrollOffset / spacing) * spacing;
              const targetOffset = targetScrollOffset / liveScrollSpeed;

              if (Math.abs(offset - targetOffset) > 1) {
                isSnapping = true;
                lenis.stop();
                snapObj.offset = offset;
                gsap.to(snapObj, {
                  offset: targetOffset,
                  duration: 0.5,
                  ease: "power2.inOut",
                  onUpdate: () => {
                    offset = snapObj.offset;
                  },
                  onComplete: () => {
                    isSnapping = false;
                    if (gate.isActive) {
                      lenis.start();
                    }
                  },
                });
              }
            }, 400);
          }
        } else if (Math.abs(delta) >= 0.5) {
          if (snapTimeout) {
            clearTimeout(snapTimeout);
            snapTimeout = null;
          }
        }

        const liveViewportConfig = getViewportConfig(
          controlsRef.current.zoomFactor,
        );
        const scrollOffset = offset * controlsRef.current.scrollSpeed;

        // Reduced motion: the thumbnail ring keeps a fixed radius (no
        // pulsing with scroll speed) and the images keep a fixed zoom below -
        // scrolling still moves them normally.
        const reduce = reducedMotionRef.current;
        const targetRadius = reduce
          ? liveViewportConfig.baseRadius
          : Math.min(
              liveViewportConfig.baseRadius + Math.abs(delta) * 0.12,
              liveViewportConfig.maxRadius,
            );
        currentRadius += (targetRadius - currentRadius) * 0.1;

        if (circleRef.current) {
          const R = -(scrollOffset / spacing) * (360 / 21);
          circleRef.current.style.transform = `translate(-50%, -50%) rotate(${R}deg)`;
          circleRef.current.style.setProperty(
            "--radius",
            `-${currentRadius}vh`,
          );
          circleRef.current.style.setProperty("--rotation", `${R}deg`);
        }

        if (textContainerRef.current) {
          let rawIndex = Math.floor(scrollOffset / spacing + 0.5);

          if (rawIndex !== prevRawIndexRef.current) {
            const isForward = rawIndex > prevRawIndexRef.current;
            prevRawIndexRef.current = rawIndex;

            let activeIndex =
              ((rawIndex % items.length) + items.length) % items.length;
            const newText = items[activeIndex].description;
            if (textContainerRef.current.dataset.activeText !== newText) {
              textContainerRef.current.dataset.activeText = newText;
              const oldDiv = activeTextRef.current;
              const newDiv = document.createElement("div");
              newDiv.className =
                "absolute w-full h-full flex items-center justify-center";
              newDiv.innerText = newText;
              textContainerRef.current.appendChild(newDiv);
              activeTextRef.current = newDiv;

              const yOffset = isForward ? 30 : -30;

              gsap.fromTo(
                newDiv,
                { y: yOffset },
                { y: 0, duration: 0.5, ease: "power3.out" },
              );
              if (oldDiv) {
                gsap.to(oldDiv, {
                  y: -yOffset,
                  duration: 0.5,
                  ease: "power3.out",
                  onComplete: () => {
                    if (oldDiv.parentNode) {
                      oldDiv.parentNode.removeChild(oldDiv);
                    }
                  },
                });
              }
            }
          }
        }

        planes.forEach((plane, i) => {
          // Position
          let x = i * spacing - scrollOffset;

          // Wrap
          x = ((x % totalWidth) + totalWidth) % totalWidth;
          if (x > totalWidth / 2) x -= totalWidth;

          plane.position.x = x;

          // Zoom
          const dist = Math.abs(x);
          const maxDist = frustumWidth;
          const norm = Math.min(dist / maxDist, 1);

          const arc = Math.cos(norm * Math.PI * 0.5);

          const targetZoom = reduce ? 1 : 1 + (1 - arc) * liveViewportConfig.zoomFactor;

          plane.material.uniforms.uZoom.value = targetZoom;
        });

        renderer.render(scene, camera);
      },
    });

    const gate = createVisibilityGate({
      root: container,
      onChange: (active: boolean) => {
        if (active) {
          if (!isSnapping) {
            lenis?.start?.();
          }
          loop.start();
        } else {
          lenis?.stop?.();
          loop.stop();
        }
      },
    });

    if (gate.isActive) {
      loop.start();
    } else {
      lenis?.stop?.();
    }

    // Keep the canvas matched to the viewport (rotation, mobile address bar,
    // device-preview resizes) - otherwise the renderer keeps its mount-time
    // size and the centred image drifts off-centre.
    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      loop.destroy();
      gate.destroy();
      if (snapTimeout) clearTimeout(snapTimeout);
      gsap.killTweensOf(snapObj);
      // renderer.dispose() does not free per-mesh GPU resources - each
      // plane's geometry, shader material, and texture must go explicitly
      // or they leak on every unmount.
      planes.forEach((plane) => {
        plane.geometry.dispose();
        plane.material.uniforms.uTexture.value?.dispose?.();
        plane.material.dispose();
        scene.remove(plane);
      });
      planes = [];
      renderer.dispose();
      container.removeChild(renderer.domElement);
      lenis.destroy();
    };
    // zoomFactor is only read here to size the initial scene (currentRadius,
    // viewportConfig); live zoom changes are already synced imperatively via
    // controlsRef.current.zoomFactor inside the RAF loop. Depending on it here
    // would tear down and rebuild the whole WebGL scene on every zoom change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const scrollHeight = items.length * 100; // 100vh per image for smooth infinite scrolling

  return (
    <div className="w-full bg-black" style={{ height: `${scrollHeight}vh` }}>
      <div
        ref={containerRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        {showCaption && (
          <div
            ref={textContainerRef}
            data-active-text={items[0].description}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-lg uppercase tracking-[0.2em] z-20 pointer-events-none mix-blend-difference overflow-hidden h-7.5 w-50 max-lg:h-9 max-lg:w-70 max-lg:text-xl max-md:h-12 max-md:w-[84vw] max-md:text-base"
          >
            <div
              ref={activeTextRef}
              className="absolute w-full h-full flex items-center justify-center"
            >
              {items[0].description}
            </div>
          </div>
        )}
        <div
          ref={circleRef}
          className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none z-10"
          style={{ transform: "translate(-50%, -50%) rotate(0deg)" }}
        >
          {items.map((item, i) => {
            const angle = i * (360 / items.length);
            return (
              <div
                key={i}
                className="absolute h-9 w-7 -ml-3.5 -mt-4.5 max-lg:h-12 max-lg:w-9 max-lg:-ml-4.5 max-lg:-mt-6 max-md:h-9 max-md:w-7 max-md:-ml-3.5 max-md:-mt-4.5"
                style={{
                  transform: `rotate(${angle}deg) translateY(var(--radius, -35vh)) rotate(calc(-${angle}deg - var(--rotation, 0deg)))`,
                }}
              >
                {/* Plain <img> so no next.config images.remotePatterns is needed.
 crossOrigin matches the WebGL texture request, so the browser cache
 entry is CORS-enabled for both. */}
                <Image
                  src={item.url}
                  crossOrigin="anonymous"
                  alt={item.description}
                  className="absolute inset-0 w-full h-full object-cover"
                  fill
                  sizes="100vw"
                  loading="eager"
                />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// Images load straight from the Vault asset bucket. It serves
// Access-Control-Allow-Origin: *, so they work as WebGL textures with
// crossOrigin="anonymous" - no proxy route or next.config needed.
const B = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images";

const items = [
  { url: `${B}/h-01.jpg`, description: "PORTFOLIO 01" },
  { url: `${B}/h-02.jpg`, description: "PORTFOLIO 02" },
  { url: `${B}/h-03.jpg`, description: "PORTFOLIO 03" },
  { url: `${B}/h-05.jpg`, description: "PORTFOLIO 04" },
  { url: `${B}/h-06.jpg`, description: "PORTFOLIO 05" },
  { url: `${B}/v-10.jpg`, description: "PORTFOLIO 06" },
  { url: `${B}/h-08.jpg`, description: "PORTFOLIO 07" },
  { url: `${B}/h-09.jpg`, description: "PORTFOLIO 08" },
  { url: `${B}/h-10.jpg`, description: "PORTFOLIO 09" },
  { url: `${B}/h-11.jpg`, description: "PORTFOLIO 10" },
  { url: `${B}/h-12.jpg`, description: "PORTFOLIO 11" },
  { url: `${B}/h-13.jpg`, description: "PORTFOLIO 12" },
  { url: `${B}/h-14.jpg`, description: "PORTFOLIO 13" },
  { url: `${B}/h-28.png`, description: "PORTFOLIO 14" },
  { url: `${B}/h-16.jpg`, description: "PORTFOLIO 15" },
  { url: `${B}/v-02.jpg`, description: "PORTFOLIO 16" },
  { url: `${B}/v-03.jpg`, description: "PORTFOLIO 17" },
  { url: `${B}/v-04.jpg`, description: "PORTFOLIO 18" },
  { url: `${B}/h-19.jpg`, description: "PORTFOLIO 19" },
  { url: `${B}/h-20.jpg`, description: "PORTFOLIO 20" },
  { url: `${B}/h-21.jpg`, description: "PORTFOLIO 21" },
];

export default function PortfolioSlider3D({
  zoomFactor = 1,
  scrollSpeed = 0.01,
  showCaption = true,
}) {
  return (
    <PortfolioSlider
      items={items}
      zoomFactor={zoomFactor}
      scrollSpeed={scrollSpeed}
      showCaption={showCaption}
    />
  )
}
