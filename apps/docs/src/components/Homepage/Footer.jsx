"use client";

import React, { useState, useEffect, useRef } from "react";
import useIsMobile from "@/hooks/useIsMobile";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useFadeUp } from "../Animations/gsapAnimations";
// Three.js footer background plane - own chunk, mounted only when the footer
// nears the viewport (an eager import forces three.js onto the main bundle).
const FlowFieldHero = dynamic(() => import("./FlowFieldPlane"), {
  ssr: false,
});
import Button from "../WebsiteComps/Button";
import { UnlockIcon } from "../WebsiteComps/Icons";
import ShimmerText from "../WebsiteComps/ShimmerText";
import Input from "../animated-form/Input";
import LinkButton from "../WebsiteComps/LinkButton";
import Image from "next/image";
import LineReveal from "../Animations/LineReveal";
import SplitLine from "./SplitLine";

const vaultFooterLinks = [
  { label: "Documentation", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  { label: "NPM", href: "https://www.npmjs.com/package/hyperiux" },
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
  { label: "GitHub", href: "https://github.com/Hyperiux-Immersion-Labs/hyperiux-components" },
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
      className="group block overflow-hidden bg-transparent transition-colors duration-300 ease-in-out hover:duration-0 hover:bg-[#ff5f00] motion-reduce:transition-none"
    >
      <span className="block py-[0.15vw] max-[1025px]:py-1.5 max-[1025px]:px-2 text20 text-foreground transition-transform duration-200 ease-out group-hover:translate-x-5 group-hover:duration-0 motion-reduce:group-hover:translate-x-0 motion-reduce:transition-none">
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
  const [webglMounted, setWebglMounted] = useState(false);
  const { isMobile } = useIsMobile();

  // Footer is a next/dynamic + Suspense boundary streamed in after the
  // initial shell, so Hero's page-wide useFadeUp() (no containerRef, scans
  // the whole document) can run before this .fadeup content even exists in
  // the DOM - it silently never gets a fade-in, and if it races the other
  // way, mutating a node an unrelated component's hydration hasn't reached
  // yet trips a hydration-mismatch warning. Scoping the call here means it
  // only runs once Footer itself has actually mounted, which is timing-safe
  // either way.
  useFadeUp(footerRef);

  useEffect(() => {
    if (isMobile) return;
    const id = "requestIdleCallback" in window
      ? window.requestIdleCallback(() => setWebglMounted(true), { timeout: 2000 })
      : window.setTimeout(() => setWebglMounted(true), 300);
    return () => {
      "cancelIdleCallback" in window
        ? window.cancelIdleCallback(id)
        : window.clearTimeout(id);
    };
  }, [isMobile]);


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
    <footer ref={footerRef} className="relative z-200 py-[7vw]  w-full overflow-hidden max-md:mt-16 px-[3.5vw] max-md:px-[7vw] max-md:py-[15vw]">

      {!isMobile ? <div className="absolute inset-0 top-0 z-1 pointer-events-auto">
        {webglMounted && <FlowFieldHero texturePath="/assets/textures/orange-1.webp" />}
      </div> :
        <div className="absolute inset-0 top-0 z-1 pointer-events-auto w-full h-[30%]">
          <Image loading="lazy" className="w-full h-full object-cover" width={400} height={800} src={"/assets/homepage/footer-bg-img-mob.webp"} alt="footer-img" />
        </div>}
      <div className="w-full max-[1025px]:space-y-[6vw] max-md:space-y-[8vw] h-fit relative z-3">

        <LineReveal
          as="h2"
          className="text110 pointer-events-auto max-md:w-full max-md:px-0! w-[70%]"
        >
          Build The Interaction Layer Your Website Is Missing.
        </LineReveal>

        <SplitLine as="p" className="text24 py-[2vw] max-md:py-[6vw]">Start with Free Core today. Upgrade to Pro for Complete Access.
        </SplitLine>

        <div className="flex max-md:flex-col  max-md:gap-[4vw] pb-[2vw] mb-[4.5vw] max-[1025px]:mb-[15vw] relative max-md:mb-[10vw] gap-[2vw] fadeup">
          <Button variant='outline2' text="Browse the Effects" id={"browse-free-effects-footer"} href="/effects" className='max-md:w-[88%] border-white/40' />
          <Button text="Upgrade to Pro" id={"upgrade-to-pro-footer"} className="max-md:w-[88%]" href="/sign-up" variant="orange" />
          <p
            className="shimmer-text w-full flex items-center gap-[0.5vw] text-[#939393] leading-none max-[1025px]:gap-2 absolute max-md:bottom-[-12vw] max-[1025px]:bottom-[-5vw] bottom-[-.8vw] left-1/2 -translate-x-1/2"
          >
            <span className="inline-block size-[0.9vw] shrink-0 text-[#d2d2d2] max-[1025px]:size-3">
              <UnlockIcon className="h-full w-full" />
            </span>
            <ShimmerText baseColor="#d2d2d2" shimmerColor="#ffffff" className="max-md:text-sm max-md:leading-[1.2] tracking-tight">
              150+ effects · 32 free · 83 Pro · React + Next.js · CLI install · Source-first code
            </ShimmerText>
          </p>
        </div>

      </div>
      <p className="text-center text18 absolute bottom-[2vw] max-md:bottom-[10vw] left-[4%] text-light-grey z-4 max-[1025px]:w-[80vw] max-md:left-[11%] max-md:text-[3.5vw]!">© 2026 Hyperiux. All rights reserved. · Vault is built by Hyperiux · Small motion. Big signal.</p>
      {/* ── Footer links grid ── */}
      <div className="relative z-3 mt-[10vw] max-md:mt-[25vw] ">

        {/* Platform label */}
        <div className="flex items-center gap-[0.5vw] max-[1025px]:gap-2 pb-[1vw] max-[1025px]:pb-[3vw]">
          <span className="size-[0.45vw] max-[1025px]:size-2 rounded-full bg-[#ff5f00]" />
          <span className="text18 text-[#B3B3B3] font-heading">Platform</span>
        </div>

        {/* Top 4-column grid: Vault | Categories | Documents | Legal */}
        <div className="grid grid-cols-[1fr_2.5fr_1fr_1fr]  gap-[2vw]  max-[1025px]:grid-cols-2 max-md:grid-cols-1 ">

          {/* Vault */}
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-md:py-[6vw] border-t  border-foreground/50 max-[1025px]:-0 max-[1025px]:pb-[5vw] max-[1025px]:gap-[3vw] max-md:pb-[6vw]">
            <h3 className="text22 font-medium text-[#979797]">Vault</h3>
            <ul className="flex flex-col max-[1025px]:gap-1">
              {vaultFooterLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-md:py-[6vw]  border-t  border-foreground/50 max-[1025px]:-0  max-[1025px]:pb-[5vw] max-[1025px]:gap-[3vw] -0 max-md:px-0 max-md:pt-[6vw] max-md:pb-[6vw] max-md:border-t max-md:border-foreground/50">
            <h3 className="text22 font-medium text-[#979797]">Categories</h3>
            <div className="grid grid-cols-2 gap-x-[1vw] max-md:grid-cols-2 max-md:gap-x-4">
              {categoryColumns.map((col, ci) => (
                <ul key={ci} className="flex flex-col max-[1025px]:gap-1">
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
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-md:py-[6vw]  border-t  border-foreground/50 max-[1025px]:-0 max-[1025px]:border-t max-[1025px]:border-foreground/50 max-[1025px]:pt-[5vw] max-[1025px]:gap-[3vw] max-md:px-0 max-md:pt-[6vw] max-md:pb-[6vw]">
            <h3 className="text22 font-medium text-[#979797]">Documents</h3>
            <ul className="flex flex-col max-[1025px]:gap-1">
              {docsLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-md:py-[6vw]  border-t  border-foreground/50  max-[1025px]:border-foreground/50 max-[1025px]:border-t max-[1025px]:pt-[5vw] max-[1025px]:gap-[3vw] -0 max-md:pl-0 max-md:border-t max-md:border-foreground/50 max-md:pt-[6vw]">
            <h3 className="text22 font-medium text-[#979797]">Legal</h3>
            <ul className="flex flex-col max-[1025px]:gap-1">
              {legalLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom row: Socials | Contact Us | (gap) | Newsletter */}
        <div className="grid grid-cols-[1fr_1fr_1.4fr_2.15fr]  gap-[2vw] py-[3vw] max-[1025px]:grid-cols-2 max-md:flex max-md:flex-col max-[1025px]:py-[6vw] max-md:py-[8vw]">

          {/* Socials */}
          <div className="flex flex-col gap-[1.1vw]  border-foreground/50 max-[1025px]:-0 max-[1025px]:pb-[5vw] max-[1025px]:gap-[3vw] max-md:pb-[6vw]">
            <div className="flex items-center gap-[0.5vw] max-[1025px]:gap-2">
              <span className="size-[0.45vw] max-[1025px]:size-2 rounded-full bg-[#ff5f00]" />
              <span className="text18 text-[#B3B3B3] font-heading">Socials</span>
            </div>
            <div className="w-full h-px  border-t  border-foreground/50" />
            {/* <p className="text18 text-[#B3B3B3] font-heading">Connect with us on</p> */}
            <ul className="flex flex-col max-[1025px]:gap-1">
              {socialLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div className="flex flex-col gap-[1.1vw]  border-foreground/50 max-[1025px]:-0  max-[1025px]:pb-[5vw] max-[1025px]:gap-[3vw] -0 max-md:px-0 max-md:pt-[6vw] max-md:pb-[6vw] max-md:border-foreground/50">
            <div className="flex items-center gap-[0.5vw] max-[1025px]:gap-2">
              <span className="size-[0.45vw] max-[1025px]:size-2 rounded-full bg-[#ff5f00] " />
              <span className="text18 text-[#B3B3B3] font-heading">Contact Us</span>
            </div>
            <div className="w-full h-px  border-t  border-foreground/50" />
            <ul className="flex flex-col max-[1025px]:gap-1">
              <li>
                <FooterBlockLink href="mailto:hello@hyperiux.com">hello@hyperiux.com</FooterBlockLink>
              </li>
              <li>
                {/* <FooterBlockLink href="tel:+918178026136">+91 81780 26136</FooterBlockLink> */}
              </li>
            </ul>
          </div>

          {/* Empty spacer */}
          <div className="max-[1025px]:hidden" />

          {/* Newsletter */}
          <div className="flex flex-col gap-[1.15vw]  border-foreground/50  max-[1025px]:border-foreground/50 max-[1025px]:pt-[5vw] max-[1025px]:col-span-2 max-[1025px]:pl-0 max-[1025px]:gap-[3vw] max-md:py-[6vw] max-md:pb-[20vw]">
            <div className="flex items-center gap-[0.5vw] max-[1025px]:gap-2">
              <span className="size-[0.45vw] max-[1025px]:size-2 rounded-full bg-[#ff5f00]" />
              <span className="text18 text-[#B3B3B3] font-heading">New effects, in your inbox.</span>
            </div>
            <div className="w-full h-px border-t  border-foreground/50" />
            <p className="text18 leading-[1.45] max-w-[25vw] mb-[1vw] max-[1025px]:max-w-full max-md:mb-[6vw] text-[#979797]">
              Every new drop, plus the occasional behind-the-scenes build. No spam. Unsubscribe anytime.
            </p>
            {status === "success" ? (
              <p className="text18 text-[#ff5f00]">You&apos;re in. Welcome to the list.</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-[0.6vw] max-[1025px]:gap-3">
                <div className="flex items-center gap-[1vw] max-[1025px]:gap-3">
                  <Input
                    type="email"
                    value={email}
                    label={"Email"}
                    labelBg="bg-[#111210]! text-[#979797]!"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder=""
                    aria-label="Email address"
                    disabled={status === "loading"}
                    className="min-w-0 flex-1 rounded-none border border-grey bg-transparent! px-[1.2vw] py-[0.6vw] max-[1025px]:px-4 max-[1025px]:py-3 text18 outline-none placeholder:text-light-grey/70 focus:border-white/30 disabled:opacity-50 text-white"
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
                  <p className="text-sm text-red-400 px-[1.2vw] max-[1025px]:px-0">{errorMessage}</p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
      <div className="absolute  bottom-0 left-0 z-2 h-[70%] w-full bg-linear-to-b from-transparent via-[#111210] to-[#111210] max-md:h-full" />

    </footer>
  );
}
