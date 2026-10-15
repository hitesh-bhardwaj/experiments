"use client";

import { prefetchFor } from "@/lib/prefetch";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { UnlockIcon } from "@/components/WebsiteComps/Icons";
import ShimmerText from "@/components/WebsiteComps/ShimmerText";
import Input from "@/components/WebsiteComps/form/Input";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { MEDIA } from "@/lib/breakpoints";
import { useInteraction } from "../components/InteractionProvider";
import Button from "../components/Button";
import { FREE_LABEL } from "@/lib/library-counts";

const vaultFooterLinks = [
  { label: "Documentation", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  { label: "Community", href: "/community" },
  { label: "NPM", href: "https://www.npmjs.com/package/hyperiux" },
  { label: "MCP", href: "/docs/mcp" },
];

const categoryColumns = [
  [
    { label: "All Effects", href: "/effects" },
    { label: "WebGL", href: "/effects/webgl-effects" },
    { label: "Text", href: "/effects/text-animations" },
    { label: "Backgrounds", href: "/effects/backgrounds" },
    { label: "Buttons", href: "/effects/buttons" },
    { label: "Carousels", href: "/effects/carousels" },
  ],
  [
    { label: "Scroll", href: "/effects/scroll-effects" },
    { label: "Components", href: "/effects/components" },
    { label: "Navigation", href: "/effects/navigation" },
    { label: "Cursor", href: "/effects/cursor-effects" },
    { label: "Transitions", href: "/effects/page-transitions" },
    { label: "Loaders", href: "/effects/loaders" },
  ],
];

const docsLinks = [
  { label: "Introduction", href: "/docs" },
  { label: "Installation", href: "/docs/installation" },
  { label: "CLI", href: "/docs/cli" },
  { label: "Dependencies", href: "/docs/dependencies" },
  { label: "License", href: "/docs/license" },
];

const legalLinks = [
  { label: "License Agreement", href: "/legal/license-agreement" },
  { label: "Terms of Service", href: "/legal/terms-of-service" },
  { label: "Privacy Policy", href: "/legal/privacy-policy" },
  { label: "Refund Policy", href: "/legal/refund-policy" },
];

const socialLinks = [
  { label: "Twitter / X", href: "https://x.com/_hyperiux_" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/hyperiux/" },
  {
    label: "GitHub",
    href: "https://github.com/Hyperiux-Immersion-Labs/hyperiux-components",
  },
  { label: "Instagram", href: "https://www.instagram.com/_hyperiux_/" },
];

function segmentHitsRect(x0, y0, x1, y1, rect) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const p = [-dx, dx, -dy, dy];
  const q = [x0 - rect.left, rect.right - x0, y0 - rect.top, rect.bottom - y0];
  let t0 = 0;
  let t1 = 1;

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }

  return true;
}


function useSweepHover(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let last = null;

    const flash = (link) => {
      link.setAttribute("data-swept", "");
      // Two frames: one to paint the hover state, then release it so the
      // fade-out transition runs from full.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => link.removeAttribute("data-swept")),
      );
    };

    const onMove = (event) => {
      if (event.pointerType !== "mouse") return;

      const { clientX: x, clientY: y } = event;

      if (last && (last.x !== x || last.y !== y)) {
        root.querySelectorAll("[data-sweep-link]").forEach((link) => {
          if (link.matches(":hover")) return;
          if (segmentHitsRect(last.x, last.y, x, y, link.getBoundingClientRect())) {
            flash(link);
          }
        });
      }

      last = { x, y };
    };

    const onLeave = () => {
      last = null;
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);

    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [rootRef]);
}

function FooterBlockLink({ href, children }) {
  const isExternal = href?.startsWith("http");
  return (
    <Link
      href={href}
      prefetch={prefetchFor(href)}
      target={isExternal ? "_blank" : "_self"}
      rel={isExternal ? "noopener noreferrer" : undefined}
      data-sweep-link
      className="group relative isolate block overflow-hidden"
    >
      {/* Orange block behind the label: snaps on, fades out over 300ms. The
          label slides in instantly and eases back over the same 300ms.
          data-swept (useSweepHover) applies the same state for links a fast
          cursor skips over. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-primary opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-hover:duration-0 group-data-swept:opacity-100 group-data-swept:duration-0 motion-reduce:transition-none"
      />
      <span className="block py-[calc(var(--cvw)*0.15)] max-md:py-1.5 max-md:px-2 type-body text-foreground transition-transform duration-300 ease-out group-hover:translate-x-5 group-hover:duration-0 group-data-swept:translate-x-5 group-data-swept:duration-0 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-data-swept:translate-x-0">
        {children}
      </span>
    </Link>
  );
}

export default function Footer() {
  const footerRef = useRef(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const ribbonCanvasRef = useRef(null);
  const { sound } = useInteraction();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MEDIA.tablet);
    const sync = () => setIsDesktop(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useFadeUp(footerRef);
  useSweepHover(footerRef);

  // Hero ribbons, mirrored (footer pose). Loaded on demand so three.js stays
  // out of the footer's chunk; they only render while the footer is near.
  // Audits, software GPUs, tablet and mobile get no WebGL context at all.
  useEffect(() => {
    if (!isDesktop || isLighthouseOrHeadless() || isSoftwareRenderer()) return undefined;

    let ribbons = null;
    let cancelled = false;
    import("../lib/theremin-ribbons").then(
      ({ mountThereminRibbons }) => {
        if (cancelled || !footerRef.current || !ribbonCanvasRef.current) return;
        try {
          ribbons = mountThereminRibbons(footerRef.current, ribbonCanvasRef.current, {
            pose: "footer",
            sound,
          });
        } catch (err) {
          console.warn("[Footer] WebGL unavailable, ribbons disabled.", err);
        }
      },
    );

    return () => {
      cancelled = true;
      ribbons?.destroy();
    };
  }, [sound, isDesktop]); // sound is stable (created once by the provider)

  const handleSubscribe = async (event) => {
    event.preventDefault();
    if (status === "loading") return;
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Something went wrong.");
        setStatus("error");
      } else {
        setStatus("success");
        setEmail("");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <footer
      ref={footerRef}
      id="footer"
      className="relative z-200 py-[calc(var(--cvw)*7)] max-lg:py-[10vw] w-full overflow-x-clip section-x max-md:py-[calc(var(--cvw)*15)] max-md:bg-background max-md:mt-16"
    >
      {isDesktop ? (
        <canvas
          ref={ribbonCanvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-[-12vh] left-[3%] z-0 block h-[calc(100%+12vh)] w-full"
        />
      ) : (
        // Tablet/mobile: a still of the ribbons instead of the WebGL scene.
        // Covers the first screen of the footer only; the rest stays blank.
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-svh">
          <Image
            src="/assets/img/footer-mobile.webp"
            alt="mobile footer"
            fill
            sizes="100vw"
            unoptimized
            className="object-cover"
          />
        </div>
      )}
      <div className={`site-container max-md:space-y-[calc(var(--cvw)*8)] h-fit relative z-3`}>
        <LineReveal
          as="h2"
          className="text-[calc(var(--cvw)*3.6)] leading-[1.1] max-lg:text-[5vw] max-md:text-[8vw] pointer-events-auto font-aeonik w-[60%] max-lg:w-[80%] max-md:w-full max-md:px-0!"
        >
          Build the Interaction Layer Your Website is Missing.
        </LineReveal>

        <div className="flex mt-[calc(var(--cvw)*3)] max-lg:mt-[5vw] max-md:mt-[calc(var(--cvw)*3)] pb-[calc(var(--cvw)*2)] mb-[calc(var(--cvw)*4.5)] max-lg:mb-[8vw] max-lg:gap-[3vw] max-md:gap-[calc(var(--cvw)*4)] max-md:mb-[calc(var(--cvw)*10)] relative gap-(--cvw) fadeup max-md:flex-col">
          <Button
            variant="outline"
            text="Browse the Effects"
            href="/effects"
            className="max-md:w-full"
          />
          <Button
            text="Upgrade to Pro"
            className="max-lg:border max-lg:border-transparent max-md:border-0 max-md:w-full"
            href="/sign-up"
            variant="orange"
          />
          <p className="shimmer-text w-full flex items-center gap-[calc(var(--cvw)*0.5)] text-light-grey leading-none max-md:gap-2 absolute max-lg:bottom-[-5vw] max-md:bottom-[calc(var(--cvw)*-12)] bottom-[calc(var(--cvw)*-0.8)] left-1/2 -translate-x-1/2">
            <span className="inline-block size-[calc(var(--cvw)*0.9)] shrink-0 text-muted max-md:size-3">
              <UnlockIcon className="h-full w-full" />
            </span>
            <ShimmerText
              baseColor="#d2d2d2"
              shimmerColor="#ffffff"
              className="font-avenir tracking-tight max-md:text-sm"
            >
              {FREE_LABEL} effects free, forever. No credit card.
            </ShimmerText>
          </p>
        </div>
      </div>
      {/* Pinned to the footer's bottom edge but inside the same 1536px container
          (and side padding) as the rest of the footer, so it lines up on wide screens */}
      <div className="absolute inset-x-0 bottom-[calc(var(--cvw)*2)] z-4 section-x max-lg:bottom-[4vw] max-md:bottom-[calc(var(--cvw)*10)]">
        <div className="site-container flex items-center justify-between gap-4 type-small text-light-grey max-md:flex-col max-md:gap-2 max-md:text-center">
          <p>
            © 2026 Hyperiux. All Rights Reserved.
            {/* <EggHint className="ml-2" /> */}
          </p>
          {/* For AI assistants: official facts (like Wingify's footer link) and the component catalogue */}
          <div className="flex items-center gap-6 max-md:gap-4">
            <Link href="/ai-components" className="transition-colors duration-300 hover:text-foreground">
              AI Component Catalogue
            </Link>
            <Link href="/llm-info" className="transition-colors duration-300 hover:text-foreground">
              Hey AI, Learn About Us
            </Link>
          </div>
        </div>
      </div>
      {/* ── Footer links grid ── */}
      <div className="relative z-3 site-container mt-[calc(var(--cvw)*10)] max-lg:mt-[12vw] max-md:mt-[calc(var(--cvw)*25)]">
        {/* Platform label */}
        <div className="flex items-center gap-[calc(var(--cvw)*1)] max-md:gap-2 pb-[calc(var(--cvw)*1)] max-lg:pb-[2vw] max-md:pb-[calc(var(--cvw)*3)] max-lg:w-[90%] max-md:w-full">
          <span className="size-[calc(var(--cvw)*0.45)] max-md:size-2 bg-primary" />
          <span className="type-body font-avenir text-foreground/80">Platform</span>
        </div>

        {/* Top 4-column grid: Vault | Categories | Documents | Legal */}
        <div className="grid grid-cols-[1fr_2.5fr_1fr_1fr] gap-[calc(var(--cvw)*2)] max-lg:grid-cols-3 max-lg:gap-[3vw] max-md:gap-[calc(var(--cvw)*4)] max-md:grid-cols-1">
          {/* Vault */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.5)] py-[calc(var(--cvw)*1.2)] max-lg:py-[2.5vw] max-md:py-[calc(var(--cvw)*6)] border-t max-md:w-full max-lg:w-[90%] border-foreground/50 max-md:pb-[calc(var(--cvw)*6)] max-lg:gap-[2vw] max-md:gap-[calc(var(--cvw)*3)]">
            <h3 className="type-body font-aeonik text-light-grey">Vault</h3>
            <ul className="flex flex-col max-md:gap-1">
              {vaultFooterLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.5)] py-[calc(var(--cvw)*1.2)] max-lg:py-[2.5vw] max-lg:col-span-3 max-lg:-order-1 max-lg:gap-[2vw] max-md:col-span-1 max-md:order-none max-md:py-[calc(var(--cvw)*6)] border-t border-foreground/50 max-md:pb-[calc(var(--cvw)*6)] max-md:gap-[calc(var(--cvw)*3)] max-md:px-0 max-md:pt-[calc(var(--cvw)*6)] max-md:border-t max-md:border-foreground/50">
            <h3 className="type-body font-aeonik text-light-grey">Categories</h3>
            <div className="grid grid-cols-2 gap-x-[calc(var(--cvw)*1)] max-lg:gap-x-[3vw] max-md:gap-x-4 max-md:grid-cols-2">
              {categoryColumns.map((col, ci) => (
                <ul key={ci} className="flex flex-col max-md:gap-1">
                  {col.map(({ label, href }) => (
                    <li key={label}>
                      <FooterBlockLink href={href}>{label}</FooterBlockLink>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.5)] py-[calc(var(--cvw)*1.2)] max-lg:py-[2.5vw] max-md:py-[calc(var(--cvw)*6)] max-md:w-full max-lg:w-[90%] border-t border-foreground/50 max-md:border-t max-md:border-foreground/50 max-lg:gap-[2vw] max-md:pt-[calc(var(--cvw)*6)] max-md:gap-[calc(var(--cvw)*3)] max-md:px-0 max-md:pb-[calc(var(--cvw)*6)]">
            <h3 className="type-body font-aeonik text-light-grey">Documents</h3>
            <ul className="flex flex-col max-md:gap-1">
              {docsLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.5)] py-[calc(var(--cvw)*1.2)] max-lg:py-[2.5vw] max-md:py-[calc(var(--cvw)*6)] max-md:w-full max-lg:w-[90%] border-t border-foreground/50 max-md:border-foreground/50 max-md:border-t max-lg:gap-[2vw] max-md:pt-[calc(var(--cvw)*6)] max-md:gap-[calc(var(--cvw)*3)] max-md:pl-0">
            <h3 className="type-body font-aeonik text-light-grey">Legal</h3>
            <ul className="flex flex-col max-md:gap-1">
              {legalLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom row: Socials | Contact Us | (gap) | Newsletter */}
        <div className="grid grid-cols-[1fr_1fr_1.4fr_2.15fr] gap-[calc(var(--cvw)*2)] py-[calc(var(--cvw)*3)] max-lg:grid-cols-2 max-lg:gap-[3vw] max-lg:py-[5vw] max-md:gap-[calc(var(--cvw)*4)] max-md:grid-cols-2 max-md:py-[calc(var(--cvw)*8)] max-md:flex max-md:flex-col">
          {/* Socials */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.1)] max-lg:gap-[2vw] border-foreground/50 max-md:pb-[calc(var(--cvw)*6)] max-md:gap-[calc(var(--cvw)*3)]">
            <div className="flex items-center gap-[calc(var(--cvw)*1)] max-md:gap-2">
              <span className="size-[calc(var(--cvw)*0.45)] max-md:size-2  bg-primary" />
              <span className="type-body font-avenir text-foreground/80">
                Socials
              </span>
            </div>
            <div className="w-full h-px max-lg:w-[90%] max-md:w-full  border-t  border-foreground/50" />
            {/* <p className="text18 text-foreground/80 font-heading">Connect with us on</p> */}
            <ul className="flex flex-col max-md:gap-1">
              {socialLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.1)] max-lg:gap-[2vw] border-foreground/50 max-md:pb-[calc(var(--cvw)*6)] max-md:gap-[calc(var(--cvw)*3)] max-lg:w-[90%] max-md:w-full max-md:px-0 max-md:pt-[calc(var(--cvw)*6)] max-md:border-foreground/50">
            <div className="flex items-center gap-[calc(var(--cvw)*1)] max-md:gap-2 ">
              <span className="size-[calc(var(--cvw)*0.45)] max-md:size-2  bg-primary " />
              <span className="type-body font-avenir text-foreground/80">
                Contact Us
              </span>
            </div>
            <div className="w-full h-px  border-t  border-foreground/50" />
            <ul className="flex flex-col max-md:gap-1">
              <li>
                <FooterBlockLink href="mailto:hello@hyperiux.com">
                  hello@hyperiux.com
                </FooterBlockLink>
              </li>
              {/* <li>
                <FooterBlockLink href="tel:+918178026136">
                  +91 81780 26136
                </FooterBlockLink>
              </li> */}
            </ul>
          </div>

          {/* Empty spacer */}
          <div className=" max-lg:hidden" />

          {/* Newsletter */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.15)] border-foreground/50 max-lg:col-span-2 max-lg:gap-[2vw] max-lg:pt-[3vw] max-lg:pb-[8vw] max-md:pb-[calc(var(--cvw)*20)] max-md:border-foreground/50 max-md:pt-[calc(var(--cvw)*6)] max-md:col-span-2 max-md:pl-0 max-md:gap-[calc(var(--cvw)*3)] max-md:py-[calc(var(--cvw)*6)]">
            <div className="flex items-center gap-[calc(var(--cvw)*1)] max-md:gap-2">
              <span className="size-[calc(var(--cvw)*0.45)] max-md:size-2  bg-primary" />
              <span className="type-body font-avenir text-foreground/80">
                New effects, in your inbox
              </span>
            </div>
            <p className="type-body max-w-[calc(var(--cvw)*25)] mb-[calc(var(--cvw)*1)] max-lg:max-w-[50vw] max-lg:mb-[2vw] max-md:mb-[calc(var(--cvw)*6)] max-md:max-w-full text-light-grey">
              Every new drop, plus the occasional behind-the-scenes build. No
              spam. Unsubscribe anytime.
            </p>
            {status === "success" ? (
              <p className="type-body text-primary">
                You&apos;re in. Welcome to the list.
              </p>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col gap-[calc(var(--cvw)*0.6)] max-md:gap-3"
              >
                {/* One line, one rule underneath: email on the left, Subscribe on the right */}
                <div className="flex items-center gap-[calc(var(--cvw)*2)] border-b border-foreground/30 transition-colors duration-300 focus-within:border-white/70 max-md:gap-4 w-[90%]">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="Your email"
                    aria-label="Email address"
                    disabled={status === "loading"}
                    style={{
                      "--input-autofill-bg": "#111210",
                      "--input-autofill-text": "#ffffff",
                    }}
                    className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent! px-0 py-[calc(var(--cvw)*0.9)] max-md:py-3 text24 text-foreground! caret-foreground shadow-none! outline-none ring-0! placeholder:text-light-grey disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="shrink-0 cursor-pointer py-[calc(var(--cvw)*0.9)] text-[calc(var(--cvw)*1)] max-lg:text-[1.5vw] max-md:text-[3.2vw] font-medium text-secondary transition-colors duration-300 hover:text-primary max-md:text-base disabled:pointer-events-none disabled:opacity-50 max-md:py-3"
                  >
                    {status === "loading" ? "Subscribing…" : "Subscribe"}
                  </button>
                </div>
                {status === "error" && (
                  <p className="type-small text-red-400 px-[calc(var(--cvw)*1.2)] max-md:px-0">
                    {errorMessage}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}




