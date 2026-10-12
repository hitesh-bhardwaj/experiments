"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { TableOfContents } from "@/components/ui/TableOfContents";

const WRAP = "mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw]";

// Same shell as the legal pages: title on the dark top, then the docs sheet
// (text column + sticky TOC), styled by blog.css like docs.
export default function LlmInfoBody({ children }) {
  const rootRef = useRef(null);
  const contentRef = useRef(null);

  useFadeUp(rootRef);

  return (
    <main ref={rootRef} className="relative flex w-full flex-col gap-[10vw] pt-25 max-md:gap-[20vw] max-md:pt-36">
      <section id="llm-info-hero" className={`${WRAP} flex flex-col gap-[1.4vw] max-md:gap-[5vw]`}>
        <Breadcrumb />
        <LineReveal as="h1" className="type-h1 w-[70%] text-foreground max-lg:w-full">
          Official Information About Hyperiux Vault
        </LineReveal>
      </section>

      <section id="llm-info-content" data-sound-flow="off" className="docs-sheet py-[4vw]">
        <div className="mx-auto flex w-full max-w-[1536px] items-start gap-[3vw] px-[4.5vw] max-lg:flex-col max-md:px-[6vw]">
          <div ref={contentRef} className="blog-content min-w-0 flex-1 max-lg:w-full">
            {children}
          </div>
          <aside className="sticky top-1/2 flex h-fit w-[22%] shrink-0 -translate-y-1/2 justify-end max-lg:hidden">
            <TableOfContents containerRef={contentRef} hideNearFooter />
          </aside>
        </div>
      </section>
    </main>
  );
}
