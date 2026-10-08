"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { preload } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Heart } from "lucide-react";
import { motion } from "motion/react";
import { useLenis } from "lenis/react";
import HeadAnim from "@/components/Animations/HeadAnim";
import Copy from "@/components/Animations/Copy";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { TemplatePaywallModal } from "@/components/ui/TemplatePaywallModal";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { useTemplateWishlist } from "../../templates/useTemplateWishlist";
import { useTemplateAccess } from "../../templates/useTemplateAccess";
import { TemplateCardV4 } from "../TemplateCardV4";
import { BADGE, DISPLAY, PRICE, GUTTER, LABEL, T13, T14, T16, T18, T40, catalogueOf, priceOf } from "../tokens";
import { GetTemplateModal } from "./GetTemplateModal";

// three.js only loads when the exploded view is shown.
const TemplateExploded = dynamic(() => import("./TemplateExploded"), {
  ssr: false,
  loading: () => <div className="h-svh" />,
});

// Same query flag as the live detail page: a signed-out Buy click comes back with ?buy=1.
const RESUME_PURCHASE_PARAM = "buy";

const DEVICES = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "phone", label: "Phone" },
];
// Live preview viewports: the iframe renders at the real size and is scaled to fit.
const LIVE_SIZE = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
};
// Hero: the title and description animate in from 0.5s; everything else fades in 0.5s after.
const HERO_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay: 1, duration: 0.8, ease: "easeInOut" },
};

const MODES = [
  { id: "exploded", label: "Exploded" },
  { id: "live", label: "Live" },
];

const CHIP = `inline-flex h-7 items-center px-2.5 font-mono ${T13}`;

/* ---------- can this device show the exploded view? (motion allowed, WebGL) ---------- */
const EXPLODED_QUERY = "(prefers-reduced-motion: no-preference)";
let webgl;
const hasWebGL = () => {
  if (webgl === undefined) {
    try {
      webgl = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webgl = false;
    }
  }
  return webgl;
};
const subscribeExploded = (onChange) => {
  const mq = window.matchMedia(EXPLODED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const canExplode = () => window.matchMedia(EXPLODED_QUERY).matches && hasWebGL();

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(date)
    : null;
}


export function TemplateDetailV4({ template, templateAccess = { allowed: false, reason: "anonymous" }, devices = {}, effects = [], stack = [], related = [] }) {
  const rootRef = useRef(null);
  const stageTopRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [hasAccess, setHasAccess] = useState(templateAccess.allowed);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [autoOpenCheckout, setAutoOpenCheckout] = useState(false);
  const [getOpen, setGetOpen] = useState(null); // null | "buy" | "credit"

  const explodedOk = useSyncExternalStore(subscribeExploded, canExplode, () => true);
  const [glFailed, setGlFailed] = useState(false);
  const [chosenMode, setChosenMode] = useState(null);
  const hasCapture = Object.keys(devices).length > 0;
  const mode = explodedOk && !glFailed && hasCapture ? chosenMode || "exploded" : "live";
  const [device, setDevice] = useState("desktop");

  const { toast, showToast, dismissToast } = useToastQueue();
  const { wishlist, toggleWishlist } = useTemplateWishlist({
    onSaved: (t) => showToast({ title: `${t.title} saved`, description: "You'll find it in your dashboard's My Templates." }),
    onRemoved: (t) => showToast({ title: `${t.title} removed`, description: "No longer in your saved templates." }),
  });
  const relatedAccess = useTemplateAccess();
  useFadeUp(rootRef);

  const price = priceOf(template);
  const full = catalogueOf(template) === "full";
  const downloadHref = `/api/templates/${template.slug}/download`;
  // A device with no exported design falls back to desktop in the exploded view.
  const capture = devices[device] || devices.desktop || Object.values(devices)[0];
  const sectionCount = devices.desktop?.sections.length || 0;
  const updated = formatDate(template.updatedAt);
  const published = formatDate(template.publishedAt);

  // Record a real view once per mount, like the live detail page.
  useEffect(() => {
    fetch(`/api/templates/${template.slug}/view`, { method: "POST" }).catch(() => {});
  }, [template.slug]);

  // Resume a purchase after the sign-in bounce (?buy=1), like the live detail page.
  useEffect(() => {
    if (searchParams.get(RESUME_PURCHASE_PARAM) !== "1") return;
    if (hasAccess || templateAccess.reason === "anonymous") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaywallOpen(true);
    setAutoOpenCheckout(true);
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = () => {
    window.location.href = downloadHref;
    showToast({ title: `${template.title} downloaded`, description: `${template.title} has been downloaded.` });
  };

  // The real purchase: owned downloads, signed-out signs in and resumes here, signed-in opens the paywall.
  const buy = () => {
    setGetOpen(null);
    if (hasAccess) return download();
    if (templateAccess.reason === "anonymous") {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`${pathname}?${RESUME_PURCHASE_PARAM}=1`)}`);
      return;
    }
    setPaywallOpen(true);
  };

  const onPurchased = () => {
    setHasAccess(true);
    setPaywallOpen(false);
    setAutoOpenCheckout(false);
    window.location.href = downloadHref;
    showToast({ title: `${template.title} purchased`, description: `${template.title} has been purchased and downloaded.` });
    router.refresh();
  };

  // Switching Exploded <-> Live changes the stage's height (the exploded view is
  // a tall scroll-through), which would leave you further down the page. Bring
  // the stage back to the top of the screen instead, so you stay on the preview.
  const lenis = useLenis();
  const keepStageRef = useRef(false);
  const chooseMode = (id) => {
    if (id === mode) return;
    keepStageRef.current = true;
    setChosenMode(id);
  };
  useLayoutEffect(() => {
    if (!keepStageRef.current) return;
    keepStageRef.current = false;
    const el = stageTopRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo(0, top);
  }, [mode, lenis]);

  // Start downloading the exploded view's images with the page, rather than
  // only once three.js has loaded and built the scene.
  if (mode === "exploded" && capture) {
    if (capture.src) preload(capture.src, { as: "image", fetchPriority: "high" });
    capture.sections.forEach((sec, i) => sec.src && preload(sec.src, { as: "image", fetchPriority: i < 3 ? "high" : "low" }));
  }

  // Effects with a Vault page vs components built just for this template.
  const vaultEffects = effects.filter((fx) => fx.href);
  const customEffects = effects.filter((fx) => !fx.href);

  const facts = [
    ["Sections", sectionCount ? `${sectionCount} on one scrolling page` : "One scrolling page"],
    ["Stack", stack],
    ["Built with", `${vaultEffects.length} Vault effects`],
    ["Includes", "Source code and Figma file"],
    ["Licence", "MPL-2.0"],
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      {explodedOk && !glFailed && hasCapture && <Segment label="View" items={MODES} value={mode} onChange={chooseMode} itemClassName="w-24" />}
      <Segment label="Device" items={mode === "exploded" ? DEVICES.filter((d) => devices[d.id]) : DEVICES} value={device} onChange={setDevice} itemClassName="w-21" />
    </div>
  );

  return (
    // Fades in, so arriving from the corridor (which fades the listing out) is one smooth cross-fade.
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: "easeInOut" }}
      className="relative text-[#F4F4F4]"
    >
      {/* ---------- hero ---------- */}
      <section className={`${GUTTER} pt-25 pb-16 max-lg:pt-32 max-md:pt-28`}>
        <motion.div {...HERO_FADE}>
          <Breadcrumb />
        </motion.div>

        <div className="mt-10 grid grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] items-start gap-12 max-lg:grid-cols-1 max-lg:gap-10">
          <div className="sticky top-[20%] h-fit">
           
            <HeadAnim rotate={0} animateOnScroll={false} delay={0.5}>
              <h1 className={`${DISPLAY} text80 leading-[0.95]! max-lg:text-[9vw] max-md:text-[13vw]`}>{template.title}</h1>
            </HeadAnim>
            {template.tagline && (
              <Copy animateOnScroll={false} delay={0.7}>
                <p className={`mt-6 max-w-[40vw] text22 leading-[1.3] text-foreground max-lg:max-w-none`}>{template.tagline}</p>
              </Copy>
            )}
             <motion.div {...HERO_FADE} className="mt-10 flex flex-wrap gap-1.5">
              <span className={`${BADGE} bg-white/5 text-[#d8d8d8]`}>{template.category}</span>
              <span className={`${BADGE} ${full ? "bg-white text-black shadow-[inset_0_0_0_1px_rgba(255,178,122,.3)]" : "bg-primary text-black"}`}>
                {full ? "Pro+ only" : "✦ Selected catalogue"}
              </span>
              {hasAccess && <span className={`${BADGE} bg-white/5 backdrop-blur-lg text-white`}>Yours <span className="text-primary">✓</span></span>}
            </motion.div>
          </div>

          <motion.aside {...HERO_FADE} className="grid min-w-0 gap-6">
            <dl className="grid gap-3">
              {facts.map(([term, value]) => (
                <div key={term} className="grid grid-cols-[8vw_minmax(0,1fr)] items-center gap-3 border-b border-white/7 pb-3 max-lg:grid-cols-[18vw_minmax(0,1fr)] max-md:grid-cols-[28vw_minmax(0,1fr)]">
                  <dt className={`${LABEL} text-white/60`}>{term}</dt>
                  <dd className={`flex flex-wrap gap-1.25 ${T14} text-[#e0e0e0]`}>
                    {Array.isArray(value)
                      ? value.map((v) => (
                          <span key={v} className={`${CHIP} h-5.5! px-1.75! text-[#bdbdbd] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)]`}>
                            {v}
                          </span>
                        ))
                      : value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-4">
              {price != null && (
                <p className="flex items-baseline gap-3">
                  <b className={`${DISPLAY} ${PRICE} text-[3.6vw] leading-none max-lg:text-[7vw] max-md:text-[12vw]`}>${price}</b>
                  <span className={`${LABEL} text-white/60`}>one-time or 1 template credit</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                 <button
                  type="button"
                  onClick={() => toggleWishlist(template)}
                  aria-pressed={wishlist.includes(template.slug)}
                  aria-label={wishlist.includes(template.slug) ? "Remove from saved" : "Save template"}
                  className="inline-flex size-11 cursor-pointer items-center justify-center bg-white/5 backdrop-blur-lg shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_rgba(255,95,0,.7)]"
                >
                  <Heart className={`size-4 ${wishlist.includes(template.slug) ? "fill-[#ff5f00] text-[#ff5f00]" : ""}`} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={hasAccess ? download : () => setGetOpen("buy")}
                  className={`inline-flex h-11 cursor-pointer items-center gap-2 bg-[#ff5f00] px-5 ${T16} text-[#141414] transition-colors duration-500 hover:bg-[#ff7300]`}
                >
                  {hasAccess ? (
                    <>
                      <Download className="size-4" aria-hidden="true" /> Download source
                    </>
                  ) : (
                    "Buy template"
                  )}
                </button>
                {/* The live template, in a new tab */}
                <ButtonV3
                  text="Demo"
                  href={template.previewHref}
                  target_blank
                  variant="outline"
                  ariaLabel={`Open the ${template.title} demo in a new tab`}
                  className="tracking-normal!"
                />
              </div>
            </div>
          </motion.aside>
        </div>
      </section>

      {/* ---------- exploded view / live preview ---------- */}
      <div ref={stageTopRef} className="scroll-mt-20">
        {mode === "exploded" ? (
          <TemplateExploded
            device={device}
            capture={capture}
            sections={capture?.sections || []}
            onUnsupported={() => setGlFailed(true)}
            toolbar={toolbar}
          />
        ) : (
          <section aria-label="Live template preview" className={`${GUTTER} pb-24`}>
            <div className="mb-3.5">{toolbar}</div>
            <LivePreview template={template} device={device} />
          </section>
        )}
      </div>

      {/* ---------- what's inside + more templates ---------- */}
      <div data-sound-hover="off" data-sound-flow="off" className="relative bg-[#F4F4F4] text-[#1D1D1D]">
        <section className={`${GUTTER} grid grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)] gap-[4vw] pt-24 max-lg:grid-cols-1 max-md:pt-16`}>
          <div className="fadeup">
            <h2 className={`${DISPLAY} ${T40} leading-[1.02]`}>
              What’s <span className="gradient-text-animate">inside.</span>
            </h2>
            {(template.overview || []).map((paragraph, i) => (
              <p key={i} className={`mt-4.5 ${T16} leading-[1.7] text-[#6B6B6B]`}>
                {paragraph}
              </p>
            ))}
            {published && <p className={`mt-6 ${LABEL} text-[#8a8a8a]`}>Published {published}</p>}
          </div>

          <div className="fadeup grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
            <InsideCard title="Sections included">
              <ol className="grid gap-2">
                {(devices.desktop?.sections || []).map((s, i) => (
                  <li key={`${s.name}-${i}`} className={`flex items-baseline gap-3 ${T16}`}>
                    <span className={`font-mono ${T13} text-[#ff5f00]`}>{String(i + 1).padStart(2, "0")}</span>
                    {s.name}
                  </li>
                ))}
              </ol>
            </InsideCard>
            <InsideCard title="Built from Vault effects">
              <div className="flex flex-wrap gap-1.5">
                {vaultEffects.map((fx) => (
                  <Link key={fx.name} href={fx.href} className={`inline-flex h-7.5 items-center bg-[#f2f0ec] px-3 ${T14} transition-colors duration-500 hover:bg-[#ff5f00] hover:text-[#141414]`}>
                    {fx.title}
                  </Link>
                ))}
              </div>
              {customEffects.length > 0 && (
                <>
                  <p className={`mt-4.5 mb-2 ${LABEL} text-[#6B6B6B]`}>Built for this template</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customEffects.map((fx) => (
                      <span key={fx.name} className={`inline-flex h-7.5 items-center px-3 ${T14} text-[#6B6B6B] shadow-[inset_0_0_0_1px_rgba(29,29,29,.12)]`}>
                        {fx.title}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </InsideCard>
            <InsideCard title="Stack" className="col-span-full">
              <div className="flex flex-wrap gap-1.5">
                {stack.map((s) => (
                  <span key={s} className={`inline-flex h-7.5 items-center bg-[#f2f0ec] px-3 ${T14}`}>
                    {s}
                  </span>
                ))}
              </div>
              <p className={`mt-3.5 ${T14} text-[#6B6B6B]`}>
                Built from Vault effects, so every section ships with the same dependency notes, reduced-motion handling and mobile behaviour as the effects themselves.
              </p>
            </InsideCard>
          </div>
        </section>

        {related.length > 0 && (
          <section className={`${GUTTER} pt-28 pb-28 max-md:pt-20 max-md:pb-20`}>
            <div className="fadeup mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 className={`${DISPLAY} ${T40} leading-[1.02]`}>
                More <span className="gradient-text-animate">templates.</span>
              </h2>
              <ButtonV3 className="tracking-normal!" text="All templates" href="/templates-v4" />
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-14 max-md:grid-cols-1">
              {related.map((t) => (
                <TemplateCardV4
                  key={t.slug}
                  template={t}
                  isWishlisted={wishlist.includes(t.slug)}
                  onToggleWishlist={toggleWishlist}
                  hasAccess={relatedAccess.includes(t.slug)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <GetTemplateModal template={template} tab={getOpen} onTab={setGetOpen} onClose={() => setGetOpen(null)} onBuy={buy} />

      <TemplatePaywallModal
        template={template}
        open={paywallOpen}
        onClose={() => {
          setPaywallOpen(false);
          setAutoOpenCheckout(false);
        }}
        onPurchased={onPurchased}
        autoOpenCheckout={autoOpenCheckout}
        templateAccess={templateAccess}
      />

      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </motion.div>
  );
}

/** The live template in an iframe at a real device size, scaled to fit the box (as on the live detail page). */
function LivePreview({ template, device }) {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(1);
  const size = LIVE_SIZE[device] || LIVE_SIZE.desktop;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScale(Math.min(box.clientWidth / size.width, box.clientHeight / size.height, 1) || 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [size.width, size.height]);

  return (
    <div ref={boxRef} className="relative flex h-[78vh] items-center justify-center overflow-hidden bg-[radial-gradient(80%_70%_at_50%_40%,#1c1c1c,#0c0c0c)] shadow-[inset_0_0_0_1px_rgba(244,244,244,.08)]">
      <div style={{ width: size.width, height: size.height, transform: `scale(${scale})` }} className="shrink-0 origin-center bg-white transition-transform duration-300">
        <iframe
          key={`${template.previewHref}-${device}`}
          src={template.previewHref}
          title={`${template.title} live preview`}
          width={size.width}
          height={size.height}
          className="block border-0"
        />
      </div>
    </div>
  );
}

function InsideCard({ title, className = "", children }) {
  return (
    <div className={`bg-white p-5.5 shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] ${className}`}>
      <p className={`mb-3.5 ${LABEL} text-[#6B6B6B]`}>{title}</p>
      {children}
    </div>
  );
}

/** Dark segmented control: an orange block slides to the chosen option. */
function Segment({ label, items, value, onChange, itemClassName }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative flex gap-0.5 bg-[rgba(20,20,20,.72)] p-0.75 shadow-[inset_0_0_0_1px_rgba(244,244,244,.1)] backdrop-blur-md">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-[#ff5f00] transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${itemClassName}`}
        style={{ transform: `translateX(calc(${index} * (100% + 2px)))` }}
      />
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.id)}
            className={`relative z-1 grid h-8.5 cursor-pointer place-items-center ${T14} transition-colors duration-500 ${itemClassName} ${
              active ? "text-[#141414]" : "text-[#a9a9a9] hover:text-white"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

