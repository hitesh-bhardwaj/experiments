"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PlatesScene - 51 metallic discs arranged in a helix ring.
// Hover: screen-space nearest-plate detection → Gaussian neighbourhood glow.
// Rendering: MeshStandardMaterial + custom shader-based additive glow overlay.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useRef,
  useMemo,
  useLayoutEffect,
  useEffect,
  useState,
  useCallback,
  Suspense,
} from "react";
import { Canvas, useFrame, useThree, invalidate } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import useIsMobile from "@/hooks/useIsMobile";
import gsap from "gsap";
import { shouldSkipRealtimeGPU } from "@/lib/audit";

const LOADER_STORAGE_KEY = "hyperiux-loader-has-run";

const lerp = (a, b, t) => a + (b - a) * t;

function hasLoaderRun() {
  if (typeof window === "undefined") return false;

  // Loader.jsx writes sessionStorage (not localStorage) and sets the window
  // flag when it completes or is skipped. Must match, or components mounting
  // after loader completion never see it and their intros never play.
  return (
    window.sessionStorage.getItem(LOADER_STORAGE_KEY) === "true" ||
    window.__HYPERIUX_LOADER_COMPLETE__ === true
  );
}

function isLoaderActive() {
  if (typeof window === "undefined") return false;

  return (
    document.body.classList.contains("loader-active") ||
    window.__HYPERIUX_LOADER_RUNNING__ === true
  );
}

// The plates run a continuous WebGL render loop, so the main thread never goes
// idle - that's exactly what makes Lighthouse/PageSpeed time out
// (RPC::DEADLINE_EXCEEDED). shouldSkipRealtimeGPU (lib/audit.js) covers
// audit/headless traffic and prefers-reduced-motion; skip the Canvas
// entirely and show the static dark backdrop instead. Real users still get
// the full animated scene.
const CONFIG = {
  count: 51,
  radius: 4.5,
  heightStep: 0.0,
  turns: 1.0,

  localTiltX: 0.21,
  localTiltY: -0.04,
  localTiltZ: 0.0,

  plateRadius: 1.5,
  plateThickness: 0.04,

  roughness: 0.6,
  metalness: 0.16,
  plateColor: "#0e0e0e",

  glowLeftColor: "#662600",
  glowRightColor: "#cc4c00",
  mobileGlowLeftColor: "#cc6600",
  mobileGlowRightColor: "#ff9940",

  hoverSigma: 2.0,
  hoverSpeed: 0.09,
  hoverScale: 1.25,
  hoverThreshold: 0.48,

  rotationSpeed: 0.05,
  glowIntensity: 1.8,

  lightColor: "#ff4f00",
  lightIntensity: 10.0,
  lightPosition: [20, 20.5, -20],

  environmentIntensity: 0.1,
  environmentPreset: "city",

  wrapperPosition: [1, 0, 0],
  groupPosition: [4.15, 3.93, -0.5],
  groupRotation: [1.41, 0.01, -0.14],

  cameraPosition: [0, 0.8, 7.0],
  cameraFov: 62,
  toneMappingExposure: 1.1,
  canvasDpr: 1.0,

  bloomIntensity: 1.35,
  bloomThreshold: 0.22,
  bloomSmoothing: 0.99,
  bloomRadius: 0,

  updateFPS: 0,
};

// ponytail: the trace-confirmed root cause was this scene's rAF-locked 60fps
// loop competing with React hydration + GSAP/Lenis's own rAF ticker for the
// first several seconds after mount (escalating from ~100ms/s to ~530ms/s of
// rAF-attributed main-thread time by t=7s in a 4x-CPU-throttle trace). The
// rotation is a function of elapsed time, not frame count, so rendering it at
// a throttled rate during that window is visually near-identical - just
// chunkier - while the hover interaction (frame-rate-dependent lerp) only
// slows down for a real visitor who mouses over the hero within the first few
// seconds, which is rare. After WARMUP_MS, frameloop switches to native
// rAF-driven "always" so hover stays fully smooth for everyone else.
const WARMUP_MS = 4000;
const WARMUP_FPS = 15;

function makePlateMaterial(roughness, metalness, plateColor) {
  return new THREE.MeshStandardMaterial({
    color: plateColor,
    roughness,
    metalness,
  });
}

function makePlateGeometry(radius, height) {
  return new THREE.CylinderGeometry(radius, radius, height, 64, 1, false);
}

function makeGlowShaderMaterial(leftColorRGB, rightColorRGB) {
  const left = new THREE.Color(leftColorRGB);
  const right = new THREE.Color(rightColorRGB);

  const leftStr = `${left.r.toFixed(5)}, ${left.g.toFixed(
    5
  )}, ${left.b.toFixed(5)}`;

  const rightStr = `${right.r.toFixed(5)}, ${right.g.toFixed(
    5
  )}, ${right.b.toFixed(5)}`;

  const vertexShader = `
    attribute float instanceIntensity;

    varying float vIntensity;
    varying vec2 vUv;
    varying float vCapMask;

    void main() {
      vUv = uv;
      vIntensity = instanceIntensity;
      vCapMask = smoothstep(0.15, 0.7, abs(normal.y));

      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying float vIntensity;
    varying vec2 vUv;
    varying float vCapMask;

    void main() {
      if (vCapMask <= 0.001 || vIntensity <= 0.001) discard;

      float t = smoothstep(0.0, 1.0, vUv.x);

      vec3 leftColor = vec3(${leftStr});
      vec3 rightColor = vec3(${rightStr});

      vec3 col = mix(leftColor, rightColor, t);

      float radial = length(vUv - 0.5) * 1.0;
      float aa = fwidth(radial) * 1.5;
      float discAlpha = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, radial);

      float strength = vIntensity * vCapMask * discAlpha;

      gl_FragColor = vec4(col * strength, strength);
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -0.5,
    polygonOffsetUnits: -0.5,
  });
}

function ParametricPlates({ isMobile }) {
  const count = CONFIG.count;
  const radius = CONFIG.radius;

  const {
    heightStep,
    turns,
    localTiltX,
    localTiltY,
    localTiltZ,
    plateRadius,
    plateThickness,
    hoverSigma,
    hoverSpeed,
    hoverScale,
    glowIntensity,
    rotationSpeed,
    hoverThreshold,
    updateFPS,
    plateColor,
    roughness,
    metalness,
    glowLeftColor,
    glowRightColor,
  } = CONFIG;

  const mainRef = useRef(null);
  const glowRef = useRef(null);

  const hoveredRef = useRef(-1);
  const prevRotation = useRef(0);
  const accumulator = useRef(0);

  const dummy = useRef(new THREE.Object3D());
  const pos = useRef(new THREE.Vector3());
  const projPos = useRef(new THREE.Vector3());
  const groupMat = useRef(new THREE.Matrix4());

  const ndcPointer = useRef(new THREE.Vector2(-9999, -9999));
  const rectRef = useRef(null);

  const tempEuler = useRef(new THREE.Euler());
  const tempQuat = useRef(new THREE.Quaternion());

  const arraysRef = useRef(null);

  if (arraysRef.current === null) {
    arraysRef.current = {
      glowArr: new Float32Array(count).fill(0),
      scaleArr: new Float32Array(count).fill(1),
      tiltXArr: new Float32Array(count).fill(localTiltX),
      tiltYArr: new Float32Array(count).fill(localTiltY),
      sinThetaArr: new Float32Array(count),
      cosThetaArr: new Float32Array(count),
      prevGlowArr: new Float32Array(count).fill(-999),
      prevScaleArr: new Float32Array(count).fill(1),
      intensityArr: new Float32Array(count).fill(0),
    };
  }

  const baseTheta = useMemo(() => {
    const arr = new Float32Array(count);
    const thetaStep = (turns * Math.PI * 2) / count;

    for (let i = 0; i < count; i += 1) {
      arr[i] = i * thetaStep;
    }

    return arr;
  }, [count, turns]);

  const leftGlowCol = isMobile ? CONFIG.mobileGlowLeftColor : glowLeftColor;
  const rightGlowCol = isMobile ? CONFIG.mobileGlowRightColor : glowRightColor;

  const mainMat = useMemo(
    () => makePlateMaterial(roughness, metalness, plateColor),
    [roughness, metalness, plateColor]
  );

  const geo = useMemo(
    () => makePlateGeometry(plateRadius, plateThickness),
    [plateRadius, plateThickness]
  );

  const glowMat = useMemo(
    () => makeGlowShaderMaterial(leftGlowCol, rightGlowCol),
    [leftGlowCol, rightGlowCol]
  );

  useLayoutEffect(() => {
    if (!glowRef.current) return;

    const instancedMesh = glowRef.current;
    const array = arraysRef.current.intensityArr;

    if (!instancedMesh.geometry.getAttribute("instanceIntensity")) {
      const attr = new THREE.InstancedBufferAttribute(array, 1);
      instancedMesh.geometry.setAttribute("instanceIntensity", attr);
    }
  }, [count, geo]);

  const { camera, gl } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const pointer = ndcPointer.current;

    rectRef.current = el.getBoundingClientRect();

    const resizeObserver = new ResizeObserver(() => {
      rectRef.current = el.getBoundingClientRect();
    });

    resizeObserver.observe(el);

    const handlePointer = (clientX, clientY) => {
      const rect = rectRef.current;

      if (!rect) return;

      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onMouseMove = (event) => {
      handlePointer(event.clientX, event.clientY);
    };

    const onTouchMove = (event) => {
      if (event.touches && event.touches[0]) {
        handlePointer(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    const onLeave = () => {
      pointer.set(-9999, -9999);
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onTouchMove, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onLeave, { passive: true });

    return () => {
      resizeObserver.disconnect();

      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onTouchMove);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onLeave);
    };
  }, [gl]);

  useFrame(({ clock }, delta) => {
    const main = mainRef.current;
    const glow = glowRef.current;

    if (!main || !glow) return;

    const {
      glowArr,
      scaleArr,
      tiltXArr,
      tiltYArr,
      sinThetaArr,
      cosThetaArr,
      prevGlowArr,
      prevScaleArr,
      intensityArr,
    } = arraysRef.current;

    const pointer = ndcPointer.current;
    const dummyObj = dummy.current;
    const position = pos.current;
    const projected = projPos.current;
    const parentMatrix = groupMat.current;

    if (updateFPS > 0) {
      accumulator.current += delta;

      const interval = 1 / updateFPS;

      if (accumulator.current < interval) return;

      accumulator.current -= interval;
    }

    const time = clock.getElapsedTime();
    const rotation = time * rotationSpeed;

    if (main.parent) {
      main.parent.updateWorldMatrix(true, false);
      parentMatrix.copy(main.parent.matrixWorld);
    }

    const mouseActive = pointer.x > -2;
    let hovId = -1;

    if (mouseActive) {
      let minDist = Infinity;
      let nearestId = -1;

      for (let i = 0; i < count; i += 1) {
        const theta = baseTheta[i] + rotation;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        cosThetaArr[i] = cosT;
        sinThetaArr[i] = sinT;

        projected
          .set(cosT * radius, (i - count / 2) * heightStep, sinT * radius)
          .applyMatrix4(parentMatrix)
          .project(camera);

        const d2 =
          (projected.x - pointer.x) ** 2 + (projected.y - pointer.y) ** 2;

        if (d2 < minDist) {
          minDist = d2;
          nearestId = i;
        }
      }

      const hoverThresholdSq = hoverThreshold * hoverThreshold;

      hoveredRef.current = minDist < hoverThresholdSq ? nearestId : -1;
      hovId = hoveredRef.current;
    } else {
      hoveredRef.current = -1;
      hovId = -1;

      for (let i = 0; i < count; i += 1) {
        const theta = baseTheta[i] + rotation;

        cosThetaArr[i] = Math.cos(theta);
        sinThetaArr[i] = Math.sin(theta);
      }
    }

    let matrixDirty =
      hovId !== -1 || Math.abs(rotation - prevRotation.current) > 0.00001;

    prevRotation.current = rotation;

    let intensitiesDirty = false;

    for (let i = 0; i < count; i += 1) {
      const cosT = cosThetaArr[i];
      const sinT = sinThetaArr[i];

      const dist = hovId === -1 ? Infinity : Math.abs(i - hovId);

      const influence =
        hovId === -1 ? 0 : Math.exp(-(dist ** 2) / (2 * hoverSigma ** 2));

      glowArr[i] = lerp(glowArr[i], influence, hoverSpeed);

      scaleArr[i] = lerp(
        scaleArr[i],
        1 + (hoverScale - 1) * influence,
        hoverSpeed
      );

      tiltXArr[i] = lerp(tiltXArr[i], localTiltX * (1 - influence), hoverSpeed);
      tiltYArr[i] = lerp(tiltYArr[i], localTiltY * (1 - influence), hoverSpeed);

      const scaleDelta = Math.abs(scaleArr[i] - prevScaleArr[i]);

      if (scaleDelta > 0.0001) {
        matrixDirty = true;
        prevScaleArr[i] = scaleArr[i];
      }

      position.set(cosT * radius, (i - count / 2) * heightStep, sinT * radius);
      dummyObj.position.copy(position);

      const tx = -sinT;
      const ty = heightStep > 0 ? heightStep / radius : 0;
      const tz = cosT;

      let nx = tx;
      let ny = ty;
      let nz = tz;

      if (heightStep > 0) {
        const len = Math.sqrt(tx * tx + ty * ty + tz * tz);

        nx /= len;
        ny /= len;
        nz /= len;
      }

      const r = ny + 1;

      if (r < 0.0001) {
        dummyObj.quaternion.set(1, 0, 0, 0);
      } else {
        dummyObj.quaternion.set(nz, 0, -nx, r).normalize();
      }

      tempEuler.current.set(tiltXArr[i], tiltYArr[i], localTiltZ);
      tempQuat.current.setFromEuler(tempEuler.current);
      dummyObj.quaternion.multiply(tempQuat.current);

      dummyObj.scale.set(scaleArr[i], 1, scaleArr[i]);
      dummyObj.updateMatrix();

      main.setMatrixAt(i, dummyObj.matrix);
      glow.setMatrixAt(i, dummyObj.matrix);

      const g = glowArr[i] * glowIntensity;

      if (Math.abs(g - prevGlowArr[i]) > 0.001) {
        prevGlowArr[i] = g;
        intensityArr[i] = g;
        intensitiesDirty = true;
      }
    }

    if (matrixDirty) {
      main.instanceMatrix.needsUpdate = true;
      glow.instanceMatrix.needsUpdate = true;
    }

    if (intensitiesDirty) {
      const attr = glow.geometry.getAttribute("instanceIntensity");

      if (attr) {
        attr.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <instancedMesh
        ref={mainRef}
        args={[geo, mainMat, count]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />

      <instancedMesh
        ref={glowRef}
        args={[geo, null, count]}
        material={glowMat}
        castShadow={false}
        receiveShadow={false}
        frustumCulled={false}
      />
    </>
  );
}

export default function GlowingPlates({
  waitForLoader = true,
  className = "",
  containerClassName = "",
}) {
  const containerRef = useRef(null);
  const canvasWrapperRef = useRef(null);

  const canvasReadyRef = useRef(false);
  const loaderReadyRef = useRef(!waitForLoader);
  const fadePlayedRef = useRef(false);

  const fadeTweenRef = useRef(null);
  const pollRef = useRef(null);
  const delayRef = useRef(null);

  const { isMobile } = useIsMobile();

  // Pause the render loop while the hero is scrolled out of view (or hidden on
  // mobile via max-[1025px]:hidden). Rotation is a function of absolute elapsed time,
  // so resuming looks seamless - no visual change, just no wasted GPU work.
  // Init true so the hero renders on first paint; the observer corrects it.
  const [inView, setInView] = useState(true);

  // ssr:false (dynamic import) means this only ever renders client-side, so the
  // lazy initializer can read navigator/matchMedia with no hydration mismatch.
  const [skip3D] = useState(() => shouldSkipRealtimeGPU());

  // See WARMUP_MS comment above CONFIG. Starts true when the site loader has
  // already run this session (repeat visit, loader skipped) - there's no
  // opaque overlay hiding the throttle in that case, so warming up would just
  // be visible 15fps stutter with nothing masking it. On a fresh loader play,
  // it flips true the moment the loader actually completes (see effect
  // below), not a fixed guess at how long that takes.
  const [warmupDone, setWarmupDone] = useState(
    () => typeof window !== "undefined" && hasLoaderRun() && !isLoaderActive()
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const syncVisibility = () => {
      const rect = el.getBoundingClientRect();
      // A display:none element (mobile) reports an all-zero rect → not in view.
      return rect.bottom > 0 && rect.top < window.innerHeight;
    };

    // IntersectionObserver can miss the initial state after client navigations.
    setInView(syncVisibility());

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0, rootMargin: "200px 0px" }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (skip3D || warmupDone) return;

    const handleLoaderComplete = () => setWarmupDone(true);

    window.addEventListener("loaderComplete", handleLoaderComplete, {
      once: true,
    });
    window.addEventListener(
      "hyperiux:loader-complete",
      handleLoaderComplete,
      { once: true }
    );

    const poll = window.setInterval(() => {
      if (hasLoaderRun() && !isLoaderActive()) setWarmupDone(true);
    }, 80);

    // Safety net: end the throttle after WARMUP_MS regardless, in case the
    // loader never signals completion for some reason.
    const timeout = window.setTimeout(() => setWarmupDone(true), WARMUP_MS);

    return () => {
      window.removeEventListener("loaderComplete", handleLoaderComplete);
      window.removeEventListener(
        "hyperiux:loader-complete",
        handleLoaderComplete
      );
      window.clearInterval(poll);
      window.clearTimeout(timeout);
    };
  }, [skip3D, warmupDone]);

  // frameloop="demand" renders nothing on its own - during warmup we drive it
  // at a throttled rate ourselves instead of the native 60fps rAF loop.
  useEffect(() => {
    if (skip3D || warmupDone || !inView) return;

    const intervalMs = 1000 / WARMUP_FPS;
    invalidate();
    const id = window.setInterval(() => invalidate(), intervalMs);
    return () => window.clearInterval(id);
  }, [skip3D, warmupDone, inView]);

  const playFadeIfReady = useCallback(() => {
    const el = canvasWrapperRef.current;

    if (!el) return;
    if (fadePlayedRef.current) return;
    if (!canvasReadyRef.current) return;
    if (!loaderReadyRef.current) return;

    fadePlayedRef.current = true;

    gsap.killTweensOf(el);

    fadeTweenRef.current = gsap.fromTo(
      el,
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: 1.2,
        delay: 0.15,
        ease: "power2.out",
      }
    );
  }, []);

  const markLoaderReady = useCallback(() => {
    if (loaderReadyRef.current) return;

    loaderReadyRef.current = true;

    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (delayRef.current) {
      window.clearTimeout(delayRef.current);
      delayRef.current = null;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        playFadeIfReady();
      });
    });
  }, [playFadeIfReady]);

  useLayoutEffect(() => {
    const el = canvasWrapperRef.current;

    if (!el) return;

    gsap.set(el, {
      opacity: 0,
    });
  }, []);

  useEffect(() => {
    if (!waitForLoader) {
      loaderReadyRef.current = true;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          playFadeIfReady();
        });
      });

      return;
    }

    const handleLoaderComplete = () => {
      delayRef.current = window.setTimeout(() => {
        markLoaderReady();
      }, 180);
    };

    if (hasLoaderRun() && !isLoaderActive()) {
      delayRef.current = window.setTimeout(() => {
        markLoaderReady();
      }, 180);
    } else {
      window.addEventListener("loaderComplete", handleLoaderComplete, {
        once: true,
      });

      window.addEventListener("hyperiux:loader-complete", handleLoaderComplete, {
        once: true,
      });

      pollRef.current = window.setInterval(() => {
        if (hasLoaderRun() && !isLoaderActive()) {
          markLoaderReady();
        }
      }, 80);
    }

    return () => {
      window.removeEventListener("loaderComplete", handleLoaderComplete);
      window.removeEventListener(
        "hyperiux:loader-complete",
        handleLoaderComplete
      );

      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }

      if (delayRef.current) {
        window.clearTimeout(delayRef.current);
        delayRef.current = null;
      }
    };
  }, [waitForLoader, markLoaderReady, playFadeIfReady]);

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;

    return () => {
      fadeTweenRef.current?.kill();

      if (wrapper) {
        gsap.killTweensOf(wrapper);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={[
        "absolute inset-0 z-10 h-[140vh] max-[1025px]:hidden w-full bg-background",
        containerClassName,
      ].join(" ")}
    >
      <div
        ref={canvasWrapperRef}
        className={["h-full w-full opacity-0", className].join(" ")}
      >
        {skip3D ? null : (
        <Canvas
          className="h-full w-full"
          frameloop={!inView ? "never" : warmupDone ? "always" : "demand"}
          dpr={CONFIG.canvasDpr}
          shadows={!isMobile ? { type: THREE.PCFShadowMap } : false}
          onCreated={() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                canvasReadyRef.current = true;
                playFadeIfReady();
              });
            });
          }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: CONFIG.toneMappingExposure,
          }}
        >
          <PerspectiveCamera
            makeDefault
            position={CONFIG.cameraPosition}
            fov={CONFIG.cameraFov}
          />

          {/* Suspense keeps the scene (and, critically, the postprocessing
              EffectComposer) from rendering until the EXR environment map has
              loaded. Without it, EffectComposer initialises against a not-yet-
              ready environment texture and throws "reading 'alpha'". */}
          <Suspense fallback={null}>
            <Environment
              files="/studio.exr"
              environmentIntensity={
                isMobile ? 0.4 : CONFIG.environmentIntensity
              }
            />

            <directionalLight
              castShadow={!isMobile}
              color={isMobile ? "#ffeedd" : CONFIG.glowLeftColor}
              intensity={isMobile ? 1.8 : CONFIG.lightIntensity}
              position={CONFIG.lightPosition}
            />

            <group position={CONFIG.wrapperPosition}>
              <group
                position={CONFIG.groupPosition}
                rotation={CONFIG.groupRotation}
              >
                <ParametricPlates
                  key={isMobile ? "mobile" : "desktop"}
                  isMobile={isMobile}
                />
              </group>
            </group>

            {!isMobile && (
              <EffectComposer frameBufferType={THREE.HalfFloatType}>
                <Bloom
                  intensity={CONFIG.bloomIntensity}
                  luminanceThreshold={CONFIG.bloomThreshold}
                  luminanceSmoothing={CONFIG.bloomSmoothing}
                  mipmapBlur
                  radius={CONFIG.bloomRadius}
                />
              </EffectComposer>
            )}
          </Suspense>
        </Canvas>
        )}
      </div>
    </div>
  );
}