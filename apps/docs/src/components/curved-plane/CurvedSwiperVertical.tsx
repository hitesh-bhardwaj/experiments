"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";
import { createSuspendedRaf } from "./createSuspendedRaf";

// GLSL Shaders
const vertexShader = `
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

const fragmentShader = `
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

const VISIBLE_ROWS = 6;
const NUM_COLUMNS = 3;
const FIXED_IMAGE_WIDTH = 280;
const FIXED_IMAGE_HEIGHT = 380;
const SPACING_X = FIXED_IMAGE_WIDTH + 150;
const SPACING_Y = FIXED_IMAGE_HEIGHT + 80;

const DEFORMATION_INTENSITY = 8;
const DEFORMATION_SENSITIVITY = 0.02;
const DEFORMATION_SMOOTHNESS = 0.12;
const DRAG_SENSITIVITY = 2.2;
const MOMENTUM_FRICTION = 0.90;        // reduced from 0.94
const SCROLL_SMOOTHNESS = 0.05;        // reduced from 0.08
const MAX_SCROLL_VELOCITY = 0.05;      // reduced from 0.1
const MAX_DEFORMATION = .1;

function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return clamp(number, min, max);
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
    const totalMeshes = (VISIBLE_ROWS + 2) * NUM_COLUMNS;

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

    const isTablet = () => viewWidth >= 768 && viewWidth <= 1024;

    const updateMeshes = () => {
      const offset = offsetRef.current;
      const deform = deformationRef.current;
      const tablet = isTablet();
      const currentImageWidth = FIXED_IMAGE_WIDTH * controlsRef.current.imageSize;
      const currentImageHeight = FIXED_IMAGE_HEIGHT * controlsRef.current.imageSize;
      const spacingX = currentImageWidth + 150 * controlsRef.current.gap;
      const spacingY = currentImageHeight + 80 * controlsRef.current.gap;

      meshes.forEach((mesh, i) => {
        const col = i % NUM_COLUMNS;
        const row = Math.floor(i / NUM_COLUMNS);

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
        
        const baseY = (row - VISIBLE_ROWS / 2) * spacingY;
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
          deform * DEFORMATION_INTENSITY * deformDirection * controlsRef.current.curveValue
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
          velocityRef.current *= MOMENTUM_FRICTION;
        }

        const now = Date.now();
        const isRecentlyScrolled = now - lastScrollTime.current < 100;

        if (!dragging.current && !isRecentlyScrolled) {
          targetDeformationRef.current = 0;
        }

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
      const currentImageHeight = FIXED_IMAGE_HEIGHT * controlsRef.current.imageSize;
      const spacingY = currentImageHeight + 80 * controlsRef.current.gap;

      const delta = (dy / spacingY) * DRAG_SENSITIVITY * controlsRef.current.speed;
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
        -MAX_SCROLL_VELOCITY,
        Math.min(MAX_SCROLL_VELOCITY, -delta / (dt / 16))
      );

      const deformIntensity = Math.max(
        -MAX_DEFORMATION,
        Math.min(MAX_DEFORMATION, instantVelocity * DEFORMATION_SENSITIVITY)
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
        -MAX_SCROLL_VELOCITY,
        Math.min(MAX_SCROLL_VELOCITY, delta * 0.15 * controlsRef.current.speed)  // reduced from 0.4
      );

      const deformIntensity = Math.max(
        -MAX_DEFORMATION,
        Math.min(MAX_DEFORMATION, delta * DEFORMATION_SENSITIVITY)
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

export default CurvedPlaneVertical;
