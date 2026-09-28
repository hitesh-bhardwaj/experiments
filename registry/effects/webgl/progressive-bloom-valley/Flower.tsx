import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { VERTEX, FRAGMENT } from "./shaders";
import { prefersReducedMotion } from "./prefersReducedMotion";

interface FlowerProps {
  data: any;
  sprite: THREE.Texture;
  config: any;
  bloomStrength?: number;
}

export default function Flower({ data, sprite, config, bloomStrength = 1.2 }: FlowerProps) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const targetMouse = useRef(new THREE.Vector2(0.5, 0.5));
  const currentMouse = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseUniform = useMemo(() => new THREE.Vector2(0.5, 0.5), []);
  const targetIntensity = useRef(0.0);
  const currentIntensity = useRef(0.0);
  const lastRawMouse = useRef(new THREE.Vector2(-999, -999));
  const reduceMotionRef = useRef(prefersReducedMotion());

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCamFar: { value: 77 },
        uBrightness: { value: 4.5 },
        uSaturation: { value: 1.5 },
        uSpriteSheet: { value: sprite },
        uColorTint: { value: config?.colorTint },
        uMouse: { value: mouseUniform },
        uAspect: { value: 1.0 },
        uHoverIntensity: { value: 0.0 },
        // Custom Hover Configs sent to shaders
        uDefaultFlowerBloom: { value: (config?.defaultFlowerBloom ?? 1.5) * bloomStrength },
        uHoverGlowMultiplier: { value: (config?.hoverGlowMultiplier ?? 6.0) * bloomStrength },
        uHoverMagneticStrength: { value: config?.hoverMagneticStrength ?? 0.6 },
        uHoverMagneticDirection: { value: config?.hoverMagneticDirection ?? 1.0 },
        uHoverZPull: { value: config?.hoverZPull ?? 2.5 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }, [sprite, config, mouseUniform]);

  useEffect(() => {
    materialRef.current = material;
    return () => {
      material.dispose();
      if (materialRef.current === material) {
        materialRef.current = null;
      }
    };
  }, [material]);

  useEffect(() => {
    const runtimeMaterial = materialRef.current;
    if (!runtimeMaterial) return;

    runtimeMaterial.uniforms.uDefaultFlowerBloom.value =
      (config?.defaultFlowerBloom ?? 1.5) * bloomStrength;
    runtimeMaterial.uniforms.uHoverGlowMultiplier.value =
      (config?.hoverGlowMultiplier ?? 6.0) * bloomStrength;
  }, [bloomStrength, config]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const applyReduced = (enabled: boolean) => {
      reduceMotionRef.current = enabled;
      const runtimeMaterial = materialRef.current;
      if (!runtimeMaterial) return;

      if (enabled) {
        runtimeMaterial.uniforms.uHoverIntensity.value = 0;
        runtimeMaterial.uniforms.uHoverMagneticStrength.value = 0;
        runtimeMaterial.uniforms.uHoverZPull.value = 0;
        targetIntensity.current = 0;
        currentIntensity.current = 0;
      } else {
        runtimeMaterial.uniforms.uHoverMagneticStrength.value =
          config?.hoverMagneticStrength ?? 0.6;
        runtimeMaterial.uniforms.uHoverZPull.value = config?.hoverZPull ?? 2.5;
      }
    };

    applyReduced(mq.matches);
    const onChange = (event: MediaQueryListEvent) => applyReduced(event.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [config]);

  // Track raw mouse position in NDC (-1 to 1) and calculate velocity/intensity
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (reduceMotionRef.current) return;

      targetMouse.current.x = e.clientX / window.innerWidth;
      targetMouse.current.y = 1.0 - e.clientY / window.innerHeight;
      // Calculate raw pixel distance moved
      const dx = e.clientX - lastRawMouse.current.x;
      const dy = e.clientY - lastRawMouse.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // If moved appreciably, spike target intensity to 1.0
      if (lastRawMouse.current.x !== -999 && dist > 1.0) {
        targetIntensity.current = 1.0;
      }
      lastRawMouse.current.set(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  useFrame((state, delta) => {
    const runtimeMaterial = materialRef.current;
    if (!runtimeMaterial) return;

    runtimeMaterial.uniforms.uAspect.value =
      state.size.width / state.size.height;

    if (reduceMotionRef.current) {
      // Freeze sway / bloom pulse - keep uTime still and hover off.
      runtimeMaterial.uniforms.uHoverIntensity.value = 0;
      return;
    }

    runtimeMaterial.uniforms.uTime.value = state.clock.elapsedTime;

    // EXTREME SMOOTHNESS: The actual mathematical center of the interaction heavily lags behind the  // physical cursor, creating a syrupy, organic drag (reduced from 8.0 to 3.0)
    currentMouse.current.lerp(targetMouse.current, Math.min(1.0, delta * 3.0));
    mouseUniform.copy(currentMouse.current);

    // Slowly decay the target intensity if not moving (fades completely in ~3 seconds for"smoothest more duration")
    targetIntensity.current = Math.max(0.0, targetIntensity.current - delta * 0.35);
    // EXTREME SMOOTHNESS: The elasticity of the magnetic pull and bloom fade-in/fade-out
    // is slowed down drastically (reduced from 2.5 to 1.5)
    currentIntensity.current +=
      (targetIntensity.current - currentIntensity.current) *
      Math.min(1.0, delta * 1.5);
    runtimeMaterial.uniforms.uHoverIntensity.value = currentIntensity.current;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          {...({
            attach: "attributes-position",
            array: data.positions,
            count: data.count,
            itemSize: 3,
          } as any)}
        />
        <bufferAttribute
          {...({
            attach: "attributes-aColorCoordinate",
            array: data.colorCoords,
            count: data.count,
            itemSize: 2,
          } as any)}
        />
        <bufferAttribute
          {...({
            attach: "attributes-aSpriteScale",
            array: data.scales,
            count: data.count,
            itemSize: 1,
          } as any)}
        />
        <bufferAttribute
          {...({
            attach: "attributes-aRandomSeed",
            array: data.seeds,
            count: data.count,
            itemSize: 1,
          } as any)}
        />
        <bufferAttribute
          {...({
            attach: "attributes-aGrowNoise",
            array: data.growNoise,
            count: data.count,
            itemSize: 1,
          } as any)}
        />
      </bufferGeometry>
      <primitive attach="material" object={material} />
    </points>
  );
}
