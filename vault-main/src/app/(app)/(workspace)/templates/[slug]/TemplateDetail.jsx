"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
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
import Button from "@/homepage/components/Button";
import { useTemplateWishlist } from "../useTemplateWishlist";
import { useTemplateAccess } from "../useTemplateAccess";
import { TemplateCard } from "../TemplateCard";
import { BADGE, GUTTER, LABEL, T13, T14, cardReveal, catalogueOf, priceOf } from "../tokens";
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


export function TemplateDetail({ template, templateAccess = { allowed: false, reason: "anonymous" }, devices = {}, effects = [], stack = [], related = [] }) {
  const rootRef = useRef(null);
  const stageTopRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [hasAccess, setHasAccess] = useState(templateAccess.allowed);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [autoOpenCheckout, setAutoOpenCheckout] = useState(false);
  const [getOpen, setGetOpen] = useState(false);
  const [getTab, setGetTab] = useState("buy");

  const explodedOk = useSyncExternalStore(subscribeExploded, canExplode, () => true);
  const [glFailed, setGlFailed] = useState(false);
  const [chosenMode, setChosenMode] = useState(null);
  const hasCapture = Object.keys(devices).length > 0;
  const mode = explodedOk && !glFailed && hasCapture ? chosenMode || "exploded" : "live";
  const [device, setDevice] = useState("desktop");

  const { toast, showToast, dismissToast } = useToastQueue();
  const { wishlist, toggleWishlist, signInModal } = useTemplateWishlist({
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

  const closeGet = useCallback(() => setGetOpen(false), []);

  const download = () => {
    window.location.href = downloadHref;
    showToast({ title: `${template.title} downloaded`, description: `${template.title} has been downloaded.` });
  };

  // The real purchase: owned downloads, signed-out signs in and resumes here, signed-in opens the paywall.
  const buy = () => {
    setGetOpen(false);
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

  // Only effects with a Vault page are listed.
  const vaultEffects = effects.filter((fx) => fx.href);

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
      className="relative text-light"
    >
      {/* ---------- hero ---------- */}
      <section id="template-hero" className={`${GUTTER} flex flex-col gap-10 pt-25 pb-16 max-lg:pt-32 max-md:pt-28`}>
        <motion.div {...HERO_FADE}>
          <Breadcrumb />
        </motion.div>

        <div className="flex items-start justify-between gap-12 max-lg:flex-col max-lg:gap-10">
          <div className="sticky top-[20%] flex h-fit w-[57%] flex-col gap-6 max-lg:static max-lg:w-full">
            <HeadAnim rotate={0} animateOnScroll={false} delay={0.5}>
              <h1 className="type-display">{template.title}</h1>
            </HeadAnim>
            {template.tagline && (
              <Copy animateOnScroll={false} delay={0.7}>
                <p className="type-body-lg w-[85%] text-foreground max-lg:w-full">{template.tagline}</p>
              </Copy>
            )}
            <motion.div {...HERO_FADE} className="flex flex-wrap gap-1.5 pt-4">
              <span className={`${BADGE} bg-foreground/5 text-foreground/80`}>{template.category}</span>
              <span className={`${BADGE} ${full ? "bg-foreground text-background ring-1 ring-inset ring-[rgba(255,178,122,.3)]" : "bg-primary text-background"}`}>
                {full ? "Pro+ only" : "Selected catalogue"}
              </span>
              {hasAccess && <span className={`${BADGE} bg-foreground/5 text-foreground backdrop-blur-lg`}>Yours <span className="text-primary">✓</span></span>}
            </motion.div>
          </div>

          <motion.aside {...HERO_FADE} className="flex w-[38%] min-w-0 flex-col gap-6 max-lg:w-full">
            <dl className="flex flex-col gap-3">
              {facts.map(([term, value]) => (
                <div key={term} className="flex items-center gap-3 border-b border-foreground/7 pb-3">
                  <dt className={`${LABEL} w-[24%] shrink-0 text-foreground/60 max-lg:w-[20%] max-md:w-[32%]`}>{term}</dt>
                  <dd className={`flex min-w-0 flex-1 flex-wrap gap-1.25 ${T14} text-foreground/90`}>
                    {Array.isArray(value)
                      ? value.map((v) => (
                          <span key={v} className={`${CHIP} h-5.5! px-1.75! text-foreground/70 ring-1 ring-inset ring-foreground/15`}>
                            {v}
                          </span>
                        ))
                      : value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-4">
              {price != null && (
                <p className="flex items-baseline gap-3">
                  <b className="type-h1 leading-none">${price}</b>
                  <span className={`${LABEL} text-foreground/60`}>one-time or 1 template credit</span>
                </p>
              )}
              {/* items-stretch: heart, Buy and Demo share one height. */}
              <div className="flex flex-wrap items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => toggleWishlist(template)}
                  aria-pressed={wishlist.includes(template.slug)}
                  aria-label={wishlist.includes(template.slug) ? "Remove from saved" : "Save template"}
                  className="inline-flex size-11 cursor-pointer items-center justify-center bg-foreground/5 ring-1 ring-inset ring-foreground/15 backdrop-blur-lg transition-shadow duration-500 hover:ring-primary/70"
                >
                  <Heart className={`size-4 ${wishlist.includes(template.slug) ? "fill-primary text-primary" : ""}`} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={
                    hasAccess
                      ? download
                      : () => {
                          setGetTab("buy");
                          setGetOpen(true);
                        }
                  }
                  className="inline-flex h-11 cursor-pointer items-center gap-2 bg-primary px-5 text-[calc(var(--hx-vw,1vw)*1.15)] text-background transition-colors duration-500 hover:bg-primary-hover max-lg:text-[clamp(13px,calc(var(--hx-vw,1vw)*1.6),15px)] max-md:text-[calc(var(--hx-vw,1vw)*2.2)] max-sm:text-[calc(var(--hx-vw,1vw)*4)]"
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
                <Button
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
          <section id="template-preview" aria-label="Live template preview" className={`${GUTTER} flex flex-col gap-3.5 pb-24`}>
            {toolbar}
            <LivePreview template={template} device={device} />
          </section>
        )}
      </div>

      {/* ---------- what's inside + more templates ---------- */}
      <div data-sound-hover="off" data-sound-flow="off" className="relative flex flex-col gap-[7vw] bg-light py-[7%] text-ink max-md:gap-[15vw] max-md:py-[15%]">
        <section id="template-inside" className={`${GUTTER} flex items-start justify-between gap-[4vw] max-lg:flex-col`}>
          {/* Article copy: styled by blog.css. Its light theme applies to a .blog-content
              inside a .blog-theme-light wrapper (as on the effect page), not to both on one
              element; body text is #1d1d1d here rather than the theme's #3a3a3a. */}
          <div className="fadeup flex w-[32%] flex-col gap-6 max-lg:w-full">
            <div className="blog-theme-light">
              <div className="blog-content [--blog-text-secondary:#1d1d1d]">
                <h2>
                  What’s <span className="gradient-text-animate">inside.</span>
                </h2>
                {(template.overview || []).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
            {published && <p className={`${LABEL} text-black/40`}>Published {published}</p>}
          </div>

          <div className="fadeup flex w-[64%] flex-wrap gap-[0.9vw] max-md:gap-[3.5vw] max-lg:w-full">
            <InsideCard title="Sections included" className="w-[calc((100%-0.9vw)/2)] max-md:w-full">
              <ol className="flex flex-col gap-2">
                {(devices.desktop?.sections || []).map((s, i) => (
                  <li key={`${s.name}-${i}`} className="type-body flex items-baseline gap-3">
                    <span className={`font-mono ${T13} text-primary`}>{String(i + 1).padStart(2, "0")}</span>
                    {s.name}
                  </li>
                ))}
              </ol>
            </InsideCard>
            <InsideCard title="Built from Vault effects" className="w-[calc((100%-0.9vw)/2)] max-md:w-full">
              <div className="flex flex-wrap gap-1.5">
                {vaultEffects.map((fx) => (
                  <Link key={fx.name} href={fx.href} className={`inline-flex h-7.5 items-center bg-light px-3 ${T14} transition-colors duration-500 hover:bg-primary hover:text-background`}>
                    {fx.title}
                  </Link>
                ))}
              </div>
            </InsideCard>
            <InsideCard title="Stack" className="w-full">
              <div className="flex flex-wrap gap-1.5">
                {stack.map((s) => (
                  <span key={s} className={`inline-flex h-7.5 items-center bg-light px-3 ${T14}`}>
                    {s}
                  </span>
                ))}
              </div>
              <p className={`${T14} text-black/60`}>
                Built from Vault effects, so every section ships with the same dependency notes, reduced-motion handling and mobile behaviour as the effects themselves.
              </p>
            </InsideCard>
          </div>
        </section>

        {related.length > 0 && (
          <section id="related-templates" className={`${GUTTER} flex flex-col gap-8`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <HeadAnim rotate={0} by="words">
                <h2 className="type-h1">
                  More <span className="gradient-text-animate">templates.</span>
                </h2>
              </HeadAnim>
              <div className="fadeup">
                <Button className="tracking-normal!" text="All templates" href="/templates" />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-[1.4vw] gap-y-14">
              {/* Same fade-up as the /templates grid (cardReveal). */}
              {related.map((t, index) => (
                <motion.div key={t.slug} {...cardReveal(index)} className="w-[calc((100%-1.4vw)/2)] max-md:w-full">
                  <TemplateCard small template={t} hasAccess={relatedAccess.includes(t.slug)} />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      {signInModal}
      <GetTemplateModal template={template} open={getOpen} tab={getTab} onTab={setGetTab} onClose={closeGet} onBuy={buy} />

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
    <div ref={boxRef} className="relative flex h-[78vh] items-center justify-center overflow-hidden bg-[radial-gradient(80%_70%_at_50%_40%,var(--dark-card),var(--background))] ring-1 ring-inset ring-foreground/8">
      <div style={{ width: size.width, height: size.height, transform: `scale(${scale})` }} className="shrink-0 origin-center bg-foreground transition-transform duration-300">
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
    <div className={`flex flex-col gap-3.5 bg-foreground p-5.5 ring-1 ring-inset ring-black/10 ${className}`}>
      <p className={`${LABEL} text-black/60`}>{title}</p>
      {children}
    </div>
  );
}

/** Dark segmented control: an orange block slides to the chosen option. */
function Segment({ label, items, value, onChange, itemClassName }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative flex gap-0.5 bg-background/70 p-0.75 ring-1 ring-inset ring-foreground/10 backdrop-blur-lg">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-primary transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${itemClassName}`}
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
            className={`relative z-1 flex h-8.5 cursor-pointer items-center justify-center ${T14} transition-colors duration-500 ${itemClassName} ${
              active ? "text-background" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

