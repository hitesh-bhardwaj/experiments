// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

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

// True when the user has asked the OS to minimise animation. Safe to call
// during render - returns false on the server.
function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

const ImageDistortionVertex = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ImageDistortionFragment = `
  uniform sampler2D u_texture0;
  uniform sampler2D u_texture1;
  uniform sampler2D u_displacement;
  uniform float u_progress;
  uniform float u_strength;
  uniform float u_rgbShift;
  uniform float u_scale;
  uniform vec2 u_resolution;
  uniform vec2 u_textureResolution0;
  uniform vec2 u_textureResolution1;

  varying vec2 vUv;

  vec2 coverUV(vec2 uv, vec2 planeRes, vec2 texRes) {
    float scale = max(planeRes.x / texRes.x, planeRes.y / texRes.y);
    vec2 newSize = texRes * scale;
    return uv * (planeRes / newSize) + (newSize - planeRes) / 2.0 / newSize;
  }

  void main() {
    float disp = texture2D(u_displacement, vUv).r;

    disp = mix(
      disp,
      disp * (sin(vUv.y * 10.0 + u_progress * 6.28) * 0.5 + 0.5),
      0.3
    );

    vec2 uv0 = coverUV(vUv, u_resolution, u_textureResolution0);
    vec2 uv1 = coverUV(vUv, u_resolution, u_textureResolution1);

    float scaleEffect = 1.0 + u_progress * (1.0 - u_progress) * u_scale;
    vec2 center = vec2(0.5);

    vec2 distortedUV0 =
      (uv0 - center) / scaleEffect +
      center +
      u_progress * disp * u_strength * vec2(1.0, 0.5);

    vec2 distortedUV1 =
      (uv1 - center) * scaleEffect +
      center -
      (1.0 - u_progress) * disp * u_strength * vec2(1.0, 0.5);

    float rgbOffset = u_progress * (1.0 - u_progress) * u_rgbShift;

    vec4 tex0 = vec4(
      texture2D(u_texture0, distortedUV0 + vec2(rgbOffset, 0.0)).r,
      texture2D(u_texture0, distortedUV0).g,
      texture2D(u_texture0, distortedUV0 - vec2(rgbOffset, 0.0)).b,
      texture2D(u_texture0, distortedUV0).a
    );

    vec4 tex1 = vec4(
      texture2D(u_texture1, distortedUV1 + vec2(rgbOffset, 0.0)).r,
      texture2D(u_texture1, distortedUV1).g,
      texture2D(u_texture1, distortedUV1 - vec2(rgbOffset, 0.0)).b,
      texture2D(u_texture1, distortedUV1).a
    );

    gl_FragColor = mix(tex0, tex1, smoothstep(0.0, 1.0, u_progress));
  }
`;

const DEFAULT_SECTIONS = [
  {
    text: "SHADOW",
    src: "https://picsum.photos/seed/h02/1600/1200",
  },
  {
    text: "FLOWER",
    src: "https://picsum.photos/seed/h03/1600/1200",
  },
  {
    text: "RUN",
    src: "https://picsum.photos/seed/h05/1600/1200",
  },
];

const DEFAULT_SHADER_CONFIG = {
  strength: 0.8,
  rgbShift: 0.05,
  scale: 0.15,
  transitionDuration: 1.25,
  transitionEase: "power3.inOut",
};
const EMPTY_SHADER_CONFIG: ScrollDistortionShaderConfig = {};

const MAX_PIXEL_RATIO = 2;
const WHEEL_THRESHOLD = 75;
const TOUCH_THRESHOLD = 45;
const TEXT_STAGGER = 0.035;
const TEXT_DURATION = 0.7;

function resolveImageSource(source: any): any {
  if (typeof source === "string") return source;
  if (source?.src) return source.src;

  return source;
}

function loadCorsObjectUrl(source: any): Promise<string> {
  const imageSource = resolveImageSource(source);

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
        `Unable to load scroll distortion texture: ${imageSource}. Current origin is ${window.location.origin}. Make sure R2 allows this exact origin. ${error?.message || ""}`
      );
    });
}

function createTextureFromImage(imageElement: HTMLImageElement) {
  const texture = new THREE.Texture(imageElement);

  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

interface ScrollDistortionSection {
  text: string;
  src: string;
}

interface ScrollDistortionShaderConfig {
  strength?: number;
  rgbShift?: number;
  scale?: number;
  transitionDuration?: number;
  transitionEase?: string;
}

interface ScrollDistortionProps {
  sections?: ScrollDistortionSection[];
  shaderConfig?: ScrollDistortionShaderConfig;
  displacementSrc?: string;
  distortionStrength?: number;
  rgbShift?: number;
  distortionScale?: number;
  transitionDuration?: number;
  transitionEase?: string;
}

export default function ScrollDistortion({
  sections = DEFAULT_SECTIONS,
  distortionStrength,
  rgbShift,
  distortionScale,
  transitionDuration,
  transitionEase,
  shaderConfig = EMPTY_SHADER_CONFIG,
  displacementSrc = "https://picsum.photos/seed/distortionnoise/1600/1200",
}: ScrollDistortionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const textRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const textTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const [objectUrls, setObjectUrls] = useState<string[] | null>(null);
  const [decodedUrls, setDecodedUrls] = useState<Set<string>>(() => new Set());
  const [isSceneReady, setIsSceneReady] = useState(false);

  const currentIndexRef = useRef(0);
  const targetIndexRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const wheelDeltaRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  const splitSections = useMemo(() => {
    return sections.map((section) => ({
      ...section,
      chars: section.text.split(""),
    }));
  }, [sections]);

  useEffect(() => {
    let isCancelled = false;
    let nextObjectUrls: string[] = [];

    currentIndexRef.current = 0;
    targetIndexRef.current = 0;
    isTransitioningRef.current = false;
    wheelDeltaRef.current = 0;
    touchStartYRef.current = null;

    Promise.all([
      ...sections.map((section) => loadCorsObjectUrl(section.src)),
      loadCorsObjectUrl(displacementSrc),
    ])
      .then((urls) => {
        nextObjectUrls = urls;

        if (!isCancelled) {
          setDecodedUrls(new Set());
          setIsSceneReady(false);
          setObjectUrls(urls);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.warn(error?.message || error);
        }
      });

    return () => {
      isCancelled = true;
      nextObjectUrls.forEach((url) => URL.revokeObjectURL(url));
      // Clear on cleanup, not on mount: clearing on mount wipes refs that were
      // just attached, and memoized ref callbacks (React Compiler) never re-run
      // to refill them, so the text could never be found or hidden.
      textRefs.current = [];
      imageRefs.current = [];
    };
  }, [sections]);

  const areImagesDecoded =
    objectUrls?.length === sections.length + 1 &&
    objectUrls.every((url) => decodedUrls.has(url));

  const markImageDecoded = (url: string | undefined) => {
    if (!url) return;

    setDecodedUrls((currentUrls) => {
      if (currentUrls.has(url)) return currentUrls;

      const nextUrls = new Set(currentUrls);
      nextUrls.add(url);

      return nextUrls;
    });
  };

  useEffect(() => {
    const containerElement = containerRef.current;

    if (!containerElement || sections.length === 0 || !areImagesDecoded) {
      return undefined;
    }

    const reducedMotion = prefersReducedMotion();

    const config = {
      ...DEFAULT_SHADER_CONFIG,
      ...shaderConfig,
      ...(distortionStrength !== undefined ? { strength: distortionStrength } : {}),
      ...(rgbShift !== undefined ? { rgbShift } : {}),
      ...(distortionScale !== undefined ? { scale: distortionScale } : {}),
      ...(transitionDuration !== undefined
        ? { transitionDuration }
        : {}),
      ...(transitionEase !== undefined ? { transitionEase } : {}),
      // Reduced motion: zero out the displacement/RGB-shift/scale warp -
      // the shader still runs the same u_progress tween, but with these at
      // 0 the distortion terms drop out and it's left with a plain
      // mix(tex0, tex1, smoothstep(progress)) crossfade.
      ...(reducedMotion ? { strength: 0, rgbShift: 0, scale: 0 } : {}),
    };

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      -1,
      1
    );

    const geometry = new THREE.PlaneGeometry(width, height);

    const textures = (
      imageRefs.current.slice(0, sections.length).filter(Boolean) as HTMLImageElement[]
    ).map(createTextureFromImage);

    const displacementImage = imageRefs.current[sections.length];

    if (textures.length === 0 || !displacementImage) {
      geometry.dispose();
      renderer.dispose();
      return undefined;
    }

    const displacementTexture = createTextureFromImage(displacementImage);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

    containerElement.replaceChildren(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_texture0: {
          value: textures[0],
        },
        u_texture1: {
          value: textures[0],
        },
        u_displacement: {
          value: displacementTexture,
        },
        u_progress: {
          value: 0,
        },
        u_resolution: {
          value: new THREE.Vector2(width, height),
        },
        u_textureResolution0: {
          value: new THREE.Vector2(1, 1),
        },
        u_textureResolution1: {
          value: new THREE.Vector2(1, 1),
        },
        u_strength: {
          value: config.strength,
        },
        u_rgbShift: {
          value: config.rgbShift,
        },
        u_scale: {
          value: config.scale,
        },
      },
      vertexShader: ImageDistortionVertex,
      fragmentShader: ImageDistortionFragment,
      transparent: true,
    });

    const setTextureResolution = (
      uniformIndex: number,
      texture: THREE.Texture<HTMLImageElement>
    ) => {
      if (!texture?.image) return;

      material.uniforms[`u_textureResolution${uniformIndex}`].value.set(
        texture.image.width,
        texture.image.height
      );
    };

    setTextureResolution(0, textures[0]);
    setTextureResolution(1, textures[0]);

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const getTextChars = (index: number) => {
      return (textRefs.current[index] || []).filter(Boolean) as HTMLSpanElement[];
    };

    const getAllTextChars = () => {
      return textRefs.current.flat().filter(Boolean) as HTMLSpanElement[];
    };

    const resetTextState = () => {
      const allChars = getAllTextChars();
      const firstChars = getTextChars(0);

      textTimelineRef.current?.kill();
      textTimelineRef.current = null;

      gsap.killTweensOf(allChars);
      gsap.set(".text-container", { opacity: 1 });

      // Reduced motion: no vertical slide at all - chars stay put, only
      // autoAlpha (opacity) ever changes.
      gsap.set(allChars, {
        yPercent: reducedMotion ? 0 : 100,
        autoAlpha: 0,
        visibility: "hidden",
        force3D: true,
      });

      gsap.set(firstChars, {
        yPercent: 0,
        autoAlpha: 1,
        visibility: "visible",
        force3D: true,
      });
    };

    resetTextState();

    const animateTextTransition = (
      fromIndex: number,
      toIndex: number,
      direction: number
    ) => {
      const fromChars = getTextChars(fromIndex);
      const toChars = getTextChars(toIndex);
      const allChars = getAllTextChars();

      if (!fromChars.length || !toChars.length) return null;

      const outgoingY = direction > 0 ? -105 : 105;
      const incomingY = direction > 0 ? 105 : -105;

      textTimelineRef.current?.kill();
      gsap.killTweensOf(allChars);

      const fromSet = new Set(fromChars);
      const toSet = new Set(toChars);

      const otherChars = allChars.filter((char) => {
        return !fromSet.has(char) && !toSet.has(char);
      });

      gsap.set(otherChars, {
        yPercent: reducedMotion ? 0 : 100,
        autoAlpha: 0,
        visibility: "hidden",
        force3D: true,
      });

      gsap.set(fromChars, {
        yPercent: 0,
        autoAlpha: 1,
        visibility: "visible",
        force3D: true,
      });

      gsap.set(toChars, {
        yPercent: reducedMotion ? 0 : incomingY,
        autoAlpha: reducedMotion ? 0 : 1,
        visibility: "visible",
        force3D: true,
      });

      const timeline = gsap.timeline({
        defaults: {
          ease: "power3.inOut",
        },
        onComplete: () => {
          gsap.set(fromChars, {
            autoAlpha: 0,
            visibility: "hidden",
          });

          gsap.set(toChars, {
            yPercent: 0,
            autoAlpha: 1,
            visibility: "visible",
          });

          textTimelineRef.current = null;
        },
      });

      // Reduced motion: plain crossfade, no vertical slide and no
      // per-char stagger.
      if (reducedMotion) {
        timeline.to(fromChars, { autoAlpha: 0, duration: TEXT_DURATION }, 0);
        timeline.to(toChars, { autoAlpha: 1, duration: TEXT_DURATION }, 0);
      } else {
        timeline.to(
          fromChars,
          {
            yPercent: outgoingY,
            autoAlpha: 0,
            duration: TEXT_DURATION,
            stagger: {
              each: TEXT_STAGGER,
              from: "start",
            },
          },
          0
        );

        timeline.to(
          toChars,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: TEXT_DURATION,
            stagger: {
              each: TEXT_STAGGER,
              from: "start",
            },
          },
          0.06
        );
      }

      textTimelineRef.current = timeline;

      return timeline;
    };

    const transitionTo = (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= textures.length) {
        return;
      }

      const currentIndex = currentIndexRef.current;

      if (nextIndex === currentIndex) {
        return;
      }

      targetIndexRef.current = nextIndex;

      if (isTransitioningRef.current) {
        return;
      }

      isTransitioningRef.current = true;

      const direction = nextIndex > currentIndex ? 1 : -1;

      material.uniforms.u_texture0.value = textures[currentIndex];
      material.uniforms.u_texture1.value = textures[nextIndex];

      setTextureResolution(0, textures[currentIndex]);
      setTextureResolution(1, textures[nextIndex]);

      material.uniforms.u_progress.value = 0;

      animateTextTransition(currentIndex, nextIndex, direction);

      gsap.to(material.uniforms.u_progress, {
        value: 1,
        duration: config.transitionDuration,
        ease: config.transitionEase,
        overwrite: true,
        onComplete: () => {
          material.uniforms.u_texture0.value = textures[nextIndex];
          setTextureResolution(0, textures[nextIndex]);
          material.uniforms.u_progress.value = 0;

          currentIndexRef.current = nextIndex;
          isTransitioningRef.current = false;

          const finalChars = getTextChars(nextIndex);

          gsap.set(finalChars, {
            yPercent: 0,
            autoAlpha: 1,
            visibility: "visible",
          });

          if (targetIndexRef.current !== currentIndexRef.current) {
            transitionTo(targetIndexRef.current);
          }
        },
      });
    };

    const goNext = () => {
      const nextIndex = Math.min(
        currentIndexRef.current + 1,
        sections.length - 1
      );

      transitionTo(nextIndex);
    };

    const goPrev = () => {
      const nextIndex = Math.max(currentIndexRef.current - 1, 0);

      transitionTo(nextIndex);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      wheelDeltaRef.current += event.deltaY;

      if (Math.abs(wheelDeltaRef.current) < WHEEL_THRESHOLD) {
        return;
      }

      if (wheelDeltaRef.current > 0) {
        goNext();
      } else {
        goPrev();
      }

      wheelDeltaRef.current = 0;
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (touchStartYRef.current === null) return;

      const currentY = event.touches[0].clientY;
      const delta = touchStartYRef.current - currentY;

      if (Math.abs(delta) < TOUCH_THRESHOLD) return;

      if (delta > 0) {
        goNext();
      } else {
        goPrev();
      }

      touchStartYRef.current = currentY;
    };

    const loop = createSuspendedRaf({
      root: containerElement,
      onFrame: () => {
        renderer.render(scene, camera);
      },
    });

    loop.start();
    setIsSceneReady(true);

    const onResize = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;

      renderer.setSize(nextWidth, nextHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

      camera.left = -nextWidth / 2;
      camera.right = nextWidth / 2;
      camera.top = nextHeight / 2;
      camera.bottom = -nextHeight / 2;
      camera.updateProjectionMatrix();

      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(nextWidth, nextHeight);

      material.uniforms.u_resolution.value.set(nextWidth, nextHeight);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("resize", onResize);

    const textRefGroups = textRefs.current;

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);

      loop.destroy();

      textTimelineRef.current?.kill();
      textTimelineRef.current = null;

      gsap.killTweensOf(material.uniforms.u_progress);

      textRefGroups.forEach((chars) => {
        gsap.killTweensOf(chars);
      });

      scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
      displacementTexture.dispose();
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      containerElement.replaceChildren();
    };
  }, [
    areImagesDecoded,
    sections,
    shaderConfig,
    displacementSrc,
    distortionStrength,
    rgbShift,
    distortionScale,
    transitionDuration,
    transitionEase,
  ]);

  return (
    <section className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
      <div className="hidden">
        {objectUrls?.slice(0, sections.length).map((url, index) => (
          <div key={`${resolveImageSource(sections[index]?.src)}-${index}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={(element) => {
                imageRefs.current[index] = element;

                if (element?.complete && element.naturalWidth > 0) {
                  markImageDecoded(url);
                }
              }}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              src={url}
              onLoad={() => markImageDecoded(url)}
              alt="asset-image"
            />
          </div>
        ))}

        {objectUrls?.[sections.length] && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            ref={(element) => {
              imageRefs.current[sections.length] = element;

              if (element?.complete && element.naturalWidth > 0) {
                markImageDecoded(objectUrls[sections.length]);
              }
            }}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            src={objectUrls[sections.length]}
            onLoad={() => markImageDecoded(objectUrls[sections.length])}
            alt="asset-image"
          />
        )}
      </div>

      {(objectUrls?.[0] || sections[0]?.src) && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isSceneReady ? "opacity-0" : "opacity-100"
          }`}
          src={objectUrls?.[0] || resolveImageSource(sections[0].src)}
          alt="asset-image"
          decoding="async"
        />
      )}

      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden text-container opacity-0">
        {splitSections.map((section, sectionIndex) => (
          <h1
            key={`${section.text}-${sectionIndex}`}
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 text-[10vw] leading-none text-white"
            aria-label={section.text}
          >
            {section.chars.map((char, charIndex) => (
              <span
                key={`${section.text}-${charIndex}`}
                className="inline-block overflow-hidden leading-none"
                aria-hidden="true"
              >
                <span
                  ref={(element) => {
                    if (!textRefs.current[sectionIndex]) {
                      textRefs.current[sectionIndex] = [];
                    }

                    textRefs.current[sectionIndex][charIndex] = element;
                  }}
                  className="inline-block will-change-transform"
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              </span>
            ))}
          </h1>
        ))}
      </div>
    </section>
  );
}
