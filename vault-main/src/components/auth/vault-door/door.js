import gsap from "gsap";

// The door: two (transparent) panels meeting at a seam of --primary light,
// drawn by one fullscreen shader. Typing pulses the seam, success flares it
// and slides the panels apart.

const PULSE_COUNT = 8;
// px over which the seam fades out at each end
const SEAM_END_FADE = 90;

const VERTEX_SHADER = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

// Panels are transparent so the site background (SiteBackground) shows
// through; only the orange seam, its glow and the typing pulses are drawn.
const FRAGMENT_SHADER = `precision highp float;
uniform vec2 uRes;uniform float uT,uSeam,uStart,uEnd,uOpen,uGap,uEnergy,uFlare,uDeny,uPort,uDpr;uniform vec3 uP[${PULSE_COUNT}];
const vec3 OR=vec3(1.,.37255,0.);const vec3 GR=vec3(.57647);
void main(){vec2 fc=gl_FragCoord.xy/uDpr;vec2 R=uRes/uDpr;
 float al=uPort>.5?fc.x:fc.y, alM=uPort>.5?R.x:R.y;
 float c=(uPort>.5?(R.y-fc.y):fc.x)-uSeam;c+=sin(uT*64.)*4.*uDeny;float ac=abs(c),g=uGap;
 float fill=uEnergy*alM*1.04,fm=smoothstep(fill+80.,fill-10.,al);
 float pu=0.;for(int i=0;i<${PULSE_COUNT};i++){float d=(al-uP[i].x)/uP[i].z;pu+=uP[i].y*exp(-d*d);}
 float en=.12+uEnergy*.34*fm+pu*.62+uFlare;
 float ends=smoothstep(uStart,uStart+${SEAM_END_FADE}.,al)*smoothstep(uEnd,uEnd-${SEAM_END_FADE}.,al);
 if(ac<g){float e2=g-ac,closed=1.-smoothstep(2.,40.,g),edge=exp(-e2/(3.+uOpen*50.));
   float a=clamp(max(closed*(.5+min(en,1.)*.5),edge*min(en,1.)*.85*(1.-uOpen*.6)),0.,1.);
   vec3 col=mix(OR*mix(.6,1.,min(en,1.)),GR*.55,uDeny);gl_FragColor=vec4(col*a,a)*ends;return;}
 float e=ac-g;
 vec3 col=mix(OR,GR*.6,uDeny)*exp(-e/(16.+uFlare*60.+uOpen*80.))*min(en,1.2)*.5;
 gl_FragColor=vec4(col,clamp(max(col.r,max(col.g,col.b)),0.,1.))*ends;}`;

const UNIFORMS = ["uRes", "uT", "uSeam", "uStart", "uEnd", "uOpen", "uGap", "uEnergy", "uFlare", "uDeny", "uPort", "uDpr", "uP"];

function createSpring(stiffness, damping, initial = 0) {
  return {
    value: initial,
    velocity: 0,
    target: initial,
    step(dt) {
      const acceleration = (this.target - this.value) * stiffness - this.velocity * damping;
      this.velocity += acceleration * dt;
      this.value += this.velocity * dt;
    },
  };
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(shader));
  return shader;
}

const NOOP_DOOR = {
  key() {},
  fill() {},
  deny() {},
  open({ onComplete } = {}) {
    onComplete?.();
  },
  reset() {},
  destroy() {},
};

// measure() returns where the seam sits, in CSS px from the canvas's
// top-left: { portrait, seam, start, end }, start/end being the span the
// line runs along. `observe` lists elements whose resizes move it.
export function createDoor(canvas, { reducedMotion = false, measure, observe = [] } = {}) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl || gl.isContextLost()) return NOOP_DOOR;

  const program = gl.createProgram();
  const shaders = [
    compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER),
    compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER),
  ];
  shaders.forEach((shader) => gl.attachShader(program, shader));
  gl.linkProgram(program);
  // Flagged for deletion; freed together with the program
  shaders.forEach((shader) => gl.deleteShader(shader));
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]));

  let width = 0;
  let height = 0;
  let dpr = 1;
  let portrait = false;
  let seam = 0;
  let spanStart = 0;
  let spanEnd = 0;

  const gap = createSpring(140, 16, 0.9);
  const energy = createSpring(40, 11);
  const state = { time: 0, activity: 0, flare: 0, deny: 0, open: 0, opening: false };
  const pulses = Array.from({ length: PULSE_COUNT }, () => ({ position: -999, amplitude: 0, width: 80, velocity: 0 }));
  const pulseData = new Float32Array(PULSE_COUNT * 3);
  let pulseIndex = 0;
  let timeline = null;
  let frame = 0;
  let last = performance.now();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const layout = measure?.() ?? { portrait: false, seam: width / 2, start: 0, end: height };
    portrait = layout.portrait;
    seam = Math.round(layout.seam);
    // The shader runs along the seam bottom-up in landscape (GL y), left-right in portrait
    spanStart = portrait ? layout.start : height - layout.end;
    spanEnd = portrait ? layout.end : height - layout.start;
  }

  // How far each panel has travelled while opening
  function openOffset() {
    const far = (portrait ? Math.max(seam, height - seam) : Math.max(seam, width - seam)) + 60;
    return state.open * far;
  }

  function render(now) {
    frame = requestAnimationFrame(render);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    state.time += dt;
    state.activity *= Math.pow(0.25, dt);
    state.deny *= Math.pow(0.08, dt);
    gap.target = 0.9 + Math.min(1, state.activity) * 3.2;
    gap.step(dt);
    energy.step(dt);

    pulses.forEach((pulse, k) => {
      if (pulse.amplitude > 0.002) {
        pulse.position += pulse.velocity * dt;
        pulse.velocity *= Math.pow(0.55, dt);
        pulse.amplitude *= Math.pow(0.42, dt);
      }
      pulseData[k * 3] = pulse.position;
      pulseData[k * 3 + 1] = pulse.amplitude;
      pulseData[k * 3 + 2] = pulse.width;
    });

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uT, state.time);
    gl.uniform1f(uniforms.uSeam, seam);
    gl.uniform1f(uniforms.uStart, spanStart);
    gl.uniform1f(uniforms.uEnd, spanEnd);
    gl.uniform1f(uniforms.uOpen, state.open);
    gl.uniform1f(uniforms.uGap, gap.value + openOffset());
    gl.uniform1f(uniforms.uEnergy, Math.max(0, energy.value));
    gl.uniform1f(uniforms.uFlare, state.flare);
    gl.uniform1f(uniforms.uDeny, state.deny);
    gl.uniform1f(uniforms.uPort, portrait ? 1 : 0);
    gl.uniform1f(uniforms.uDpr, dpr);
    gl.uniform3fv(uniforms.uP, pulseData);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize();
  const resizeObserver = new ResizeObserver(resize);
  [canvas, ...observe].forEach((element) => element && resizeObserver.observe(element));
  frame = requestAnimationFrame(render);

  return {
    // A keystroke sends a pulse of light up the seam
    key(backspace) {
      if (state.opening) return;
      state.activity = Math.min(1.4, state.activity + 0.35);
      const pulse = pulses[pulseIndex++ % PULSE_COUNT];
      pulse.position = -60;
      pulse.amplitude = backspace ? 0.35 : 0.8 + Math.random() * 0.2;
      pulse.width = 70 + Math.random() * 50;
      pulse.velocity = portrait ? width * 1.1 : height * 1.25;
    },

    fill(value) {
      energy.target = Math.max(0, Math.min(1, value));
    },

    deny() {
      state.deny = 1;
      energy.target = Math.max(0, energy.target - 0.25);
    },

    // onMove receives how far the panels have slid, and whether the door is portrait
    open({ onFlare, onSwing, onMove, onComplete } = {}) {
      if (state.opening) return;
      state.opening = true;
      energy.target = 1;

      if (reducedMotion) {
        state.open = 1;
        onComplete?.();
        return;
      }

      timeline = gsap.timeline({ onComplete });
      timeline.to(energy, { value: 1, duration: 0.55, ease: "power2.inOut" });
      timeline.to(state, { flare: 1, duration: 0.35, ease: "power2.out", onStart: onFlare }, "-=.1");
      timeline.to(
        state,
        {
          open: 1,
          duration: 1.9,
          ease: "power4.inOut",
          onStart: onSwing,
          onUpdate: () => onMove?.(openOffset(), portrait),
        },
        "+=.05"
      );
      timeline.to(state, { flare: 0, duration: 1.2, ease: "power2.in" }, "<.5");
    },

    reset() {
      timeline?.kill();
      state.opening = false;
      state.open = 0;
      state.flare = 0;
      energy.target = 0;
      energy.value = 0;
    },

    destroy() {
      cancelAnimationFrame(frame);
      timeline?.kill();
      resizeObserver.disconnect();
      // Free GPU objects but keep the context: the canvas may be remounted
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
