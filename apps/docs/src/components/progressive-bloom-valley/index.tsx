// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
import FilmGrainEffect from "./FilmGrainEffect";
import EdgeBlurEffect from "./EdgeBlurEffect";
import Experience from "./ExperienceComp";
import { createVisibilityGate } from "./createSuspendedRaf";

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
 const number = Number(value);
 return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
}

interface ProgressiveBloomValleyProps {
 bloomStrength?: number;
 bloomRadius?: number;
 cameraSpeed?: number;
 backgroundColor?: string;
}

export default function ProgressiveBloomValley({
 bloomStrength = 1.2,
 bloomRadius = 0.4,
 cameraSpeed = 1,
 backgroundColor = "#000000",
}: ProgressiveBloomValleyProps) {
 const rootRef = useRef<HTMLDivElement | null>(null);
 const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");
 const resolvedBloomStrength = clampNumber(bloomStrength, 0, 4, 1.2);
 const resolvedBloomRadius = clampNumber(bloomRadius, 0, 1, 0.4);
 const resolvedCameraSpeed = clampNumber(cameraSpeed, 0.05, 5, 1);

 useEffect(() => {
 const gate = createVisibilityGate({
 root: rootRef,
 onChange: (active) => setFrameloop(active ? "always" : "never"),
 });
 setFrameloop(gate.isActive ? "always" : "never");
 return () => gate.destroy();
 }, []);

 return (
 <div ref={rootRef} className="h-screen w-full relative" style={{ backgroundColor }}>

 <Canvas
 dpr={[1, 1.5]}
 flat
 frameloop={frameloop}
 gl={{
 powerPreference:"high-performance",
 outputColorSpace: THREE.SRGBColorSpace,
 }}

 >
 <color attach="background" args={[backgroundColor]} />
 <Suspense fallback={null}>
 <Experience
 bloomStrength={resolvedBloomStrength}
 cameraSpeed={resolvedCameraSpeed}
 />
 </Suspense>

 <EffectComposer {...({ disableNormalPass: true } as any)}>
 {/* Mipmap blur creates an extremely soft, diffused glow without harsh edges */}
 {/* Threshold ensures only the hovered (multiplied) pixels bloom, preserving details elsewhere */}
  <EdgeBlurEffect
 blurStrength={0.8 + resolvedBloomRadius * 1.4}
 blurStart={0.35 - resolvedBloomRadius * 0.2}
 />
 <FilmGrainEffect amount={0.05} scale={1} />
 <Vignette

 offset={0.3}
 darkness={.7}
 />
 </EffectComposer>
 </Canvas>
 </div>
 );
}
