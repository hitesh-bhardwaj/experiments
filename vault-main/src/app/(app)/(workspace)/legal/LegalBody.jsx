"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { TableOfContents } from "@/components/ui/TableOfContents";
import DocsPageFooter from "../docs/DocsPageFooter";

const WRAP = "mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw]";

// Page titles for the dark hero (the content itself starts at its first section)
// Same order as the site footer's legal links (License Agreement first)
const LEGAL_TITLES = {
  "/legal/license-agreement": "License Agreement",
  "/legal/terms-of-service": "Terms of Service",
  "/legal/privacy-policy": "Privacy Policy",
  "/legal/refund-policy": "Refund Policy",
};

// Previous/Next order for the page footer
const LEGAL_PAGES = Object.entries(LEGAL_TITLES).map(([href, label]) => ({ href, label }));

// Legal pages share the effect detail layout: title on the dark top, the full-width
// text on one white area below. The text is styled by blog.css (light theme), like
// blog posts, docs and effect content - no overrides here.
export default function LegalBody({ children }) {
  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const pathname = usePathname()?.replace(/\/$/, "") || "/legal";
  const title = LEGAL_TITLES[pathname] || "Legal";

  useFadeUp(rootRef, [pathname]);

  return (
    <main ref={rootRef} className="relative flex w-full flex-col gap-[10vw] pt-25 max-md:gap-[20vw] max-md:pt-36">
      <section id="legal-hero" className={`${WRAP} flex flex-col gap-[1.4vw] max-md:gap-[5vw]`}>
        <Breadcrumb />
        <LineReveal key={pathname} as="h1" className="type-h1 w-[70%] text-foreground max-lg:w-full">
          {title}
        </LineReveal>
      </section>

      <div data-sound-flow="off" className="bg-foreground text-background">
        <section id="legal-content" className={`${WRAP} blog-theme-light relative pt-[5.5vw] pb-[7%] max-md:pt-[15vw] max-md:pb-[15%]`}>
          <div className="fixed right-[1vw] top-1/2 z-30 -translate-y-1/2 max-lg:hidden">
            <TableOfContents containerRef={contentRef} watchKey={pathname} revealAt={0.2} showBackToTop />
          </div>
          <div className="flex w-[70%] flex-col gap-[5vw] max-lg:w-full max-md:gap-[15vw]">
            <div ref={contentRef} className="blog-content">
              {children}
            </div>
            {/* Same page footer as docs (helpful? + Previous/Next). It's built for the docs
                sheet, where foreground is dark ink, so the same swap is made here. */}
            <div className="[--foreground:var(--ink)]">
              <DocsPageFooter pages={LEGAL_PAGES} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
