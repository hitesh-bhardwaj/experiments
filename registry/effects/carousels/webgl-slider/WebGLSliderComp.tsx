"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useLenis } from "lenis/react";
import gsap from "gsap";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

const vertexShader = /* glsl */ `
 uniform float uFold;
 uniform float uHover;
 uniform vec2 uHoverPos;
 varying vec2 vUv;
 varying float vShade;

 void main() {
 vUv = uv;
 vec3 pos = position;

 float strength = abs(uFold);
 float dir = sign(uFold);

 float edgeUV = dir < 0.0 ? uv.y : (1.0 - uv.y);

 float foldLength = 1.8;
 float distFromEdge = (1.0 - edgeUV) * 3.0;
 float localUV = clamp((foldLength - distFromEdge) / foldLength, 0.0, 1.0);

 float edgeCurve = localUV * localUV;

 float A = max(strength * 3.14159, 0.001);
 float t = localUV * foldLength;
 float L_bend = 2.0;
 float R = L_bend / A;
 float t_bend = min(t, L_bend);
 float theta = (t_bend / L_bend) * A;
 float t_straight = max(t - L_bend, 0.0);

 float foldZ = R * (1.0 - cos(theta)) + t_straight * sin(A);
 pos.z += foldZ;

 float foldPull = (t_bend - R * sin(theta)) + t_straight * (1.0 - cos(A));
 pos.y += foldPull * dir;

 pos.x += edgeCurve * strength * 0.1 * dir;

 float dist = length(uv - uHoverPos);
 float hoverBend = smoothstep(0.7, 0.0, dist) * 0.9 * uHover;
 pos.z += hoverBend;

 vShade = 1.0 - edgeCurve * strength * 0.4;

 gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
 }
`;

const fragmentShader = /* glsl */ `
 uniform sampler2D uTexture;
 uniform vec2 uPlaneSize;
 uniform vec2 uImageSize;
 varying vec2 vUv;
 varying float vShade;

 void main() {
 vec2 planeAspect = vec2(uPlaneSize.x / uPlaneSize.y, uPlaneSize.y / uPlaneSize.x);
 vec2 imageAspect = vec2(uImageSize.x / uImageSize.y, uImageSize.y / uImageSize.x);
 vec2 ratio = min(planeAspect / imageAspect, 1.0);
 vec2 uv = vUv * ratio + (1.0 - ratio) * 0.5;

 vec4 color = texture2D(uTexture, uv);
 color.rgb *= vShade;
 gl_FragColor = color;
 }
`;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
const mod = (n: number, m: number): number => ((n % m) + m) % m;

function getMediaProxyUrl(src: string): string {
  return src;
}

export interface WebGLSliderImage {
  src: string;
  text: string;
}

interface WebGLSliderCompProps {
  images?: WebGLSliderImage[];
  distortionStrength?: number;
  transitionDuration?: number;
  enableHoverEffect?: boolean;
  imageWidth?: number;
  imageHeight?: number;
}

function WebGLSliderComp({
  images = [],
  distortionStrength = 1,
  transitionDuration = 0.6,
  enableHoverEffect = true,
  imageWidth = 3.2,
  imageHeight = 3,
}: WebGLSliderCompProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef(0);
  const lastScroll = useRef(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lenisResumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSnapping = useRef(false);
  const [isMobile, setIsMobile] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const announcedIndexRef = useRef(0);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    const syncReducedMotion = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches =
        "matches" in event ? event.matches : (((event as any).currentTarget as MediaQueryList | null)?.matches ?? prefersReducedMotion());
      setReduceMotion(matches);
    };

    if (mediaQuery) {
      syncReducedMotion(mediaQuery);
      mediaQuery.addEventListener("change", syncReducedMotion);
      return () => mediaQuery.removeEventListener("change", syncReducedMotion);
    }

    setReduceMotion(prefersReducedMotion());
  }, []);

  // Optional: if a Lenis instance exists somewhere in the tree, use it to
  // pause/resume smooth scrolling during the snap animation below. The
  // slider's own scroll position is always driven off native scrollY (see
  // the tick() loop), so it works the same with or without Lenis present.
  const lenis = useLenis();

  useEffect(() => {
    const readScroll = () =>
      window.scrollY || document.documentElement.scrollTop || 0;

    const handleScroll = () => {
      if (isSnapping.current) return;

      const current = readScroll();

      if (Math.abs(current - lastScroll.current) > 0.1) {
        lastScroll.current = current;

        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

        scrollTimeout.current = setTimeout(() => {
          if (isSnapping.current) return;

          const currentScroll = readScroll();
          const vh = window.innerHeight;
          const targetScroll = Math.round(currentScroll / vh) * vh;

          if (Math.abs(currentScroll - targetScroll) > 2) {
            isSnapping.current = true;
            lenis?.stop?.();

            const settle = () => {
              window.scrollTo(0, targetScroll);
              lastScroll.current = targetScroll;
              lenis?.scrollTo?.(targetScroll, { immediate: true, force: true });

              if (lenisResumeTimeout.current) {
                clearTimeout(lenisResumeTimeout.current);
              }

              lenisResumeTimeout.current = setTimeout(() => {
                lastScroll.current = targetScroll;
                lenis?.start?.();
                requestAnimationFrame(() => {
                  isSnapping.current = false;
                });
                lenisResumeTimeout.current = null;
              }, 1000);
            };

            const obj = { y: currentScroll };

            // Reduced motion still gets a brief, simple ease rather than the

            gsap.to(obj, {
              y: targetScroll,
              duration: reduceMotion ? 0.15 : transitionDuration,
              ease: reduceMotion ? "power1.out" : "power2.inOut",
              onUpdate: () => {
                window.scrollTo(0, obj.y);
              },
              onComplete: settle,
            });
          }
        }, 150);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      if (lenisResumeTimeout.current) clearTimeout(lenisResumeTimeout.current);
    };
  }, [lenis, reduceMotion, transitionDuration]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !images.length || isMobile) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2(-100, -100);

    const onMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    // Reduced motion: the pointer only drives the hover bend, which is
    // disabled below, so there is nothing to track.
    if (enableHoverEffect && !reduceMotion) {
      window.addEventListener("mousemove", onMouseMove);
    }

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    camera.position.z = 7;

    const width = window.innerWidth;
    const mobileViewport = width < 768;
    const isTablet = width >= 768 && width < 1025;
    const isCompact = width < 1025;

    const CARD_W = mobileViewport ? 1.55 : isTablet ? 2.25 : Math.max(1, Number(imageWidth) || 3.2);
    const CARD_H = mobileViewport ? 1.45 : isTablet ? 2.1 : Math.max(1, Number(imageHeight) || 3.0);
    const BASE_GAP = mobileViewport ? 4.7 : isTablet ? 5.1 : 4.5;
    const GAP = reduceMotion ? BASE_GAP * 1.25 : BASE_GAP;

    const total = images.length;

    const vFov = (camera.fov * Math.PI) / 180;
    const viewH = 2 * Math.tan(vFov / 2) * camera.position.z;

    const loopLength = total * GAP;
    const pxPerWorldUnit = window.innerHeight / GAP;

    const textEls = images.map((_, i) => {
      const el = document.getElementById(`slider-text-${i}`);

      if (el && el.classList.contains("hidden")) {
        el.classList.remove("hidden");
        el.style.display = "none";
      }

      return el;
    });

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
    const textures: THREE.Texture[] = [];

    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H, 64, 64);

    images.forEach((img, i) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: null },
          uFold: { value: 0.0 },
          uHover: { value: 0.0 },
          uHoverPos: { value: new THREE.Vector2(0.5, 0.5) },
          uPlaneSize: { value: new THREE.Vector2(CARD_W, CARD_H) },
          uImageSize: { value: new THREE.Vector2(1, 1) },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
      });

      const proxiedSrc = getMediaProxyUrl(img.src);

      const tex = loader.load(
        proxiedSrc,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.needsUpdate = true;

          if (texture.image) {
            const img = texture.image as any;
            mat.uniforms.uImageSize.value.set(
              img.width || img.videoWidth || 1,
              img.height || img.videoHeight || 1
            );
          }
        },
        undefined,
        (error) => {
          console.warn("Failed to load WebGL slider texture:", img.src, error);
        }
      );

      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;

      mat.uniforms.uTexture.value = tex;
      textures.push(tex);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.index = i;

      scene.add(mesh);
      meshes.push(mesh);
    });

    document.body.style.height = `${total * 100 + 100}vh`;

    let rafId: number;

    const targetUv = new THREE.Vector2();
    const mouseWorldDir = new THREE.Vector3();

    const halfViewConst = viewH / 2;
    const foldRangeConst = halfViewConst + CARD_H;
    const loopHalf = loopLength / 2;
    const invFoldRange = 1 / foldRangeConst;

    const CARD_W_OFFSET = mobileViewport
      ? CARD_W * 0.32
      : isTablet
        ? CARD_W * 0.46
        : CARD_W * 0.7;

    const CARD_H_75 = mobileViewport
      ? CARD_H * 0.48
      : isTablet
        ? CARD_H * 0.58
        : CARD_H * 0.75;

    const HALF_PI = Math.PI * 0.5;

    const mouseWorldPos = new THREE.Vector3();

    // Native scroll arrives in coarse per-wheel-tick jumps (unlike Lenis,
    // which interpolates internally), so we smooth it ourselves here to
    // keep the fold motion fluid regardless of how choppy the raw input is.

    let smoothScroll = window.scrollY || document.documentElement.scrollTop || 0;
    const SCROLL_LERP = reduceMotion ? 1 : 0.12;

    const tick = () => {
      rafId = requestAnimationFrame(tick);

      const rawScroll = window.scrollY || document.documentElement.scrollTop || 0;
      smoothScroll += (rawScroll - smoothScroll) * SCROLL_LERP;
      scrollRef.current = smoothScroll;

      mouseWorldDir
        .set(mouse.x, mouse.y, 0.5)
        .unproject(camera)
        .sub(camera.position)
        .normalize();

      const mouseDist = -camera.position.z / mouseWorldDir.z;

      mouseWorldPos
        .copy(camera.position)
        .add(mouseWorldDir.multiplyScalar(mouseDist));

      const viewW = viewH * camera.aspect;

      const arcRadiusX = mobileViewport
        ? viewW * 2.45
        : isTablet
          ? viewW * 2.05
          : viewW * 1.2;

      const arcRadiusY = mobileViewport
        ? viewH * 1.75
        : isTablet
          ? viewH * 1.55
          : viewW * 1.2;

      const invArcRadius = 1 / arcRadiusY;

      const worldOffset = scrollRef.current / pxPerWorldUnit;
      const wrappedOffset = mod(worldOffset, loopLength);

      if (total > 0) {
        const nextIndex = mod(Math.round(wrappedOffset / GAP), total);
        if (nextIndex !== announcedIndexRef.current) {
          announcedIndexRef.current = nextIndex;
          setActiveIndex(nextIndex);
        }
      }

      const halfScreenW = window.innerWidth / 2;
      const halfScreenH = window.innerHeight / 2;
      const invHalfViewW = 1 / (viewW / 2);
      const invHalfViewH = 1 / (viewH / 2);

      for (let idx = 0; idx < meshes.length; idx++) {
        const mesh = meshes[idx];
        const i = mesh.userData.index;
        const baseY = -i * GAP;

        let y = mod(baseY + wrappedOffset + loopHalf, loopLength) - loopHalf;

        const theta = y * invArcRadius;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        mesh.position.x = -arcRadiusX + arcRadiusX * cosTheta;
        mesh.position.y = arcRadiusY * sinTheta;
        mesh.rotation.z = theta;

        mesh.renderOrder = Math.floor(Math.abs(y) * 100);

        const isVisible = Math.abs(y) < foldRangeConst + CARD_H;

        if (mesh.visible !== isVisible) mesh.visible = isVisible;

        const textEl = textEls[i];

        const planeX = mesh.position.x;
        const planeY = mesh.position.y;
        const angle = mesh.rotation.z;

        const dx = mouseWorldPos.x - planeX;
        const dy = mouseWorldPos.y - planeY;

        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);
        const localX = dx * cosA - dy * sinA;
        const localY = dx * sinA + dy * cosA;

        targetUv.set(localX / CARD_W + 0.5, localY / CARD_H + 0.5);

        // Reduced motion: no pointer-following bend - uHover stays at 0, so
        // the card surface is unaffected by the cursor.
        if (enableHoverEffect && !reduceMotion) {
          mesh.material.uniforms.uHoverPos.value.lerp(targetUv, 0.15);

          const isMouseOffscreen = mouse.x < -10 || mouse.y < -10;
          const hoverTarget = isMouseOffscreen ? 0.0 : 1.0;

          mesh.material.uniforms.uHover.value +=
            (hoverTarget - mesh.material.uniforms.uHover.value) * 0.1;
        }

        if (!isVisible) {
          if (textEl && textEl.style.display !== "none") {
            textEl.style.display = "none";
          }

          continue;
        }

        const fold = isCompact ? 0.0 : clamp(y * invFoldRange, -1, 1);

        // Reduced motion: keep `fold` driving text offset/spacing exactly as
        // in normal mode, only mute the GPU curl/bend deformation.
        mesh.material.uniforms.uFold.value = reduceMotion ? 0.0 : fold * distortionStrength;

        if (textEl) {
          if (textEl.style.display === "none") {
            textEl.style.display = "block";
          }

          const progressToCenter = Math.cos(fold * HALF_PI);
          const localOffsetX = progressToCenter * CARD_W_OFFSET;
          const localOffsetY = fold * CARD_H_75;

          const textWorldX =
            mesh.position.x +
            localOffsetX * cosTheta -
            localOffsetY * sinTheta;

          const textWorldY =
            mesh.position.y +
            localOffsetX * sinTheta +
            localOffsetY * cosTheta;

          const screenX = halfScreenW + textWorldX * invHalfViewW * halfScreenW;
          const screenY = halfScreenH - textWorldY * invHalfViewH * halfScreenH;

          textEl.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) rotate(${-theta}rad)`;
        }
      }

      renderer.render(scene, camera);
    };

    tick();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      if (lenisResumeTimeout.current) {
        clearTimeout(lenisResumeTimeout.current);
      }

      cancelAnimationFrame(rafId);

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);

      textEls.forEach((el) => {
        if (el) {
          el.style.display = "none";
          el.style.transform = "";
        }
      });

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      textures.forEach((texture) => {
        texture.dispose();
      });

      meshes.forEach((mesh) => {
        scene.remove(mesh);
        mesh.material.dispose();
      });

      geo.dispose();
      renderer.dispose();

      document.body.style.height = "";
    };
  }, [images, isMobile, reduceMotion, distortionStrength, enableHoverEffect, imageWidth, imageHeight]);

  if (isMobile) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#050505] px-8 text-white">
        <div className="pointer-events-none flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="text-[11vw] font-light leading-none tracking-tight">Open on desktop</p>
          <p className="text-sm uppercase tracking-[0.3em] text-white/35">WebGL Slider</p>
          <p className="text-sm leading-relaxed text-white/55">
            For the full fold, depth, and motion experience, view this slider on a larger screen.
          </p>
        </div>
      </div>
    );
  }

  const activeImage = images[activeIndex];
  const identifyingText = activeImage?.text
    ? String(activeImage.text).replace(/\s+/g, " ").trim()
    : null;
  const slideAnnouncement = images.length
    ? identifyingText
      ? `${identifyingText}, slide ${activeIndex + 1} of ${images.length}`
      : `Slide ${activeIndex + 1} of ${images.length}`
    : "";

  return (
    <div className="relative w-full">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {slideAnnouncement}
      </div>
      <div
        ref={containerRef}
        className="fixed inset-0 z-10 h-screen w-full pointer-events-none"
      />

      <div className="fixed inset-0 z-20 h-screen w-full overflow-hidden pointer-events-none">
        {images.map((img, i) => (
          <div
            key={i}
            id={`slider-text-${i}`}
            className="absolute top-0 left-0 hidden will-change-transform"
          >
            <div className="flex origin-center -translate-x-1/2 -translate-y-1/2 flex-col">
              <p className="whitespace-pre-wrap text-[6.5vw] font-bold leading-[0.85] tracking-tighter max-[1025px]:text-[7.6vw] max-md:text-[9.4vw]">
                {img.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WebGLSliderComp;
