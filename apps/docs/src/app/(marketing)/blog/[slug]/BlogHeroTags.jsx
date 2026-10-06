"use client";

import { useState } from "react";

const PILL_CLASS =
  "bg-[#2B2B2B] px-[0.4vw] py-[0.1vw] text-[0.95vw] font-mono text-white/90 max-md:px-3 max-md:py-1 max-md:text-[3vw]!";

const MOBILE_VISIBLE = 3;

export default function BlogHeroTags({ tags = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (!tags.length) return null;

  const hiddenCount = tags.length - MOBILE_VISIBLE;
  const showToggle = !expanded && hiddenCount > 0;

  return (
    <div className="flex w-[30%] flex-wrap items-center justify-end gap-2.5 max-[1025px]:w-[50%]">
      {tags.map((tag, index) => {
        // Past the cap the pill still renders for wider screens - it's only
        // hidden at max-md, and only until the viewer expands the list.
        const hideOnMobile = !expanded && index >= MOBILE_VISIBLE;

        return (
          <span
            key={tag}
            className={`${PILL_CLASS} ${hideOnMobile ? "max-md:hidden" : ""}`}
          >
            {tag}
          </span>
        );
      })}

      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`Show ${hiddenCount} more tags`}
          className={`${PILL_CLASS} hidden cursor-pointer transition-colors hover:bg-[#3a3a3a] max-md:block`}
        >
          +{hiddenCount}
        </button>
      )}
    </div>
  );
}
