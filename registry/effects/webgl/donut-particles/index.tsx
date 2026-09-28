// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { degToRad } from "three/src/math/MathUtils";
import { createVisibilityGate } from "./createSuspendedRaf";

const PARTICLE_SIZES = [0.08, 0.09, 0.1, 0.2,0.4,0.6 ];
const OFFSCREEN = 9999;
const TORUS_MAJOR_RADIUS = 1.2;
const TORUS_MINOR_RADIUS = 0.9;
const TORUS_OUTER_RADIUS = 0.48;
const TORUS_INNER_RADIUS = 0.08;

function random01(seed: number) {
 const value = Math.sin(seed * 127.1 + seed * seed * 311.7) * 43758.5453123;
 return value - Math.floor(value);
}

interface DonutParticleProps {
 position?: [number, number, number]
 scale?: number
 rotation?: [number, number, number]
 interactive?: boolean
 particleSize?: number
 particleColor?: string
 speed?: number
 intensity?: number
}

function DonutParticle({
 position = [0, 0, 0],
 scale = 2.5,
 rotation = [degToRad(-100), degToRad(45), 0],
 interactive = true,
 particleSize = 1,
 particleColor = "#9973ff",
 speed = 1,
 intensity = 1,
}: DonutParticleProps) {
 const pointsRef = useRef<any>(null);
 const simulationRef = useRef<any>(null);
 const { size, camera, gl } = useThree();

 const count = 25000;
 const dpr = gl.getPixelRatio();

 const mouse3D = useRef(new THREE.Vector3(OFFSCREEN, OFFSCREEN, OFFSCREEN));
 const smoothMouse = useRef(new THREE.Vector3(OFFSCREEN, OFFSCREEN, OFFSCREEN));
 const prevSmoothMouse = useRef(new THREE.Vector3(OFFSCREEN, OFFSCREEN, OFFSCREEN));
 const mouseVelocity = useRef(new THREE.Vector3());
 const smoothMouseVelocity = useRef(new THREE.Vector3());
 const motionActivity = useRef(0);
 const reduceMotionRef = useRef(
 typeof window !== "undefined" &&
 (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false)
 );
 const localMouse = useMemo(() => new THREE.Vector3(), []);
 const localVelocity = useMemo(() => new THREE.Vector3(), []);
 const mouseNdc = useMemo(() => new THREE.Vector2(), []);
 const raycaster = useMemo(() => new THREE.Raycaster(), []);
 const interactionPlane = useMemo(() => new THREE.Plane(), []);
 const planeNormal = useMemo(() => new THREE.Vector3(), []);
 const planePoint = useMemo(() => new THREE.Vector3(), []);
 const worldIntersection = useMemo(() => new THREE.Vector3(), []);

 useEffect(() => {
 const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
 if (!mq) return;
 const onChange = (event: MediaQueryListEvent) => {
 reduceMotionRef.current = event.matches;
 if (event.matches) {
 mouse3D.current.set(OFFSCREEN, OFFSCREEN, OFFSCREEN);
 smoothMouse.current.set(OFFSCREEN, OFFSCREEN, OFFSCREEN);
 prevSmoothMouse.current.set(OFFSCREEN, OFFSCREEN, OFFSCREEN);
 mouseVelocity.current.set(0, 0, 0);
 smoothMouseVelocity.current.set(0, 0, 0);
 motionActivity.current = 0;
 }
 };
 reduceMotionRef.current = mq.matches;
 mq.addEventListener?.("change", onChange);
 return () => mq.removeEventListener?.("change", onChange);
 }, []);

 useEffect(() => {
 if (!interactive) {
 mouse3D.current.set(OFFSCREEN, OFFSCREEN, OFFSCREEN);
 smoothMouse.current.set(OFFSCREEN, OFFSCREEN, OFFSCREEN);
 prevSmoothMouse.current.set(OFFSCREEN, OFFSCREEN, OFFSCREEN);
 return;
 }

 const handleMouseMove = (event: MouseEvent) => {
 if (reduceMotionRef.current) return;
 if (!pointsRef.current) {
 return;
 }

 mouseNdc.set(
 (event.clientX / size.width) * 2 - 1,
 -(event.clientY / size.height) * 2 + 1
 );

 raycaster.setFromCamera(mouseNdc, camera);

 planeNormal.set(0, 0, 1).applyQuaternion(pointsRef.current.quaternion);
 pointsRef.current.getWorldPosition(planePoint);
 interactionPlane.setFromNormalAndCoplanarPoint(planeNormal, planePoint);

 if (raycaster.ray.intersectPlane(interactionPlane, worldIntersection)) {
 if (mouse3D.current.x === OFFSCREEN) {
 smoothMouse.current.copy(worldIntersection);
 prevSmoothMouse.current.copy(worldIntersection);
 }
 mouse3D.current.copy(worldIntersection);
 }
 };

 const handleLeave = () => {
 mouse3D.current.set(OFFSCREEN, OFFSCREEN, OFFSCREEN);
 smoothMouse.current.set(OFFSCREEN, OFFSCREEN, OFFSCREEN);
 prevSmoothMouse.current.set(OFFSCREEN, OFFSCREEN, OFFSCREEN);
 };

 window.addEventListener("mousemove", handleMouseMove);
 window.addEventListener("mouseleave", handleLeave);

 return () => {
 window.removeEventListener("mousemove", handleMouseMove);
 window.removeEventListener("mouseleave", handleLeave);
 };
 }, [
 camera,
 interactionPlane,
 mouseNdc,
 planeNormal,
 planePoint,
 raycaster,
 size,
 worldIntersection,
 interactive,
 ]);

 const simulation = useMemo(() => {
 const positions = new Float32Array(count * 3);
 const colors = new Float32Array(count * 3);
 const sizes = new Float32Array(count);
 const randoms = new Float32Array(count * 4);
 const velocities = new Float32Array(count * 3);
 const base: { x: number, y: number, z: number, u: number, v: number, noiseX: number, noiseY: number }[] = [];

 const palette = [
 [0.06, 0.02, 0.12],
 [0.15, 0.05, 0.28],
 [0.28, 0.1, 0.48],
 [0.42, 0.18, 0.7],
 [0.56, 0.28, 0.9],
 [0.7, 0.4, 1.0],
 [0.9, 0.62, 1.0],
 ];

 for (let i = 0; i < count; i += 1) {
 const rand0 = random01(i + 1.17);
 const rand1 = random01(i + 2.31);
 const rand3 = random01(i + 4.91);
 const rand4 = random01(i + 5.57);
 const rand5 = random01(i + 6.41);
 const rand6 = random01(i + 7.29);

 const u = rand0 * Math.PI * 2;
 const v = rand1 * Math.PI * 2;
 const majorRadius = TORUS_MAJOR_RADIUS;
 const minorRadius = TORUS_MINOR_RADIUS;

 const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
 const y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
 const z = minorRadius * Math.sin(v);

 positions.set([x, y, z], i * 3);
 velocities.set([0, 0, 0], i * 3);

 base.push({
 x,
 y,
 z,
 u,
 v,
 noiseX: rand5 * Math.PI * 2,
 noiseY: rand6 * Math.PI * 2,
 });

 const color = palette[Math.floor(rand3 * palette.length)];
 colors.set(color, i * 3);

 sizes[i] = PARTICLE_SIZES[Math.floor(rand4 * PARTICLE_SIZES.length)];
 randoms.set([rand1, rand4, rand5, rand6], i * 4);
 }

 return { positions, colors, sizes, randoms, base, velocities };
 }, []);

 const { positions, colors, randoms } = simulation;

 const sizeAttributeRef = useRef<THREE.BufferAttribute | null>(null);

 const sizes = useMemo(() => {
 const scaled = new Float32Array(simulation.sizes.length);
 for (let i = 0; i < scaled.length; i += 1) {
 scaled[i] = simulation.sizes[i] * particleSize;
 }
 return scaled;
 }, [simulation.sizes, particleSize]);

 // Swapping the `array` prop alone doesn't re-upload the buffer to the GPU;
 // the attribute's version has to be bumped explicitly.
 useEffect(() => {
 if (sizeAttributeRef.current) {
 sizeAttributeRef.current.array = sizes;
 sizeAttributeRef.current.needsUpdate = true;
 }
 }, [sizes]);

 useEffect(() => {
 simulationRef.current = {
 base: simulation.base,
 velocities: simulation.velocities,
 };
 }, [simulation]);

 const invMatrix = useMemo(() => new THREE.Matrix4(), []);

 const pointTexture = useMemo(() => {
 const textureSize = 128;
 const canvas = document.createElement("canvas");
 canvas.width = textureSize;
 canvas.height = textureSize;

 const context = canvas.getContext("2d");
 if (!context) {
 return null;
 }

 const gradient = context.createRadialGradient(
 textureSize * 0.45,
 textureSize * 0.4,
 textureSize * 0.05,
 textureSize * 0.5,
 textureSize * 0.5,
 textureSize * 0.5
 );
 gradient.addColorStop(0,"rgba(255,255,255,1)");
 gradient.addColorStop(0.2,"rgba(255,255,255,0.98)");
 gradient.addColorStop(0.5,"rgba(238,220,255,0.86)");
 gradient.addColorStop(0.8,"rgba(140,90,255,0.26)");
 gradient.addColorStop(1,"rgba(0,0,0,0)");

 context.clearRect(0, 0, textureSize, textureSize);
 context.fillStyle = gradient;
 context.beginPath();
 context.arc(
 textureSize / 2,
 textureSize / 2,
 textureSize * 0.47,
 0,
 Math.PI * 2
 );
 context.fill();

 const texture = new THREE.CanvasTexture(canvas);
 texture.needsUpdate = true;
 texture.colorSpace = THREE.SRGBColorSpace;
 return texture;
 }, []);

 const matcapTexture = useMemo(() => {
 const textureSize = 128;
 const canvas = document.createElement("canvas");
 canvas.width = textureSize;
 canvas.height = textureSize;

 const context = canvas.getContext("2d");
 if (!context) {
 return null;
 }

 const base = context.createLinearGradient(0, 0, textureSize, textureSize);
 base.addColorStop(0,"#fcf4ff");
 base.addColorStop(0.25,"#cf9dff");
 base.addColorStop(0.55,"#6a2fcd");
 base.addColorStop(1,"#0c0619");
 context.fillStyle = base;
 context.fillRect(0, 0, textureSize, textureSize);

 const bubble = context.createRadialGradient(
 textureSize * 0.34,
 textureSize * 0.3,
 textureSize * 0.04,
 textureSize * 0.5,
 textureSize * 0.54,
 textureSize * 0.62
 );
 bubble.addColorStop(0,"rgba(255,255,255,1)");
 bubble.addColorStop(0.16,"rgba(255,245,255,0.95)");
 bubble.addColorStop(0.4,"rgba(231,182,255,0.65)");
 bubble.addColorStop(0.75,"rgba(108,46,190,0.15)");
 bubble.addColorStop(1,"rgba(0,0,0,0)");
 context.fillStyle = bubble;
 context.fillRect(0, 0, textureSize, textureSize);

 const texture = new THREE.CanvasTexture(canvas);
 texture.needsUpdate = true;
 texture.colorSpace = THREE.SRGBColorSpace;
 return texture;
 }, []);

 const particleMaterial = useMemo(() => {
 if (!pointTexture || !matcapTexture) {
 return null;
 }

 return new THREE.ShaderMaterial({
 uniforms: {
 pointTexture: { value: pointTexture },
 matcapTexture: { value: matcapTexture },
 time: { value: 0 },
 uDpr: { value: dpr },
 uColor: { value: new THREE.Color(particleColor) },
 uIntensity: { value: intensity },
 },
 vertexShader: `
 uniform float uDpr;
 attribute float size;
 attribute vec4 random;
 varying vec3 vColor;
 varying vec4 vRandom;
 varying float vScale;
 varying vec3 vViewPos;

 void main() {
 vColor = color;
 vRandom = random;

 vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
 vViewPos = mvPosition.xyz;
 vScale = smoothstep(3.0, 14.0, length(mvPosition.xyz));
 vScale *= mix(0.55, 1.0, random.z);

 gl_PointSize = size * uDpr * 1.55 * vScale * (90.0 / length(mvPosition.xyz));
 gl_Position = projectionMatrix * mvPosition;
 }
 `,
 fragmentShader: `
 uniform sampler2D pointTexture;
 uniform sampler2D matcapTexture;
 uniform float time;
 uniform vec3 uColor;
 uniform float uIntensity;
 varying vec3 vColor;
 varying vec4 vRandom;
 varying float vScale;
 varying vec3 vViewPos;

 vec3 blendOverlay(vec3 base, vec3 blend) {
 return mix(
 2.0 * base * blend,
 1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
 step(0.5, base)
 );
 }

 vec3 blendSoftLight(vec3 base, vec3 blend) {
 return mix(
 2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
 sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
 step(0.5, blend)
 );
 }

 float hash(vec2 p) {
 return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
 }

 void main() {
 vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
 vec2 centered = uv - 0.5;
 float radius = length(centered);

 if (radius > 0.5 || vScale < 0.08) {
 discard;
 }

 vec4 sprite = vec4(1.0);
 vec3 purple = uColor;
 float cycleSpeed = mix(0.12, 0.26, vRandom.y);
 float cycleOffset = vRandom.x + vRandom.w * 0.73;
 float cycle = fract(time * cycleSpeed + cycleOffset);
 float phase = cycle * 3.0;
 float blend = smoothstep(0.0, 1.0, fract(phase));
 vec3 color = phase < 1.0
 ? mix(vec3(0.0), vec3(1.0), blend)
 : phase < 2.0
 ? mix(vec3(1.0), purple, blend)
 : mix(purple, vec3(0.0), blend);
 color = max(color, vec3(0.08, 0.06, 0.14));

 vec3 sparkle = vec3(0.4 + sin(time * 4.0 + vRandom.y * 20.0));
 color *= 0.5 + sparkle * pow(vRandom.z, 10.0) * 2.35;
 color *= uIntensity;

 float alpha = sprite.a;
 if (alpha < 0.08) {
 discard;
 }

 gl_FragColor = vec4(color, alpha);
 }
 `,
 transparent: true,
 depthWrite: false,
 vertexColors: true,
 blending: THREE.NormalBlending,
 });
 }, [dpr, matcapTexture, pointTexture]); // eslint-disable-line react-hooks/exhaustive-deps -- particleColor/intensity are synced per-frame instead, to avoid rebuilding the shader on every remix drag

 useEffect(() => {
 return () => {
 particleMaterial?.dispose();
 pointTexture?.dispose();
 matcapTexture?.dispose();
 };
 }, [matcapTexture, particleMaterial, pointTexture]);

 useFrame(({ clock }, delta) => {
 if (!pointsRef.current || !particleMaterial) {
 return;
 }

 const time = clock.getElapsedTime();
 const hz = delta * 60;
 const positionsArray = pointsRef.current.geometry.attributes.position.array;
 const simulation = simulationRef.current;

 if (!simulation) {
 return;
 }

 const { base, velocities } = simulation;

 pointsRef.current.material.uniforms.uDpr.value = gl.getPixelRatio();
 pointsRef.current.material.uniforms.uColor.value.set(particleColor);
 pointsRef.current.material.uniforms.uIntensity.value = intensity;

 // Reduced-motion: freeze spin / waves / mouse stretch - hold constrained torus.
 if (reduceMotionRef.current) {
 pointsRef.current.material.uniforms.time.value = 0;
 const majorRadius = TORUS_MAJOR_RADIUS;
 const outerMinorRadius = TORUS_OUTER_RADIUS;
 const innerMinorRadius = TORUS_INNER_RADIUS;

 for (let i = 0; i < count; i += 1) {
 const index = i * 3;
 const particle = base[i];
 velocities[index] = 0;
 velocities[index + 1] = 0;
 velocities[index + 2] = 0;

 // Base samples a fat torus; project onto the same tube used while animating.
 const radial = Math.hypot(particle.x, particle.y) || 0.0001;
 const dirX = particle.x / radial;
 const dirY = particle.y / radial;
 const tubeOffset = radial - majorRadius;
 const tubeDistance =
 Math.sqrt(tubeOffset * tubeOffset + particle.z * particle.z) ||
 0.0001;
 const targetDistance = THREE.MathUtils.clamp(
 tubeDistance,
 innerMinorRadius,
 outerMinorRadius
 );
 const scale = targetDistance / tubeDistance;

 positionsArray[index] = dirX * (majorRadius + tubeOffset * scale);
 positionsArray[index + 1] = dirY * (majorRadius + tubeOffset * scale);
 positionsArray[index + 2] = particle.z * scale;
 }
 pointsRef.current.geometry.attributes.position.needsUpdate = true;
 return;
 }

 const animTime = time * speed;
 pointsRef.current.material.uniforms.time.value = animTime;

 pointsRef.current.rotation.z += 0.00095 * speed;

 const majorRadius = TORUS_MAJOR_RADIUS;
 const outerMinorRadius = TORUS_OUTER_RADIUS;
 const innerMinorRadius = TORUS_INNER_RADIUS;

 smoothMouse.current.lerp(mouse3D.current, 0.85);
 mouseVelocity.current
 .copy(smoothMouse.current)
 .sub(prevSmoothMouse.current)
 .multiplyScalar(1.2);
 prevSmoothMouse.current.copy(smoothMouse.current);
 smoothMouseVelocity.current.lerp(mouseVelocity.current, 0.4);

 const movementSpeed = smoothMouseVelocity.current.length();
 motionActivity.current = THREE.MathUtils.lerp(
 motionActivity.current,
 movementSpeed * 10,
 movementSpeed * 10 > motionActivity.current ? 0.8 : 0.08
 );
 motionActivity.current = Math.min(motionActivity.current, 1);

 invMatrix.copy(pointsRef.current.matrixWorld).invert();
 localMouse.copy(smoothMouse.current).applyMatrix4(invMatrix);
 localVelocity.copy(smoothMouseVelocity.current).applyMatrix4(invMatrix);

 const INFLUENCE = 0.75;
 const CLOSE_INFLUENCE = 0.32;
 const STICK = 0.8;
 const FLOW = 0.65;
 const CLOSE_FLOW_BOOST = 5.5;
 const RETURN = 0.003;
 const DAMP = 0.7;

 for (let i = 0; i < count; i += 1) {
 const index = i * 3;
 const particle = base[i];

 let x = positionsArray[index];
 let y = positionsArray[index + 1];
 let z = positionsArray[index + 2];

 const wave = Math.sin(animTime * 1.5 + particle.u * 2) * 0.15;
 const swirl = Math.cos(animTime * 1.2 + particle.v * 2) * 0.15;

 const tx = particle.x + wave;
 const ty = particle.y + swirl;
 const tz = particle.z + wave * 0.5;

 let fx = (tx - x) * RETURN;
 let fy = (ty - y) * RETURN;
 let fz = (tz - z) * RETURN;

 const dx = localMouse.x - x;
 const dy = localMouse.y - y;
 const dz = localMouse.z - z;
 const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
 let stretchPower = 0;
 let velocityLerp = 0.25;

 if (dist < INFLUENCE && motionActivity.current > 0.01) {
 const power = (1 - dist / INFLUENCE) * motionActivity.current;
 const closePower =
 dist < CLOSE_INFLUENCE
 ? Math.pow(1 - dist / CLOSE_INFLUENCE, 2.4) * motionActivity.current
 : 0;
 const flowBoost = 1 + closePower * CLOSE_FLOW_BOOST;

 fx += dx * STICK * power * 0.05 * intensity;
 fy += dy * STICK * power * 0.05 * intensity;
 fz += dz * STICK * power * 0.05 * intensity;

 fx += localVelocity.x * FLOW * power * flowBoost * intensity;
 fy += localVelocity.y * FLOW * power * flowBoost * intensity;
 fz += localVelocity.z * FLOW * power * flowBoost * intensity;

 stretchPower = power + closePower * 0.4;
 velocityLerp = THREE.MathUtils.lerp(0.25, 1.0, power);
 }

 velocities[index] = THREE.MathUtils.lerp(
 velocities[index],
 (velocities[index] + fx * hz) * DAMP,
 velocityLerp
 );
 velocities[index + 1] = THREE.MathUtils.lerp(
 velocities[index + 1],
 (velocities[index + 1] + fy * hz) * DAMP,
 velocityLerp
 );
 velocities[index + 2] = THREE.MathUtils.lerp(
 velocities[index + 2],
 (velocities[index + 2] + fz * hz) * DAMP,
 velocityLerp
 );

 let nextX = x + velocities[index];
 let nextY = y + velocities[index + 1];
 let nextZ = z + velocities[index + 2];

 const radial = Math.hypot(nextX, nextY) || 0.0001;
 const dirX = nextX / radial;
 const dirY = nextY / radial;
 const tubeOffset = radial - majorRadius;
 const tubeDistance =
 Math.sqrt(tubeOffset * tubeOffset + nextZ * nextZ) || 0.0001;
 const stretch = stretchPower * 0.06;
 const maxOuter = outerMinorRadius + stretch;
 const minInner = innerMinorRadius - stretch * 0.4;

 if (tubeDistance > maxOuter || tubeDistance < minInner) {
 const targetDistance = THREE.MathUtils.clamp(
 tubeDistance,
 innerMinorRadius,
 outerMinorRadius
 );
 const scale = targetDistance / tubeDistance;
 const lerpBack = 0.15;

 nextX = THREE.MathUtils.lerp(
 nextX,
 dirX * (majorRadius + tubeOffset * scale),
 lerpBack
 );
 nextY = THREE.MathUtils.lerp(
 nextY,
 dirY * (majorRadius + tubeOffset * scale),
 lerpBack
 );
 nextZ = THREE.MathUtils.lerp(nextZ, nextZ * scale, lerpBack);
 }

 positionsArray[index] = nextX;
 positionsArray[index + 1] = nextY;
 positionsArray[index + 2] = nextZ;
 }

 pointsRef.current.geometry.attributes.position.needsUpdate = true;
 });

 useEffect(() => {
 camera.lookAt(0, 0, 0);
}, [camera]);

 return (
 <points
 ref={pointsRef}
 position={position}
 scale={scale}
 frustumCulled={false}
 rotation={rotation}
 >
 <bufferGeometry>
 <bufferAttribute
 {...({
 attach: "attributes-position",
 array: positions,
 count: count,
 itemSize: 3,
 } as any)}
 />
 <bufferAttribute
 {...({
 attach: "attributes-color",
 array: colors,
 count: count,
 itemSize: 3,
 } as any)}
 />
 <bufferAttribute
 {...({
 ref: sizeAttributeRef,
 attach: "attributes-size",
 array: sizes,
 count: count,
 itemSize: 1,
 } as any)}
 />
 <bufferAttribute
 {...({
 attach: "attributes-random",
 array: randoms,
 count: count,
 itemSize: 4,
 } as any)}
 />
 </bufferGeometry>

 {particleMaterial ? (
 <primitive object={particleMaterial} attach="material" />
 ) : null}
 </points>
 );
}

// The declarative <Canvas camera={{ fov }}> prop applies the value but only
// calls updateProjectionMatrix() for aspect/left/right/bottom/top changes,
// so fov edits are silently ignored without this explicit sync.
function CameraFovSync({ fov }: { fov: number }) {
 const { camera } = useThree();

 useEffect(() => {
 if ("fov" in camera && camera.fov !== fov) {
 // eslint-disable-next-line react-hooks/immutability -- three.js cameras are inherently mutable imperative objects; this is the standard r3f pattern for syncing fov.
 camera.fov = fov;
 camera.updateProjectionMatrix();
 }
 }, [camera, fov]);

 return null;
}

interface DonutParticlesProps {
 className?: string
 canvasClassName?: string
 donutPosition?: [number, number, number]
 donutScale?: number
 donutRotation?: [number, number, number]
 cameraPosition?: [number, number, number]
 cameraFov?: number
 dpr?: number | [number, number]
 particleSize?: number
 particleColor?: string
 mouseInteraction?: boolean
 speed?: number
 intensity?: number
}

export default function DonutParticles({
 className = "",
 canvasClassName = "",
 donutPosition = [0, 0, 0],
 donutScale = 3.5,
 donutRotation = [degToRad(-60), degToRad(45), 0],
 cameraPosition = [2.0, 4, 6],
 cameraFov = 50,
 dpr = [1, 2],
 particleSize = 1,
 particleColor = "#9973ff",
 mouseInteraction = true,
 speed = 1,
 intensity = 1,
}: DonutParticlesProps) {
 const rootRef = useRef<HTMLDivElement | null>(null);
 const [frameloop, setFrameloop] = useState<'always' | 'never'>("always");
 const [viewportWidth, setViewportWidth] = useState(1280);

 useEffect(() => {
 const gate = createVisibilityGate({
 root: rootRef,
 onChange: (active) => setFrameloop(active ? "always" : "never"),
 });
 setFrameloop(gate.isActive ? "always" : "never");
 return () => gate.destroy();
 }, []);

 useEffect(() => {
 const updateViewportWidth = () => {
 setViewportWidth(window.innerWidth);
 };

 updateViewportWidth();
 window.addEventListener("resize", updateViewportWidth);

 return () => {
 window.removeEventListener("resize", updateViewportWidth);
 };
 }, []);

 const isTablet = viewportWidth > 640 && viewportWidth <= 1025;
 const isMobile = viewportWidth <= 640;
 const responsiveScale = isMobile
 ? donutScale * 0.48
 : isTablet
 ? donutScale * 0.52
 : donutScale;
 const responsivePosition = (isMobile
 ? [donutPosition[0] - 0.5, donutPosition[1], donutPosition[2]]
 : isTablet
 ? [donutPosition[0] - 0.35, donutPosition[1], donutPosition[2]]
 : donutPosition) as [number, number, number];

 return (
 <div ref={rootRef} className={`h-screen w-full bg-black ${className}`}>
 <Canvas aria-hidden="true" className={canvasClassName} camera={{ position: cameraPosition, fov: cameraFov }} dpr={dpr} frameloop={frameloop}>
 <CameraFovSync fov={cameraFov} />
 <DonutParticle
 position={responsivePosition}
 scale={responsiveScale}
 rotation={donutRotation}
 interactive={mouseInteraction && !isTablet && !isMobile}
 particleSize={particleSize}
 particleColor={particleColor}
 speed={speed}
 intensity={intensity}
 />
 </Canvas>
 </div>
 );
}
