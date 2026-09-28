// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { prefersReducedMotion } from "../Animations/reducedMotion";

// The GLSL value-noise the shader used to run per pixel. Its input never varied
// across the screen, so one call per frame here reproduces it exactly.
const hash = (x: number) => {
  const v = Math.sin(x * 12.9898) * 43758.5453123;
  return v - Math.floor(v);
};

const noise1D = (x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3.0 - 2.0 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorBase;
uniform float uBaseStart;
uniform float uWaveHeight;
uniform float uWaveAmplitude;
uniform float uWaveCount;
uniform vec3 uColorDark;
// Constant across the screen, so it is computed once per frame on the CPU
// rather than re-derived from noise in every fragment
uniform float uWavePhase;

void main() {
  float invertedY = 1.0 - vUv.y;

  // The travelling wave: a sine across x, phase-shifted by noise so the crest
  // wanders instead of marching evenly
  // uWaveCount is in whole waves across the screen, so scale it to radians
  float wave = sin(vUv.x * uWaveCount * 6.2831853 + uTime * 1.3 + uWavePhase) * uWaveAmplitude;
  float verticalOffset = sin(uTime * 0.65) * 0.05;

  // The base gets its own crest: same travelling motion, shifted a half cycle
  // and swung less far. The original code left this boundary straight because a
  // full-amplitude trough here dipped into the dark region and smeared it; at
  // 60% amplitude, offset in phase, the troughs stay well clear.
  float baseWave =
    sin(vUv.x * uWaveCount * 6.2831853 + uTime * 1.04 + uWavePhase + 3.1415927)
    * uWaveAmplitude * 0.6;

  float yPos = invertedY + verticalOffset;

  // The wave lives on the top boundary, where the black crown gives way to color
  float waveMask = smoothstep(uWaveHeight - 0.22, uWaveHeight + 0.46, yPos + wave);
  float edgeFalloff = smoothstep(0.0, 0.1, yPos);
  float finalMask = waveMask * edgeFalloff;

  vec3 gradientColor = mix(uColorA, uColorB, invertedY);
  // The mask falls to a deep navy rather than pure black, so the dark region
  // keeps its blue cast instead of greying the midtones out
  vec3 finalColor = mix(uColorDark, gradientColor, finalMask);
  // True black at the very crown, above where the color begins
  finalColor *= smoothstep(0.0, uWaveHeight + 0.10, invertedY);

  // The melt into white, riding its own crest. The wave is added to the
  // coordinate rather than to uBaseStart so the fade keeps its full width.
  float base = smoothstep(uBaseStart, 1.0, invertedY + baseWave);
  finalColor = mix(finalColor, uColorBase, base);

  // Opaque all the way down: the base is already solid white by the bottom, so
  // it hands off to the white page with no fade and nothing dark showing through
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

interface ShaderProps {
  /** Color at the top of the wave */
  colorA: string;
  /** Color at the base of the wave */
  colorB: string;
  /** Color the base melts into, matching the page behind the hero */
  colorBase: string;
  /** Height (0-1 from the bottom) where the melt into the base color begins */
  baseStart: number;
  /** Height (0-1 from the bottom) the wave crest sits at */
  waveHeight: number;
  /** How far the crest swings. Larger = a more pronounced wave */
  waveAmplitude: number;
  /** How many whole waves span the screen */
  waveCount: number;
  /** Deep tone the mask falls to, keeping the dark region blue rather than grey */
  colorDark: string;
  /** Frozen on a single frame when motion is reduced */
  animate: boolean;
  /** False while the hero is scrolled off screen, pausing the render loop */
  visible: boolean;
}

const NoiseMaterial = ({
  colorA,
  colorB,
  colorBase,
  baseStart,
  waveHeight,
  waveAmplitude,
  waveCount,
  colorDark,
  animate,
  visible,
}: ShaderProps) => {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Rebuilt only when the colors change, so a re-render cannot reset uTime
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uColorBase: { value: new THREE.Color(colorBase) },
      uBaseStart: { value: baseStart },
      uWaveHeight: { value: waveHeight },
      uWaveAmplitude: { value: waveAmplitude },
      uWaveCount: { value: waveCount },
      uColorDark: { value: new THREE.Color(colorDark) },
      uWavePhase: { value: 0 },
    }),
    [
      colorA,
      colorB,
      colorBase,
      baseStart,
      waveHeight,
      waveAmplitude,
      waveCount,
      colorDark,
    ],
  );

  useFrame(({ clock }) => {
    if (!animate || !visible || !materialRef.current) return;
    const t = clock.getElapsedTime();
    materialRef.current.uniforms.uTime.value = t;
    materialRef.current.uniforms.uWavePhase.value =
      (noise1D(t * 0.26) * 0.5 + 0.5) * 1.2;
  });

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      transparent
    />
  );
};

const Plane = ({
  colorA,
  colorB,
  colorBase,
  baseStart,
  waveHeight,
  waveAmplitude,
  waveCount,
  colorDark,
  animate,
  visible,
}: ShaderProps) => {
  // Sized from the viewport so the plane always fills the canvas
  const { viewport } = useThree();

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <NoiseMaterial
        colorA={colorA}
        colorB={colorB}
        colorBase={colorBase}
        baseStart={baseStart}
        waveHeight={waveHeight}
        waveAmplitude={waveAmplitude}
        waveCount={waveCount}
        colorDark={colorDark}
        animate={animate}
        visible={visible}
      />
    </mesh>
  );
};

interface GradientProps {
  colorA?: string;
  colorB?: string;
  /** Color the base melts into. Match the page behind the hero */
  colorBase?: string;
  /** Height (0-1 from the bottom) where the melt into white begins */
  baseStart?: number;
  /** Height (0-1 from the bottom) the wave crest sits at */
  waveHeight?: number;
  /** How far the crest swings. Larger = a more pronounced wave */
  waveAmplitude?: number;
  /** How many whole waves span the screen */
  waveCount?: number;
  /** Deep tone the mask falls to, keeping the dark region blue rather than grey */
  colorDark?: string;
  className?: string;
}

/**
 * Animated noise-wave gradient. A travelling wave crest separates the black
 * crown from the color below, which fades cleanly to white at the base. Fills
 * its positioned parent rather than the viewport, so the hero sets the extent.
 */
const Gradient = ({
  colorA = "#1B4EF0",
  colorB = "#E2EAF8",
  colorBase = "#ffffff",
  colorDark = "#050B1F",
  baseStart = 0.58,
  waveHeight = 0.35,
  waveAmplitude = 0.06,
  waveCount = 1.2,
  className = "",
}: GradientProps) => {
  // Read once: the canvas renders imperatively, so a static first frame is the
  // right reduced-motion behavior rather than a re-render
  const animate = !prefersReducedMotion();

  const hostRef = useRef<HTMLDivElement | null>(null);
  // Starts true so the first paint is never blank if the observer is late
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      // A small margin resumes the loop just before the hero scrolls back in
      { rootMargin: "100px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 ${className}`}
      // The shader's own alpha fades out at the base, so the backdrop has to
      // fade with it: an opaque black div would put the hard edge straight back
      style={{
        background: "#000000",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        // Capped so the shader does not render at 3x on high-DPI screens
        // 1.5 is ample for a soft gradient: 2 quadruples the pixels shaded on
        // retina for a difference no one can see in a blur this wide
        dpr={[1, 1.5]}
        // Opaque: the shader writes alpha 1.0 everywhere, so blending the canvas
        // against the page was paying for a composite that changes nothing
        gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      >
        <Plane
          colorA={colorA}
          colorB={colorB}
          colorBase={colorBase}
          baseStart={baseStart}
          waveHeight={waveHeight}
          waveAmplitude={waveAmplitude}
          waveCount={waveCount}
          colorDark={colorDark}
          animate={animate}
          visible={visible}
        />
      </Canvas>
    </div>
  );
};

export default Gradient;
