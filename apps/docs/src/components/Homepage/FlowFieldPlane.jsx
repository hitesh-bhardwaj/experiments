"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { shouldSkipRealtimeGPU } from "@/lib/audit";

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  precision highp int;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uMousePos;
  uniform vec2 uMouseVel;
  uniform float uMouseSpeed;
  uniform float uRadius;
  uniform float uStrength;
  uniform float uAmbient;
  uniform float uVelBoost;
  uniform float uSmear;
  uniform float uSwirl;
  uniform float uPunch;
  uniform sampler2D uSourceImage;
  uniform vec2 uImageRes;

  varying vec2 vUv;

  const int MAX_ITERATIONS = 8;
  const float PI = 3.14159265359;

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);

    return -1.0 + 2.0 * fract(vec3(
      (p3.x + p3.y) * p3.z,
      (p3.x + p3.z) * p3.y,
      (p3.y + p3.z) * p3.x
    ));
  }

  float perlin_noise(vec3 p) {
    vec3 pi = floor(p);
    vec3 pf = p - pi;
    vec3 w = pf * pf * (3.0 - 2.0 * pf);

    float n000 = dot(pf - vec3(0.0, 0.0, 0.0), hash33(pi + vec3(0.0, 0.0, 0.0)));
    float n100 = dot(pf - vec3(1.0, 0.0, 0.0), hash33(pi + vec3(1.0, 0.0, 0.0)));
    float n010 = dot(pf - vec3(0.0, 1.0, 0.0), hash33(pi + vec3(0.0, 1.0, 0.0)));
    float n110 = dot(pf - vec3(1.0, 1.0, 0.0), hash33(pi + vec3(1.0, 1.0, 0.0)));

    float n001 = dot(pf - vec3(0.0, 0.0, 1.0), hash33(pi + vec3(0.0, 0.0, 1.0)));
    float n101 = dot(pf - vec3(1.0, 0.0, 1.0), hash33(pi + vec3(1.0, 0.0, 1.0)));
    float n011 = dot(pf - vec3(0.0, 1.0, 1.0), hash33(pi + vec3(0.0, 1.0, 1.0)));
    float n111 = dot(pf - vec3(1.0, 1.0, 1.0), hash33(pi + vec3(1.0, 1.0, 1.0)));

    float nx00 = mix(n000, n100, w.x);
    float nx01 = mix(n001, n101, w.x);
    float nx10 = mix(n010, n110, w.x);
    float nx11 = mix(n011, n111, w.x);

    float nxy0 = mix(nx00, nx10, w.y);
    float nxy1 = mix(nx01, nx11, w.y);

    return mix(nxy0, nxy1, w.z);
  }

  float ease(float t) {
    return t * t;
  }

  vec2 distortUV(vec2 uv) {
    vec2 st = uv;

    float aspectRatio = uResolution.x / max(uResolution.y, 0.001);
    vec2 aspectVec = vec2(aspectRatio, 1.0);

    vec2 mPos = uMousePos;

    /*
      Localised falloff around the cursor. The old formula (1.0 - d * 0.5)
      only reached zero two units away, so every pixel got roughly the same
      push and the field read as ambient noise instead of as a reaction to
      the pointer. smoothstep over uRadius gives a real hot spot, and the
      contrast against the calm surroundings is what makes it feel alive.
    */
    vec2 rel = (st - mPos) * aspectVec;
    float dist = ease(smoothstep(uRadius, 0.0, length(rel)));

    /*
      Twist the space around the cursor before the flow field runs, so the
      pixels orbit the pointer rather than only sliding past it.
    */
    float swirlAng = uSwirl * dist;
    float sc = cos(swirlAng);
    float ss = sin(swirlAng);
    st = mPos + (mat2(sc, -ss, ss, sc) * rel) / aspectVec;

    // Smear along the direction the pointer is travelling - the drag trail.
    st += uMouseVel * uSmear * dist;

    float sprd = (0.1580 + 0.01) / ((aspectRatio + 1.0) / 2.0);

    /*
      uAmbient keeps the whole image breathing when the pointer is nowhere
      near; the cursor term rides on top of it and scales with how fast the
      pointer is moving, so flicking across the footer whips the field.
    */
    float amt =
      (uAmbient + uStrength * dist * (1.0 + uMouseSpeed * uVelBoost)) * 0.015;

    vec2 invPos = vec2(0.5);
    float freq = 5.0 * sprd;

    float t = (0.1900 * 5.0) + (uTime * 0.8);
    float degrees = 360.0 * (0.9990 * 6.0);
    float rad = degrees * PI / 180.0;

    for (int i = 0; i < MAX_ITERATIONS; i++) {
      vec2 clampedSt = clamp(st, -1.0, 2.0);
      vec2 scaled = (clampedSt - 0.5) * aspectVec + invPos;

      float perlin = perlin_noise(vec3((scaled - 0.5) * freq, t)) - 0.5;
      float ang = perlin * rad;

      st += vec2(cos(ang), sin(ang)) * amt;
    }

    // Lean harder on the distorted sample near the cursor.
    float blend = clamp(0.5100 + dist * uPunch, 0.0, 1.0);

    return mix(uv, clamp(st, 0.0, 1.0), blend);
  }

  void main() {
    vec2 uv = vUv;

    vec2 distortedUV = distortUV(uv);

    vec2 s = uResolution;
    vec2 i = uImageRes;

    float rs = s.x / max(s.y, 0.001);
    float ri = i.x / max(i.y, 0.001);

    vec2 newRes = rs < ri
      ? vec2(i.x * s.y / i.y, s.y)
      : vec2(s.x, i.y * s.x / i.x);

    vec2 offset = (
      rs < ri
        ? vec2((newRes.x - s.x) / 2.0, 0.0)
        : vec2(0.0, (newRes.y - s.y) / 2.0)
    ) / newRes;

    vec2 finalUV = distortedUV * s / newRes + offset;

    /*
      Direct texture output.
      No tint.
      No palette remap.
      No contrast.
      No saturation.
      No deband.
    */
    vec4 sampled = texture2D(uSourceImage, finalUV);

    gl_FragColor = sampled;
  }
`;

function FlowFieldPlane({
  texturePath = "/assets/textures/orange-1.webp",
  imageResolution = [500, 500],
  // Higher = the hot spot keeps up with the cursor instead of trailing it.
  mouseLerp = 0.11,
  timeSpeed = 0.0002,
  // Radius of the cursor's influence, in aspect-corrected UV units.
  mouseRadius = 0.85,
  // Peak flow amplitude added at the cursor.
  interactionStrength = 2.0,
  // Flow amplitude that stays on everywhere, pointer or not.
  ambientStrength = 1.2,
  // How much extra amplitude a fast pointer adds on top.
  velocityBoost = 0.9,
  // Length of the drag trail left behind a moving pointer.
  smearStrength = 0.045,
  // Rotation (radians) applied to the space around the cursor.
  swirlStrength = 0.4,
  // Extra weight given to the distorted sample near the cursor.
  punch = 0.18,
  // Scales raw pointer lag into the 0..1 speed the shader reads.
  velocityScale = 8,
}) {
  const materialRef = useRef(null);

  const texture = useTexture(texturePath);
  const { size, gl } = useThree();

  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const velocityRef = useRef(new THREE.Vector2(0, 0));
  const velocityScratch = useRef(new THREE.Vector2(0, 0));
  const elapsedRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: {
        value: 0,
      },
      uResolution: {
        value: new THREE.Vector2(1, 1),
      },
      uMousePos: {
        value: new THREE.Vector2(0.5, 0.5),
      },
      uMouseVel: {
        value: new THREE.Vector2(0, 0),
      },
      uMouseSpeed: {
        value: 0,
      },
      uRadius: {
        value: 0.85,
      },
      uStrength: {
        value: 2.0,
      },
      uAmbient: {
        value: 1.2,
      },
      uVelBoost: {
        value: 0.9,
      },
      uSmear: {
        value: 0.045,
      },
      uSwirl: {
        value: 0.4,
      },
      uPunch: {
        value: 0.18,
      },
      uSourceImage: {
        value: texture,
      },
      uImageRes: {
        value: new THREE.Vector2(imageResolution[0], imageResolution[1]),
      },
    }),
    [texture, imageResolution]
  );

  useEffect(() => {
    // useTexture has no option to configure filtering/wrapping/colorSpace at
    // load time - mutating the loaded THREE.Texture in-place is the only API
    // Three.js exposes for this, and it's confined to an effect.
    // eslint-disable-next-line react-hooks/immutability
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    /*
      IMPORTANT FIX:
      For this custom shader, keep the texture as raw display pixels.
      SRGBColorSpace decodes the texture and makes orange appear darker/redder
      when you output sampled color directly from shaderMaterial.
    */
    texture.colorSpace = THREE.NoColorSpace;

    texture.needsUpdate = true;
  }, [texture]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uResolution.value.set(size.width, size.height);
  }, [size]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material || !texture) return;

    material.uniforms.uSourceImage.value = texture;

    const image = texture.image;

    if (image) {
      const width =
        image.naturalWidth ||
        image.videoWidth ||
        image.width ||
        imageResolution[0];

      const height =
        image.naturalHeight ||
        image.videoHeight ||
        image.height ||
        imageResolution[1];

      material.uniforms.uImageRes.value.set(width, height);
    }
  }, [texture, imageResolution]);

  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerMove = (event) => {
      /*
        Map into the canvas' own box, not the viewport. This section is only
        65vw tall and sits well down the page, so normalising by
        window.innerWidth/innerHeight put the hot spot nowhere near the
        cursor - the main reason the interaction read as weak. Listening on
        window (rather than the canvas) is deliberate: the field starts
        reacting as the pointer approaches from outside, and coordinates
        outside 0..1 simply fall off through the shader's smoothstep.
      */
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      targetMouseRef.current.x = (event.clientX - rect.left) / rect.width;
      targetMouseRef.current.y = 1 - (event.clientY - rect.top) / rect.height;
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;

    const target = targetMouseRef.current;
    const mouse = mouseRef.current;

    /*
      How far the cursor has run ahead of the smoothed position is a free
      proxy for pointer velocity - no per-event bookkeeping or timestamps
      needed, and it decays on its own once the pointer stops.
    */
    const velocity = velocityScratch.current
      .set(target.x - mouse.x, target.y - mouse.y)
      .multiplyScalar(velocityScale);

    if (velocity.lengthSq() > 1) velocity.normalize();

    velocityRef.current.lerp(velocity, 0.12);

    mouse.lerp(target, mouseLerp);

    /*
      Accumulate from a clamped delta rather than reading performance.now().
      The clock only advances while the canvas is in view, so the flow field
      picks up where it left off instead of jumping ahead by the time spent
      scrolled away.
    */
    elapsedRef.current += Math.min(delta, 0.1) * 1000 * timeSpeed;

    material.uniforms.uTime.value = elapsedRef.current;
    material.uniforms.uMousePos.value.copy(mouse);
    material.uniforms.uMouseVel.value.copy(velocityRef.current);
    material.uniforms.uMouseSpeed.value = velocityRef.current.length();

    material.uniforms.uRadius.value = mouseRadius;
    material.uniforms.uStrength.value = interactionStrength;
    material.uniforms.uAmbient.value = ambientStrength;
    material.uniforms.uVelBoost.value = velocityBoost;
    material.uniforms.uSmear.value = smearStrength;
    material.uniforms.uSwirl.value = swirlStrength;
    material.uniforms.uPunch.value = punch;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />

      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        toneMapped={false}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export default function FlowFieldHero({
  texturePath = "/assets/textures/orange-1.webp",
  imageResolution = [32, 32],
}) {
  const sectionRef = useRef(null);
  const [isInView, setIsInView] = useState(false);

  // Same continuous-render-loop problem as GlowingPlates.jsx (Hero WebGL
  // scene): once in view this runs frameloop="always" forever, which is
  // exactly what makes Lighthouse/PageSpeed time out (RPC::DEADLINE_EXCEEDED).
  // See lib/audit.js for the audit/headless/reduced-motion detection.
  const [skipGPU] = useState(() => shouldSkipRealtimeGPU());

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (skipGPU) {
    return (
      <section className="absolute inset-0 h-[65vw] w-screen overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={texturePath}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
        />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="absolute inset-0 h-[65vw] w-screen overflow-hidden"
    >
      <Canvas
        /*
          "demand" still paints one static frame so the image is visible
          before the section scrolls in, then the loop stops again on exit.
        */
        frameloop={isInView ? "always" : "demand"}
        dpr={[0.5, 0.5]}
        camera={{
          position: [0, 0, 1],
          near: 0.1,
          far: 10,
        }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000", 1);

          /*
            Keep output normal for the page,
            but do not tone-map the shader.
          */
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <Suspense fallback={null}>
          <FlowFieldPlane
            texturePath={texturePath}
            imageResolution={imageResolution}
          />
        </Suspense>
      </Canvas>
    </section>
  );
}

// ponytail: preload must match what the footer actually renders - the old
// hardcoded orange.png pulled a 1.6MB texture nobody displays (webp is 16KB).
useTexture.preload("/assets/textures/orange-1.webp");