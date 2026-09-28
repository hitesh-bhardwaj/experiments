"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, extend, useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { createVisibilityGate } from "./createSuspendedRaf";

gsap.registerPlugin(ScrollTrigger);

const INITIAL_POINTER = 0.5;
const DEFAULT_GRID_SIZE = 35;
const DEFAULT_LERP = 0.1;
const DEFAULT_BACKGROUND_COLOR = "#000000";
const DEFAULT_CIRCLE_COLOR_A = "#0080b3";
const DEFAULT_CIRCLE_COLOR_B = "#801acc";
const HOVER_LERP = 0.05;
const PLANE_WIDTH = 18;
const PLANE_HEIGHT = 12;
const PIXEL_CIRCLES_VERT = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PIXEL_CIRCLES_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uHover;
  uniform float uBasePixels;
  uniform float uDynamicRange;
  uniform float uNoiseStrength;
  uniform float uDisplacement;
  uniform float uColorBoost;
  uniform float uVignette;
  uniform vec2  uResolution;
  uniform vec2  uCircle1Center;
  uniform vec2  uCircle2Center;
  uniform vec3  uBackgroundColor;
  uniform vec3  uCircleColorA;
  uniform vec3  uCircleColorB;

  varying vec2 vUv;

  float noise2D(vec2 p) {
    vec2 ip = floor(p);
    vec2 f = fract(p);
    f = f * (3.0 - 2.0 * f);
    vec4 h = vec4(0.0, 1.0, 0.0, 1.0);
    vec4 n = h.xyzy * ip.x + h.xxzz * ip.y;
    n = sin(n * vec4(12.9898, 78.233, 45.164, 94.673));
    return dot(mix(n.xy, n.zw, f.y), mix(h.xz, h.yw, f.x)) * 0.1 + 0.5;
  }

  vec2 pixelate(vec2 uv, float pixels) {
    vec2 pixelUV = floor(uv * pixels) / pixels;
    float n = fract(sin(dot(floor(pixelUV * 10.0), vec2(12.9898, 78.233))) * 43758.5453)
      * uNoiseStrength
      * 0.9;
    return pixelUV + n * uHover;
  }

  void main() {
    vec2 uv = vUv;
    float dist = distance(uv, uMouse);
    float time = uTime * 2.0;
    float dynamicPixels = uBasePixels * (1.0 + sin(time) * uDynamicRange);
    float finalPixels = mix(
      uBasePixels,
      dynamicPixels,
      smoothstep(0.5, 0.0, dist) * uHover
    );

    vec2 disp = vec2(
      noise2D(uv + time),
      noise2D(uv * 3.0 + time + 1.0)
    ) * uDisplacement * uHover;

    vec2 pixelatedUV = mix(
      uv + disp,
      pixelate(uv + disp, finalPixels),
      smoothstep(0.20, 0.0, dist) * 3.0 * uHover
    );

    float c1 = smoothstep(0.5, 0.0, distance(pixelatedUV, uCircle1Center));
    float c2 = smoothstep(0.5, 0.0, distance(pixelatedUV, uCircle2Center));

    vec3 color = mix(
      uBackgroundColor,
      mix(uCircleColorA, uCircleColorB, c2),
      c1
    );

    float vig = 1.0 - smoothstep(0.3, 3.2, length(uv - 0.5) * 2.0);
    gl_FragColor = vec4(color * mix(1.0, vig, uVignette), 1.0);
  }
`;

class PixelCirclesMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(INITIAL_POINTER, INITIAL_POINTER) },
        uHover: { value: 0.7 },
        uBasePixels: { value: 35.0 },
        uDynamicRange: { value: 0.02 },
        uNoiseStrength: { value: 0.05 },
        uDisplacement: { value: 0.02 },
        uColorBoost: { value: 0.0 },
        uVignette: { value: 0.6 },
        uResolution: { value: new THREE.Vector2(2, 2) },
        uCircle1Center: { value: new THREE.Vector2(0.3, 0.5) },
        uCircle2Center: { value: new THREE.Vector2(0.7, 0.5) },
        uBackgroundColor: { value: new THREE.Color(DEFAULT_BACKGROUND_COLOR) },
        uCircleColorA: { value: new THREE.Color(DEFAULT_CIRCLE_COLOR_A) },
        uCircleColorB: { value: new THREE.Color(DEFAULT_CIRCLE_COLOR_B) },
      },
      vertexShader: PIXEL_CIRCLES_VERT,
      fragmentShader: PIXEL_CIRCLES_FRAG,
    });
  }
}

extend({ PixelCirclesMaterial });

// pixelCirclesMaterial is a custom shader material registered via extend(),
// so it isn't part of JSX.IntrinsicElements; reference it through an
// any-typed tag so JSX accepts it without changing what's rendered.
const PixelCirclesMaterialTag = "pixelCirclesMaterial" as any;

const DEFAULT_FIRST_LINE = {
  prefix: "Building ",
  highlight: "Interfaces.",
  highlightClassName: "font-light",
  className: "text-left",
};

const DEFAULT_SECOND_LINE = {
  prefix: "Shipping ",
  highlight: "Experiences.",
  highlightClassName: "font-medium",
  className: "text-right font-light max-md:text-left",
};

const DEFAULT_MOBILE_NOTICE =
  "Pro tip: this one's built for a mouse - try it on desktop for the cleanest pixel trail.";
const DEFAULT_DESCRIPTION =
  "The Vault is a curated collection of production-ready UI effects built to help developers ship polished interactions faster.";

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(max, Math.max(min, numericValue))
    : fallback;
}

function createShaderPalette(color: string) {
  const baseColor = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  baseColor.getHSL(hsl);

  if (hsl.l < 0.02 && hsl.s < 0.02) {
    return {
      background: baseColor,
      circleA: new THREE.Color(DEFAULT_CIRCLE_COLOR_A),
      circleB: new THREE.Color(DEFAULT_CIRCLE_COLOR_B),
    };
  }

  const hue = hsl.s < 0.02 ? 0.58 : hsl.h;
  const saturation = Math.max(0.45, hsl.s);
  const brightness = Math.max(0.34, Math.min(0.7, hsl.l + 0.18));

  return {
    background: baseColor,
    circleA: new THREE.Color().setHSL(hue, saturation, brightness),
    circleB: new THREE.Color().setHSL(
      (hue + 0.14) % 1,
      Math.min(1, saturation + 0.12),
      Math.min(0.74, brightness + 0.08)
    ),
  };
}

interface PixelCirclesPlaneProps {
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
  backgroundColor?: string;
}

function PixelCirclesPlane({
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
}: PixelCirclesPlaneProps) {
  const materialRef = useRef<PixelCirclesMaterial | null>(null);
  const pointerRef = useRef({
    target: { x: INITIAL_POINTER, y: INITIAL_POINTER },
    current: { x: INITIAL_POINTER, y: INITIAL_POINTER },
  });
  const isHoveredRef = useRef(false);
  const safeGridSize = clampNumber(gridSize, 8, 90, DEFAULT_GRID_SIZE);
  const safeLerp = clampNumber(lerp, 0.01, 0.6, DEFAULT_LERP);
  const paletteRef = useRef(createShaderPalette(backgroundColor));

  useEffect(() => {
    paletteRef.current = createShaderPalette(backgroundColor);
  }, [backgroundColor]);

  useEffect(() => {
    const onResize = () => {
      materialRef.current?.uniforms.uResolution.value.set(
        window.innerWidth,
        window.innerHeight
      );
    };

    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.set(".text-left", {
        opacity: 1,
      });

      gsap.from(".text-left", {
        xPercent: -25,
        duration: 3.5,
        ease: "expo.out",
      });

      gsap.set(".text-right", {
        opacity: 1,
      });

      gsap.from(".text-right", {
        xPercent: 25,
        duration: 3.5,
        ease: "expo.out",
      });

     
    });

    return () => {
      context.revert();
    };
  }, []);

  const onPointerEnter = () => {
    if (!mouseInteraction) {
      return;
    }

    isHoveredRef.current = true;
  };

  const onPointerLeave = () => {
    isHoveredRef.current = false;
  };

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!mouseInteraction || !event.uv) return;
    pointerRef.current.target = { x: event.uv!.x, y: event.uv!.y };
  };

  useFrame(({ clock }) => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    // Animation loop
    const time = clock.getElapsedTime();
    const { target, current } = pointerRef.current;
    const { uniforms } = material;

    uniforms.uTime.value = time;
    uniforms.uBasePixels.value = safeGridSize;
    uniforms.uBackgroundColor.value.copy(paletteRef.current.background);
    uniforms.uCircleColorA.value.copy(paletteRef.current.circleA);
    uniforms.uCircleColorB.value.copy(paletteRef.current.circleB);

    if (!mouseInteraction) {
      target.x = INITIAL_POINTER;
      target.y = INITIAL_POINTER;
    }

    current.x += (target.x - current.x) * safeLerp;
    current.y += (target.y - current.y) * safeLerp;
    uniforms.uMouse.value.set(current.x, current.y);
    uniforms.uHover.value +=
      ((mouseInteraction && isHoveredRef.current ? 1 : 0) -
        uniforms.uHover.value) *
      HOVER_LERP;
    uniforms.uCircle1Center.value.set(
      0.5 + 0.2 * Math.sin(time * 0.3),
      0.5 + 0.2 * Math.cos(time * 0.3)
    );
    uniforms.uCircle2Center.value.set(
      0.5 + 0.3 * Math.sin(time * 0.1),
      0.5 + 0.15 * Math.cos(time * 0.8)
    );
  });

  return (
    <mesh
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
    >
      <planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />
      <PixelCirclesMaterialTag ref={materialRef} />
    </mesh>
  );
}

interface PixelationLine {
  prefix?: string
  highlight?: string
  highlightClassName?: string
  className?: string
}

interface PixelationProps {
  firstLine?: PixelationLine;
  secondLine?: PixelationLine;
  mobileNotice?: string;
  description?: string;
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
  backgroundColor?: string;
}

export default function Pixelation({
  firstLine = DEFAULT_FIRST_LINE,
  secondLine = DEFAULT_SECOND_LINE,
  mobileNotice = DEFAULT_MOBILE_NOTICE,
  description = DEFAULT_DESCRIPTION,
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
}: PixelationProps) {
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
    <div ref={rootRef} className="relative h-screen w-screen overflow-hidden">
      <div className="fixed left-0 top-0 h-full w-full overflow-hidden">
        <Canvas aria-hidden="true" frameloop={frameloop}>
          <color attach="background" args={[backgroundColor]} />
          <PixelCirclesPlane
            gridSize={gridSize}
            mouseInteraction={mouseInteraction}
            lerp={lerp}
            backgroundColor={backgroundColor}
          />
        </Canvas>
      </div>

      <section
        className="pointer-events-none relative z-10 flex h-screen w-full flex-col justify-center gap-[12vw] px-[5vw] max-[1025px]:h-[90vh] max-[1025px]:gap-[7vw] max-md:h-[90vh] max-md:gap-[7vw]"
      >
        <h1 className="mt-[4vw] flex flex-col text-[8vw] font-medium leading-[1.2] text-white max-[1025px]:text-[12vw] max-md:text-[15vw]">
          <span className={`${firstLine.className} opacity-0`}>
            {firstLine.prefix}
            <span className={firstLine.highlightClassName}>
              {firstLine.highlight}
            </span>
          </span>
          <span className={`${secondLine.className} opacity-0`}>
            {secondLine.prefix}
            <span className={secondLine.highlightClassName}>
              {secondLine.highlight}
            </span>
          </span>
        </h1>

        <p className="hidden font-medium tracking-wide text-white/70 max-[1025px]:block max-[1025px]:text-[3vw] max-md:text-[4vw]">
          {mobileNotice}
        </p>

        <p className="w-[30%] text-[1.5vw] text-white max-[1025px]:mt-[5vw] max-[1025px]:w-[80%] max-[1025px]:text-[3vw] max-md:w-[90%] max-md:text-[5vw]">
          {description}
        </p>
      </section>
    </div>
  );
}
