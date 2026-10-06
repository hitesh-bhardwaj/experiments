"use client"
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createSuspendedRaf } from "./createSuspendedRaf";
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

export default CurvedPlaneHorizontal;
