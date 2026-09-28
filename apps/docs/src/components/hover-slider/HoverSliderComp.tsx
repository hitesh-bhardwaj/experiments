"use client";

import { useEffect, useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { createSuspendedRaf } from "./createSuspendedRaf";

const vertexShader = /* glsl */ `
uniform vec2 uVelocity;
uniform vec2 uViewport;
uniform float uCurvature;

varying vec2 vUv;

float circularArc(float d) {
  float maxAngle = 1.15;
  float theta = clamp(d, 0.0, 1.0) * maxAngle;
  return (1.0 - cos(theta)) / (1.0 - cos(maxAngle));
}

void main() {
  vUv = uv;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);

  float nx = worldPos.x / uViewport.x;
  float ny = worldPos.y / uViewport.y;

  float cx = clamp(nx, -1.0, 1.0);
  float cy = clamp(ny, -1.0, 1.0);

  float distY = abs(cy);
  float distX = abs(cx);

  float curveY = circularArc(distY);
  float curveX = circularArc(distX);

  float edgeLift = curveY * uCurvature + curveX * (uCurvature * 0.1);

  float finalZOffset = edgeLift;

  float focalLength = max(uViewport.y * 2.2, 900.0);
  float perspective = focalLength / (focalLength - finalZOffset);

  vec3 finalPos = worldPos.xyz;
  finalPos.xy *= perspective;
  finalPos.z += finalZOffset;

  gl_Position = projectionMatrix * viewMatrix * vec4(finalPos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform vec2 uPlaneSize;
uniform vec2 uImageSize;
uniform float uAlpha;
uniform float uZoom;

varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 planeSize, vec2 imageSize) {
  float planeRatio = planeSize.x / planeSize.y;
  float imageRatio = imageSize.x / imageSize.y;

  vec2 scale = vec2(1.0);

  if (planeRatio > imageRatio) {
    scale.y = imageRatio / planeRatio;
  } else {
    scale.x = planeRatio / imageRatio;
  }

  uv = (uv - 0.5) * scale + 0.5;

  return (uv - 0.5) / uZoom + 0.5;
}

void main() {
  vec2 uv = coverUv(vUv, uPlaneSize, uImageSize);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;

  vec4 tex = texture2D(uTexture, uv);

  gl_FragColor = vec4(tex.rgb, tex.a * uAlpha);
}
`;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

function getTextureUrl(src: string) {
  return src;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return clamp(number, min, max);
}

interface HoverSliderItem {
  id: string
  title: string
  focus: string
  year: string
  img: string
}

interface HoverSliderGlApi {
  setActive: (index: number) => void
  show: (targetIdx: number) => void
  hide: () => void
  onRowChange: (targetIdx: number) => void
}

export default function HoverSliderComp({ items = [], transitionDuration = 0.45, imageScale = 0.95, curveFactor = 1 }: { items?: HoverSliderItem[]; transitionDuration?: number; imageScale?: number; curveFactor?: number }) {
  const mountRef = useRef<HTMLElement | null>(null);
  const glRef = useRef<HoverSliderGlApi | null>(null);
  const isDesktopRef = useRef(false);
  const controlsRef = useRef({
    transitionDuration: clampNumber(transitionDuration, 0.05, 3, 0.45),
    imageScale: clampNumber(imageScale, 0.5, 2, 0.95),
    curveFactor: clampNumber(curveFactor, 0, 2.5, 1),
  });

  useEffect(() => {
    controlsRef.current.transitionDuration = clampNumber(transitionDuration, 0.05, 3, 0.45);
    controlsRef.current.imageScale = clampNumber(imageScale, 0.5, 2, 0.95);
    controlsRef.current.curveFactor = clampNumber(curveFactor, 0, 2.5, 1);
  }, [curveFactor, imageScale, transitionDuration]);

  const stateRef = useRef({
    activeIndex: 0,
    hovering: false,
    hasClicked: false,
  });

  const DESKTOP_BREAKPOINT = 1025;

  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!items.length) return;

    const mount = mountRef.current;

    if (!mount) return;

    let W = mount.offsetWidth;
    let H = W < 768 ? window.innerHeight : mount.offsetHeight;

    const CARD_ASPECT = 1.7;
    const GAP = 14;
    const VISIBLE = 7;
    const HALF = 3;

    const getCardH = () => Math.round(H * (W < 768 ? 0.34 : 0.46));

    const getCardW = () => {
      const cardW = getCardH() * CARD_ASPECT;

      return Math.round(W < 768 ? Math.min(cardW, W * 0.88) : cardW);
    };

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    Object.assign(renderer.domElement.style, {
      position: W < 768 ? "fixed" : "absolute",
      top: "0",
      left: "0",
      right: "0",
      bottom: W < 768 ? "auto" : "0",
      width: "100%",
      height: W < 768 ? "100vh" : "100%",
      zIndex: "15",
      pointerEvents: "none",
    });

    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();

    const updateCamera = () => {
      camera.left = -W / 2;
      camera.right = W / 2;
      camera.top = H / 2;
      camera.bottom = -H / 2;
      camera.near = -2000;
      camera.far = 2000;
      camera.updateProjectionMatrix();
    };

    camera.position.z = 1000;
    updateCamera();

    renderer.setSize(W, H, false);

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    const texCache: Record<string, THREE.Texture> = {};

    const getTexture = (src: string): THREE.Texture | null => {
      if (!src) return null;

      const textureUrl = getTextureUrl(src);

      if (texCache[textureUrl]) return texCache[textureUrl];

      const tex = loader.load(
        textureUrl,
        (loadedTexture) => {
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.minFilter = THREE.LinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.generateMipmaps = false;

          loadedTexture.userData.iw = loadedTexture.image?.width || 1;
          loadedTexture.userData.ih = loadedTexture.image?.height || 1;

          loadedTexture.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.warn("Failed to load hover slider texture:", src, error);
        }
      );

      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.userData.iw = 1;
      tex.userData.ih = 1;

      texCache[textureUrl] = tex;

      return tex;
    };

    items.forEach((item) => getTexture(item.img));

    const syncImageSize = (mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>) => {
      const texture = mesh.material.uniforms.uTexture.value;

      if (!texture?.image) return;

      mesh.material.uniforms.uImageSize.value.set(
        texture.image.width || texture.userData.iw || 1,
        texture.image.height || texture.userData.ih || 1
      );
    };

    const geo = new THREE.PlaneGeometry(1, 1, 80, 80);

    let CW = getCardW();
    let CH = getCardH();

    const makeMat = (tex: THREE.Texture | null) =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTexture: {
            value: tex,
          },
          uPlaneSize: {
            value: new THREE.Vector2(CW, CH),
          },
          uImageSize: {
            value: new THREE.Vector2(tex?.userData?.iw || 1, tex?.userData?.ih || 1),
          },
          uVelocity: {
            value: new THREE.Vector2(0, 0),
          },
          uAlpha: {
            value: 0,
          },
          uZoom: {
            value: 1.06,
          },
          uViewport: {
            value: new THREE.Vector2(W / 2, H / 2),
          },
          uCurvature: {
            value: 0,
          },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

    const firstTex = getTexture(items[0].img);

    const meshes = Array.from({ length: VISIBLE }, (_, index) => {
      const mesh = new THREE.Mesh(geo, makeMat(firstTex));

      mesh.renderOrder = index;

      scene.add(mesh);

      return mesh;
    });

    const curveAnim = {
      value: 0,
      zoom: 1.06,
    };

    const anim = {
      alpha: 0,
    };

    const ACTIVE_CURVE = 400;
    const SOFT_CURVE = 80;

    let floatIdx = 0;
    let prevFloat = 0;

    const vel = new THREE.Vector2(0, 0);

    const getCurveForTravel = (targetIdx: number) => {
      const travel = Math.abs(targetIdx - floatIdx);
      const progress = clamp((travel - 0.35) / 3.5, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);

      return lerp(SOFT_CURVE, ACTIVE_CURVE, eased);
    };

    const reduceMotionMq = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    );
    let reduceMotion = reduceMotionMq?.matches ?? false;

    const snapStack = (targetIdx: number = stateRef.current.activeIndex) => {
      curveAnim.value = 0;
      curveAnim.zoom = 1.06;
      floatIdx = targetIdx;
      prevFloat = floatIdx;
      vel.set(0, 0);
    };

    // Reduced-motion: swap images with opacity instead of sliding the stack.
    const fadeToIndex = (targetIdx: number) => {
      gsap.killTweensOf(curveAnim);

      const reveal = () => {
        snapStack(targetIdx);
        gsap.killTweensOf(anim);
        gsap.to(anim, {
          alpha: 1,
        duration: controlsRef.current.transitionDuration * 0.62,
          ease: "power2.out",
        });
      };

      if (anim.alpha <= 0.01) {
        reveal();
        return;
      }

      gsap.killTweensOf(anim);
      gsap.to(anim, {
        alpha: 0,
        duration: controlsRef.current.transitionDuration * 0.36,
        ease: "power2.in",
        onComplete: reveal,
      });
    };

    const onReduceMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;

      if (reduceMotion) {
        gsap.killTweensOf(curveAnim);
        snapStack(stateRef.current.activeIndex);
      }
    };

    reduceMotionMq?.addEventListener?.("change", onReduceMotionChange);

    const releaseCurve = (targetIdx: number = stateRef.current.activeIndex) => {
      if (reduceMotion) {
        fadeToIndex(targetIdx);
        return;
      }

      const peakCurve = getCurveForTravel(targetIdx);

      gsap.killTweensOf(curveAnim);

      curveAnim.zoom = 1.06;

      gsap
        .timeline()
        .to(curveAnim, {
          value: peakCurve,
          zoom: 1.06,
          duration: controlsRef.current.transitionDuration * 0.27,
          ease: "power2.out",
        })
        .to(curveAnim, {
          value: 0,
          zoom: 1.06,
          duration: controlsRef.current.transitionDuration * 2.78,
          ease: "power2.inOut",
        });
    };

    const show = (targetIdx: number) => {
      if (reduceMotion) {
        fadeToIndex(targetIdx);
        return;
      }

      gsap.killTweensOf(anim);

      gsap.to(anim, {
        alpha: 1,
        duration: controlsRef.current.transitionDuration,
        ease: "power3.out",
      });

      releaseCurve(targetIdx);
    };

    const hide = () => {
      if (reduceMotion) {
        gsap.killTweensOf(curveAnim);
        snapStack(stateRef.current.activeIndex);
        gsap.killTweensOf(anim);
        gsap.to(anim, {
          alpha: 0,
          duration: controlsRef.current.transitionDuration * 0.49,
          ease: "power2.out",
        });
        return;
      }

      gsap.killTweensOf(anim);
      gsap.killTweensOf(curveAnim);

      gsap.to(anim, {
        alpha: 0,
        duration: controlsRef.current.transitionDuration * 0.78,
        ease: "power2.out",
      });

      gsap.to(curveAnim, {
        value: 0,
        zoom: 1.06,
        duration: controlsRef.current.transitionDuration * 1.22,
        ease: "power2.inOut",
      });
    };

    const onRowChange = (targetIdx: number) => {
      releaseCurve(targetIdx);
    };

    const onResize = () => {
      const wasDesktop = isDesktopRef.current;

      W = mount.offsetWidth;
      H = W < 768 ? window.innerHeight : mount.offsetHeight;

      isDesktopRef.current = W >= DESKTOP_BREAKPOINT;

      Object.assign(renderer.domElement.style, {
        position: W < 768 ? "fixed" : "absolute",
        bottom: W < 768 ? "auto" : "0",
        height: W < 768 ? "100vh" : "100%",
      });

      renderer.setSize(W, H, false);

      updateCamera();

      CW = getCardW();
      CH = getCardH();

      meshes.forEach((mesh) => {
        mesh.material.uniforms.uPlaneSize.value.set(CW, CH);
        mesh.material.uniforms.uViewport.value.set(W / 2, H / 2);
      });

      if (!wasDesktop && isDesktopRef.current) {
        stateRef.current.hasClicked = true;
        stateRef.current.hovering = true;
        stateRef.current.activeIndex = 0;

        setHighlightedIndex(0);
        show(0);
      }
    };

    window.addEventListener("resize", onResize);

    onResize();

    if (isDesktopRef.current) {
      stateRef.current.hasClicked = true;
      stateRef.current.hovering = true;

      setHighlightedIndex(0);
      show(0);
    }

    const loop = createSuspendedRaf({
      root: mount,
      onFrame: () => {
        const targetIdx = stateRef.current.activeIndex;

        if (reduceMotion) {
          floatIdx = targetIdx;
          prevFloat = floatIdx;
          vel.set(0, 0);
          curveAnim.value = 0;
          curveAnim.zoom = 1.06;
        } else {
          const diff = targetIdx - floatIdx;
          const distToTarget = Math.abs(diff);
          const durationFactor = clamp(
            0.45 / controlsRef.current.transitionDuration,
            0.15,
            4
          );
          const t = clamp(
            (0.18 - distToTarget * 0.06) * durationFactor,
            0.015,
            0.55
          );

          floatIdx += diff * t;

          const delta = floatIdx - prevFloat;

          vel.y = lerp(vel.y, delta * 60, clamp(0.16 * durationFactor, 0.04, 0.6));
          vel.x = lerp(vel.x, 0, clamp(0.14 * durationFactor, 0.04, 0.6));

          prevFloat = floatIdx;
        }

        const centreInt = Math.round(floatIdx);
        const drift = floatIdx - centreInt;

        for (let i = 0; i < VISIBLE; i++) {
          const offset = i - HALF;

          // Reduced-motion: only the active (center) card - hide the stack above/below.
          if (reduceMotion && offset !== 0) {
            meshes[i].material.uniforms.uAlpha.value = 0;
            meshes[i].position.set(0, 0, i);
            meshes[i].scale.set(CW, CH, 1);
            continue;
          }

          const itemIdx =
            ((centreInt + offset) % items.length + items.length) % items.length;

          const posY = reduceMotion ? 0 : (-offset + drift) * (CH + GAP);
          const dist = reduceMotion ? 0 : Math.abs(offset - drift);

          const scaleH = Math.max(0.76, 1.0 - dist * 0.06);

          const imageScaleValue = controlsRef.current.imageScale;
          const sw = CW * imageScaleValue;
          const sh = CH * scaleH * imageScaleValue;

          const baseOpacity = 0.88;
          const opacity = Math.max(0, baseOpacity - dist * 0.22) * anim.alpha;

          const wantTex = getTexture(items[itemIdx].img);

          if (wantTex && meshes[i].material.uniforms.uTexture.value !== wantTex) {
            meshes[i].material.uniforms.uTexture.value = wantTex;
          }

          syncImageSize(meshes[i]);

          meshes[i].position.set(0, posY, i);
          meshes[i].scale.set(sw, sh, 1);
          meshes[i].rotation.z = 0;

          meshes[i].material.uniforms.uVelocity.value.set(vel.x, vel.y * 0.28);
          meshes[i].material.uniforms.uAlpha.value = opacity;
          meshes[i].material.uniforms.uZoom.value =
            curveAnim.zoom - clamp(1.0 - dist, 0, 1) * 0.04;
          meshes[i].material.uniforms.uPlaneSize.value.set(sw, sh);
          meshes[i].material.uniforms.uCurvature.value =
            curveAnim.value * controlsRef.current.curveFactor;
          meshes[i].material.uniforms.uViewport.value.set(W / 2, H / 2);
        }

        renderer.render(scene, camera);
      },
    });

    loop.start();

    glRef.current = {
      setActive: (index: number) => {
        stateRef.current.activeIndex = index;
      },
      show,
      hide,
      onRowChange,
    };

    return () => {
      loop.destroy();

      window.removeEventListener("resize", onResize);
      reduceMotionMq?.removeEventListener?.("change", onReduceMotionChange);

      gsap.killTweensOf(anim);
      gsap.killTweensOf(curveAnim);

      geo.dispose();

      meshes.forEach((mesh) => {
        mesh.material.dispose();
      });

      Object.values(texCache).forEach((texture) => {
        texture.dispose();
      });

      renderer.dispose();
      renderer.domElement.remove();

      glRef.current = null;
    };
  }, [items]);

  const onEnter = useCallback((index: number) => {
    if (isDesktopRef.current) {
      const wasHovering = stateRef.current.hovering;

      stateRef.current.hasClicked = true;
      stateRef.current.hovering = true;
      stateRef.current.activeIndex = index;

      setHighlightedIndex(index);

      glRef.current?.setActive(index);

      if (!wasHovering) {
        glRef.current?.show(index);
      } else {
        glRef.current?.onRowChange(index);
      }

      return;
    }

    if (!stateRef.current.hasClicked) {
      setHighlightedIndex(index);
      return;
    }

    const wasHovering = stateRef.current.hovering;

    stateRef.current.hovering = true;
    stateRef.current.activeIndex = index;

    setHighlightedIndex(index);

    glRef.current?.setActive(index);

    if (!wasHovering) {
      glRef.current?.show(index);
    } else {
      glRef.current?.onRowChange(index);
    }
  }, []);

  const onLeave = useCallback((event: ReactPointerEvent) => {
    if (event.pointerType === "touch") return;
    if (stateRef.current.hasClicked) return;

    stateRef.current.hovering = false;

    setHighlightedIndex(null);

    glRef.current?.hide();
  }, []);

  const activateRow = useCallback((index: number) => {
    if (isDesktopRef.current) return;

    const wasHovering = stateRef.current.hovering;

    stateRef.current.hasClicked = true;
    stateRef.current.hovering = true;
    stateRef.current.activeIndex = index;

    setHighlightedIndex(index);

    glRef.current?.setActive(index);

    if (!wasHovering) {
      glRef.current?.show(index);
    } else {
      glRef.current?.onRowChange(index);
    }
  }, []);

  return (
    <section
      ref={mountRef}
      onPointerLeave={onLeave}
      className="relative isolate pt-24 min-h-screen overflow-visible bg-[#f0ede6] px-4 py-9 text-[#1e1c18] max-md:px-0 max-md:pt-40 max-md:pb-20 md:overflow-hidden md:px-10"
      style={{ cursor: "crosshair" }}
    >
      <div className="relative z-20 w-full overflow-x-auto pb-8 max-md:px-2 md:max-w-205 md:overflow-x-visible md:pb-0">
        <div className="absolute right-[-50%] top-[1vw] z-30 w-[20vw] rounded-[1vw] bg-black/6 px-3 py-2 text-[0.9rem] text-[#1e1c18] shadow-md backdrop-blur-sm max-md:hidden">
          Tip: hover the list rows - watch the images move and reveal.
        </div>

        <div
          className="grid min-w-155 gap-5 pb-4 text-sm uppercase tracking-widest md:min-w-0"
          style={{
            gridTemplateColumns:
              "72px minmax(140px,1fr) minmax(180px,1.1fr) 64px",
            color: "rgba(30,28,24,0.6)",
            borderBottom: "1px solid rgba(30,28,24,0.06)",
          }}
        >
          <div>ID</div>
          <div>Title</div>
          <div>Focus</div>
          <div>Year</div>
        </div>

        {items.map((item, index) => {
          const active = highlightedIndex === index;

          return (
            <div
              key={item.id}
              onPointerEnter={() => onEnter(index)}
              onPointerDown={() => activateRow(index)}
              onClick={() => activateRow(index)}
              className="min-w-155 md:min-w-0"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "72px minmax(140px,1fr) minmax(180px,1.1fr) 64px",
                gap: "20px",
                padding: "7px 0",
                borderBottom: "1px solid rgba(30,28,24,0.06)",
                cursor: "crosshair",
                transition: "color 0.15s",
                color: active ? "#FF5F00" : "rgba(30,28,24,0.6)",
              }}
            >
              <div style={{ fontSize: 13, letterSpacing: "0.03em" }}>
                {item.id}
              </div>

              <div style={{ fontSize: 15, fontWeight: 500 }}>
                {item.title}
              </div>

              <div style={{ fontSize: 13 }}>{item.focus}</div>

              <div style={{ fontSize: 15 }}>{item.year}</div>
            </div>
          );
        })}
      </div>

     <p
        className="pointer-events-none absolute bottom-[8%] right-0 z-20 max-w-87.5 text-right text-sm leading-relaxed max-[1025px]:hidden max-[1025px]:hidden md:absolute md:bottom-[10vw] md:right-[2vw] md:mt-0"
        style={{ color: "rgba(30,28,24,0.6)" }}
      >
        A curated collection of futuristic UI experiments, motion systems, and
        interactive components - crafted to push modern web experiences beyond
        the ordinary.
      </p>

      <p className="absolute bottom-15 right-10 z-40 hidden w-[50vw] rounded-lg bg-black/10 p-3 text-center text-lg backdrop-blur-xl max-[1025px]:block max-[1025px]:bottom-2 max-[1025px]:w-[80vw] max-[1025px]:text-sm">
        Click on an item to see the animation. Hover effects available on
        desktop.
      </p>
    </section>
  );
}
