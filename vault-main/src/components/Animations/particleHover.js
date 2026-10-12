// Cursor hover for the particle blobs (community, pricing, blog), after the
// donut-particles effect: the pointer is smoothed, its speed drives an
// "activity" that rises fast and fades slowly, and dots near it are drawn in
// and dragged along its path (much harder right under it), with a little of
// the community crowd's swirl. Each dot's velocity eases toward its new value
// instead of snapping, and the push eases back to nothing once the cursor
// stops, so the dots trail behind the pointer and drift home.
//
// It is a layer on top of each page's own motion: hover.offset[i * 3..] is
// added to where the dot would otherwise be drawn.
//
//   const hover = createHover(N);
//   hover.frame(dt, pointerOn, x, y);  // once per frame, pointer in world units on z = 0
//   hover.step(i, x, y, z);            // per dot, its position before the hover offset

// Reach of the cursor (world units; the blobs have a radius of about 3)
const RADIUS = 2.2;
const CLOSE_RADIUS = 0.9;
// donut-particles' forces, per 60fps frame, turned well down so the hover stays gentle
const STICK = 0.012;
const FLOW = 0.22;
const CLOSE_FLOW_BOOST = 2;
const RETURN = 0.004;
const DAMP = 0.7;
// A touch of the community crowd's swirl around the cursor
const SWIRL = 0.004;
// How far a dot can be pushed before it is eased back (donut-particles keeps them in the tube)
const MAX_OFFSET = 0.6;

export function createHover(N) {
  const offset = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const m = {
    on: false,
    x: 0, y: 0, // smoothed pointer
    px: 0, py: 0, // last frame's smoothed pointer
    vx: 0, vy: 0, // smoothed pointer velocity, world units per 60fps frame
    activity: 0,
    hz: 1,
  };
  let fresh = true;

  // Frame-rate independent version of a per-frame lerp factor
  const ease = (k, hz) => 1 - Math.pow(1 - k, hz);

  const frame = (dt, on, x, y) => {
    const hz = Math.max(dt * 60, 1e-3);
    m.hz = hz;
    m.on = on;
    if (on) {
      if (fresh) { m.x = m.px = x; m.y = m.py = y; fresh = false; }
      m.x += (x - m.x) * ease(0.85, hz);
      m.y += (y - m.y) * ease(0.85, hz);
    } else {
      fresh = true;
    }
    const mvx = ((m.x - m.px) * 1.2) / hz, mvy = ((m.y - m.py) * 1.2) / hz;
    m.px = m.x;
    m.py = m.y;
    m.vx += ((on ? mvx : 0) - m.vx) * ease(0.4, hz);
    m.vy += ((on ? mvy : 0) - m.vy) * ease(0.4, hz);
    const target = on ? Math.min(1, Math.hypot(m.vx, m.vy) * 10) : 0;
    m.activity += (target - m.activity) * ease(target > m.activity ? 0.8 : 0.08, hz);
  };

  const step = (i, x, y, z) => {
    const q = i * 3, hz = m.hz;
    const ox = offset[q], oy = offset[q + 1], oz = offset[q + 2];
    // Ease back to no offset
    let fx = -ox * RETURN, fy = -oy * RETURN, fz = -oz * RETURN;
    let vLerp = 0.25;
    if (m.on && m.activity > 0.01) {
      const dx = m.x - (x + ox), dy = m.y - (y + oy);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < RADIUS) {
        const power = (1 - dist / RADIUS) * m.activity;
        const close = dist < CLOSE_RADIUS ? Math.pow(1 - dist / CLOSE_RADIUS, 2.4) * m.activity : 0;
        const boost = 1 + close * CLOSE_FLOW_BOOST;
        const inv = 1 / (dist + 0.05);
        // Drawn in, dragged along the cursor's path, and swirled a little
        fx += dx * STICK * power + m.vx * FLOW * power * boost - dy * inv * SWIRL * power;
        fy += dy * STICK * power + m.vy * FLOW * power * boost + dx * inv * SWIRL * power;
        fz += (z > 0 ? 1 : -1) * close * 0.01;
        vLerp = 0.25 + 0.75 * power;
      }
    }
    const damp = Math.pow(DAMP, hz), k = ease(vLerp, hz);
    vel[q] += ((vel[q] + fx * hz) * damp - vel[q]) * k;
    vel[q + 1] += ((vel[q + 1] + fy * hz) * damp - vel[q + 1]) * k;
    vel[q + 2] += ((vel[q + 2] + fz * hz) * damp - vel[q + 2]) * k;
    let nx = ox + vel[q] * hz, ny = oy + vel[q + 1] * hz, nz = oz + vel[q + 2] * hz;
    const len = Math.hypot(nx, ny, nz);
    if (len > MAX_OFFSET) {
      const s = 1 - (1 - MAX_OFFSET / len) * ease(0.15, hz);
      nx *= s; ny *= s; nz *= s;
    }
    offset[q] = nx;
    offset[q + 1] = ny;
    offset[q + 2] = nz;
  };

  return { offset, frame, step };
}
