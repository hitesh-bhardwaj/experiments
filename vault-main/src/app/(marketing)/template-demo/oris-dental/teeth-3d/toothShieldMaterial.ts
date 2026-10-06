import * as THREE from "three";

/** Ring buffer depth - the number of ripples that can be in flight at once. */
export const MAX_HITS = 6;

// ── Vertex shader ─────────────────────────────────────────────────────────────
// uCenter / uInvSize map the tooth's object space into a roughly unit-sized box
// centred on the model. Everything downstream (hex scale, noise scale, the
// bottom fade) is then expressed in that normalised space, so the look does not
// change when the model is scaled or swapped.
const vertexShader = /* glsl */ `
  uniform vec3  uCenter;
  uniform float uInvSize;

  varying vec3 vNormPos;
  varying vec3 vObjNormal;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    vUv        = uv;
    vNormPos   = (position - uCenter) * uInvSize;
    vObjNormal = normalize(normal);
    vNormal    = normalize(normalMatrix * normal);

    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

// ── Fragment shader ───────────────────────────────────────────────────────────
const fragmentShader = /* glsl */ `
  #define MAX_HITS ${MAX_HITS}

  uniform float uTime;
  uniform vec3  uColor;
  uniform float uHexScale;
  uniform float uEdgeWidth;
  uniform float uFresnelPower;
  uniform float uFresnelStrength;
  uniform float uOpacity;
  uniform float uReveal;
  uniform float uFlashSpeed;
  uniform float uFlashIntensity;
  uniform float uNoiseScale;
  uniform vec3  uNoiseEdgeColor;
  uniform float uNoiseEdgeWidth;
  uniform float uNoiseEdgeIntensity;
  uniform float uNoiseEdgeSmoothness;
  uniform float uHexOpacity;
  uniform float uFlowScale;
  uniform float uFlowSpeed;
  uniform float uFlowIntensity;
  uniform float uFadeStart;
  uniform vec3  uHoverPos;
  uniform float uHoverStrength;
  uniform float uHoverRadius;
  uniform float uHoverIntensity;
  uniform vec3  uHitPos[MAX_HITS];
  uniform float uHitTime[MAX_HITS];
  uniform float uHitRingSpeed;
  uniform float uHitRingWidth;
  uniform float uHitMaxRadius;
  uniform float uHitDuration;
  uniform float uHitIntensity;
  uniform float uHitImpactRadius;
  uniform float uHitAlpha;
  uniform sampler2D uMetalnessMap;
  uniform float uUseMetalMask;
  uniform float uMetalThreshold;
  uniform float uMetalSoftness;

  varying vec3 vNormPos;
  varying vec3 vObjNormal;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;

  // ── Simplex 3D noise ────────────────────────────────────────────────────────
  vec3 mod289v3(vec3 x){ return x - floor(x*(1./289.))*289.; }
  vec4 mod289v4(vec4 x){ return x - floor(x*(1./289.))*289.; }
  vec4 permute(vec4 x){ return mod289v4(((x*34.)+1.)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1./6., 1./3.);
    const vec4 D = vec4(0., 0.5, 1., 2.);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1. - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289v3(i);
    vec4 p = permute(permute(permute(
      i.z+vec4(0.,i1.z,i2.z,1.))
     +i.y+vec4(0.,i1.y,i2.y,1.))
     +i.x+vec4(0.,i1.x,i2.x,1.));
    float n_ = 0.142857142857;
    vec3  ns = n_*D.wyz - D.xzx;
    vec4 j   = p - 49.*floor(p*ns.z*ns.z);
    vec4 x_  = floor(j*ns.z);
    vec4 y_  = floor(j - 7.*x_);
    vec4 x   = x_*ns.x + ns.yyyy;
    vec4 y   = y_*ns.x + ns.yyyy;
    vec4 h   = 1. - abs(x) - abs(y);
    vec4 b0  = vec4(x.xy, y.xy);
    vec4 b1  = vec4(x.zw, y.zw);
    vec4 s0  = floor(b0)*2.+1.;
    vec4 s1  = floor(b1)*2.+1.;
    vec4 sh  = -step(h, vec4(0.));
    vec4 a0  = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1  = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0  = vec3(a0.xy, h.x);
    vec3 p1  = vec3(a0.zw, h.y);
    vec3 p2  = vec3(a1.xy, h.z);
    vec3 p3  = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m = max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m = m*m;
    return 42.*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  // ── Hex grid ────────────────────────────────────────────────────────────────
  float hexPattern(vec2 p){
    p *= uHexScale;
    const vec2 s = vec2(1., 1.7320508);
    vec4 hC = floor(vec4(p, p-vec2(0.5,1.))/s.xyxy) + 0.5;
    vec4 h  = vec4(p-hC.xy*s, p-(hC.zw+0.5)*s);
    vec2 cell = (dot(h.xy,h.xy) < dot(h.zw,h.zw)) ? h.xy : h.zw;
    cell = abs(cell);
    float d = max(dot(cell, s*0.5), cell.x);
    return smoothstep(0.5-uEdgeWidth, 0.5, d);
  }

  vec2 hexCellId(vec2 p){
    p *= uHexScale;
    const vec2 s = vec2(1., 1.7320508);
    vec4 hC = floor(vec4(p, p-vec2(0.5,1.))/s.xyxy) + 0.5;
    vec4 h  = vec4(p-hC.xy*s, p-(hC.zw+0.5)*s);
    return (dot(h.xy,h.xy) < dot(h.zw,h.zw)) ? hC.xy : hC.zw+0.5;
  }

  // Each cell gets its own phase and rate from its id, so the grid twinkles
  // cell by cell instead of pulsing as one sheet.
  float cellFlash(vec2 cellId, float salt){
    float rnd   = fract(sin(dot(cellId, vec2(127.1,311.7)) + salt)*43758.5453);
    float phase = rnd * 6.2831;
    float speed = 0.5 + rnd * 1.5;
    return smoothstep(0.6, 1.0, sin(uTime*uFlashSpeed*speed+phase)) * uFlashIntensity;
  }

  void main(){
    vec3 nPos = vNormPos;

    // ── Enamel-only mask ──────────────────────────────────────────────────────
    // The crown and the titanium post are one mesh sharing one material; the
    // only thing that separates them is the metallicRoughness texture, where
    // glTF packs metalness in BLUE. So the shield is gated per-fragment on
    // metalness, exactly the way the enamel whitening in TeethCanvas is.
    float enamelMask = 1.0;
    if (uUseMetalMask > 0.5) {
      float metalness = texture2D(uMetalnessMap, vUv).b;
      enamelMask = 1.0 - smoothstep(uMetalThreshold - uMetalSoftness, uMetalThreshold + uMetalSoftness, metalness);
      if (enamelMask < 0.004) discard;
    }

    // ── Reveal / dissolve ─────────────────────────────────────────────────────
    float noise = snoise(nPos * uNoiseScale) * 0.5 + 0.5;
    float revealMask = smoothstep(uReveal - uNoiseEdgeWidth, uReveal, noise);
    if (revealMask < 0.001) discard;

    float innerFade  = mix(0.98, 0.15, uNoiseEdgeSmoothness);
    float edgeLow    = smoothstep(uReveal-uNoiseEdgeWidth, uReveal-uNoiseEdgeWidth*innerFade, noise);
    float edgeHigh   = smoothstep(uReveal-uNoiseEdgeWidth*0.15, uReveal, noise);
    float revealEdge = edgeLow * (1.0 - edgeHigh);

    // ── Fresnel ───────────────────────────────────────────────────────────────
    // Double sided draw needs the normal flipped on backfaces, otherwise the far
    // side of the shell reads as a solid silhouette instead of a rim.
    vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    float fresnel = pow(1.0 - clamp(dot(n, normalize(vViewDir)), 0.0, 1.0), uFresnelPower) * uFresnelStrength;

    // ── Flow noise ────────────────────────────────────────────────────────────
    float t   = uTime * uFlowSpeed;
    float fn1 = snoise(nPos*uFlowScale + vec3(t, t*0.6, t*0.4));
    float fn2 = snoise(nPos*uFlowScale*2.1 + vec3(-t*0.5, t*0.9, t*0.3));
    float flowNoise = (fn1*0.6 + fn2*0.4)*0.5 + 0.5;

    // ── Hex: triplanar ────────────────────────────────────────────────────────
    // The sphere version picked one cube face from the *position*, which only
    // works on a shape that is a ball. A tooth is not, so the grid is projected
    // on all three axes and blended by the surface *normal* - the cells then
    // follow the crown and the cusps instead of shearing across them.
    vec3 blend = pow(abs(normalize(vObjNormal)), vec3(4.0));
    blend /= max(blend.x + blend.y + blend.z, 1e-4);

    float hex = hexPattern(nPos.yz) * blend.x
              + hexPattern(nPos.xz) * blend.y
              + hexPattern(nPos.xy) * blend.z;

    float flash = cellFlash(hexCellId(nPos.yz), 0.0)  * blend.x
                + cellFlash(hexCellId(nPos.xz), 7.3)  * blend.y
                + cellFlash(hexCellId(nPos.xy), 19.1) * blend.z;

    // ── Hover effect (soft localized hex spotlight) ───────────────────────────
    float hoverDist = length(nPos - uHoverPos);
    float hoverZone = smoothstep(uHoverRadius, 0.0, hoverDist);
    float hoverFactor = hoverZone * hoverZone * uHoverStrength;
    float hoverHexBoost = hex * hoverFactor * uHoverIntensity;

    // ── Hit ring buffer (click impact & ripples) ──────────────────────────────
    // Each slot is one ripple: an expanding noisy ring plus a short hex
    // highlight around the impact. Distances are straight-line in normalised
    // object space - on a sphere the original could use a geodesic, but on an
    // arbitrary shell there is no cheap surface distance and the chord reads
    // the same at these radii.
    float ringContrib = 0.0;
    float hexHitBoost = 0.0;

    for (int i = 0; i < MAX_HITS; i++) {
      float ht      = uHitTime[i];
      float elapsed = uTime - ht;

      // isActive: slot has been used AND the ripple is still within its lifetime
      float isActive = step(0.0, ht)
                     * step(0.0, elapsed)
                     * step(elapsed, uHitDuration);

      float dist = length(nPos - uHitPos[i]);

      float ringR      = min(elapsed * uHitRingSpeed, uHitMaxRadius);
      float noiseD     = snoise(nPos*5.0 + vec3(elapsed*2.0)) * 0.05;
      float ring       = smoothstep(uHitRingWidth, 0.0, abs(dist + noiseD - ringR));
      float fade       = 1.0 - smoothstep(uHitDuration*0.5, uHitDuration, elapsed);
      float radialFade = 1.0 - smoothstep(uHitMaxRadius*0.75, uHitMaxRadius, ringR);
      ringContrib     += ring * fade * radialFade * isActive;

      float zone     = smoothstep(uHitImpactRadius, 0.0, dist);
      float zoneFade = 1.0 - smoothstep(0.0, uHitDuration*0.35, elapsed);
      hexHitBoost   += zone * zoneFade * isActive;
    }

    ringContrib = min(ringContrib, 2.0);
    hexHitBoost = min(hexHitBoost, 1.0);

    // ── Combine ───────────────────────────────────────────────────────────────
    float effectiveHexOpacity = uHexOpacity + hoverHexBoost + hexHitBoost * uHitIntensity;
    float intensity = hex * effectiveHexOpacity * (0.3 + fresnel*0.7) + fresnel*0.4 + flash;

    vec3 shieldColor = uColor * intensity * 2.0;
    shieldColor += uNoiseEdgeColor * (hoverFactor * 0.4 * uHoverIntensity);
    shieldColor += uColor * (flowNoise * fresnel * uFlowIntensity);
    shieldColor += uColor * ringContrib * uHitIntensity;

    vec3 edgeGlow = uNoiseEdgeColor * revealEdge * uNoiseEdgeIntensity;

    float hitAlpha = clamp(ringContrib * uHitAlpha + hexHitBoost * uHitAlpha * 0.5, 0.0, 1.0);
    float hoverAlpha = hoverFactor * 0.4 * uHoverIntensity;

    float alpha = clamp(
      intensity*uOpacity*revealMask + revealEdge*uNoiseEdgeIntensity + hitAlpha*revealMask + hoverAlpha*revealMask,
      0.0,
      1.0
    );
    alpha *= enamelMask;

    // ── Bottom fade gradient ──────────────────────────────────────────────────
    // nPos.y is already normalised to about [-1, 1] over the model height, so
    // the gradient lands on the root of the tooth no matter what the GLB scale is.
    alpha *= smoothstep(-1.0, uFadeStart, nPos.y);

    gl_FragColor = vec4(shieldColor + edgeGlow, alpha);
  }
`;

export interface ShieldUniformOverrides {
  color?: string;
  edgeColor?: string;
}

// ── Material factory ──────────────────────────────────────────────────────────
export function createToothShieldMaterial(
  options: ShieldUniformOverrides = {},
): THREE.ShaderMaterial {
  const { color = "#3365e2", edgeColor = "#a8c4ff" } = options;

  const hitPositions = Array.from(
    { length: MAX_HITS },
    () => new THREE.Vector3(0, 0, 0),
  );
  // Negative marks the slot as never used, which the shader's step(0.0, ht) reads.
  const hitTimes = new Array(MAX_HITS).fill(-999);

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3(0, 0, 0) },
      uInvSize: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uHexScale: { value: 8.7 },
      uEdgeWidth: { value: 0.06 },
      uFresnelPower: { value: 1.8 },
      uFresnelStrength: { value: 1.9 },
      uOpacity: { value: 0.72 },
      // Dissolve threshold, NOT a progress value: 1.05 hides the shell
      // completely, 0 shows all of it. The reveal animates downwards.
      uReveal: { value: 1.05 },
      uFlashSpeed: { value: 1.85 },
      uFlashIntensity: { value: 0.07 },
      uNoiseScale: { value: 7.0 },
      uNoiseEdgeColor: { value: new THREE.Color(edgeColor) },
      uNoiseEdgeWidth: { value: 0.02 },
      uNoiseEdgeIntensity: { value: 10.0 },
      uNoiseEdgeSmoothness: { value: 0.5 },
      uHexOpacity: { value: 0.13 },
      uHoverPos: { value: new THREE.Vector3(0, 0, 0) },
      uHoverStrength: { value: 0 },
      uHoverRadius: { value: 0.5 },
      uHoverIntensity: { value: 1.05 },
      uFlowScale: { value: 2.4 },
      uFlowSpeed: { value: 1.13 },
      uFlowIntensity: { value: 2.8 },
      uFadeStart: { value: 1.0 },
      uHitPos: { value: hitPositions },
      uHitTime: { value: hitTimes },
      uHitRingSpeed: { value: 1.6 },
      uHitRingWidth: { value: 0.08 },
      uHitMaxRadius: { value: 0.8 },
      uHitDuration: { value: 1.6 },
      uHitIntensity: { value: 1.2 },
      uHitImpactRadius: { value: 0.25 },
      uHitAlpha: { value: 0.35 },
      uMetalnessMap: { value: null as THREE.Texture | null },
      uUseMetalMask: { value: 0 },
      uMetalThreshold: { value: 0.13 },
      uMetalSoftness: { value: 0.5 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    // The shell wraps the tooth, so the back half has to draw too - with
    // FrontSide the shield would only ever be seen from outside.
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    // The layer is only a few thousandths of the model thick, which is far
    // too little to separate it from the enamel in the depth buffer - at
    // grazing angles the offset along the normal barely moves the fragment
    // towards the camera at all. A slope-scaled depth bias wins that test
    // reliably without the shell having to stand off the tooth visibly.
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
}
