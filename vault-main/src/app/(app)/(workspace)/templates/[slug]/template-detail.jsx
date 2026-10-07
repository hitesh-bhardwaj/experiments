"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Monitor, Tablet, Smartphone, Download } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Tooltip } from "@/components/ui/Tooltip";
import { TemplateCard } from "@/components/ui/TemplateCard";
import { TemplatePaywallModal } from "@/components/ui/TemplatePaywallModal";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import HeadAnim from "@/components/Animations/HeadAnim";
import Copy from "@/components/Animations/Copy";
import { useFadeUp, useLineAnim } from "@/components/Animations/gsapAnimations";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { useTemplateWishlist } from "../useTemplateWishlist";
import { useTemplateAccess } from "../useTemplateAccess";

// Query flag a signed-out "Buy" click appends before bouncing through
// /sign-in?redirect_url=... - on the way back, its presence (plus now being
// signed in) is what tells this page to resume the purchase itself instead
// of making the visitor click Buy a second time.
const RESUME_PURCHASE_PARAM = "buy";

// Design-only for now, per the Figma template detail page (Enigma-Redesign,
// node 4304:540) - mock data, no real registry/Sanity backing, no purchase
// flow. The Figma frame is a half-migrated duplicate of the Effect Detail
// page: only the breadcrumb/heading/description/dates/category badge were
// actually updated for a template (ElenaVoss); the big preview area and the
// entire "Related" section still showed leftover Arrow-Fill-Button/Related
// Effects content, so this mirrors effect-detail.jsx's structure/classNames
// instead of that stale markup, swapped to template-specific copy. The big
// preview area embeds the real, live template (/template-demo/<slug>) in an
// iframe with a device-size toggle, per md/sections-templates-plan.md §3's
// "iframe the existing live route" recommendation - same-origin, so no
// CSP/X-Frame-Options changes were needed (frame-src already allows 'self').
//
// The live templates size everything in vw/vh, calibrated against a real
// device viewport - so the iframe can't just be fluid-width'd to whatever
// the outer container happens to be (that reads as an arbitrary in-between
// width to the template's own CSS and its media queries). Each preset here
// is instead a genuine device viewport; the iframe always renders at that
// exact size, and the wrapper is CSS-scaled down to fit the visible box, so
// 1vw inside the frame always means "1% of a real 1920/768/390px device".
const DEVICE_PRESETS = {
  web: { label: "Web", icon: Monitor, width: 1920, height: 1080 },
  mobile: { label: "Mobile", icon: Smartphone, width: 390, height: 844 },
};

function formatTemplateDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function TemplateDetail({
  template,
  relatedTemplates = [],
  templateAccess = { allowed: false, reason: "anonymous" },
}) {
  useFadeUp();
  useLineAnim();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [device, setDevice] = useState("web");
  const [scale, setScale] = useState(1);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  // Only true for the sign-in-then-resume path below - a direct click on
  // "Buy" while already signed in still opens the modal normally, requiring
  // its own Buy click, same as before this feature existed.
  const [autoOpenCheckout, setAutoOpenCheckout] = useState(false);
  // Access is re-derived server-side on every navigation via
  // getTemplateAccessDecision (page.js), but that only reruns on a real
  // request - after a successful in-place purchase this flips optimistically
  // so "Download Zip" works immediately, without waiting on a full reload.
  const [hasAccess, setHasAccess] = useState(templateAccess.allowed);
  const previewBoxRef = useRef(null);
  const { toast, showToast, dismissToast } = useToastQueue();
  const { wishlist, toggleWishlist } = useTemplateWishlist({
    onSaved: (related) =>
      showToast({ title: `${related.title} saved`, description: "You'll find it in your dashboard's My Templates." }),
    onRemoved: (related) =>
      showToast({ title: `${related.title} removed`, description: "No longer in your saved templates." }),
  });
  const relatedAccessSlugs = useTemplateAccess();

  const publishedLabel = formatTemplateDate(template.publishedAt);
  const updatedLabel = formatTemplateDate(template.updatedAt);
  const preset = DEVICE_PRESETS[device];

  const downloadHref = `/api/templates/${template.slug}/download`;

  const handleDownloadClick = () => {
    if (hasAccess) {
      // Deliberately window.location, not ButtonV3's Next <Link> - a <Link>
      // to a Route Handler risks Next's client-router prefetch machinery
      // interfering with what needs to be a real file-download response.
      // Content-Disposition: attachment on this route means the browser
      // downloads it in place rather than navigating away, so the toast
      // below stays on screen through and after the download.
      window.location.href = downloadHref;
      showToast({
        title: `${template.title} downloaded`,
        description: `${template.title} has been downloaded.`,
      });
      return;
    }

    if (templateAccess.reason === "anonymous") {
      // Bounce through sign-in and land back on this exact page with
      // ?buy=1, which the effect below reads to resume the purchase
      // automatically instead of making them find and click Buy again.
      const resumeUrl = `${pathname}?${RESUME_PURCHASE_PARAM}=1`;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(resumeUrl)}`);
      return;
    }

    setIsPaywallOpen(true);
  };

  const handlePurchased = () => {
    setHasAccess(true);
    setIsPaywallOpen(false);
    setAutoOpenCheckout(false);
    // Content-Disposition: attachment on this route means the browser
    // downloads it in place rather than navigating away, so the toast below
    // stays on screen through and after the download.
    window.location.href = downloadHref;
    showToast({
      title: `${template.title} purchased`,
      description: `${template.title} has been purchased and downloaded.`,
    });
    // Re-syncs the server-derived access decision in the background so a
    // later visit (or a refresh right now) reflects the real Supabase row
    // rather than only this optimistic client flag.
    router.refresh();
  };

  useEffect(() => {
    // Records a real view once per mount - a real browser render of this
    // page, not Next's Link prefetch (TemplateCard's Link to here uses
    // prefetch={false} and only ever calls router.prefetch() manually on
    // hover, which would otherwise inflate this every time a card is merely
    // hovered). Fire-and-forget: a failed view record shouldn't block or
    // error the page itself.
    fetch(`/api/templates/${template.slug}/view`, { method: "POST" }).catch(() => { });
  }, [template.slug]);

  useEffect(() => {
    // Resume path: signed-out visitor clicked Buy, went through
    // /sign-in?redirect_url=<this page>?buy=1, and is now back here already
    // authenticated. templateAccess is recomputed server-side on this fresh
    // navigation, so reason !== "anonymous" reliably reflects the real,
    // just-established session - open the paywall and let
    // RazorpayCheckoutButton's autoOpen skip the second click.
    if (searchParams.get(RESUME_PURCHASE_PARAM) !== "1") return;
    if (hasAccess || templateAccess.reason === "anonymous") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPaywallOpen(true);
    setAutoOpenCheckout(true);
    router.replace(pathname, { scroll: false });
    // Only ever meant to run once, off the URL this page loaded with - not
    // meant to re-fire on later state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const box = previewBoxRef.current;

    if (!box) return;

    const updateScale = () => {
      const nextScale = Math.min(
        box.clientWidth / preset.width,
        box.clientHeight / preset.height,
        1
      );

      setScale(nextScale > 0 ? nextScale : 1);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(box);

    return () => observer.disconnect();
  }, [preset.width, preset.height]);

  return (
    <div className="min-h-screen text-foreground">
      <main className="mx-auto w-full relative px-14 max-[1025px]:px-0 pt-25 max-md:pt-36">
        <section className="space-y-10">
          <div className="flex items-start max-md:px-[7vw] max-[1025px]:px-[6vw] justify-between gap-5">
            <div className="w-full space-y-5">
              <Breadcrumb />

              <HeadAnim>
                <h1 className="w-full max-md:text-[6vw] max-md:font-bold max-[1025px]:w-[90%] max-md:w-[80%]  font-semibold leading-[1.3]! text-foreground text80">
                  {template.title}
                </h1>
              </HeadAnim>

              {template.tagline && (
                <Copy delay={0.5}>
                  <p className="mt-4 w-full max-[1025px]:w-[90%] text-foreground opacity-90 text22 leading-relaxed max-[1025px]:leading-[1.3]">
                    {template.tagline}
                  </p>
                </Copy>
              )}

              {(publishedLabel || updatedLabel) && (
                <div className="mt-5 flex flex-wrap items-start gap-x-5 gap-y-1 text18 text-white/80 max-sm:text-[3vw]!">
                  {publishedLabel && (
                    <div className="fadeup">
                      <span className="font-laygrotesk">Published On: </span>
                      {publishedLabel}
                    </div>
                  )}
                  {updatedLabel && (
                    <div className="fadeup">
                      <span className="font-laygrotesk">Last Updated: </span>
                      {updatedLabel}
                    </div>
                  )}
                </div>
              )}

              {template.category && (
                <div className="fadeup mt-5 inline-block w-fit bg-[#272727] px-3 py-1.5 text20 text-foreground">
                  {template.category}
                </div>
              )}
            </div>
          </div>

          <div className="fadeup max-md:px-[7vw] max-[1025px]:px-[6vw] w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative inline-flex items-center gap-1 bg-[#161616] p-1">
                {/* Same sliding-highlight technique as the grid-density toggle
                    on the effects listing - one absolutely positioned span
                    behind the buttons, translated by a slot's width instead
                    of each button carrying its own background. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1 top-1 h-9 w-10 bg-primary transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(${device === "mobile" ? "calc(2.5rem + 0.25rem)" : "0"})`,
                  }}
                />
                {Object.entries(DEVICE_PRESETS).map(([key, { label, icon: Icon }]) => (
                  <Tooltip key={key} label={label}>
                    <button
                      type="button"
                      onClick={() => setDevice(key)}
                      aria-pressed={device === key}
                      className={`relative z-10 flex h-9 w-10 cursor-pointer items-center justify-center text18 transition-colors ${device === key ? "text-black" : "text-white/60 hover:text-white"
                        }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </Tooltip>
                ))}
              </div>

              <div className="flex shrink-0 items-center gap-3 max-md:flex-col max-md:items-start">
                <ButtonV3
                  text="Preview"
                  href={template.previewHref}
                  target_blank={true}
                  target="_blank"
                  variant="outline"
                  className="shrink-0"
                />
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  className="group flex items-center gap-2 border bg-[#ff5f00] px-4 py-3 text20 text-black transition-colors duration-300 border-[#ff5f00] hover:border-[#ff7300] hover:bg-[#ff7300] hover:text-black"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {hasAccess ? "Download Zip" : `Buy - $${template.pricing?.standaloneOneTime ?? "-"}`}
                </button>


              </div>
            </div>

            <div
              ref={previewBoxRef}
              className="relative flex h-[40.75vw] max-h-205  w-full items-center justify-center overflow-hidden bg-[#111111] max-md:h-[70vh]"
            >
              <div
                style={{
                  width: preset.width,
                  height: preset.height,
                  transform: `scale(${scale})`,
                }}
                className="shrink-0 origin-center bg-white transition-transform duration-300"
              >
                <iframe
                  key={`${template.previewHref}-${device}`}
                  src={template.previewHref}
                  title={`${template.title} live preview`}
                  width={preset.width}
                  height={preset.height}
                  className="block border-0"
                />
              </div>
            </div>
          </div>

          {template.overview?.length > 0 && (
            <div className="relative max-md:px-[7vw] max-[1025px]:px-[6vw] pt-[1.5vw]">
              <div className="space-y-6 w-[70%] max-[1025px]:w-full">
                <HeadAnim>
                  <h2 className="text32 font-medium text-foreground">Overview</h2>
                </HeadAnim>

                <div className="fadeup space-y-4">
                  {template.overview.map((paragraph, index) => (
                    <p key={index} className="text18 text-muted leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {relatedTemplates.length > 0 && (
            <section className="my-20 relative max-md:pt-[5vh] space-y-10 max-[1025px]:space-y-10">
              <div className="flex items-center justify-between gap-5 max-[1025px]:flex-col">
                <HeadAnim>
                  <h2 className="text-[3.32vw] max-[1025px]:text-[5vw] max-md:text-[2rem] font-medium text-foreground">
                    Related Templates
                  </h2>
                </HeadAnim>

                <div className="fadeup flex flex-col justify-center items-end gap-5">
                  <ButtonV3
                    text="Explore all templates"
                    href="/templates"
                    variant="orange"
                    className="shrink-0"
                  />
                </div>
              </div>

              <div className="fadeup grid grid-cols-2 gap-6 max-md:px-[7vw] max-[1025px]:px-[6vw] max-[1025px]:gap-10 max-md:grid-cols-1">
                {relatedTemplates.map((relatedTemplate) => (
                  <TemplateCard
                    key={relatedTemplate.slug}
                    template={relatedTemplate}
                    isWishlisted={wishlist.includes(relatedTemplate.slug)}
                    toggleWishlist={toggleWishlist}
                    showPurchase
                    hasAccess={relatedAccessSlugs.includes(relatedTemplate.slug)}
                  />
                ))}
              </div>
            </section>
          )}
        </section>
      </main>

      <TemplatePaywallModal
        template={template}
        open={isPaywallOpen}
        onClose={() => {
          setIsPaywallOpen(false);
          setAutoOpenCheckout(false);
        }}
        onPurchased={handlePurchased}
        autoOpenCheckout={autoOpenCheckout}
        templateAccess={templateAccess}
      />

      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
