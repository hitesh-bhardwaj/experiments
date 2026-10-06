"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

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

    float dist = ease(
      max(0.0, 1.0 - length(st * aspectVec - mPos * aspectVec) * 0.5)
    );

    float sprd = (0.1580 + 0.01) / ((aspectRatio + 1.0) / 2.0);
    float amt = (1.0000 * 3.0) * 0.015 * dist;

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

    return mix(uv, clamp(st, 0.0, 1.0), 0.5100);
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
  mouseLerp = 0.05,
  timeSpeed = 0.0002,
}) {
  const materialRef = useRef(null);

  const texture = useTexture(texturePath);
  const { size } = useThree();

  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));
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
    const handlePointerMove = (event) => {
      targetMouseRef.current.x = event.clientX / window.innerWidth;
      targetMouseRef.current.y = 1 - event.clientY / window.innerHeight;
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;

    mouseRef.current.lerp(targetMouseRef.current, mouseLerp);

    /*
      Accumulate from a clamped delta rather than reading performance.now().
      The clock only advances while the canvas is in view, so the flow field
      picks up where it left off instead of jumping ahead by the time spent
      scrolled away.
    */
    elapsedRef.current += Math.min(delta, 0.1) * 1000 * timeSpeed;

    material.uniforms.uTime.value = elapsedRef.current;
    material.uniforms.uMousePos.value.copy(mouseRef.current);
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

// Must match what the Footer actually renders - the old orange.png preload
// fetched a 1.6MB texture at page load (module-level preloads fire on bundle
// eval, not on mount) that nothing displayed. The webp is 16KB.
useTexture.preload("/assets/textures/orange-1.webp");