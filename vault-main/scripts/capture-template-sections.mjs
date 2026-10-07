#!/usr/bin/env node
/**
 * Captures each live template (/template-demo/<slug>) as one tall image per
 * device width, plus where each top-level section starts and ends. The
 * /templates-v4/[slug] sample page uses these for its exploded 3D view.
 *
 *   npm run dev                                   # in another terminal
 *   node scripts/capture-template-sections.mjs    # all templates
 *   node scripts/capture-template-sections.mjs lumera kyntra
 *
 * Env: BASE_URL (default http://localhost:3000), CHROME (path to Chrome).
 *
 * Writes public/assets/templates-exploded/<slug>/<device>.webp and
 * public/assets/templates-exploded/<slug>/manifest.json.
 *
 * Pages are captured with prefers-reduced-motion: reduce, so they render
 * their static layout (no loaders, pins or scroll-hidden content). The page
 * is screenshotted viewport by viewport and stitched, rather than with one
 * full-page capture: that would resize the viewport to the whole page and
 * break every vh-based section.
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/assets/templates-exploded");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const ALL = ["elenavoss", "oris-dental", "lumera", "kyntra"];

// Viewport per device, and the width of the saved image.
const DEVICES = {
  desktop: { width: 1280, height: 800, mobile: false, outWidth: 960 },
  tablet: { width: 820, height: 1180, mobile: true, outWidth: 615 },
  phone: { width: 390, height: 844, mobile: true, outWidth: 585 },
};
const MAX_OUT_HEIGHT = 16000;
const MIN_SECTION = 80; // px; thinner blocks merge into the one above

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- minimal CDP client ---------- */
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      (listeners.get(msg.method) || []).forEach((fn) => fn(msg.params));
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const once = (method) =>
    new Promise((resolve) => {
      const fn = (params) => {
        listeners.set(method, (listeners.get(method) || []).filter((f) => f !== fn));
        resolve(params);
      };
      listeners.set(method, [...(listeners.get(method) || []), fn]);
    });
  const evaluate = async (expression) => {
    const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || "evaluate failed");
    return res.result.value;
  };
  return { send, once, evaluate, close: () => ws.close() };
}

/* ---------- in-page helpers ---------- */
// The sections are the children of the deepest element that wraps the whole page.
const FIND_SECTIONS = `(() => {
  const H = document.documentElement.scrollHeight;
  const visible = (el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return cs.display !== "none" && cs.position !== "fixed" && r.height > 0;
  };
  let root = document.body;
  for (let i = 0; i < 10; i++) {
    const kids = [...root.children].filter(visible);
    const tall = kids.filter((k) => k.getBoundingClientRect().height > ${MIN_SECTION});
    if (tall.length === 1 && tall[0].getBoundingClientRect().height > H * 0.85) root = tall[0];
    else break;
  }
  // Open up wrappers that just stack several tall sections (e.g. a <div> around
  // most of the page), so each inner section becomes its own layer.
  const expand = (el, depth) => {
    const r = el.getBoundingClientRect();
    const kids = [...el.children].filter(visible).filter((k) => k.getBoundingClientRect().height > ${MIN_SECTION});
    const stacked = kids.reduce((sum, k) => sum + k.getBoundingClientRect().height, 0);
    if (depth > 0 && r.height > H * 0.3 && kids.length > 1 && Math.abs(stacked - r.height) < r.height * 0.15) {
      return [...el.children].filter(visible).flatMap((k) => expand(k, depth - 1));
    }
    return [el];
  };
  const out = [];
  for (const el of [...root.children].filter(visible).flatMap((k) => expand(k, 2))) {
    const r = el.getBoundingClientRect();
    const y = Math.round(r.top + scrollY), h = Math.round(r.height);
    if (h <= 0) continue;
    const heading = el.querySelector("h1,h2,h3");
    const label = (el.id || el.getAttribute("aria-label") || (heading && heading.textContent) || "").replace(/\\s+/g, " ").trim().slice(0, 80);
    if (h < ${MIN_SECTION} && out.length) { out[out.length - 1].h = y + h - out[out.length - 1].y; continue; }
    out.push({ y, h, label, tag: el.tagName.toLowerCase(), cls: String(el.className || "").split(" ")[0] });
  }
  return { height: H, sections: out };
})()`;

const HIDE_FIXED = `(() => {
  for (const el of document.querySelectorAll("body *")) {
    const p = getComputedStyle(el).position;
    if (p === "fixed" || p === "sticky") el.style.setProperty("visibility", "hidden", "important");
  }
})()`;

async function captureDevice(cdp, slug, device) {
  const d = DEVICES[device];
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: d.width, height: d.height, deviceScaleFactor: 1, mobile: d.mobile });
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: `${BASE_URL}/template-demo/${slug}` });
  await loaded;
  await sleep(4000);

  // walk the page once so lazy sections, images and fonts load
  let H = await cdp.evaluate("document.documentElement.scrollHeight");
  for (let y = 0; y < H; y += d.height * 0.8) {
    await cdp.evaluate(`window.scrollTo(0, ${y})`);
    await sleep(350);
    H = await cdp.evaluate("document.documentElement.scrollHeight");
  }
  await cdp.evaluate("window.scrollTo(0, 0)");
  await sleep(1500);

  const { height, sections } = await cdp.evaluate(FIND_SECTIONS);

  // viewport-by-viewport screenshots
  const tiles = [];
  for (let y = 0; y < height; y += d.height) {
    const top = Math.min(y, Math.max(0, height - d.height));
    await cdp.evaluate(`window.scrollTo(0, ${top})`);
    await sleep(450);
    const actual = await cdp.evaluate("Math.round(scrollY)");
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    tiles.push({ y: actual, data: shot.data });
    if (tiles.length === 1) await cdp.evaluate(HIDE_FIXED); // header only once, at the top
  }
  return { height, sections, tiles, viewport: d };
}

// Stitch the tiles on a blank page's canvas and export one webp.
async function stitch(cdp, { height, tiles, viewport }, outWidth) {
  await cdp.send("Emulation.clearDeviceMetricsOverride");
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: "about:blank" });
  await loaded;
  const scale = Math.min(outWidth / viewport.width, MAX_OUT_HEIGHT / height);
  await cdp.evaluate(`window.__tiles = []`);
  for (const t of tiles) await cdp.evaluate(`window.__tiles.push(${JSON.stringify(t)})`);
  const dataUrl = await cdp.evaluate(`(async () => {
    const s = ${scale}, W = Math.round(${viewport.width} * s), H = Math.round(${height} * s);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
    for (const t of window.__tiles) {
      const img = new Image(); img.src = "data:image/png;base64," + t.data; await img.decode();
      g.drawImage(img, 0, Math.round(t.y * s), W, Math.round(img.height * s));
    }
    return c.toDataURL("image/webp", 0.78);
  })()`);
  return { buffer: Buffer.from(dataUrl.split(",")[1], "base64"), scale };
}

async function main() {
  const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
  const profile = await mkdtemp(path.join(tmpdir(), "tpl-capture-"));
  const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--hide-scrollbars",
    "--mute-audio",
    "--no-first-run",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    let page;
    for (let i = 0; i < 40 && !page; i++) {
      await sleep(250);
      page = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === "page")).catch(() => null);
    }
    if (!page) throw new Error("Chrome didn't start");
    const cdp = await connect(page.webSocketDebuggerUrl);
    await cdp.send("Page.enable");

    for (const slug of slugs) {
      const manifest = { slug, devices: {} };
      await mkdir(path.join(OUT, slug), { recursive: true });
      for (const device of Object.keys(DEVICES)) {
        process.stdout.write(`${slug} · ${device} … `);
        const cap = await captureDevice(cdp, slug, device);
        const { buffer, scale } = await stitch(cdp, cap, DEVICES[device].outWidth);
        const file = `${device}.webp`;
        await writeFile(path.join(OUT, slug, file), buffer);
        manifest.devices[device] = {
          src: `/assets/templates-exploded/${slug}/${file}`,
          viewport: DEVICES[device].width,
          width: Math.round(DEVICES[device].width * scale),
          height: Math.round(cap.height * scale),
          // y/h in the saved image's pixels
          sections: cap.sections.map((s) => ({ ...s, y: Math.round(s.y * scale), h: Math.round(s.h * scale) })),
        };
        console.log(`${cap.sections.length} sections, ${cap.height}px tall, ${(buffer.length / 1024).toFixed(0)} KB`);
      }
      await writeFile(path.join(OUT, slug, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    }
    cdp.close();
  } finally {
    chrome.kill();
    await sleep(300);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
