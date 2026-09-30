"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

import { UnlockIcon } from "@/components/WebsiteComps/Icons";
import ShimmerText from "@/components/WebsiteComps/ShimmerText";
import Input from "@/components/animated-form/Input";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import LineReveal from "@/components/Animations/LineReveal";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { useInteraction } from "../components/InteractionProvider";
// import { EggHint } from "../components/easter-egg/EasterEgg";
import ButtonV3 from "../components/ButtonV3";

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

function FooterBlockLink({ href, children }) {
  const isExternal = href?.startsWith("http");
  return (
    <Link
      href={href}
      prefetch={false}
      target={isExternal ? "_blank" : "_self"}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="group block overflow-hidden bg-transparent transition-colors duration-300 ease-in-out hover:duration-0 hover:bg-primary motion-reduce:transition-none"
    >
      <span className="block py-[0.15vw] max-[1025px]:py-1 max-md:py-1.5 max-md:px-2 text20 text-foreground transition-transform duration-200 ease-out group-hover:translate-x-5 group-hover:duration-0 motion-reduce:group-hover:translate-x-0 motion-reduce:transition-none">
        {children}
      </span>
    </Link>
  );
}

export default function FooterV3() {
  const footerRef = useRef(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const ribbonCanvasRef = useRef(null);
  const { sound } = useInteraction();

  useFadeUp(footerRef);

  // Hero ribbons, mirrored (footer pose). Loaded on demand so three.js stays
  // out of the footer's chunk; they only render while the footer is near.
  // Audits and software GPUs get no WebGL context at all.
  useEffect(() => {
    if (isLighthouseOrHeadless() || isSoftwareRenderer()) return undefined;

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
          console.warn("[FooterV3] WebGL unavailable, ribbons disabled.", err);
        }
      },
    );

    return () => {
      cancelled = true;
      ribbons?.destroy();
    };
  }, [sound]); // sound is stable (created once by the provider)

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
      className="relative z-200 py-[7vw]  w-full overflow-hidden max-[1025px]:px-[5vw] max-[1025px]:py-[10vw] max-sm:mt-16 px-[3.5vw] max-sm:px-[7vw] max-sm:py-[15vw] max-[1025px]:bg-[#111110]"
    >
      {/* One viewport tall and pinned to the top: the footer pose parks a small
          ribbon cluster in the top-right corner. The bottom fades out so the
          arcs never end on a hard line. */}
      <canvas
        ref={ribbonCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 block h-svh w-full mask-[linear-gradient(to_top,transparent,#000_40%)]"
      />
      <div className="w-full max-md:space-y-[6vw] max-sm:space-y-[8vw] h-fit relative z-3">
        <LineReveal
          as="h2"
          className="text-[4vw] font-aeonik pointer-events-auto max-[1025px]:w-full max-sm:w-full max-sm:px-0! w-[60%]"
        >
          Build the Interaction Layer Your Website is Missing.
        </LineReveal>

        <div className="flex max-sm:flex-col mt-[3vw]  max-sm:gap-[4vw] pb-[2vw] mb-[4.5vw] max-[1025px]:mb-[10vw] max-[1025px]:gap-[3vw] max-md:mb-[15vw] relative max-sm:mb-[10vw] gap-[2vw] fadeup">
          <ButtonV3
            variant="outline"
            text="Browse the Effects"
            href="/effects"
            className="max-sm:w-full"
          />
          <ButtonV3
            text="Upgrade to Pro"
            className="max-sm:w-full"
            href="/sign-up"
            variant="orange"
          />
          <p className="shimmer-text w-full  flex items-center gap-[0.5vw] max-[1025px]:gap-2 max-[1025px]:bottom-[-4vw] text-[#939393] leading-none max-md:gap-2 absolute max-sm:bottom-[-12vw] max-md:bottom-[-5vw] bottom-[-.8vw] left-1/2 -translate-x-1/2">
            <span className="inline-block size-[0.9vw] shrink-0 text-[#d2d2d2] max-[1025px]:size-3 max-md:size-3">
              <UnlockIcon className="h-full w-full" />
            </span>
            <ShimmerText
              baseColor="#d2d2d2"
              shimmerColor="#ffffff"
              className="max-sm:text-sm font-mono max-sm:leading-[1.2] tracking-tight"
            >
              50+ effects free, forever. No credit card.
            </ShimmerText>
          </p>
        </div>
      </div>
      <p className="text-center text18 absolute bottom-[2vw] max-[1025px]:bottom-[4vw] max-[1025px]:w-[90vw] max-sm:bottom-[10vw] left-[4%] text-light-grey z-4 max-md:w-[80vw] max-sm:left-[11%] max-sm:text-[3.5vw]!">
        © 2026 Hyperiux. All rights reserved. Psst, the first sentence is hiding something .
        {/* <EggHint className="ml-2" /> */}
      </p>
      {/* ── Footer links grid ── */}
      <div className="relative z-3 mt-[10vw] max-[1025px]:mt-[14vw] max-sm:mt-[25vw] ">
        {/* Platform label */}
        <div className="flex items-center gap-[1vw] max-[1025px]:gap-2 max-[1025px]:pb-[2vw] max-md:gap-2 pb-[1vw] max-md:pb-[3vw]">
          <span className="size-[0.45vw] max-[1025px]:size-2 max-md:size-2 bg-[#ff5f00]" />
          <span className="text24 text-[#B3B3B3] font-heading">Platform</span>
        </div>

        {/* Top 4-column grid: Vault | Categories | Documents | Legal */}
        <div className="grid grid-cols-[1fr_2.5fr_1fr_1fr]  gap-[2vw] max-[1025px]:grid-cols-2 max-[1025px]:gap-[4vw] max-md:grid-cols-2 max-sm:grid-cols-1 ">
          {/* Vault */}
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-[1025px]:gap-[2.5vw] max-[1025px]:py-[2.5vw] max-sm:py-[6vw] border-t  border-foreground/50 max-md:-0 max-md:pb-[5vw] max-md:gap-[3vw] max-sm:pb-[6vw]">
            <h3 className="text24 font-medium text-[#979797]">Vault</h3>
            <ul className="flex flex-col max-[1025px]:gap-1 max-md:gap-1">
              {vaultFooterLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-[1025px]:gap-[2.5vw] max-[1025px]:py-[2.5vw] max-sm:py-[6vw]  border-t  border-foreground/50 max-md:-0  max-md:pb-[5vw] max-md:gap-[3vw] -0 max-sm:px-0 max-sm:pt-[6vw] max-sm:pb-[6vw] max-sm:border-t max-sm:border-foreground/50">
            <h3 className="text24 font-medium text-[#979797]">Categories</h3>
            <div className="grid grid-cols-2 gap-x-[1vw] max-[1025px]:gap-x-[2vw] max-sm:grid-cols-2 max-sm:gap-x-4">
              {categoryColumns.map((col, ci) => (
                <ul key={ci} className="flex flex-col max-[1025px]:gap-1 max-md:gap-1">
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
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-[1025px]:gap-[2.5vw] max-[1025px]:py-[2.5vw] max-sm:py-[6vw]  border-t  border-foreground/50 max-md:-0 max-md:border-t max-md:border-foreground/50 max-md:pt-[5vw] max-md:gap-[3vw] max-sm:px-0 max-sm:pt-[6vw] max-sm:pb-[6vw]">
            <h3 className="text24 font-medium text-[#979797]">Documents</h3>
            <ul className="flex flex-col max-[1025px]:gap-1 max-md:gap-1">
              {docsLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-[1025px]:gap-[2.5vw] max-[1025px]:py-[2.5vw] max-sm:py-[6vw]  border-t  border-foreground/50  max-md:border-foreground/50 max-md:border-t max-md:pt-[5vw] max-md:gap-[3vw] -0 max-sm:pl-0 max-sm:border-t max-sm:border-foreground/50 max-sm:pt-[6vw]">
            <h3 className="text24 font-medium text-[#979797]">Legal</h3>
            <ul className="flex flex-col max-[1025px]:gap-1 max-md:gap-1">
              {legalLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom row: Socials | Contact Us | (gap) | Newsletter */}
        <div className="grid grid-cols-[1fr_1fr_1.4fr_2.15fr]  gap-[2vw] py-[3vw] max-[1025px]:grid-cols-2 max-[1025px]:gap-[4vw] max-[1025px]:py-[5vw] max-md:grid-cols-2 max-sm:flex max-sm:flex-col max-md:py-[6vw] max-sm:py-[8vw]">
          {/* Socials */}
          <div className="flex flex-col gap-[1.1vw] max-[1025px]:gap-[2.5vw]  border-foreground/50 max-md:-0 max-md:pb-[5vw] max-md:gap-[3vw] max-sm:pb-[6vw]">
            <div className="flex items-center gap-[1vw] max-[1025px]:gap-2 max-md:gap-2">
              <span className="size-[0.45vw] max-[1025px]:size-2 max-md:size-2  bg-[#ff5f00]" />
              <span className="text24 text-[#B3B3B3] font-heading">
                Socials
              </span>
            </div>
            <div className="w-full h-px  border-t  border-foreground/50" />
            {/* <p className="text18 text-[#B3B3B3] font-heading">Connect with us on</p> */}
            <ul className="flex flex-col max-[1025px]:gap-1 max-md:gap-1">
              {socialLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div className="flex flex-col gap-[1.1vw] max-[1025px]:gap-[2.5vw]  border-foreground/50 max-md:-0  max-md:pb-[5vw] max-md:gap-[3vw] -0 max-sm:px-0 max-sm:pt-[6vw] max-sm:pb-[6vw] max-sm:border-foreground/50">
            <div className="flex items-center gap-[1vw] max-[1025px]:gap-2 max-md:gap-2">
              <span className="size-[0.45vw] max-[1025px]:size-2 max-md:size-2  bg-[#ff5f00] " />
              <span className="text24 text-[#B3B3B3] font-heading">
                Contact Us
              </span>
            </div>
            <div className="w-full h-px  border-t  border-foreground/50" />
            <ul className="flex flex-col max-[1025px]:gap-1 max-md:gap-1">
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
          <div className="max-[1025px]:hidden max-md:hidden" />

          {/* Newsletter */}
          <div className="flex flex-col gap-[1.15vw]  border-foreground/50  max-[1025px]:col-span-2 max-[1025px]:pt-[4vw] max-[1025px]:pb-[12vw] max-[1025px]:pl-0 max-[1025px]:gap-[2.5vw] max-md:border-foreground/50 max-md:pt-[5vw] max-md:col-span-2 max-md:pl-0 max-md:gap-[3vw] max-sm:py-[6vw] max-sm:pb-[20vw]">
            <div className="flex items-center gap-[1vw] max-[1025px]:gap-2 max-md:gap-2">
              <span className="size-[0.45vw] max-[1025px]:size-2 max-md:size-2  bg-[#ff5f00]" />
              <span className="text24 text-[#B3B3B3] font-heading">
                New effects, in your inbox
              </span>
            </div>
            <p className="text18 leading-[1.45] max-w-[25vw] mb-[1vw] max-[1025px]:max-w-full max-[1025px]:mb-[2vw] max-md:max-w-full max-sm:mb-[6vw] text-[#979797]">
              Every new drop, plus the occasional behind-the-scenes build. No
              spam. Unsubscribe anytime.
            </p>
            {status === "success" ? (
              <p className="text18 text-[#ff5f00]">
                You&apos;re in. Welcome to the list.
              </p>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col gap-[0.6vw] max-[1025px]:gap-2 max-md:gap-3"
              >
                <div className="flex items-center gap-[1vw] max-[1025px]:gap-3 max-md:gap-3">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="Email"
                    aria-label="Email address"
                    disabled={status === "loading"}
                    style={{
                      "--input-autofill-bg": "#111210",
                      "--input-autofill-text": "#ffffff",
                    }}
                    className="h-auto min-w-0 flex-1 rounded-none border-0 border-b border-foreground/50 bg-transparent! px-0 py-[0.6vw] max-[1025px]:py-[1.2vw] max-md:py-3 text18 text-white outline-none placeholder:text-light-grey/70 focus:border-white/70 disabled:opacity-50"
                  />
                  <LinkButton
                    href="#"
                    text={status === "loading" ? "Subscribing…" : "Subscribe"}
                    showArrow={false}
                    tilted={false}
                    shimmer
                    onClick={handleSubscribe}
                    className={`text18 shrink-0${status === "loading" ? " pointer-events-none opacity-50" : ""}`}
                  />
                </div>
                {status === "error" && (
                  <p className="text-sm text-red-400 px-[1.2vw] max-md:px-0">
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
