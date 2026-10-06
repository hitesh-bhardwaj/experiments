"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { UnlockIcon } from "@/components/WebsiteComps/Icons";
import ShimmerText from "@/components/WebsiteComps/ShimmerText";
import Input from "@/components/animated-form/Input";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { useInteraction } from "../components/InteractionProvider";
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
      className="group relative isolate block overflow-hidden"
    >
      {/* Orange block behind the label: snaps on, fades out over 150ms. The
          40ms delay on the way in (label too) is what stops the flicker when
          the cursor sweeps fast across the list - crossing into the next link
          can graze the previous one for a single frame, which used to snap it
          back to full orange and fade it out again. 40ms outlasts a graze and
          still reads as instant for a real hover. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-primary opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-hover:duration-0 motion-reduce:transition-none"
      />
      <span className="block py-[0.15vw] max-md:py-1.5 max-md:px-2 text20 text-foreground transition-transform duration-200 ease-out group-hover:translate-x-5 group-hover:duration-0 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
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
      className="relative z-200 py-[7vw]  w-full overflow-hidden max-md:px-[5vw] max-md:py-[10vw] max-sm:mt-16 px-[4.5vw] max-sm:px-[7vw] max-sm:py-[15vw] max-md:bg-[#111110]"
    >
      <canvas
        ref={ribbonCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 left-[3%] block h-svh w-full mask-[linear-gradient(to_top,transparent,#000_40%)]"
      />
      <div className={`mx-auto max-w-[1536px] w-full max-md:space-y-[6vw] max-sm:space-y-[8vw] h-fit relative z-3`}>
        <LineReveal
          as="h2"
          className="text-[4vw] max-md:text-[7.5vw] max-sm:text-[8vw] leading-[1.1] font-aeonik pointer-events-auto max-md:w-full max-sm:px-0! w-[60%]"
        >
          Build the Interaction Layer Your Website is Missing.
        </LineReveal>

        <div className="flex max-sm:flex-col mt-[3vw]  max-sm:gap-[4vw] pb-[2vw] mb-[4.5vw] max-md:gap-[3vw] max-md:mb-[15vw] relative max-sm:mb-[10vw] gap-[2vw] fadeup">
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
          <p className="shimmer-text w-full  flex items-center gap-[0.5vw] text-[#939393] leading-none max-md:gap-2 absolute max-sm:bottom-[-12vw] max-md:bottom-[-5vw] bottom-[-.8vw] left-1/2 -translate-x-1/2">
            <span className="inline-block size-[0.9vw] shrink-0 text-[#d2d2d2] max-md:size-3">
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
      <p className="text-center text18 absolute bottom-[2vw] max-md:bottom-[4vw] max-sm:bottom-[10vw] left-[4%] text-light-grey z-4 max-md:w-[80vw] max-sm:left-[11%] max-sm:text-[3.5vw]!">
        © 2026 Hyperiux. All rights reserved. Psst, the first sentence is hiding something .
        {/* <EggHint className="ml-2" /> */}
      </p>
      {/* ── Footer links grid ── */}
      <div className="relative z-3 mx-auto mt-[10vw] w-full max-w-[1536px] max-md:mt-[14vw] max-sm:mt-[25vw]">
        {/* Platform label */}
        <div className="flex items-center gap-[1vw] max-md:gap-2 pb-[1vw] max-md:pb-[3vw]">
          <span className="size-[0.45vw] max-md:size-2 bg-[#ff5f00]" />
          <span className="text24 text-[#B3B3B3] font-heading">Platform</span>
        </div>

        {/* Top 4-column grid: Vault | Categories | Documents | Legal */}
        <div className="grid grid-cols-[1fr_2.5fr_1fr_1fr]  gap-[2vw] max-md:gap-[4vw] max-md:grid-cols-2 max-sm:grid-cols-1 ">
          {/* Vault */}
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-md:py-[2.5vw] max-sm:py-[6vw] border-t  border-foreground/50 max-md:pb-[5vw] max-md:gap-[3vw] max-sm:pb-[6vw]">
            <h3 className="text24 font-medium text-[#979797]">Vault</h3>
            <ul className="flex flex-col max-md:gap-1">
              {vaultFooterLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-md:py-[2.5vw] max-sm:py-[6vw]  border-t  border-foreground/50  max-md:pb-[5vw] max-md:gap-[3vw] max-sm:px-0 max-sm:pt-[6vw] max-sm:pb-[6vw] max-sm:border-t max-sm:border-foreground/50">
            <h3 className="text24 font-medium text-[#979797]">Categories</h3>
            <div className="grid grid-cols-2 gap-x-[1vw] max-md:gap-x-[2vw] max-sm:grid-cols-2 max-sm:gap-x-4">
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
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-md:py-[2.5vw] max-sm:py-[6vw]  border-t  border-foreground/50 max-md:border-t max-md:border-foreground/50 max-md:pt-[5vw] max-md:gap-[3vw] max-sm:px-0 max-sm:pt-[6vw] max-sm:pb-[6vw]">
            <h3 className="text24 font-medium text-[#979797]">Documents</h3>
            <ul className="flex flex-col max-md:gap-1">
              {docsLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-[1.5vw] py-[1.2vw] max-md:py-[2.5vw] max-sm:py-[6vw]  border-t  border-foreground/50  max-md:border-foreground/50 max-md:border-t max-md:pt-[5vw] max-md:gap-[3vw] max-sm:pl-0 max-sm:border-t max-sm:border-foreground/50 max-sm:pt-[6vw]">
            <h3 className="text24 font-medium text-[#979797]">Legal</h3>
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
        <div className="grid grid-cols-[1fr_1fr_1.4fr_2.15fr]  gap-[2vw] py-[3vw] max-md:gap-[4vw] max-md:grid-cols-2 max-sm:flex max-sm:flex-col max-md:py-[6vw] max-sm:py-[8vw]">
          {/* Socials */}
          <div className="flex flex-col gap-[1.1vw]  border-foreground/50 max-md:pb-[5vw] max-md:gap-[3vw] max-sm:pb-[6vw]">
            <div className="flex items-center gap-[1vw] max-md:gap-2">
              <span className="size-[0.45vw] max-md:size-2  bg-[#ff5f00]" />
              <span className="text24 text-[#B3B3B3] font-heading">
                Socials
              </span>
            </div>
            <div className="w-full h-px  border-t  border-foreground/50" />
            {/* <p className="text18 text-[#B3B3B3] font-heading">Connect with us on</p> */}
            <ul className="flex flex-col max-md:gap-1">
              {socialLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div className="flex flex-col gap-[1.1vw]  border-foreground/50  max-md:pb-[5vw] max-md:gap-[3vw] max-sm:px-0 max-sm:pt-[6vw] max-sm:pb-[6vw] max-sm:border-foreground/50">
            <div className="flex items-center gap-[1vw] max-md:gap-2">
              <span className="size-[0.45vw] max-md:size-2  bg-[#ff5f00] " />
              <span className="text24 text-[#B3B3B3] font-heading">
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
          <div className=" max-md:hidden" />

          {/* Newsletter */}
          <div className="flex flex-col gap-[1.15vw]  border-foreground/50  max-md:pb-[12vw] max-md:border-foreground/50 max-md:pt-[5vw] max-md:col-span-2 max-md:pl-0 max-md:gap-[3vw] max-sm:py-[6vw] max-sm:pb-[20vw]">
            <div className="flex items-center gap-[1vw] max-md:gap-2">
              <span className="size-[0.45vw] max-md:size-2  bg-[#ff5f00]" />
              <span className="text24 text-[#B3B3B3] font-heading">
                New effects, in your inbox
              </span>
            </div>
            <p className="text18 leading-[1.45] max-w-[25vw] mb-[1vw] max-md:mb-[2vw] max-md:max-w-full max-sm:mb-[6vw] text-[#979797]">
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
                className="flex flex-col gap-[0.6vw] max-md:gap-3"
              >
                {/* One line, one rule underneath: email on the left, Subscribe on the right */}
                <div className="flex items-center gap-[2vw] border-b border-foreground/30 transition-colors duration-300 focus-within:border-white/70 max-md:gap-4 w-[90%]">
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
                    className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent! px-0 py-[0.9vw] max-md:py-3 text24 text-white shadow-none! outline-none ring-0! placeholder:text-[#6e6e6e] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="shrink-0 cursor-pointer py-[0.9vw] text-[0.9vw] font-medium text-[#d8d8d8] uppercase transition-colors duration-300 hover:text-primary disabled:pointer-events-none disabled:opacity-50 max-md:py-3"
                  >
                    {status === "loading" ? "Subscribing…" : "Subscribe"}
                  </button>
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




