"use client";

import { useState } from "react";
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

const label = "text-[11px] font-medium uppercase tracking-[.16em]";

function FeedbackButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 cursor-pointer border px-4 transition-colors duration-300 ${label} ${
        active
          ? "border-primary bg-primary text-black"
          : "border-white/15 text-white/80 hover:border-primary hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// The site buttons' pixelated arrow (ButtonV3), sized to the label's cap height
function PagerArrow({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`block size-[11px] shrink-0 bg-current [mask-image:url(/homepage-v3/svgs/pixelated-arrow.svg)] mask-center mask-no-repeat mask-contain transition-transform duration-300 ${className}`}
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
      className={`group flex flex-col gap-3 border border-white/10 bg-white/[.03] p-6 transition-colors duration-300 hover:border-primary/60 hover:bg-primary/[.06] ${
        next ? "col-start-2 items-end text-right max-sm:col-start-1" : "items-start"
      }`}
    >
      <span className={`${label} flex items-center gap-2.5 leading-none text-white/50 transition-colors duration-300 group-hover:text-primary`}>
        {/* {!next && <PagerArrow className="rotate-180 group-hover:-translate-x-1" />} */}
        {next ? "Next" : "Previous"}
        {/* {next && <PagerArrow className="group-hover:translate-x-1" />} */}
      </span>
      <span className="text-[clamp(1.4rem,2vw,2rem)] leading-none tracking-[-.03em] text-white">{page.label}</span>
    </Link>
  );
}

export default function DocsPageFooter() {
  const pathname = usePathname()?.replace(/\/$/, "") || "/docs";
  const [vote, setVote] = useState(null);
  const index = DOCS_PAGES.findIndex((page) => page.href === pathname);
  const prev = index > 0 ? DOCS_PAGES[index - 1] : null;
  const next = index >= 0 && index < DOCS_PAGES.length - 1 ? DOCS_PAGES[index + 1] : null;

  return (
    <div className="mt-20 grid gap-4 border-t border-white/10 pt-10">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border border-white/10 p-6">
        <p className="m-0! text-[1.05rem]! text-[#1D1D1D]!">Was this page helpful?</p>
        <div className="flex gap-2">
          <FeedbackButton active={vote === "yes"} onClick={() => setVote("yes")}>Yes</FeedbackButton>
          <FeedbackButton active={vote === "no"} onClick={() => setVote("no")}>Not quite</FeedbackButton>
        </div>
        <p aria-live="polite" className={`m-0! ${label} text-[#1D1D1D]!`}>
          {vote === "yes" && "Thanks. Glad it helped."}
          {vote === "no" && (
            <>
              Thanks. Tell us what was missing at{" "}
              <a href="mailto:hello@hyperiux.com" className="text-primary underline underline-offset-4">hello@hyperiux.com</a>.
            </>
          )}
        </p>
      </div>

      {(prev || next) && (
        <nav aria-label="Docs pages" className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          {prev && <PagerCard page={prev} direction="prev" />}
          {next && <PagerCard page={next} direction="next" />}
        </nav>
      )}
    </div>
  );
}
