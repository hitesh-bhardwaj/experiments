/**
 * Where the navbar's wordmark comes to rest, in viewport pixels.
 *
 * The loader's ASCII field docks onto this rect - same artwork, same aspect -
 * so the mark lands exactly on the logo it hands over to.
 *
 * Read off the live DOM rather than from shared constants: the bar's padding
 * and the logo's width are `vw` ramps that differ per breakpoint, and there are
 * two bars (desktop and mobile) with their own numbers. Measuring is the only
 * thing that stays right when those are retuned.
 */

const NAV_LOGO_SELECTOR = "[data-nav-logo]";

/**
 * The bars are parked off-screen (`translate-y-[-120%]`) until their intro, so
 * the measured rect has to have any ancestor translation backed out of it -
 * what we want is where the logo *will* sit, not where it is being held.
 */
function translationOf(node) {
  let x = 0;
  let y = 0;

  for (let el = node; el && el !== document.body; el = el.parentElement) {
    const transform = getComputedStyle(el).transform;
    if (!transform || transform === "none") continue;

    const matrix = new DOMMatrixReadOnly(transform);
    x += matrix.m41;
    y += matrix.m42;
  }

  return { x, y };
}

export function measureNavLogoTarget() {
  if (typeof document === "undefined" || typeof DOMMatrixReadOnly === "undefined")
    return null;

  // Both bars carry the mark and each hides itself outside its own breakpoint,
  // so the one that is live at this width is the one with a box.
  let host = null;
  for (const node of document.querySelectorAll(NAV_LOGO_SELECTOR)) {
    if (node.offsetWidth > 0 && node.offsetHeight > 0) {
      host = node;
      break;
    }
  }
  if (!host) return null;

  const rect = host.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const shift = translationOf(host);
  let x = rect.left - shift.x;
  let y = rect.top - shift.y;
  let w = rect.width;
  let h = rect.height;

  // The svg is letterboxed inside its box by `preserveAspectRatio`, so the ink
  // can sit inside the element rather than filling it. Docking to the element
  // box instead of the ink would land the mark a few pixels off.
  const view = host.querySelector("svg")?.viewBox?.baseVal;
  if (view?.width && view?.height) {
    const ratio = view.height / view.width;
    const fitH = w * ratio;

    if (fitH <= h) {
      y += (h - fitH) / 2;
      h = fitH;
    } else {
      const fitW = h / ratio;
      x += (w - fitW) / 2;
      w = fitW;
    }
  }

  return { x, y, w, h };
}
