"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { TableOfContents } from "@/components/ui/TableOfContents";
import DocsPageFooter from "../docs/DocsPageFooter";

const WRAP = "mx-auto w-full section-x";

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
    <main ref={rootRef} className="relative flex w-full flex-col gap-[calc(var(--cvw)*10)] pt-25 max-md:gap-[20vw] max-md:pt-36">
      <section id="legal-hero" className={`${WRAP} flex flex-col gap-[calc(var(--cvw)*1.4)] max-md:gap-[5vw]`}>
        <Breadcrumb />
        <LineReveal key={pathname} as="h1" className="type-h1 w-[70%] text-foreground max-lg:w-full">
          {title}
        </LineReveal>
      </section>

      {/* Same white sheet as docs (.docs-sheet in globals.css): background, text colours,
          fonts, content column, footer and TOC are all the docs ones */}
      <section id="legal-content" data-sound-flow="off" className="docs-sheet py-[calc(var(--cvw)*4)]">
        <div className="mx-auto w-full section-x flex items-start gap-[calc(var(--cvw)*3)] max-lg:flex-col">
          <div className="flex min-w-0 flex-1 flex-col gap-[calc(var(--cvw)*5)] max-lg:w-full max-md:gap-[15vw]">
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
