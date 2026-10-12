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

// Legal pages share the docs layout: title on the dark top, then the docs sheet below
// (text column + sticky TOC). The text is styled by blog.css on the sheet, like docs.
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

      {/* Same white sheet as docs (.docs-sheet in globals.css): background, text colours,
          fonts, content column, footer and TOC are all the docs ones */}
      <section id="legal-content" data-sound-flow="off" className="docs-sheet py-[4vw]">
        <div className="mx-auto flex w-full max-w-[1536px] items-start gap-[3vw] px-[4.5vw] max-lg:flex-col max-md:px-[6vw]">
          <div className="flex min-w-0 flex-1 flex-col gap-[5vw] max-lg:w-full max-md:gap-[15vw]">
            <div ref={contentRef} className="blog-content">
              {children}
            </div>
            <DocsPageFooter pages={LEGAL_PAGES} />
          </div>
          {/* TOC lives in the sheet's right column, sticky at the vertical centre */}
          <aside className="sticky top-1/2 flex h-fit w-[22%] shrink-0 -translate-y-1/2 justify-end max-lg:hidden">
            <TableOfContents containerRef={contentRef} watchKey={pathname} hideNearFooter />
          </aside>
        </div>
      </section>
    </main>
  );
}
