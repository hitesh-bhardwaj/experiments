import { CANVAS_COLORS } from "./constants";

// The catalogue core: one node per effect on a slowly turning sphere with
// hairline links. It charges with the seam, ripples on each keystroke,
// flickers grey on a wrong entry and spins up as the door opens.

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const LINKS_PER_NODE = 3;
const HOVER_RADIUS = 14;

function rgba(rgb, alpha) {
  return `rgba(${rgb},${alpha.toFixed(3)})`;
}

function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

// Fibonacci sphere, so nodes are spread evenly
function createNodes(effects) {
  const count = effects.length;
  return effects.map((effect, i) => {
    const y = count > 1 ? 1 - (i / (count - 1)) * 2 : 0;
    const radius = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * i;
    return {
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      effect,
      lit: 0,
      ripple: 0,
      rank: Math.random(),
      screenX: 0,
      screenY: 0,
      depth: 0,
    };
  });
}

function createLinks(nodes) {
  const links = [];
  nodes.forEach((node, a) => {
    nodes
      .map((other, b) => [b, distanceSquared(node, other)])
      .sort((u, v) => u[1] - v[1])
      .slice(1, LINKS_PER_NODE + 1)
      .forEach(([b]) => {
        if (a < b) links.push([a, b]);
      });
  });
  return links;
}

const NOOP_CORE = {
  energy() {},
  pulse() {},
  deny() {},
  go() {},
  reset() {},
  setMode() {},
  destroy() {},
};

// onHover(effect | null, x01) fires when the hovered node changes
export function createCore({ canvas, layer, tooltip, effects, onHover }) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !effects.length) return NOOP_CORE;

  const nodes = createNodes(effects);
  const links = createLinks(nodes);
  const tooltipName = tooltip.querySelector("[data-tip-name]");
  const tooltipMeta = tooltip.querySelector("[data-tip-meta]");

  let mode = "sign-in";
  let width = 0;
  let height = 0;
  let dpr = 1;
  let radius = 100;
  let centerX = 0;
  let centerY = 0;
  let frame = 0;
  let last = performance.now();
  const state = { tiltX: 0.35, tiltY: 0, rotation: 0, spin: 0.12, energy: 0, energyTarget: 0, deny: 0, go: 0, time: 0, mouseX: -1, mouseY: -1, hovered: -1 };

  function resize() {
    const rect = layer.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Centred across the column's content box, sitting high (follows the
    // top-aligned form), behind the readout
    radius = Math.min(width * 0.46, height * 0.36) * 1.2;
    centerX = width * 0.5;
    centerY = height * 0.35;
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = event.clientX - rect.left;
    state.mouseY = event.clientY - rect.top;
  }

  function onPointerLeave() {
    state.mouseX = -1;
    state.mouseY = -1;
    if (state.hovered !== -1) {
      state.hovered = -1;
      tooltip.dataset.on = "false";
      onHover?.(null);
    }
  }

  // Free-only nodes light up on sign-up, the whole vault on sign-in
  function isEligible(node) {
    return mode !== "sign-up" || node.effect.tier === "free";
  }

  function updateNodes(dt, cosY, sinY, cosX, sinX, breath) {
    nodes.forEach((node) => {
      const x = node.x * cosY + node.z * sinY;
      let z = -node.x * sinY + node.z * cosY;
      const y = node.y * cosX - z * sinX;
      z = node.y * sinX + z * cosX;
      const scale = 1 / (1.9 - z * 0.6);
      node.screenX = centerX + x * radius * breath * scale * 1.4;
      node.screenY = centerY + y * radius * breath * scale * 1.4;
      node.depth = z;

      const want = isEligible(node) && node.rank < state.energy ? 1 : 0;
      node.lit += (want - node.lit) * Math.min(1, dt * (want ? 4 : 2));
      node.ripple *= Math.pow(0.18, dt);
    });
  }

  function drawLinks() {
    ctx.lineWidth = 1;
    links.forEach(([a, b]) => {
      const from = nodes[a];
      const to = nodes[b];
      const alpha = 0.05 + ((from.depth + to.depth) / 2 + 1) * 0.07;
      const lit = Math.min(from.lit, to.lit) * (1 - state.deny);
      ctx.strokeStyle = lit > 0.05 ? rgba(CANVAS_COLORS.orange, alpha * 1.6 * lit + 0.02) : rgba(CANVAS_COLORS.grey, alpha);
      ctx.beginPath();
      ctx.moveTo(from.screenX, from.screenY);
      ctx.lineTo(to.screenX, to.screenY);
      ctx.stroke();
    });
  }

  // Draws back to front and returns the node under the pointer
  function drawNodes() {
    let hovered = -1;
    let closest = HOVER_RADIUS * HOVER_RADIUS;

    [...nodes]
      .sort((a, b) => a.depth - b.depth)
      .forEach((node) => {
        const depth = (node.depth + 1) / 2;
        const isPro = node.effect.tier === "pro";
        const baseColor = isPro ? CANVAS_COLORS.offWhite : CANVAS_COLORS.grey;
        const alpha = (0.25 + depth * 0.65) * (mode === "sign-up" && isPro ? 0.35 : 1);
        const size = 1.1 + depth * 1.9 + node.ripple * 2.2;
        const lit = Math.max(node.lit, node.ripple * 0.9) * (1 - state.deny * 0.9);

        if (state.mouseX >= 0 && depth > 0.35) {
          const d2 = (node.screenX - state.mouseX) ** 2 + (node.screenY - state.mouseY) ** 2;
          if (d2 < closest) {
            closest = d2;
            hovered = nodes.indexOf(node);
          }
        }

        if (lit > 0.04) {
          ctx.fillStyle = rgba(CANVAS_COLORS.orange, 0.12 * lit * alpha);
          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, size * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = lit > 0.5 ? rgba(CANVAS_COLORS.orange, alpha) : rgba(baseColor, alpha * (isPro ? 0.8 : 0.9));
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, size, 0, Math.PI * 2);
        ctx.fill();
      });

    return hovered;
  }

  function updateTooltip(hovered) {
    if (hovered < 0) {
      if (state.hovered !== -1) {
        state.hovered = -1;
        tooltip.dataset.on = "false";
        onHover?.(null);
      }
      return;
    }

    const node = nodes[hovered];
    ctx.strokeStyle = rgba(CANVAS_COLORS.orange, 0.9);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(node.screenX, node.screenY, 7, 0, Math.PI * 2);
    ctx.stroke();

    if (state.hovered !== hovered) {
      state.hovered = hovered;
      tooltipName.textContent = node.effect.name;
      tooltipMeta.textContent = `${node.effect.category} · ${node.effect.tier === "pro" ? "Pro" : "Free"}`;
      tooltip.dataset.on = "true";
      onHover?.(node.effect, node.screenX / width);
    }
    tooltip.style.transform = `translate(${node.screenX + 14}px,${node.screenY - 14}px)`;
  }

  function render(now) {
    frame = requestAnimationFrame(render);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    state.time += dt;
    if (!width) resize();

    state.energy += (state.energyTarget - state.energy) * Math.min(1, dt * 3.5);
    state.deny *= Math.pow(0.06, dt);
    state.spin += (0.12 + state.go * 2.4 - state.spin) * Math.min(1, dt * 1.5);
    state.rotation += state.spin * dt;

    const mouseNX = state.mouseX >= 0 ? state.mouseX / width - 0.5 : 0;
    const mouseNY = state.mouseY >= 0 ? state.mouseY / height - 0.5 : 0;
    state.tiltX += (0.35 + mouseNY * 0.5 - state.tiltX) * Math.min(1, dt * 2.5);
    state.tiltY += (mouseNX * 0.6 - state.tiltY) * Math.min(1, dt * 2.5);

    const angleY = state.rotation + state.tiltY;
    const breath = 1 + Math.sin(state.time * 0.8) * 0.012 + state.go * 0.06;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    updateNodes(dt, Math.cos(angleY), Math.sin(angleY), Math.cos(state.tiltX), Math.sin(state.tiltX), breath);
    drawLinks();
    updateTooltip(drawNodes());
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(layer);
  layer.addEventListener("pointermove", onPointerMove);
  layer.addEventListener("pointerleave", onPointerLeave);
  frame = requestAnimationFrame(render);

  return {
    energy(value) {
      state.energyTarget = Math.max(0, Math.min(1, value));
    },

    // A ripple spreading from a random node
    pulse() {
      const origin = nodes[Math.floor(Math.random() * nodes.length)];
      nodes.forEach((node) => {
        const distance = Math.sqrt(distanceSquared(node, origin));
        node.ripple = Math.max(node.ripple, Math.max(0, 1 - distance / 0.9));
      });
      state.spin += 0.08;
    },

    deny() {
      state.deny = 1;
    },

    go() {
      state.energyTarget = 1;
      state.go = 1;
    },

    reset() {
      state.energyTarget = 0;
      state.go = 0;
      state.spin = 0.12;
    },

    setMode(nextMode) {
      mode = nextMode;
    },

    destroy() {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      layer.removeEventListener("pointermove", onPointerMove);
      layer.removeEventListener("pointerleave", onPointerLeave);
    },
  };
}
