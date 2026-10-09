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
import Button from "../components/Button";

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
      <span className="block py-[calc(var(--cvw)*0.15)] max-md:py-1.5 max-md:px-2 type-body text-foreground transition-transform duration-200 ease-out group-hover:translate-x-5 group-hover:duration-0 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
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
          console.warn("[Footer] WebGL unavailable, ribbons disabled.", err);
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
      className="relative z-200 py-[calc(var(--cvw)*7)]  w-full overflow-hidden max-md:px-[calc(var(--cvw)*5)] max-md:py-[calc(var(--cvw)*10)] max-sm:mt-16 px-[calc(var(--cvw)*4.5)] max-sm:px-[calc(var(--cvw)*7)] max-sm:py-[calc(var(--cvw)*15)] max-md:bg-[#111110]"
    >
      <canvas
        ref={ribbonCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-[3%] z-0 block h-full w-full"
      />
      <div className={`mx-auto max-w-[1536px] w-full max-md:space-y-[calc(var(--cvw)*6)] max-sm:space-y-[calc(var(--cvw)*8)] h-fit relative z-3`}>
        <LineReveal
          as="h2"
          className="text-[calc(var(--cvw)*3.6)] leading-[1.1] max-lg:text-[5vw] max-md:text-[8vw] pointer-events-auto font-aeonik w-[60%] max-md:w-full max-sm:px-0!"
        >
          Build the Interaction Layer Your Website is Missing.
        </LineReveal>

        <div className="flex max-sm:flex-col mt-[calc(var(--cvw)*3)]  max-sm:gap-[calc(var(--cvw)*4)] pb-[calc(var(--cvw)*2)] mb-[calc(var(--cvw)*4.5)] max-md:gap-[calc(var(--cvw)*3)] max-md:mb-[calc(var(--cvw)*15)] relative max-sm:mb-[calc(var(--cvw)*10)] gap-[calc(var(--cvw)*2)] fadeup">
          <Button
            variant="outline"
            text="Browse the Effects"
            href="/effects"
            className="max-sm:w-full"
          />
          <Button
            text="Upgrade to Pro"
            className="max-sm:w-full"
            href="/sign-up"
            variant="orange"
          />
          <p className="shimmer-text w-full  flex items-center gap-[calc(var(--cvw)*0.5)] text-[#939393] leading-none max-md:gap-2 absolute max-sm:bottom-[calc(var(--cvw)*-12)] max-md:bottom-[calc(var(--cvw)*-5)] bottom-[calc(var(--cvw)*-.8)] left-1/2 -translate-x-1/2">
            <span className="inline-block size-[calc(var(--cvw)*0.9)] shrink-0 text-[#d2d2d2] max-md:size-3">
              <UnlockIcon className="h-full w-full" />
            </span>
            <ShimmerText
              baseColor="#d2d2d2"
              shimmerColor="#ffffff"
              className="max-sm:text-sm font-avenir max-sm:leading-[1.2] tracking-tight"
            >
              50+ effects free, forever. No credit card.
            </ShimmerText>
          </p>
        </div>
      </div>
      {/* Pinned to the footer's bottom edge but inside the same 1536px container
          (and side padding) as the rest of the footer, so it lines up on wide screens */}
      <div className="absolute inset-x-0 bottom-[calc(var(--cvw)*2)] z-4 px-[calc(var(--cvw)*4.5)] max-md:bottom-[calc(var(--cvw)*4)] max-md:px-[calc(var(--cvw)*5)] max-sm:bottom-[calc(var(--cvw)*10)] max-sm:px-[calc(var(--cvw)*7)]">
        <p className="mx-auto w-full max-w-[1536px] type-small text-light-grey max-md:text-center">
          © 2026 Hyperiux. All Rights Reserved.
          {/* <EggHint className="ml-2" /> */}
        </p>
      </div>
      {/* ── Footer links grid ── */}
      <div className="relative z-3 mx-auto mt-[calc(var(--cvw)*10)] w-full max-w-[1536px] max-md:mt-[calc(var(--cvw)*14)] max-sm:mt-[calc(var(--cvw)*25)]">
        {/* Platform label */}
        <div className="flex items-center gap-[calc(var(--cvw)*1)] max-md:gap-2 pb-[calc(var(--cvw)*1)] max-md:pb-[calc(var(--cvw)*3)]">
          <span className="size-[calc(var(--cvw)*0.45)] max-md:size-2 bg-[#ff5f00]" />
          <span className="type-body font-aeonik text-[#B3B3B3]">Platform</span>
        </div>

        {/* Top 4-column grid: Vault | Categories | Documents | Legal */}
        <div className="grid grid-cols-[1fr_2.5fr_1fr_1fr]  gap-[calc(var(--cvw)*2)] max-md:gap-[calc(var(--cvw)*4)] max-md:grid-cols-2 max-sm:grid-cols-1 ">
          {/* Vault */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.5)] py-[calc(var(--cvw)*1.2)] max-md:py-[calc(var(--cvw)*2.5)] max-sm:py-[calc(var(--cvw)*6)] border-t  border-foreground/50 max-md:pb-[calc(var(--cvw)*5)] max-md:gap-[calc(var(--cvw)*3)] max-sm:pb-[calc(var(--cvw)*6)]">
            <h3 className="type-body font-aeonik text-[#979797]">Vault</h3>
            <ul className="flex flex-col max-md:gap-1">
              {vaultFooterLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.5)] py-[calc(var(--cvw)*1.2)] max-md:py-[calc(var(--cvw)*2.5)] max-sm:py-[calc(var(--cvw)*6)]  border-t  border-foreground/50  max-md:pb-[calc(var(--cvw)*5)] max-md:gap-[calc(var(--cvw)*3)] max-sm:px-0 max-sm:pt-[calc(var(--cvw)*6)] max-sm:pb-[calc(var(--cvw)*6)] max-sm:border-t max-sm:border-foreground/50">
            <h3 className="type-body font-aeonik text-[#979797]">Categories</h3>
            <div className="grid grid-cols-2 gap-x-[calc(var(--cvw)*1)] max-md:gap-x-[calc(var(--cvw)*2)] max-sm:grid-cols-2 max-sm:gap-x-4">
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
          <div className="flex flex-col gap-[calc(var(--cvw)*1.5)] py-[calc(var(--cvw)*1.2)] max-md:py-[calc(var(--cvw)*2.5)] max-sm:py-[calc(var(--cvw)*6)]  border-t  border-foreground/50 max-md:border-t max-md:border-foreground/50 max-md:pt-[calc(var(--cvw)*5)] max-md:gap-[calc(var(--cvw)*3)] max-sm:px-0 max-sm:pt-[calc(var(--cvw)*6)] max-sm:pb-[calc(var(--cvw)*6)]">
            <h3 className="type-body font-aeonik text-[#979797]">Documents</h3>
            <ul className="flex flex-col max-md:gap-1">
              {docsLinks.map(({ label, href }) => (
                <li key={label}>
                  <FooterBlockLink href={href}>{label}</FooterBlockLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.5)] py-[calc(var(--cvw)*1.2)] max-md:py-[calc(var(--cvw)*2.5)] max-sm:py-[calc(var(--cvw)*6)]  border-t  border-foreground/50  max-md:border-foreground/50 max-md:border-t max-md:pt-[calc(var(--cvw)*5)] max-md:gap-[calc(var(--cvw)*3)] max-sm:pl-0 max-sm:border-t max-sm:border-foreground/50 max-sm:pt-[calc(var(--cvw)*6)]">
            <h3 className="type-body font-aeonik text-[#979797]">Legal</h3>
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
        <div className="grid grid-cols-[1fr_1fr_1.4fr_2.15fr]  gap-[calc(var(--cvw)*2)] py-[calc(var(--cvw)*3)] max-md:gap-[calc(var(--cvw)*4)] max-md:grid-cols-2 max-sm:flex max-sm:flex-col max-md:py-[calc(var(--cvw)*6)] max-sm:py-[calc(var(--cvw)*8)]">
          {/* Socials */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.1)]  border-foreground/50 max-md:pb-[calc(var(--cvw)*5)] max-md:gap-[calc(var(--cvw)*3)] max-sm:pb-[calc(var(--cvw)*6)]">
            <div className="flex items-center gap-[calc(var(--cvw)*1)] max-md:gap-2">
              <span className="size-[calc(var(--cvw)*0.45)] max-md:size-2  bg-[#ff5f00]" />
              <span className="type-body font-aeonik text-[#B3B3B3]">
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
          <div className="flex flex-col gap-[calc(var(--cvw)*1.1)]  border-foreground/50  max-md:pb-[calc(var(--cvw)*5)] max-md:gap-[calc(var(--cvw)*3)] max-sm:px-0 max-sm:pt-[calc(var(--cvw)*6)] max-sm:pb-[calc(var(--cvw)*6)] max-sm:border-foreground/50">
            <div className="flex items-center gap-[calc(var(--cvw)*1)] max-md:gap-2">
              <span className="size-[calc(var(--cvw)*0.45)] max-md:size-2  bg-[#ff5f00] " />
              <span className="type-body font-aeonik text-[#B3B3B3]">
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
          <div className="flex flex-col gap-[calc(var(--cvw)*1.15)]  border-foreground/50  max-md:pb-[calc(var(--cvw)*12)] max-md:border-foreground/50 max-md:pt-[calc(var(--cvw)*5)] max-md:col-span-2 max-md:pl-0 max-md:gap-[calc(var(--cvw)*3)] max-sm:py-[calc(var(--cvw)*6)] max-sm:pb-[calc(var(--cvw)*20)]">
            <div className="flex items-center gap-[calc(var(--cvw)*1)] max-md:gap-2">
              <span className="size-[calc(var(--cvw)*0.45)] max-md:size-2  bg-[#ff5f00]" />
              <span className="type-body font-aeonik text-[#B3B3B3]">
                New effects, in your inbox
              </span>
            </div>
            <p className="type-body max-w-[calc(var(--cvw)*25)] mb-[calc(var(--cvw)*1)] max-md:mb-[calc(var(--cvw)*2)] max-md:max-w-full max-sm:mb-[calc(var(--cvw)*6)] text-[#979797]">
              Every new drop, plus the occasional behind-the-scenes build. No
              spam. Unsubscribe anytime.
            </p>
            {status === "success" ? (
              <p className="type-body text-[#ff5f00]">
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
                    className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent! px-0 py-[calc(var(--cvw)*0.9)] max-md:py-3 text24 text-white shadow-none! outline-none ring-0! placeholder:text-[#6e6e6e] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="shrink-0 cursor-pointer py-[calc(var(--cvw)*0.9)] text-[calc(var(--cvw)*0.9)] font-medium text-[#d8d8d8] uppercase transition-colors duration-300 hover:text-primary max-md:text-base disabled:pointer-events-none disabled:opacity-50 max-md:py-3"
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




