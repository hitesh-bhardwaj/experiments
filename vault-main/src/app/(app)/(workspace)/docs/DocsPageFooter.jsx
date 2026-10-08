"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Same order as the docs sidebar.
const DOCS_PAGES = [
  { href: "/docs", label: "Introduction" },
  { href: "/docs/installation", label: "Installation" },
  { href: "/docs/cli", label: "CLI" },
  { href: "/docs/mcp", label: "MCP" },
  { href: "/docs/dependencies", label: "Dependencies" },
  { href: "/docs/license", label: "License" },
];

const label = "type-label";

function FeedbackButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 cursor-pointer border px-4 transition-colors duration-300 ${label} ${
        active
          ? "border-primary bg-primary text-background"
          : "border-foreground/15 text-foreground/80 hover:border-primary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function feedbackMessage(vote) {
  if (vote === "yes") return "Thanks. Glad it helped.";
  if (vote === "no") {
    return (
      <>
        Thanks. Tell us what was missing at{" "}
        <a href="mailto:hello@hyperiux.com" className="text-primary underline underline-offset-4">hello@hyperiux.com</a>.
      </>
    );
  }
  return null;
}

// Rolls the message: the old one leaves through the top while the new one rises from below.
function FeedbackMessage({ vote }) {
  const currentRef = useRef(null);
  const outgoingRef = useRef(null);
  const previous = useRef(null);
  const [outgoing, setOutgoing] = useState(null);

  useLayoutEffect(() => {
    const was = previous.current;
    if (was === vote) return;
    previous.current = vote;
    gsap.fromTo(currentRef.current, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "power3.out" });
    if (was) setOutgoing(was);
  }, [vote]);

  useLayoutEffect(() => {
    if (!outgoing) return;
    gsap.fromTo(
      outgoingRef.current,
      { yPercent: 0, opacity: 1 },
      { yPercent: -100, opacity: 0, duration: 0.6, ease: "power3.out", onComplete: () => setOutgoing(null) }
    );
  }, [outgoing]);

  return (
    <p aria-live="polite" className={`relative m-0! overflow-hidden ${label} text-foreground`}>
      <span ref={currentRef} className="block">{feedbackMessage(vote)}</span>
      {outgoing && (
        <span ref={outgoingRef} aria-hidden="true" className="absolute left-0 top-0 block w-full">{feedbackMessage(outgoing)}</span>
      )}
    </p>
  );
}

// The site buttons' pixelated arrow (Button), sized to the label's cap height
function PagerArrow({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`block size-[0.8vw] shrink-0 bg-current [mask-image:url(/svgs/pixelated-arrow.svg)] mask-center mask-no-repeat mask-contain transition-transform duration-300 ${className}`}
    />
  );
}

function PagerCard({ page, direction }) {
  const next = direction === "next";
  return (
    <Link
      href={page.href}
      // The site's full page transition (PageTransition), not the docs' in-place fade
      data-page-transition
      className={`group flex w-[calc(50%-0.5vw)] flex-col gap-[0.8vw] border border-foreground/10 bg-foreground/3 p-[1.5vw] transition-colors duration-300 hover:border-primary/60 hover:bg-primary/6 max-md:gap-[3vw] max-md:p-[4vw] max-md:text-center ${
        next ? "items-end text-right max-md:items-center max-md:text-center" : "items-start max-md:items-center"
      }`}
    >
      <span className={`${label} flex items-center gap-2.5 leading-none text-foreground/50 transition-colors duration-300 group-hover:text-primary`}>
        {/* {!next && <PagerArrow className="rotate-180 group-hover:-translate-x-1" />} */}
        {next ? "Next" : "Previous"}
        {/* {next && <PagerArrow className="group-hover:translate-x-1" />} */}
      </span>
      <span className="type-h3 leading-none text-foreground">{page.label}</span>
    </Link>
  );
}

// `pages`: the ordered list Previous/Next walks through (docs by default; legal passes its own)
export default function DocsPageFooter({ pages = DOCS_PAGES }) {
  const pathname = usePathname()?.replace(/\/$/, "") || "/docs";
  const [vote, setVote] = useState(null);
  const index = pages.findIndex((page) => page.href === pathname);
  const prev = index > 0 ? pages[index - 1] : null;
  const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : null;

  return (
    <div className="flex flex-col gap-[1vw] border-t border-foreground/10 pt-[2.5vw] max-md:gap-[4vw] max-md:pt-[8vw]">
      <div className="flex flex-wrap items-center gap-[1.5vw] border border-foreground/10 p-[1.5vw] max-md:gap-[4vw] max-md:p-[5vw]">
        <p className="type-body m-0! text-foreground">Was this page helpful?</p>
        <div className="flex gap-[0.5vw] max-md:gap-[2vw]">
          <FeedbackButton active={vote === "yes"} onClick={() => setVote("yes")}>Yes</FeedbackButton>
          <FeedbackButton active={vote === "no"} onClick={() => setVote("no")}>Not quite</FeedbackButton>
        </div>
        <FeedbackMessage vote={vote} />
      </div>

      {(prev || next) && (
        <nav aria-label="Docs pages" className={`flex gap-[1vw] ${prev ? "justify-between" : "justify-end"}`}>
          {prev && <PagerCard page={prev} direction="prev" />}
          {next && <PagerCard page={next} direction="next" />}
        </nav>
      )}
    </div>
  );
}
