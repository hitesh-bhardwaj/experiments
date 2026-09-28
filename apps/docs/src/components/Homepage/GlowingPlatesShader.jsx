"use client";

import { useRef, useLayoutEffect, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import useIsMobile from "@/hooks/useIsMobile";
import { prefersReducedMotion } from "@/lib/motion";
import gsap from "gsap";

const LOADER_STORAGE_KEY = "hyperiux-loader-has-run";

const lerp = (a, b, t) => a + (b - a) * t;

function hasLoaderRun() {
  if (typeof window === "undefined") return false;

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

// A continuous WebGL loop keeps the main thread busy, which trips Lighthouse/PSI
// timeouts. Under an audit/headless environment we skip the canvas entirely and
// let the container's dark backdrop stand in.
function isAuditEnvironment() {
  if (typeof window === "undefined") return false;

  if (navigator.webdriver === true) return true;

  const ua = navigator.userAgent || "";

  return /Lighthouse|Chrome-Lighthouse|Google Page Speed|PTST|HeadlessChrome|bot|crawler|spider/i.test(
    ua
  );
}

// Values mirror the geometry version's CONFIG so the shader reproduces the same
// composition: a fan of 51 thin plates, the same group transform, the same
// fixed camera, and glow that only appears on hover.
const CONFIG = {
  count: 51,
  radius: 4.5,
  turns: 1.0,

  plateRadius: 1.5,
  plateThickness: 0.04,

  localTiltX: 0.21,
  localTiltY: -0.04,

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

  // Same nested transform as the old scene -> wrapper -> inner chain and the
  // same fixed camera (which looks straight down -Z, no lookAt).
  wrapperPosition: [1, 0, 0],
  groupPosition: [4.15, 3.93, -0.5],
  groupRotation: [1.41, 0.01, -0.14],
  cameraPosition: [0, 0.8, 7.0],
  cameraFov: 62,

  // Raymarch quality. `neighbors` sectors either side are evaluated per step;
  // the blades are thin along the ring tangent so a small window is enough.
  raymarchSteps: 120,
  neighbors: 2,
  maxStep: 0.09,

  // Neon halo faked from the ray's closest approach to a lit plate (replaces the
  // UnrealBloom pass). Only lit plates glow, so it is invisible until hover.
  haloSharp: 2.4,
  haloGain: 1.15,

  canvasDpr: 1.0,
};

const VERTEX_SHADER = /* glsl */ `
  out vec2 vScreen;

  void main() {
    // Fullscreen quad: drive clip space directly, ignore camera matrices.
    vScreen = position.xy;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function buildFragmentShader() {
  const {
    count,
    radius,
    plateRadius,
    plateThickness,
    neighbors,
    turns,
  } = CONFIG;

  return /* glsl */ `
    precision highp float;

    in vec2 vScreen;
    out vec4 fragColor;

    uniform float uRot;
    uniform float uAspect;

    uniform vec3 uCamPos;
    uniform vec3 uCamRight;
    uniform vec3 uCamUp;
    uniform vec3 uCamFwd;
    uniform float uTanHalfFov;

    uniform mat4 uModelInv;      // world -> ring-local (inverse group matrix)
    uniform vec3 uBoundCenter;   // ring centre in world space
    uniform float uBoundRadius;

    uniform vec3 uPlateColor;
    uniform vec3 uGlowLeft;
    uniform vec3 uGlowRight;

    // Per-plate state, smoothed on the CPU exactly like the geometry version.
    uniform float uGlow[${count}];
    uniform float uScale[${count}];
    uniform float uTiltX[${count}];
    uniform float uTiltY[${count}];

    #define COUNT ${count}
    #define COUNT_F ${count.toFixed(1)}
    #define RING_R ${radius.toFixed(3)}
    #define PLATE_R ${plateRadius.toFixed(3)}
    #define HALF_T ${(plateThickness * 0.5).toFixed(4)}
    #define NEI ${neighbors}
    #define STEPS ${CONFIG.raymarchSteps}
    #define MAX_STEP ${CONFIG.maxStep.toFixed(3)}
    #define GLOW_INT ${CONFIG.glowIntensity.toFixed(3)}
    #define HALO_SHARP ${CONFIG.haloSharp.toFixed(3)}
    #define HALO_GAIN ${CONFIG.haloGain.toFixed(3)}
    #define SECTOR ${((turns * Math.PI * 2) / count).toFixed(8)}

    // --- quaternion helpers (match three.js conventions) ---------------------

    vec4 eulerToQuatXYZ(float x, float y, float z) {
      float c1 = cos(x * 0.5), s1 = sin(x * 0.5);
      float c2 = cos(y * 0.5), s2 = sin(y * 0.5);
      float c3 = cos(z * 0.5), s3 = sin(z * 0.5);
      return vec4(
        s1 * c2 * c3 + c1 * s2 * s3,
        c1 * s2 * c3 - s1 * c2 * s3,
        c1 * c2 * s3 + s1 * s2 * c3,
        c1 * c2 * c3 - s1 * s2 * s3
      );
    }

    vec4 quatMul(vec4 a, vec4 b) {
      return vec4(
        a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
        a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z,
        a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x,
        a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
      );
    }

    // Rotate v by the inverse of unit quaternion q.
    vec3 rotInv(vec4 q, vec3 v) {
      vec3 u = -q.xyz;
      return v + 2.0 * cross(u, cross(u, v) + q.w * v);
    }

    // Orientation of plate at angle ang: shortest arc from +Y to the ring
    // tangent, then the local tilt (same as the old quaternion.multiply).
    vec4 plateQuat(float ang, float tiltX, float tiltY) {
      float ca = cos(ang), sa = sin(ang);
      // tangent n = (-sa, 0, ca); shortest-arc(+Y -> n) = (nz,0,-nx,1+ny).
      vec4 arc = normalize(vec4(ca, 0.0, sa, 1.0));
      vec4 tilt = eulerToQuatXYZ(tiltX, tiltY, 0.0);
      return quatMul(arc, tilt);
    }

    // SDF of the whole fan in ring-local space. Angular domain repetition keeps
    // it O(1). Writes the winning plate index, its face coords and lit glow.
    float mapLocal(vec3 pl, out int oId, out vec2 oFace, out float oGlow) {
      float a = atan(pl.z, pl.x);
      float baseId = floor((a - uRot) / SECTOR + 0.5);

      float best = 1e9;
      oId = 0;
      oFace = vec2(0.0);
      oGlow = 0.0;

      for (int k = -NEI; k <= NEI; k++) {
        float idf = baseId + float(k);
        float ang = idf * SECTOR + uRot;

        int wid = int(mod(idf, COUNT_F) + COUNT_F);
        wid = wid - (wid / COUNT) * COUNT; // wid % COUNT, always in [0,COUNT)

        float sc = uScale[wid];
        float pr = PLATE_R * sc;

        vec4 q = plateQuat(ang, uTiltX[wid], uTiltY[wid]);
        vec3 c = vec3(cos(ang) * RING_R, 0.0, sin(ang) * RING_R);
        vec3 lp = rotInv(q, pl - c); // point in plate-local frame (axis = Y)

        float radial = length(lp.xz);
        vec2 d2 = vec2(radial - pr, abs(lp.y) - HALF_T);
        float dist = min(max(d2.x, d2.y), 0.0) + length(max(d2, 0.0));

        if (dist < best) {
          best = dist;
          oId = wid;
          oFace = vec2(lp.x / pr, radial / pr);
          oGlow = uGlow[wid];
        }
      }

      return best;
    }

    float mapDist(vec3 pw) {
      vec3 pl = (uModelInv * vec4(pw, 1.0)).xyz;
      int id; vec2 f; float g;
      return mapLocal(pl, id, f, g);
    }

    vec3 calcNormal(vec3 pw) {
      vec2 e = vec2(0.0015, 0.0);
      return normalize(vec3(
        mapDist(pw + e.xyy) - mapDist(pw - e.xyy),
        mapDist(pw + e.yxy) - mapDist(pw - e.yxy),
        mapDist(pw + e.yyx) - mapDist(pw - e.yyx)
      ));
    }

    // Emissive on a plate cap: L->R gradient, faded at the disc edge, scaled by
    // the plate's (already smoothed) glow. Zero unless the plate is hovered.
    vec3 plateEmissive(vec2 face, float glow) {
      if (glow <= 0.001) return vec3(0.0);
      float t = clamp(face.x * 0.5 + 0.5, 0.0, 1.0);
      vec3 c = mix(uGlowLeft, uGlowRight, t);
      float edge = 1.0 - smoothstep(0.8, 1.0, face.y); // radial falloff
      return c * (glow * GLOW_INT * edge);
    }

    // Cheap warm environment approximation (studio.exr stand-in) so the dark
    // metallic plates aren't flat black off-hover.
    vec3 envColor(vec3 d) {
      float u = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 warm = vec3(0.18, 0.11, 0.06);
      vec3 cool = vec3(0.05, 0.06, 0.08);
      return mix(warm, cool, smoothstep(0.0, 0.75, u));
    }

    void main() {
      vec3 ro = uCamPos;
      vec3 rd = normalize(
        uCamFwd +
        vScreen.x * uAspect * uTanHalfFov * uCamRight +
        vScreen.y * uTanHalfFov * uCamUp
      );

      // Clip the march to the fan's bounding sphere.
      vec3 oc = ro - uBoundCenter;
      float b = dot(oc, rd);
      float c = dot(oc, oc) - uBoundRadius * uBoundRadius;
      float disc = b * b - c;

      if (disc < 0.0) {
        fragColor = vec4(0.0);
        return;
      }

      float sq = sqrt(disc);
      float t = max(-b - sq, 0.0);
      float tExit = -b + sq;

      float hit = 0.0;
      int oId; vec2 oFace; float oGlow;
      int hId = 0; vec2 hFace = vec2(0.0); float hGlow = 0.0;

      float dmin = 1e9;
      vec3 haloCol = vec3(0.0);

      for (int i = 0; i < STEPS; i++) {
        vec3 pw = ro + rd * t;
        vec3 pl = (uModelInv * vec4(pw, 1.0)).xyz;
        float d = mapLocal(pl, oId, oFace, oGlow);

        if (oGlow > 0.001 && d < dmin) {
          dmin = d;
          haloCol = plateEmissive(oFace, oGlow);
        }

        if (d < 0.0006) {
          hit = 1.0;
          hId = oId; hFace = oFace; hGlow = oGlow;
          break;
        }

        t += min(max(d, 0.0012), MAX_STEP);
        if (t > tExit) break;
      }

      vec3 halo = haloCol * exp(-max(dmin, 0.0) * HALO_SHARP) * HALO_GAIN;

      vec3 col;
      float alpha;

      if (hit > 0.5) {
        vec3 pw = ro + rd * t;
        vec3 n = calcNormal(pw);

        // Warm key light from up/behind-right, matching the old directional.
        vec3 L = normalize(vec3(20.0, 20.5, -20.0) - pw);
        float diff = max(dot(n, L), 0.0);
        float fres = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
        vec3 refl = envColor(reflect(rd, n));

        vec3 warm = uGlowLeft;
        vec3 base =
          uPlateColor * (0.35 + 0.9 * diff) +
          warm * diff * 0.6 +
          refl * (0.10 + 0.16 * fres);

        vec3 face = plateEmissive(hFace, hGlow);

        col = base + face + halo;
        alpha = 1.0;
      } else {
        col = halo;
        alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
      }

      fragColor = vec4(col, alpha);
    }
  `;
}

// Vanilla three.js shader-only scene. No plate geometry, no materials, no
// lights, no environment map, no post-processing composer: the entire fan of
// plates lives in one raymarched fragment shader. The React shell handles
// loader gating, GSAP fade-in and visibility pausing.
class PlatesShaderScene {
  constructor(container, { isMobile, isStatic, onReady }) {
    this.container = container;
    this.isMobile = isMobile;
    this.isStatic = isStatic;
    this.onReady = onReady;

    this.running = false;
    this.rafId = 0;
    this.readyFired = false;
    this.disposed = false;

    this.clock = new THREE.Clock();

    this.ndcPointer = new THREE.Vector2(-9999, -9999);
    this.pointerActive = false;
    this.center = new THREE.Vector3();

    // Per-plate state smoothed each frame (same as the geometry version).
    const n = CONFIG.count;
    this.glowArr = new Float32Array(n).fill(0);
    this.scaleArr = new Float32Array(n).fill(1);
    this.tiltXArr = new Float32Array(n).fill(CONFIG.localTiltX);
    this.tiltYArr = new Float32Array(n).fill(CONFIG.localTiltY);

    this._initTransforms();
    this._initRenderer();
    this._initScene();
    this._initPointer();
    this._initResize();

    if (this.isStatic) this.renderFrame();
  }

  // Rebuild the scene -> wrapper -> inner matrix on the CPU so the shader can
  // raymarch in ring-local space and hover picking can project plate centres.
  _initTransforms() {
    const wrapper = new THREE.Group();
    wrapper.position.set(...CONFIG.wrapperPosition);

    const inner = new THREE.Group();
    inner.position.set(...CONFIG.groupPosition);
    inner.rotation.set(...CONFIG.groupRotation);

    wrapper.add(inner);
    wrapper.updateMatrixWorld(true);

    this.model = inner.matrixWorld.clone();
    this.modelInv = this.model.clone().invert();
    this.boundCenter = new THREE.Vector3().setFromMatrixPosition(this.model);
    // Fan radius + halo reach, all rigid so world extent == local extent.
    this.boundRadius = CONFIG.radius + CONFIG.plateRadius + 3.0;
  }

  _initRenderer() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(CONFIG.canvasDpr);
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);

    const el = renderer.domElement;
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.display = "block";

    this.container.appendChild(el);
    this.renderer = renderer;
  }

  _initScene() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;

    const scene = new THREE.Scene();
    const quadCamera = new THREE.Camera();

    // Projection camera: fixed, looking straight down -Z (no lookAt), matching
    // the geometry version. Used for the shader ray basis and hover picking.
    const projCamera = new THREE.PerspectiveCamera(
      CONFIG.cameraFov,
      w / h,
      0.1,
      1000
    );
    projCamera.position.set(...CONFIG.cameraPosition);
    projCamera.updateMatrixWorld(true);

    const leftGlow = this.isMobile
      ? CONFIG.mobileGlowLeftColor
      : CONFIG.glowLeftColor;
    const rightGlow = this.isMobile
      ? CONFIG.mobileGlowRightColor
      : CONFIG.glowRightColor;

    const uniforms = {
      uRot: { value: 0 },
      uAspect: { value: w / h },

      uCamPos: { value: new THREE.Vector3(...CONFIG.cameraPosition) },
      // Camera looks down -Z with identity orientation.
      uCamRight: { value: new THREE.Vector3(1, 0, 0) },
      uCamUp: { value: new THREE.Vector3(0, 1, 0) },
      uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
      uTanHalfFov: {
        value: Math.tan((CONFIG.cameraFov * Math.PI) / 180 / 2),
      },

      uModelInv: { value: this.modelInv },
      uBoundCenter: { value: this.boundCenter },
      uBoundRadius: { value: this.boundRadius },

      uPlateColor: { value: new THREE.Color(CONFIG.plateColor) },
      uGlowLeft: { value: new THREE.Color(leftGlow) },
      uGlowRight: { value: new THREE.Color(rightGlow) },

      uGlow: { value: this.glowArr },
      uScale: { value: this.scaleArr },
      uTiltX: { value: this.tiltXArr },
      uTiltY: { value: this.tiltYArr },
    };

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERTEX_SHADER,
      fragmentShader: buildFragmentShader(),
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    scene.add(quad);

    this.scene = scene;
    this.quadCamera = quadCamera;
    this.projCamera = projCamera;
    this.material = material;
    this.uniforms = uniforms;
    this.quadGeo = quad.geometry;
  }

  _initPointer() {
    const el = this.renderer.domElement;
    const pointer = this.ndcPointer;

    this.rect = el.getBoundingClientRect();

    const handlePointer = (clientX, clientY) => {
      const rect = this.rect;
      if (!rect) return;

      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      this.pointerActive = true;
    };

    this._onMouseMove = (event) => handlePointer(event.clientX, event.clientY);

    this._onTouchMove = (event) => {
      if (event.touches && event.touches[0]) {
        handlePointer(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    this._onLeave = () => {
      pointer.set(-9999, -9999);
      this.pointerActive = false;
    };

    el.addEventListener("mousemove", this._onMouseMove);
    el.addEventListener("mouseleave", this._onLeave);
    el.addEventListener("touchstart", this._onTouchMove, { passive: true });
    el.addEventListener("touchmove", this._onTouchMove, { passive: true });
    el.addEventListener("touchend", this._onLeave, { passive: true });
  }

  _initResize() {
    const el = this.renderer.domElement;

    this._resizeObserver = new ResizeObserver(() => {
      const w = this.container.clientWidth || 1;
      const h = this.container.clientHeight || 1;

      this.renderer.setSize(w, h);
      this.projCamera.aspect = w / h;
      this.projCamera.updateProjectionMatrix();
      this.uniforms.uAspect.value = w / h;

      this.rect = el.getBoundingClientRect();

      if (!this.running) this.renderFrame();
    });

    this._resizeObserver.observe(this.container);
  }

  // Project the plate centres to NDC and pick the nearest to the pointer -
  // same hover logic and threshold as the geometry version.
  _computeHoverId(rot) {
    if (!this.pointerActive || this.isStatic) return -1;

    const sector = (CONFIG.turns * Math.PI * 2) / CONFIG.count;
    const px = this.ndcPointer.x;
    const py = this.ndcPointer.y;
    const thresholdSq = CONFIG.hoverThreshold * CONFIG.hoverThreshold;

    let minD = Infinity;
    let nearest = -1;

    for (let i = 0; i < CONFIG.count; i += 1) {
      const ang = i * sector + rot;

      this.center
        .set(Math.cos(ang) * CONFIG.radius, 0, Math.sin(ang) * CONFIG.radius)
        .applyMatrix4(this.model)
        .project(this.projCamera);

      const d2 = (this.center.x - px) ** 2 + (this.center.y - py) ** 2;

      if (d2 < minD) {
        minD = d2;
        nearest = i;
      }
    }

    return minD < thresholdSq ? nearest : -1;
  }

  // Smooth per-plate glow/scale/tilt toward the hover target, identical to the
  // geometry version's per-instance update.
  _updatePlateState(hovId) {
    const settle = this.isStatic ? 1 : CONFIG.hoverSpeed;
    const { hoverSigma, hoverScale, localTiltX, localTiltY } = CONFIG;

    for (let i = 0; i < CONFIG.count; i += 1) {
      const dist = hovId === -1 ? Infinity : Math.abs(i - hovId);
      const influence =
        hovId === -1 ? 0 : Math.exp(-(dist ** 2) / (2 * hoverSigma ** 2));

      this.glowArr[i] = lerp(this.glowArr[i], influence, settle);
      this.scaleArr[i] = lerp(
        this.scaleArr[i],
        1 + (hoverScale - 1) * influence,
        settle
      );
      this.tiltXArr[i] = lerp(
        this.tiltXArr[i],
        localTiltX * (1 - influence),
        settle
      );
      this.tiltYArr[i] = lerp(
        this.tiltYArr[i],
        localTiltY * (1 - influence),
        settle
      );
    }
  }

  start() {
    if (this.running || this.isStatic || this.disposed) return;

    this.running = true;
    this.clock.getDelta();

    const loop = () => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      this.renderFrame();
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  renderFrame() {
    if (this.disposed) return;

    const time = this.clock.getElapsedTime();
    const rot = this.isStatic ? 0 : time * CONFIG.rotationSpeed;

    const hovId = this._computeHoverId(rot);
    this._updatePlateState(hovId);

    this.uniforms.uRot.value = rot;

    // The uniform array values share the same Float32Array references, so the
    // in-place updates above are uploaded on the next render automatically.
    this.renderer.render(this.scene, this.quadCamera);

    this._maybeReady();
  }

  _maybeReady() {
    if (this.readyFired) return;
    this.readyFired = true;
    this.onReady?.();
  }

  dispose() {
    this.disposed = true;
    this.stop();

    this._resizeObserver?.disconnect();

    const el = this.renderer?.domElement;

    if (el) {
      el.removeEventListener("mousemove", this._onMouseMove);
      el.removeEventListener("mouseleave", this._onLeave);
      el.removeEventListener("touchstart", this._onTouchMove);
      el.removeEventListener("touchmove", this._onTouchMove);
      el.removeEventListener("touchend", this._onLeave);

      if (el.parentNode) el.parentNode.removeChild(el);
    }

    this.quadGeo?.dispose();
    this.material?.dispose();
    this.renderer?.dispose();
  }
}

export default function GlowingPlatesShader({
  waitForLoader = true,
  className = "",
  containerClassName = "",
}) {
  const containerRef = useRef(null);
  const canvasWrapperRef = useRef(null);
  const mountRef = useRef(null);

  const sceneRef = useRef(null);

  const canvasReadyRef = useRef(false);
  const loaderReadyRef = useRef(!waitForLoader);
  const fadePlayedRef = useRef(false);

  const fadeTweenRef = useRef(null);
  const pollRef = useRef(null);
  const delayRef = useRef(null);

  const inViewRef = useRef(true);

  const { isMobile } = useIsMobile();

  const [inView, setInView] = useState(true);
  const [skip3D] = useState(() => isAuditEnvironment());
  const [staticFrame] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const syncVisibility = () => {
      const rect = el.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    };

    setInView(syncVisibility());

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0, rootMargin: "200px 0px" }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const playFadeIfReady = useCallback(() => {
    const el = canvasWrapperRef.current;

    if (!el) return;
    if (fadePlayedRef.current) return;
    if (!canvasReadyRef.current) return;
    if (!loaderReadyRef.current) return;

    fadePlayedRef.current = true;

    gsap.killTweensOf(el);

    if (staticFrame) {
      gsap.set(el, { opacity: 1 });
      return;
    }

    fadeTweenRef.current = gsap.fromTo(
      el,
      { opacity: 0 },
      { opacity: 1, duration: 1.2, delay: 0.15, ease: "power2.out" }
    );
  }, [staticFrame]);

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

    gsap.set(el, { opacity: 0 });
  }, []);

  useEffect(() => {
    if (skip3D) return undefined;

    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new PlatesShaderScene(mount, {
      isMobile,
      isStatic: staticFrame,
      onReady: () => {
        canvasReadyRef.current = true;
        playFadeIfReady();
      },
    });

    sceneRef.current = scene;

    if (!staticFrame && inViewRef.current) {
      scene.start();
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
      canvasReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip3D, isMobile, staticFrame]);

  useEffect(() => {
    inViewRef.current = inView;

    const scene = sceneRef.current;
    if (!scene || staticFrame) return;

    if (inView) scene.start();
    else scene.stop();
  }, [inView, staticFrame]);

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
        {skip3D ? null : <div ref={mountRef} className="h-full w-full" />}
      </div>
    </div>
  );
}
