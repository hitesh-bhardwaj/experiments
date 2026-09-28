// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import MouseTrailParticles from "./MouseTrailParticles";
import MorphingParticleModel from "./MorphingParticleModelNew";
import { createVisibilityGate } from "./createSuspendedRaf";

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

export default function HyperiuxGlitter({
  glitterColor = "#ffffff",
  accentColor = "#ffffff",
  speed = 1,
  mouseInfluence = 1,
  rotationInfluence = 1,
}) {

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");
  const [modelScale, setModelScale] = useState(0.15);
  const resolvedSpeed = clampNumber(speed, 0.05, 5, 1);
  const resolvedMouseInfluence = clampNumber(mouseInfluence, 0, 4, 1);
  const resolvedRotationInfluence = clampNumber(rotationInfluence, 0, 4, 1);

useEffect(() => {
  const gate = createVisibilityGate({
    root: rootRef,
    onChange: (active) => setFrameloop(active ? "always" : "never"),
  });
  setFrameloop(gate.isActive ? "always" : "never");
  return () => gate.destroy();
}, []);

useEffect(() => {
  const updateScale = () => {
    if (window.innerWidth < 768) {
      setModelScale(0.09); // mobile
    } else if (window.innerWidth < 1024) {
      setModelScale(0.12); // tablet
    } else {
      setModelScale(0.15); // desktop
    }
  };

  updateScale();
  window.addEventListener("resize", updateScale);

  return () => window.removeEventListener("resize", updateScale);
}, []);

  return (
    <div ref={rootRef} className="relative h-screen w-screen overflow-hidden bg-black">
      <Canvas
        aria-hidden="true"
        className="h-full w-full"
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        frameloop={frameloop}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.2} />

        <Suspense fallback={null}>
          <Center>
            <MorphingParticleModel
              url="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/hyperiux-new-model.glb"
              scale={modelScale}
              particleCount={10000}
              color={glitterColor}
              size={0.18}
              speed={1.15 * resolvedSpeed}
              opacity={1}
              brightness={4.5}
              showModel={false}
              modelOpacity={0}
              parallaxStrength={0.12 * resolvedMouseInfluence}
              rotationStrengthX={0.12 * resolvedRotationInfluence}
              rotationStrengthY={0.18 * resolvedRotationInfluence}
              rotationStrengthZ={0.04 * resolvedRotationInfluence}
              interactionStrength={2.24 * resolvedMouseInfluence}
              frontFacingThreshold={0.12}
              frontFacingSoftness={0.05}
            />
          </Center>

          <MouseTrailParticles
            maxParticles={700}
            spawnPerMove={4}
            particleLife={0.4 / Math.sqrt(resolvedSpeed)}
            size={0.14}
            color={accentColor}
            brightness={5.5}
            zOffset={0.1}
            spread={0.035 * Math.max(resolvedMouseInfluence, 0.25)}
            velocityStrength={0.24 * resolvedMouseInfluence}
            lerpFactor={0.12}
            idleDamping={0.92}
            stopSpeedThreshold={0.0015}
            idleModeDelay={1.2}
            idleCometDelayMin={0.5}
            idleCometDelayMax={1.4}
            idleCometLife={0.85 / Math.sqrt(resolvedSpeed)}
            idleCometSpeedMin={4.1 * resolvedSpeed}
            idleCometSpeedMax={10.1 * resolvedSpeed}
            idleCometSpawnPerFrame={10}
            idleCometTrailSpread={0.08 * Math.max(resolvedMouseInfluence, 0.25)}
            idleCometViewportPadding={0.25}
          />
        </Suspense>

        <EffectComposer multisampling={4}>
          <Bloom
            intensity={0.25}
            luminanceThreshold={0.72}
            luminanceSmoothing={0.08}
          />
        </EffectComposer>
      </Canvas>
        <div className="absolute bottom-[3vw] left-1/2 -translate-x-1/2 z-40 bg-white/8 backdrop-blur-sm px-8 py-4 rounded-full text-white text-[1.1vw] max-[1025px]:hidden shadow-lg">
       Sweep your cursor across the canvas - leave a glittering comet trail and watch the model respond.
        </div>

        <div className="absolute bottom-[20vw] w-[90%] left-1/2 -translate-x-1/2 z-40 bg-white/8 backdrop-blur-sm px-8 py-4 rounded-full text-white hidden max-[1025px]:block text-[2.5vw] max-md:text-[3.5vw] text-center">
        Tap to interact. Best experienced on desktop.
        </div>
      </div>
  );
}
