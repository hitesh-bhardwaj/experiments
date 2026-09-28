"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createVisibilityGate } from "./createSuspendedRaf";

const IMAGE_ASPECT_RATIO = 1920 / 1080;
const TABLET_MAX_WIDTH = 768;
const MOBILE_MAX_WIDTH = 640;
const VELOCITY_TARGET_SCALE = 35;
const VELOCITY_SMOOTH_LERP = 0.06;
const VELOCITY_DECAY = 0.96;
const MOVEMENT_TIMEOUT_MS = 300;
const MOVEMENT_STATE_LERP = 0.05;
const INITIAL_MOUSE = 0.5;
const INITIAL_VELOCITY_Y = 0.5;
const INITIAL_TIME = 2;
const DEFAULT_GRID_SIZE = 35;
const DEFAULT_LERP = 0.1;
const EFFECT_RADIUS = 0.3;
const EFFECT_INTENSITY = 1.8;
const DEFAULT_IMAGE_URL = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg";
const DEFAULT_NOTICE =
  "Heads up: the pixel-drift responds to cursor velocity - desktop is the sweet spot.";

// Indirection so writing a shader uniform's `.value` (a plain mutable holder,
// not React state) isn't flagged as mutating a value returned from a hook.
function setUniformValue(uniform: { value: number }, value: number) {
  uniform.value = value;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(max, Math.max(min, numericValue))
    : fallback;
}

const PIXEL_SHIFT_VERT = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PIXEL_SHIFT_FRAG = /* glsl */ `
  uniform vec2 uMouse;
  uniform vec2 uVelocity;
  uniform float uBlockSize;
  uniform float uRadius;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uIsMoving;
  uniform sampler2D uTexture;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    vec2 blockCoord = floor(uv / uBlockSize) * uBlockSize + (uBlockSize * 0.5);
    blockCoord += sin(uTime * 0.3) * 0.002 + cos(uTime * 0.4) * 0.001;

    float dist = distance(blockCoord, uMouse);
    float smoothDist = smoothstep(uRadius * 1.2, 0.0, dist);

    float influence = smoothDist * (1.0 - dist / (uRadius * 1.2));
    influence *= 1.0 + sin(uTime * 1.5) * 0.15 + cos(uTime * 2.3) * 0.05;
    influence *= smoothstep(0.0, 1.0, uIsMoving);

    vec2 vel = uVelocity;
    float smoothSignX = vel.x / (abs(vel.x) + 0.08);
    float smoothSignY = vel.y / (abs(vel.y) + 0.08);
    float blend = smoothstep(-0.05, 0.15, abs(vel.x) - abs(vel.y));

    vec2 dir = mix(
      vec2(0.0, smoothSignY),
      vec2(smoothSignX, 0.0),
      blend
    );

    vec2 displacement = dir * influence * uBlockSize * uIntensity;
    displacement *= 1.0 + sin(uTime * 0.8) * 0.2 + cos(uTime * 1.2) * 0.1;

    vec2 displacedUV = uv - displacement;
    displacedUV += sin(displacedUV.x * 8.0 + uTime) * 0.002
      + cos(displacedUV.y * 6.0 + uTime * 0.8) * 0.001;

    vec4 color = texture2D(uTexture, displacedUV);
    color.rgb *= 1.0 + influence * 0.1;

    gl_FragColor = color;
  }
`;

interface PlaneWithShaderProps {
  texture: THREE.Texture;
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
}

function PlaneWithShader({
  texture,
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
}: PlaneWithShaderProps) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const isMovingRef = useRef(1);
  const lastMouseRef = useRef(new THREE.Vector2(INITIAL_MOUSE, INITIAL_MOUSE));
  const targetMouseRef = useRef(new THREE.Vector2(INITIAL_MOUSE, INITIAL_MOUSE));
  const targetVelocityRef = useRef(new THREE.Vector2(0, 0));
  const smoothedVelocityRef = useRef(new THREE.Vector2(0, 0));
  const { size, viewport } = useThree();
  const safeGridSize = clampNumber(gridSize, 8, 90, DEFAULT_GRID_SIZE);
  const safeLerp = clampNumber(lerp, 0.01, 0.6, DEFAULT_LERP);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMouse: { value: new THREE.Vector2(INITIAL_MOUSE, INITIAL_MOUSE) },
          uVelocity: { value: new THREE.Vector2(0, INITIAL_VELOCITY_Y) },
          uBlockSize: { value: 1 / DEFAULT_GRID_SIZE },
          uRadius: { value: EFFECT_RADIUS },
          uIntensity: { value: EFFECT_INTENSITY },
          uTime: { value: INITIAL_TIME },
          uIsMoving: { value: 1 },
          uTexture: { value: texture },
        },
        vertexShader: PIXEL_SHIFT_VERT,
        fragmentShader: PIXEL_SHIFT_FRAG,
        transparent: false,
      }),
    [texture]
  );

  useEffect(() => {
    shaderMaterialRef.current = shaderMaterial;
  }, [shaderMaterial]);

  useEffect(() => {
    setUniformValue(shaderMaterial.uniforms.uBlockSize, 1 / safeGridSize);
  }, [safeGridSize, shaderMaterial]);

  useEffect(() => {
    if (!mouseInteraction) {
      targetMouseRef.current.set(INITIAL_MOUSE, INITIAL_MOUSE);
      targetVelocityRef.current.set(0, 0);
      smoothedVelocityRef.current.set(0, 0);
      isMovingRef.current = 0;
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const nextMouse = new THREE.Vector2(
        event.clientX / size.width,
        1 - event.clientY / size.height
      );
      const nextVelocity = nextMouse
        .clone()
        .sub(lastMouseRef.current)
        .multiplyScalar(VELOCITY_TARGET_SCALE);

      targetMouseRef.current.copy(nextMouse);
      targetVelocityRef.current.copy(nextVelocity);
      lastMouseRef.current.copy(nextMouse);
      isMovingRef.current = 1;

      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }

      moveTimeoutRef.current = setTimeout(() => {
        isMovingRef.current = 0;
      }, MOVEMENT_TIMEOUT_MS);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, [mouseInteraction, size.height, size.width]);

  useFrame(() => {
    const shader = shaderMaterialRef.current;

    if (!shader) {
      return;
    }

    // Animation loop
    shader.uniforms.uTime.value = clockRef.current.getElapsedTime();
    shader.uniforms.uMouse.value.lerp(targetMouseRef.current, safeLerp);
    smoothedVelocityRef.current.lerp(
      targetVelocityRef.current,
      VELOCITY_SMOOTH_LERP
    );
    shader.uniforms.uVelocity.value.lerp(
      smoothedVelocityRef.current,
      safeLerp
    );
    targetVelocityRef.current.multiplyScalar(VELOCITY_DECAY);
    shader.uniforms.uIsMoving.value = THREE.MathUtils.lerp(
      shader.uniforms.uIsMoving.value,
      isMovingRef.current,
      MOVEMENT_STATE_LERP
    );
  });

  const viewportAspectRatio = viewport.width / viewport.height;
  const isTabletViewport =
    size.width <= TABLET_MAX_WIDTH && size.width > MOBILE_MAX_WIDTH;
  let planeWidth: number;
  let planeHeight: number;

  // Plane sizing
  if (isTabletViewport || IMAGE_ASPECT_RATIO > viewportAspectRatio) {
    planeWidth = viewport.width;
    planeHeight = viewport.width / IMAGE_ASPECT_RATIO;
  } else {
    planeHeight = viewport.height;
    planeWidth = viewport.height * IMAGE_ASPECT_RATIO;
  }

  return (
    <mesh>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <primitive object={shaderMaterial} attach="material" ref={materialRef} />
    </mesh>
  );
}

function resolveImageSource(source: any) {
  if (typeof source === "string") return source;
  if (source?.src) return source.src;

  return source;
}

function resolveTextureSource(source: any) {
  const imageSource = resolveImageSource(source);

  if (!imageSource) return imageSource;
  if (imageSource.startsWith("/")) return imageSource;

  try {
    new URL(imageSource);

    // external URL - return as-is (ensure your image host sends CORS headers)
  } catch {
    return imageSource;
  }

  return imageSource;
}

function loadTextureBlobUrl(source: any): Promise<string> {
  const imageSource = resolveTextureSource(source);

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
        `Unable to load PixelShift texture: ${imageSource}. Current origin is ${window.location.origin}. Make sure the public URL allows CORS for this site. ${error?.message || ""}`
      );
    });
}

interface PixelShiftSceneProps {
  img: unknown;
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
}

function Scene({
  img,
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
}: PixelShiftSceneProps) {
  const resolvedImage = resolveImageSource(img) || DEFAULT_IMAGE_URL;
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | undefined;

    loadTextureBlobUrl(resolvedImage)
      .then((nextObjectUrl) => {
        objectUrl = nextObjectUrl;

        if (!isCancelled) {
          setTextureUrl(nextObjectUrl);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.warn(error?.message || error);
        }
      });

    return () => {
      isCancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedImage]);

  const texture = useMemo(() => {
    if (!textureUrl) return null;

    const loader = new THREE.TextureLoader();

    loader.setCrossOrigin("anonymous");

    const nextTexture = loader.load(
      textureUrl,
      undefined,
      undefined,
      (error) => {
        console.warn(
          `Unable to decode PixelShift texture: ${resolvedImage}.`,
          error
        );
      }
    );

    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;

    return nextTexture;
  }, [resolvedImage, textureUrl]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  if (!texture) return null;

  return (
    <PlaneWithShader
      texture={texture}
      gridSize={gridSize}
      mouseInteraction={mouseInteraction}
      lerp={lerp}
    />
  );
}

interface PixelShiftProps {
  img?: unknown;
  imageUrl?: unknown;
  notice?: string;
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
}

export default function PixelShift({
  img,
  imageUrl = img || DEFAULT_IMAGE_URL,
  notice = DEFAULT_NOTICE,
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
}: PixelShiftProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");

  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? "always" : "never"),
    });
    setFrameloop(gate.isActive ? "always" : "never");
    return () => gate.destroy();
  }, []);

  return (
    <div ref={rootRef} className="relative h-screen w-full">
      <div className="pointer-events-none absolute left-1/2 top-40 z-10 hidden w-full -translate-x-1/2 px-5 max-[1025px]:flex max-[1025px]:justify-center max-md:left-0 max-md:block max-md:translate-x-0 max-md:pt-5">
        <p className="inline-flex max-w-[92vw] rounded-sm border border-white/15 bg-black/40 px-4 py-2 font-medium text-white/75 backdrop-blur max-[1025px]:w-[80%] max-[1025px]:text-center max-[1025px]:text-[2.8vw] max-md:w-full max-md:text-[3.5vw]">
          {notice}
        </p>
      </div>

      <Canvas aria-hidden="true" camera={{ position: [0, 0, 5], fov: 45 }} frameloop={frameloop}>
        <color attach="background" args={["#000000"]} />
        <Scene
          img={imageUrl}
          gridSize={gridSize}
          mouseInteraction={mouseInteraction}
          lerp={lerp}
        />
      </Canvas>
    </div>
  );
}
