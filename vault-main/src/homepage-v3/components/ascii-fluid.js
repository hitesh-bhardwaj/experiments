/**
 * The stable-fluids solver behind the hero's ASCII trail, as a standalone grid.
 *
 * Same passes and constants as the hero background, but the grid size is a
 * parameter: the hero spreads 80×60 across the viewport, while a card-sized
 * canvas needs far fewer cells to keep a cell the same number of pixels - and
 * a fluid cell's pixel size is what sets how wide the trail reads on screen.
 *
 * Velocity is injected from outside (see the trail loop in EffectBox), then
 * `step()` diffuses, projects and advects it and damps the whole field, so a
 * stroke keeps swirling and spreading for about a second after the cursor has
 * moved on. That lingering smear is the part a per-point radius fade cannot
 * reproduce, and the reason the trail is built on a fluid at all.
 */
export function createFluid(cols, rows) {
  const count = cols * rows;

  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  const vx0 = new Float32Array(count);
  const vy0 = new Float32Array(count);
  const p = new Float32Array(count);
  const div = new Float32Array(count);

  const fi = (x, y) =>
    Math.max(0, Math.min(rows - 1, y)) * cols + Math.max(0, Math.min(cols - 1, x));

  const bnd = (b, a) => {
    for (let x = 1; x < cols - 1; x += 1) {
      a[fi(x, 0)] = b === 2 ? -a[fi(x, 1)] : a[fi(x, 1)];
      a[fi(x, rows - 1)] = b === 2 ? -a[fi(x, rows - 2)] : a[fi(x, rows - 2)];
    }
    for (let y = 1; y < rows - 1; y += 1) {
      a[fi(0, y)] = b === 1 ? -a[fi(1, y)] : a[fi(1, y)];
      a[fi(cols - 1, y)] = b === 1 ? -a[fi(cols - 2, y)] : a[fi(cols - 2, y)];
    }
  };

  const diffuse = (b, d, s, diff, dt) => {
    const a = dt * diff * count;
    for (let k = 0; k < 4; k += 1) {
      for (let y = 1; y < rows - 1; y += 1) {
        for (let x = 1; x < cols - 1; x += 1) {
          d[fi(x, y)] =
            (s[fi(x, y)] +
              a *
              (d[fi(x - 1, y)] +
                d[fi(x + 1, y)] +
                d[fi(x, y - 1)] +
                d[fi(x, y + 1)])) /
            (1 + 4 * a);
        }
      }
      bnd(b, d);
    }
  };

  const advect = (b, d, d0, ux, uy, dt) => {
    const dtx = dt * cols * 1.4;
    const dty = dt * rows * 1.4;

    for (let y = 1; y < rows - 1; y += 1) {
      for (let x = 1; x < cols - 1; x += 1) {
        const px = Math.max(0.5, Math.min(cols - 1.5, x - dtx * ux[fi(x, y)]));
        const py = Math.max(0.5, Math.min(rows - 1.5, y - dty * uy[fi(x, y)]));
        const x0 = Math.floor(px);
        const y0 = Math.floor(py);
        const s1 = px - x0;
        const s0 = 1 - s1;
        const t1 = py - y0;
        const t0 = 1 - t1;

        d[fi(x, y)] =
          s0 * (t0 * d0[fi(x0, y0)] + t1 * d0[fi(x0, y0 + 1)]) +
          s1 * (t0 * d0[fi(x0 + 1, y0)] + t1 * d0[fi(x0 + 1, y0 + 1)]);
      }
    }
    bnd(b, d);
  };

  const project = (ux, uy) => {
    const hx = 1 / cols;
    const hy = 1 / rows;

    for (let y = 1; y < rows - 1; y += 1) {
      for (let x = 1; x < cols - 1; x += 1) {
        div[fi(x, y)] =
          -0.5 *
          (hx * (ux[fi(x + 1, y)] - ux[fi(x - 1, y)]) +
            hy * (uy[fi(x, y + 1)] - uy[fi(x, y - 1)]));
        p[fi(x, y)] = 0;
      }
    }

    bnd(0, div);
    bnd(0, p);

    for (let k = 0; k < 4; k += 1) {
      for (let y = 1; y < rows - 1; y += 1) {
        for (let x = 1; x < cols - 1; x += 1) {
          p[fi(x, y)] =
            (div[fi(x, y)] +
              p[fi(x - 1, y)] +
              p[fi(x + 1, y)] +
              p[fi(x, y - 1)] +
              p[fi(x, y + 1)]) /
            4;
        }
      }
      bnd(0, p);
    }

    for (let y = 1; y < rows - 1; y += 1) {
      for (let x = 1; x < cols - 1; x += 1) {
        ux[fi(x, y)] -= (0.5 * (p[fi(x + 1, y)] - p[fi(x - 1, y)])) / hx;
        uy[fi(x, y)] -= (0.5 * (p[fi(x, y + 1)] - p[fi(x, y - 1)])) / hy;
      }
    }

    bnd(1, ux);
    bnd(2, uy);
  };

  return {
    cols,
    rows,
    vx,
    vy,
    fi,
    step() {
      diffuse(1, vx0, vx, 0.00002, 0.016);
      diffuse(2, vy0, vy, 0.00002, 0.016);
      project(vx0, vy0);
      advect(1, vx, vx0, vx0, vy0, 0.016);
      advect(2, vy, vy0, vx0, vy0, 0.016);
      project(vx, vy);
      for (let i = 0; i < count; i += 1) {
        vx[i] *= 0.94;
        vy[i] *= 0.94;
      }
    },
  };
}
