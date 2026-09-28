"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import Lenis from "lenis";
import gsap from "gsap";
import { createSuspendedRaf, createVisibilityGate } from "./createSuspendedRaf";

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
    getServerReducedMotionSnapshot
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
 url: string
 description: string
}

interface PortfolioSliderProps {
 items: PortfolioSliderItem[]
 zoomFactor?: number
 scrollSpeed?: number
 showCaption?: boolean
}

export default function PortfolioSlider({
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

 useEffect(() => {
 controlsRef.current = { zoomFactor, scrollSpeed };
 }, [zoomFactor, scrollSpeed]);

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

 items.forEach((item, i) => {
 const texture = loader.load(item.url);
 texture.minFilter = THREE.LinearFilter;

 const geometry = new THREE.PlaneGeometry(
 planeWidth,
 planeHeight,
 32,
 32
 );

 const material = new THREE.ShaderMaterial({
 uniforms: {
 uTexture: { value: texture },
 uZoom: { value: 1.2 },
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
 varying vec2 vUv;

 void main() {
 vec2 uv = vUv;
 uv = (uv - 0.5) / uZoom + 0.5;
 gl_FragColor = texture2D(uTexture, uv);
 }
 `,
 });

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
 const targetScrollOffset = Math.round(currentScrollOffset / spacing) * spacing;
 const targetOffset = targetScrollOffset / liveScrollSpeed;

 if (Math.abs(offset - targetOffset) > 1) {
 isSnapping = true;
 lenis.stop();
 snapObj.offset = offset;
 gsap.to(snapObj, {
 offset: targetOffset,
 duration: 0.5,
 ease:"power2.inOut",
 onUpdate: () => {
 offset = snapObj.offset;
 },
 onComplete: () => {
 isSnapping = false;
 if (gate.isActive) {
 lenis.start();
 }
 }
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

 const liveViewportConfig = getViewportConfig(controlsRef.current.zoomFactor);
 const scrollOffset = offset * controlsRef.current.scrollSpeed;

const targetRadius = Math.min(
  liveViewportConfig.baseRadius + Math.abs(delta) * 0.12,
  liveViewportConfig.maxRadius
);
 currentRadius += (targetRadius - currentRadius) * 0.1;

 if (circleRef.current) {
 const R = -(scrollOffset / spacing) * (360 / 21);
 circleRef.current.style.transform = `translate(-50%, -50%) rotate(${R}deg)`;
 circleRef.current.style.setProperty('--radius', `-${currentRadius}vh`);
 circleRef.current.style.setProperty('--rotation', `${R}deg`);
 }

 if (textContainerRef.current) {
 let rawIndex = Math.floor((scrollOffset / spacing) + 0.5);

 if (rawIndex !== prevRawIndexRef.current) {
 const isForward = rawIndex > prevRawIndexRef.current;
 prevRawIndexRef.current = rawIndex;

 let activeIndex = ((rawIndex % items.length) + items.length) % items.length;
 const newText = items[activeIndex].description;
  if (textContainerRef.current.dataset.activeText !== newText) {
 textContainerRef.current.dataset.activeText = newText;
  const oldDiv = activeTextRef.current;
  const newDiv = document.createElement("div");
 newDiv.className ="absolute w-full h-full flex items-center justify-center";
 newDiv.innerText = newText;
  textContainerRef.current.appendChild(newDiv);
 activeTextRef.current = newDiv;

 const yOffset = isForward ? 30 : -30;

 gsap.fromTo(newDiv, { y: yOffset }, { y: 0, duration: 0.5, ease:"power3.out" });
 if (oldDiv) {
 gsap.to(oldDiv, {  y: -yOffset,  duration: 0.5,  ease:"power3.out",  onComplete: () => {
 if (oldDiv.parentNode) {
 oldDiv.parentNode.removeChild(oldDiv);
 }
 }  });
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

const targetZoom = 1 + (1 - arc) * liveViewportConfig.zoomFactor;

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

 return () => {
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
 }, [items]);

 const scrollHeight = items.length * 100; // 100vh per image for smooth infinite scrolling

 return (
 <div className="w-full bg-black" style={{ height: `${scrollHeight}vh` }}>
 <div ref={containerRef} className="sticky top-0 h-screen w-full overflow-hidden">
 {showCaption && (
 <div
 ref={textContainerRef}
 data-active-text={items[0].description}
 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-lg uppercase tracking-[0.2em] z-20 pointer-events-none mix-blend-difference overflow-hidden h-7.5 w-50 max-[1025px]:h-9 max-[1025px]:w-70 max-[1025px]:text-xl max-md:h-12 max-md:w-[84vw] max-md:text-base"
 >
 <div ref={activeTextRef} className="absolute w-full h-full flex items-center justify-center">
 {items[0].description}
 </div>
 </div>
 )}
 <div  ref={circleRef}  className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none z-10"
 style={{ transform:"translate(-50%, -50%) rotate(0deg)" }}
 >
 {items.map((item, i) => {
 const angle = i * (360 / items.length);
 return (
 <div
 key={i}
 className="absolute h-9 w-7 -ml-3.5 -mt-4.5 max-[1025px]:h-12 max-[1025px]:w-9 max-[1025px]:-ml-4.5 max-[1025px]:-mt-6 max-md:h-9 max-md:w-7 max-md:-ml-3.5 max-md:-mt-4.5"
 style={{
transform: `rotate(${angle}deg) translateY(var(--radius, -35vh)) rotate(calc(-${angle}deg - var(--rotation, 0deg)))`
}}
 >
 <img src={item.url} alt={item.description} className="absolute inset-0 w-full h-full object-cover" />
 </div>
 );
 })}
 </div>

 {reducedMotion && (
 <div
 aria-live="polite"
 className="fixed bottom-6 right-6 z-60 w-fit max-w-[min(90vw,26rem)] rounded-md border border-black/10 bg-[#F8F8F3] p-6 text-center shadow-sm"
 >
 <h2 className="text-[1.15vw] max-md:text-[3.5vw] max-[1025px]:text-[2vw] leading-none text-[#111111]">
 This effect can&apos;t be reduced.
 </h2>
 <p className="mx-auto mt-4 text-sm leading-6 text-black/65">
 Reduced motion is enabled, but this continuous scroll-driven
 3D carousel is the navigation itself, and can&apos;t be
 simplified to a fade without losing the ability to browse.
 </p>
 </div>
 )}
 </div>
 </div>
 );
}
