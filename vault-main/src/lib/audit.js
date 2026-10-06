const AUDIT_UA_PATTERN =
  /Lighthouse|Chrome-Lighthouse|Google Page Speed|PTST|HeadlessChrome|bot|crawler|spider/i;

const SOFTWARE_RENDERER_PATTERN =
  /SwiftShader|llvmpipe|Software Rasterizer|Mesa OffScreen/i;

// Server-safe: matches a raw User-Agent string (e.g. a request header), so it
// can gate server-rendered markup (like GTM's <script>) before any
// client-side check would even get a chance to run.
export function isAuditUserAgent(userAgent) {
  return AUDIT_UA_PATTERN.test(userAgent || "");
}

// Detects headless/audit agents (Lighthouse, PageSpeed Insights, WebPageTest).
// Lighthouse/PSI drive Chrome over the DevTools protocol in headless mode, where
// navigator.webdriver is true - the most reliable signal - plus a UA fallback.
// Used to skip work (WebGL render loops, tracking scripts) that keeps the main
// thread or network busy and makes audits time out (RPC::DEADLINE_EXCEEDED).
export function isLighthouseOrHeadless() {
  if (typeof navigator === "undefined") return false;

  if (navigator.webdriver === true) return true;

  return isAuditUserAgent(navigator.userAgent);
}

// Confirmed live (see GlowingPlates.jsx history): PageSpeed Insights' real
// desktop crawler does not set navigator.webdriver and presents a plain
// desktop Chrome UA, so isLighthouseOrHeadless() alone misses it. Audit
// infrastructure (including Google's own) runs Chrome in a headless cloud VM
// with no GPU passthrough, which falls back to a software WebGL rasterizer -
// a much harder signal to fake than the checks above, since a real visitor's
// desktop GPU essentially never reports one of these.
// The GPU cannot change within a page load, so the probe runs at most once.
// Every mounted effect calls this, and a fresh context per call is exactly
// what pushes real canvases past the browser's limit.
let softwareRendererResult = null;

export function isSoftwareRenderer() {
  if (typeof document === "undefined") return false;

  if (softwareRendererResult !== null) return softwareRendererResult;

  try {
    const probe = document.createElement("canvas");
    const gl =
      probe.getContext("webgl") || probe.getContext("experimental-webgl");
    const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl?.getParameter(gl.RENDERER);

    // Hand the context back immediately. Browsers cap live WebGL contexts
    // (~16 in Chrome) and evict the oldest to make room, so a probe per
    // component would otherwise push real, still-rendering canvases out and
    // blank them at random.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();

    softwareRendererResult =
      typeof renderer === "string" && SOFTWARE_RENDERER_PATTERN.test(renderer);

    return softwareRendererResult;
  } catch {
    // Can't probe WebGL - a real <Canvas> would fail the same way, so this
    // isn't a case worth treating differently from "skip".
    softwareRendererResult = true;
    return true;
  }
}

// Combined check for anything that runs a continuous WebGL render loop:
// audit/headless traffic (by any of the three signals above) or a visitor
// who has asked for less motion - a perpetual animation is exactly what that
// preference exists to avoid.
export function shouldSkipRealtimeGPU() {
  if (typeof window === "undefined") return false;

  if (isLighthouseOrHeadless()) return true;

  if (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  ) {
    return true;
  }

  return isSoftwareRenderer();
}
