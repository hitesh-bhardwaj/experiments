"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { TableOfContents } from "@/components/ui/TableOfContents";

const WRAP = "mx-auto w-full px-[calc(var(--cvw)*4.5)] max-md:px-[6vw]";

// Same shell as /llm-info: title and live counts on the dark top, then the docs
// sheet (text column + sticky TOC), styled by blog.css like docs.
export default function AiComponentsBody({ stats, children }) {
  const rootRef = useRef(null);
  const contentRef = useRef(null);

  useFadeUp(rootRef);

  return (
    <main ref={rootRef} className="relative flex w-full flex-col gap-[calc(var(--cvw)*7)] pt-25 max-md:gap-[16vw] max-md:pt-36">
      <section id="ai-components-hero" className={`${WRAP} flex flex-col gap-[calc(var(--cvw)*1.4)] max-md:gap-[5vw]`}>
        <Breadcrumb />
        <LineReveal as="h1" className="type-h1 w-[70%] text-foreground max-lg:w-full">
          AI Component Catalogue for React &amp; Next.js
        </LineReveal>
        <p className="fadeup type-body-lg w-[52%] text-foreground/80 max-lg:w-full">
          Every Hyperiux Vault effect with what it&apos;s for, what it isn&apos;t for, dependencies, accessibility notes,
          usage code and props. Written for people and readable by AI assistants.
        </p>
        <dl className="fadeup mt-[calc(var(--cvw)*1)] grid w-fit grid-cols-5 gap-x-[calc(var(--cvw)*3.5)] gap-y-6 max-md:grid-cols-3 max-md:gap-x-[8vw]">
          {stats.map(([value, label]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="type-small order-2 text-foreground/80">{label}</dt>
              <dd className="type-h2 order-1 m-0 text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="ai-components-content" data-sound-flow="off" className="docs-sheet py-[calc(var(--cvw)*4)]">
        <div className="mx-auto flex w-full items-start gap-[calc(var(--cvw)*3)] px-[calc(var(--cvw)*4.5)] max-lg:flex-col max-md:px-[6vw]">
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
