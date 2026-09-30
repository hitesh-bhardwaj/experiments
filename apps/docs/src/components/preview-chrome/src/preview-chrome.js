/**
 * Preview chrome for effect demo pages, ported from "GSAP Flip Card — Live preview".
 *
 *   · a floating glass bar at the top: ← back to the effect page · Free/Pro badge · Desktop / Tablet / Phone
 *     · Replay · Reduced motion · Props · Shortcuts · Copy props
 *   · the bar tucks away after ~3s idle and a "Controls" tag drops in on a cord (sways); click it,
 *     press any key or move to the top edge to bring the bar back
 *   · Props opens a side panel; the host fills `chrome.panelBody` (the app portals its RemixerPanel in)
 *   · Tablet / Phone show the page in a real device-sized iframe (media queries fire), scaled to fit
 *   · Reduced motion makes matchMedia('(prefers-reduced-motion: reduce)') match, then replays
 *   · one floating tooltip (with the key hint) for every control, a toast, and a shortcuts sheet
 *
 * Framework-agnostic: it renders its own markup into document.body. Classes are prefixed `pc-`.
 *
 *   const chrome = mountPreviewChrome({
 *     title: 'Square Translate', tier: 'pro', backHref: '/effects/scroll/square-translate',
 *     onReplay() {}, onCopy: () => codeString, hasProps: true,
 *     frameSrc: (dev, { rm }) => `${location.pathname}?embed=1${rm ? '&rm=1' : ''}`,
 *     sound,                                   // optional: { note(i), click() }
 *   });
 *   chrome.panelBody  → element for the props UI
 *   chrome.postValues(values) → forwards edited props to the device iframe
 *   chrome.destroy()
 *
 * The embedded page (inside the device iframe) calls `readEmbed()` early and `onEmbedValues(cb)`.
 */

const ICON = {
  back: '<path d="M15 6l-6 6 6 6"/>',
  full: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  tablet: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  rm: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  props: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  keys: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const DEVICES = { full: null, tablet: [820, 1180], phone: [390, 844] };
const RM_QUERY = /prefers-reduced-motion\s*:\s*reduce/;
const MSG = 'vault-preview:values';

/* ---------- reduced-motion simulation (shared by host page and embedded page) ---------- */
let rmOn = false, origMatchMedia = null;
function fakeList(q) {
  return { matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } };
}
export function simulateReducedMotion(on) {
  if (typeof window === 'undefined') return;
  if (!origMatchMedia) {
    origMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (q) => (rmOn && RM_QUERY.test(q) ? fakeList(q) : origMatchMedia(q));
  }
  rmOn = !!on;
  document.documentElement.toggleAttribute('data-pc-rm', rmOn);
}

/** Inside the device iframe: `?embed=1` hides the chrome, `?rm=1` turns on reduced motion. Call before effects mount. */
export function readEmbed(search = typeof location !== 'undefined' ? location.search : '') {
  const p = new URLSearchParams(search);
  const embed = p.get('embed') === '1', rm = p.get('rm') === '1';
  if (embed && typeof document !== 'undefined') document.documentElement.setAttribute('data-pc-embed', '');
  if (rm) simulateReducedMotion(true);
  return { embed, rm };
}

/** Inside the device iframe: receive edited props from the host bar. Returns an unsubscribe fn. */
export function onEmbedValues(cb) {
  const fn = (e) => { if (e.origin === location.origin && e.data && e.data.type === MSG) cb(e.data.values); };
  addEventListener('message', fn);
  return () => removeEventListener('message', fn);
}

export function mountPreviewChrome(opts = {}) {
  const {
    title = 'Effect', tier = 'free', backHref = '/effects', backLabel = 'Back to the effect page',
    onBack = null, onReplay = () => {}, onCopy = null, onReducedMotion = null, hasProps = true,
    frameSrc = (dev, { rm }) => `${location.pathname}?embed=1${rm ? '&rm=1' : ''}`,
    sound = null, idleMs = 3200, shortcuts = [], startOpen = false,
  } = opts;

  const root = document.createElement('div');
  root.className = 'pc';
  const tierLbl = tier === 'pro' ? 'Pro' : 'Free';
  root.innerHTML = `
  <div class="pc-stage" aria-hidden="true"><div class="pc-frame"><iframe title="${esc(title)} device preview" loading="eager"></iframe></div><p class="pc-dims pc-label"></p></div>
  <header class="pc-bar">
    <a class="pc-bb pc-back" href="${esc(backHref)}" aria-label="Back to ${esc(title)}" data-tip="${esc(backLabel)}">${svg('back')}<span class="pc-nm">${esc(title)}</span></a>
    <span class="pc-bd pc-bd-${tier === 'pro' ? 'pro' : 'free'}">${tierLbl}</span>
    <span class="pc-sep" aria-hidden="true"></span>
    <div class="pc-devs" role="radiogroup" aria-label="Preview size">
      <button class="pc-bb" type="button" role="radio" aria-checked="true" data-dev="full" aria-label="Desktop, full width" data-tip="Desktop" data-key="1">${svg('full')}</button>
      <button class="pc-bb" type="button" role="radio" aria-checked="false" data-dev="tablet" aria-label="Tablet" data-tip="Tablet · 820 × 1180" data-key="2">${svg('tablet')}</button>
      <button class="pc-bb" type="button" role="radio" aria-checked="false" data-dev="phone" aria-label="Phone" data-tip="Phone · 390 × 844" data-key="3">${svg('phone')}</button>
    </div>
    <span class="pc-sep" aria-hidden="true"></span>
    <button class="pc-bb" type="button" data-act="replay" aria-label="Replay the animation" data-tip="Replay the animation" data-key="R">${svg('replay')}</button>
    <button class="pc-bb" type="button" data-act="rm" aria-pressed="false" aria-label="Preview reduced motion" data-tip="Preview reduced motion" data-key="M">${svg('rm')}</button>
    ${hasProps ? `<button class="pc-bb" type="button" data-act="props" aria-pressed="false" aria-label="Edit props" data-tip="Edit props" data-key="P">${svg('props')}</button>` : ''}
    <button class="pc-bb pc-keys-btn" type="button" data-act="keys" aria-label="Keyboard shortcuts" data-tip="Keyboard shortcuts" data-key="?">${svg('keys')}</button>
    ${onCopy ? `<button class="pc-cpy pc-label" type="button" data-act="copy" aria-label="Copy your props as JSX" data-tip="Copies your edited props as JSX. Grab the component code from the effect page.">Copy props</button>` : ''}
  </header>
  <button class="pc-pull" type="button" aria-label="Show preview controls" data-tip="Pull for controls · or press any key" hidden><span class="pc-hang"><span class="pc-cord" aria-hidden="true"></span><span class="pc-tag"><span class="pc-eyelet" aria-hidden="true"></span><svg class="pc-chev3" viewBox="0 0 16 24" aria-hidden="true"><defs><linearGradient id="pc-beam" gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="22" spreadMethod="repeat"><stop offset="0" stop-color="#FF6B00" stop-opacity=".2"/><stop offset=".3" stop-color="#FF6B00" stop-opacity=".2"/><stop offset=".58" stop-color="#FF6B00" stop-opacity="1"/><stop offset=".86" stop-color="#FF6B00" stop-opacity=".2"/><stop offset="1" stop-color="#FF6B00" stop-opacity=".2"/><animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="0 28" dur="1.6s" repeatCount="indefinite"/></linearGradient></defs><g fill="none" stroke="url(#pc-beam)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3.5l5 5 5-5"/><path d="M3 9.5l5 5 5-5"/><path d="M3 15.5l5 5 5-5"/></g></svg><span class="pc-label">Controls</span></span></span></button>
  <aside class="pc-panel" aria-label="Props" hidden data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
    <div class="pc-panel-h"><p class="pc-label">Props</p><button class="pc-bb" type="button" data-act="close-props" aria-label="Close props">✕</button></div>
    <div class="pc-panel-body"></div>
  </aside>
  <div class="pc-keys" hidden><p class="pc-label">Shortcuts</p><dl>
    <div><dt>R</dt><dd>Replay</dd></div>${hasProps ? '<div><dt>P</dt><dd>Props</dd></div>' : ''}<div><dt>1 2 3</dt><dd>Desktop · Tablet · Phone</dd></div><div><dt>M</dt><dd>Reduced motion</dd></div>
    ${shortcuts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}<div><dt>Esc</dt><dd>Close</dd></div></dl></div>
  <p class="pc-rm-note" role="status" hidden><i aria-hidden="true"></i>Reduced motion on: effects skip their travel</p>
  <div class="pc-tip" role="tooltip" aria-hidden="true"></div>
  <div class="pc-toast" role="status" aria-live="polite"></div>`;
  document.body.appendChild(root);
  document.documentElement.setAttribute('data-pc', '');

  const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
  const bar = $('.pc-bar'), pull = $('.pc-pull'), panel = $('.pc-panel'), keys = $('.pc-keys'), stage = $('.pc-stage');
  const frame = $('.pc-frame'), iframe = $('iframe'), dims = $('.pc-dims'), tip = $('.pc-tip'), toast = $('.pc-toast');
  const offs = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
  const note = (i) => { try { sound?.note?.(i); } catch { /* sound is optional */ } };

  /* ---------- toast ---------- */
  let toastT;
  function showToast(m) { toast.textContent = m; toast.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 3400); }

  /* ---------- devices: real-size iframe, scaled to fit ---------- */
  let dev = 'full', lastValues = null, frameReady = false;
  function fit() {
    const d = DEVICES[dev];
    if (!d) return;
    const cs = getComputedStyle(stage);
    const aw = innerWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.min(1, aw / d[0], ah / d[1]);
    frame.style.width = `${Math.round(d[0] * s)}px`; frame.style.height = `${Math.round(d[1] * s)}px`;
    iframe.style.width = `${d[0]}px`; iframe.style.height = `${d[1]}px`; iframe.style.transform = `scale(${s})`;
    dims.textContent = `${d[0]} × ${d[1]}${s < 1 ? ` · shown at ${Math.round(s * 100)}%` : ''}`;
  }
  function loadFrame() { frameReady = false; iframe.src = frameSrc(dev, { rm: rmOn }); }
  on(iframe, 'load', () => { frameReady = true; if (lastValues) postValues(lastValues); });
  function setDev(v) {
    if (!(v in DEVICES) || v === dev) return;
    const wasFull = dev === 'full';
    dev = v;
    $$('[data-dev]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.dev === v)));
    root.classList.toggle('pc-dev', v !== 'full');
    stage.setAttribute('aria-hidden', String(v === 'full'));
    document.documentElement.toggleAttribute('data-pc-dev', v !== 'full');
    if (v !== 'full') { if (wasFull || !iframe.src) loadFrame(); requestAnimationFrame(fit); }
    note(v === 'full' ? 4 : v === 'tablet' ? 2 : 0);
  }
  $$('[data-dev]').forEach((b) => on(b, 'click', () => setDev(b.dataset.dev)));
  on(window, 'resize', fit);

  function postValues(values) {
    lastValues = values;
    if (dev !== 'full' && frameReady && iframe.contentWindow) iframe.contentWindow.postMessage({ type: MSG, values }, location.origin);
  }

  /* ---------- replay / reduced motion ---------- */
  function replay() { onReplay(); if (dev !== 'full') loadFrame(); root.classList.remove('pc-spin'); void root.offsetWidth; root.classList.add('pc-spin'); note(1); }
  function setRM(v) {
    simulateReducedMotion(v);
    $('[data-act="rm"]').setAttribute('aria-pressed', String(v));
    $('.pc-rm-note').hidden = !v;
    onReducedMotion?.(v);
    showToast(v ? 'Previewing reduced motion.' : 'Full motion restored.');
    replay();
  }

  /* ---------- props panel / shortcuts ---------- */
  function setPanel(v) {
    if (!hasProps) return;
    panel.hidden = !v;
    $('[data-act="props"]')?.setAttribute('aria-pressed', String(v));
    if (v) { panel.classList.remove('pc-in'); void panel.offsetWidth; panel.classList.add('pc-in'); }
  }
  const toggleKeys = () => { keys.hidden = !keys.hidden; };

  async function copy() {
    if (!onCopy) return;
    const text = onCopy();
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    showToast(`Props copied. Paste them onto <${title.replace(/\s+/g, '')} /> in your project.`);
  }

  on(bar, 'click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'replay') replay();
    else if (a === 'rm') setRM(!rmOn);
    else if (a === 'props') setPanel(panel.hidden);
    else if (a === 'keys') toggleKeys();
    else if (a === 'copy') copy();
  });
  on($('[data-act="close-props"]'), 'click', () => setPanel(false));
  if (onBack) on($('.pc-back'), 'click', (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); onBack(backHref); });

  /* ---------- the bar tucks into a pull tag while you watch ---------- */
  let idle;
  function tuck() {
    bar.classList.add('pc-away'); bar.setAttribute('aria-hidden', 'true'); bar.inert = true;
    pull.hidden = false; requestAnimationFrame(() => pull.classList.add('pc-in'));
  }
  function wake() {
    bar.classList.remove('pc-away'); bar.removeAttribute('aria-hidden'); bar.inert = false;
    pull.classList.remove('pc-in');
    setTimeout(() => { if (!bar.classList.contains('pc-away')) pull.hidden = true; }, 500);
    clearTimeout(idle);
    idle = setTimeout(() => {
      if (!panel.hidden || !keys.hidden || bar.matches(':hover') || bar.contains(document.activeElement)) return wake();
      tuck();
    }, idleMs);
  }
  on(pull, 'click', () => { wake(); if (matchMedia('(pointer:fine)').matches) bar.querySelector('.pc-bb')?.focus({ preventScroll: true }); note(3); });
  on(bar, 'pointerenter', wake); on(bar, 'focusin', wake);
  on(window, 'pointermove', (e) => { if (e.clientY < 70 && bar.classList.contains('pc-away')) wake(); }, { passive: true });

  on(document, 'keydown', (e) => {
    const t = e.target;
    if (t && (t.closest?.('input,textarea,select,[contenteditable="true"]'))) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (bar.classList.contains('pc-away') && k !== 'tab') wake();
    if (k === 'r') replay();
    else if (k === 'p') setPanel(panel.hidden);
    else if (k === 'm') setRM(!rmOn);
    else if (k === '1') setDev('full');
    else if (k === '2') setDev('tablet');
    else if (k === '3') setDev('phone');
    else if (k === '?' || (k === '/' && e.shiftKey)) toggleKeys();
    else if (k === 'escape') { if (!keys.hidden) keys.hidden = true; else if (!panel.hidden) setPanel(false); else if (dev !== 'full') setDev('full'); }
  });

  /* ---------- tooltips: one floating element, hover + keyboard focus ---------- */
  let cur = null, tipT;
  function showTip(el) {
    cur = el; const k = el.dataset.key;
    tip.innerHTML = `<span>${esc(el.dataset.tip)}</span>${k ? `<kbd>${esc(k)}</kbd>` : ''}`;
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    const x = Math.max(10, Math.min(innerWidth - tw - 10, r.left + r.width / 2 - tw / 2));
    let y = r.bottom + 10; if (y + th > innerHeight - 10) y = r.top - th - 10;
    tip.style.left = `${x}px`; tip.style.top = `${y}px`; tip.classList.add('pc-on');
  }
  function hideTip() { cur = null; tip.classList.remove('pc-on'); }
  on(root, 'pointerover', (e) => {
    const el = e.target.closest?.('[data-tip]'); if (el === cur) return;
    clearTimeout(tipT); if (!el) { hideTip(); return; } tipT = setTimeout(() => showTip(el), 140);
  });
  on(root, 'pointerleave', hideTip);
  on(root, 'focusin', (e) => { const el = e.target.closest?.('[data-tip]'); if (el && el.matches(':focus-visible')) showTip(el); });
  on(root, 'focusout', hideTip); on(document, 'pointerdown', hideTip); on(window, 'scroll', hideTip, true);

  if (startOpen) setPanel(true);
  wake();

  return {
    root,
    panelBody: $('.pc-panel-body'),
    setPanel, setDevice: setDev, replay, showToast, postValues,
    get device() { return dev; },
    get reducedMotion() { return rmOn; },
    destroy() {
      offs.forEach((f) => f()); clearTimeout(idle); clearTimeout(toastT); clearTimeout(tipT);
      if (rmOn) simulateReducedMotion(false);
      document.documentElement.removeAttribute('data-pc'); document.documentElement.removeAttribute('data-pc-dev');
      root.remove();
    },
  };
}
