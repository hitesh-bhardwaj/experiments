// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { add, length, mul, oneMinus, sub, texture, uniform, uv } from "three/tsl";
import * as THREE from "three/webgpu";

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

const DEFAULT_IMAGE_SRC =
  'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg'

const damp = (current: number, target: number, lambda: number, delta: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * delta))

const durationToDamp = (duration: number) => {
  const seconds = Math.max(Number(duration) || 0, 0)
  return seconds === 0 ? 1000 : 1 / seconds
}

function loadCorsObjectUrl(src: string): Promise<string> {
  return fetch(src, { mode: 'cors', credentials: 'omit', cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(`Image request failed with ${res.status}`)
      return res.blob()
    })
    .then((blob) => URL.createObjectURL(blob))
}

interface ImageNodeMaterialProps {
  src: string
  isMobile: boolean
  bulgeEffect: number
  duration: number
  smoothness: number
  mouseInteractive: boolean
}

function ImageNodeMaterial({
  src,
  isMobile,
  bulgeEffect,
  duration,
  smoothness,
  mouseInteractive,
}: ImageNodeMaterialProps) {
  const sourceMap = useTexture(src) as THREE.Texture
  const { size, camera } = useThree()

  const height =
    2 * Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180 / 2) * camera.position.z

  const width = height * (size.width / size.height)

  const mouse = useRef(new THREE.Vector2(0.5, 0.5))
  const target = useRef(new THREE.Vector2(0.5, 0.5))
  const strength = useRef(0)
  const strengthTarget = useRef(0)
  const materialRef = useRef<any>(null)

  const map = useMemo(() => {
    const clonedMap = sourceMap.clone()
    clonedMap.colorSpace = THREE.SRGBColorSpace
    clonedMap.needsUpdate = true
    return clonedMap
  }, [sourceMap])

  useEffect(() => {
    return () => {
      map.dispose()
    }
  }, [map])

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicNodeMaterial()

    const mouseU = uniform(new THREE.Vector2(0.5, 0.5))
    const strengthU = uniform(0)

    const baseUV = uv()
    const diff = sub(baseUV, mouseU)
    const dist = length(diff)

    const falloff = oneMinus(dist).pow(2)

    const displacement = mul(diff, falloff).mul(strengthU.negate())

    const distortedUV = add(baseUV, displacement)

    mat.colorNode = texture(map, distortedUV)

    mat.userData.mouseU = mouseU
    mat.userData.strengthU = strengthU

    return mat
  }, [map])

  useEffect(() => {
    materialRef.current = material
    return () => {
      materialRef.current = null
    }
  }, [material])

  useFrame((_, delta) => {
    const currentMaterial = materialRef.current
    if (!currentMaterial) return

    const canInteract = !isMobile && mouseInteractive
    const mouseDamp = durationToDamp(smoothness)
    const strengthDamp = durationToDamp(duration)

    if (!canInteract) {
      target.current.set(0.5, 0.5)
      strengthTarget.current = 0
    } else if (strengthTarget.current > 0) {
      strengthTarget.current = Math.max(Number(bulgeEffect) || 0, 0)
    }

    if (!isMobile) {
      mouse.current.x = damp(mouse.current.x, target.current.x, mouseDamp, delta)
      mouse.current.y = damp(mouse.current.y, target.current.y, mouseDamp, delta)

      strength.current = damp(
        strength.current,
        strengthTarget.current,
        strengthDamp,
        delta
      )
    }

    currentMaterial.userData.mouseU.value.copy(mouse.current)
    currentMaterial.userData.strengthU.value = isMobile ? 0 : strength.current
  })

  return (
    <mesh
      material={material}
      onPointerMove={
        isMobile || !mouseInteractive
          ? undefined
          : (e: ThreeEvent<PointerEvent>) => {
              if (!e.uv) return
              target.current.copy(e.uv)
              strengthTarget.current = Math.max(Number(bulgeEffect) || 0, 0)
            }
      }
      onPointerLeave={
        isMobile || !mouseInteractive
          ? undefined
          : () => {
              target.current.set(0.5, 0.5)
              strengthTarget.current = 0
            }
      }
    >
      <planeGeometry args={[width, height]} />
    </mesh>
  )
}

interface FishEyeProps {
  bulgeEffect?: number
  duration?: number
  smoothness?: number
  mouseInteractive?: boolean
}

export default function FishEye({
  bulgeEffect = 1,
  duration = 0.125,
  smoothness = 0.083,
  mouseInteractive = true,
}: FishEyeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const update = () => setIsMobile(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (isMobile) return undefined

    let url: string | null = null
    loadCorsObjectUrl(DEFAULT_IMAGE_SRC)
      .then((u) => {
        url = u
        setObjectUrl(u)
      })
      .catch((err) => console.warn('FishEye texture load failed:', err))

    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [isMobile])

  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? 'always' : 'never'),
    })
    setFrameloop(gate.isActive ? 'always' : 'never')
    return () => gate.destroy()
  }, [])

  if (isMobile) return null

  return (
    <div ref={rootRef} className="h-full w-fit">
      {objectUrl ? (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 5], fov: 45 }}
          className="h-full w-full"
          frameloop={frameloop}
          style={{
            pointerEvents: isMobile ? 'none' : 'auto',
            touchAction: isMobile ? 'none' : 'auto',
          }}
          gl={({ canvas }: any) => {
            const renderer = new THREE.WebGPURenderer({
              canvas,
              antialias: true,
            })

            renderer.outputColorSpace = THREE.SRGBColorSpace
            renderer.toneMapping = THREE.NoToneMapping
            renderer.init()

            return renderer
          }}
        >
          <ImageNodeMaterial
            src={objectUrl}
            isMobile={isMobile}
            bulgeEffect={bulgeEffect}
            duration={duration}
            smoothness={smoothness}
            mouseInteractive={mouseInteractive}
          />
        </Canvas>
      ) : null}
    </div>
  )
}
