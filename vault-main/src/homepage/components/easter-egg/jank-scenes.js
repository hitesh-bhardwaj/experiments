// Canvas scenes for "Spot the Jank" (SpotTheJank.jsx). Two copies of one
// interaction are drawn per frame: the smooth one (flaw = null) and one that
// carries a single flaw. Pure drawing, no DOM or state.

export const CYCLE_S = 2.6;

export const FLAWS = {
  frames: ['dropped frames', 'It stuttered. Vault effects are sequenced and tuned against real hardware.'],
  linear: ['stiff easing', 'It moved at a robotic constant speed. Easing is where the feel lives.'],
  shift: ['layout shift', 'Content jumped mid-animation. Vault ships with no unexplained layout shift.'],
  stagger: ['sloppy stagger', 'The sequence landed unevenly. Rhythm makes motion read as intentional.'],
  jitter: ['jitter', 'It shimmered off the pixel grid. Clean motion lands exactly.'],
  overshoot: ['overshoot', 'It bounced too hard. Restraint is part of the craft.'],
};
export const FLAW_KEYS = Object.keys(FLAWS);
export const SCENES = ['cards', 'lines', 'grid', 'wipe', 'orbit', 'counter'];
export const BADGES = [['s5', 'Sharp eye · 5 streak'], ['s12', 'Frame hawk · 12 streak'], ['pro', 'Spotted an expert-level flaw'], ['p3k', '3,000 points'], ['all', 'Caught all six flaws']];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeBack = (t, k) => 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);

// Square corners, in the homepage's edgy language (callers still pass a radius)
function roundRect(g, x, y, w, h) { g.beginPath(); g.rect(x, y, w, h); }
// One frame of a scene; f = flaw config, or null for the smooth copy
// `font` is a resolved family list; canvas can't read CSS variables
export function drawScene(g, name, t, f, { diff: d, W, H, pr, font }) {
  g.setTransform(pr, 0, 0, pr, 0, 0);
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(244,244,244,.05)';
  for (let yy = 18; yy < H; yy += 24) for (let xx = 12; xx < W; xx += 24) g.fillRect(xx, yy, 1, 1);
  let tt = t;
  if (f && f.k === 'frames') {
    const fps = lerp(12, 30, d);
    tt = Math.floor(t * fps * 2.2) / (fps * 2.2);
    if (f.hitch && t > f.hitch && t < f.hitch + lerp(0.14, 0.06, d)) tt = f.hitch;
  }
  const E = (x) => {
    if (f && f.k === 'linear') return d > 0.6 ? x * (2 - x) * 0.5 + x * 0.5 : x;
    if (f && f.k === 'overshoot') return easeBack(x, lerp(3.6, 2.1, d));
    return easeOutExpo(x);
  };
  const J = () => (f && f.k === 'jitter' ? (Math.random() - 0.5) * lerp(3.2, 0.9, d) : 0);
  const sh = f && f.k === 'shift' && tt > 0.18 ? lerp(14, 3, d) : 0;
  const DL = (i, base) => (f && f.k === 'stagger' ? i * base + f.off[i % f.off.length] * lerp(0.16, 0.05, d) : i * base);
  const cx = W / 2, cy = H / 2;
  let p, e;
  if (name === 'cards') {
    for (let i = 0; i < 3; i++) {
      p = clamp((tt - DL(i, 0.09)) / 0.55, 0, 1); e = E(p);
      const w = W * 0.22, h = H * 0.42, x = cx - w * 1.6 + i * w * 1.1 + J(), y = cy - h / 2 + (1 - e) * 50 + sh + J();
      g.globalAlpha = Math.min(1, p * 2.5);
      g.fillStyle = i === 1 ? '#FF6B00' : '#2a2a2a'; roundRect(g, x, y, w, h, 10); g.fill();
      g.fillStyle = i === 1 ? 'rgba(20,20,20,.5)' : 'rgba(244,244,244,.25)';
      g.fillRect(x + 12, y + h - 30, w * 0.55, 5); g.fillRect(x + 12, y + h - 20, w * 0.35, 5);
    }
    g.globalAlpha = 1;
  } else if (name === 'lines') {
    for (let i = 0; i < 5; i++) {
      p = clamp((tt - DL(i, 0.07)) / 0.5, 0, 1); e = E(p);
      const lw = [0.7, 0.82, 0.6, 0.76, 0.45][i] * W * 0.8;
      g.fillStyle = i === 0 ? '#FF6B00' : 'rgba(244,244,244,.8)';
      roundRect(g, W * 0.1 + J(), H * 0.24 + i * H * 0.12 + (1 - e) * 18 + sh, lw * Math.min(1, e * 1.05), H * 0.06, 4); g.fill();
    }
  } else if (name === 'grid') {
    const m = Math.min(W, H);
    for (let i = 0; i < 9; i++) {
      const gx = i % 3, gy = (i / 3) | 0;
      p = clamp((tt - DL(i, 0.05)) / 0.45, 0, 1); e = E(p);
      const s = m * 0.2 * e, x = cx + (gx - 1) * m * 0.26 + J(), y = cy + (gy - 1) * m * 0.26 + sh + J();
      g.fillStyle = i === 4 ? '#FF6B00' : '#333'; roundRect(g, x - s / 2, y - s / 2, s, s, 6); g.fill();
    }
  } else if (name === 'wipe') {
    e = E(clamp(tt / 0.6, 0, 1));
    g.fillStyle = '#FF6B00'; g.fillRect(0, H * (1 - e) + sh, W, H * e);
    const e2 = E(clamp((tt - 0.35) / 0.5, 0, 1));
    g.fillStyle = 'rgba(20,20,20,' + e2 + ')';
    for (let i = 0; i < 3; i++) g.fillRect(W * 0.14 + J(), H * 0.35 + i * H * 0.12 + (1 - e2) * 16 + sh, W * [0.6, 0.45, 0.52][i], H * 0.055);
  } else if (name === 'orbit') {
    e = E(clamp(tt / 0.85, 0, 1));
    for (let i = 6; i >= 0; i--) {
      const q = Math.max(0, e - i * 0.035), a = -Math.PI * 0.9 + q * Math.PI * 1.6;
      g.globalAlpha = 1 - i / 7; g.fillStyle = '#FF6B00';
      g.beginPath(); g.arc(cx + Math.cos(a) * W * 0.3 + J(), cy + Math.sin(a) * H * 0.28 + sh, 10 - i, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
  } else {
    e = E(clamp(tt / 0.8, 0, 1));
    g.fillStyle = '#F4F4F4'; g.font = '400 ' + Math.round(H * 0.3) + 'px ' + font;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Math.round(e * 100), cx + J(), cy + sh + J());
    g.fillStyle = '#FF6B00'; g.fillRect(cx - W * 0.25, cy + H * 0.22 + sh, W * 0.5 * e, 3);
  }
}

