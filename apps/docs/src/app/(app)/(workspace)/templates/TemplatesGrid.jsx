"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { TemplateCard } from "@/components/ui/TemplateCard";
import FadeUp from "@/components/WebsiteComps/FadeUp";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { useTemplateWishlist } from "./useTemplateWishlist";
import { useTemplateAccess } from "./useTemplateAccess";

function formatLabel(value = "") {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Client-only (page.js stays a server component so its `metadata` export
// keeps working) filter row + grid, styled and behaving like
// effects/vault-content.jsx's own category chips - `template.category` is
// templates' equivalent of an effect's category, doubling as the
// industry/vertical label ("Portfolio", "Healthcare", "Real Estate", ...).
// No dedicated per-category route exists for templates (unlike
// /effects/[slug]), so filtering is plain client-side state rather than a
// URL param - just the chip row's look/toggle behavior is what's being
// matched here.
export function TemplatesGrid({ templates }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const { toast, showToast, dismissToast } = useToastQueue();
  const { wishlist, toggleWishlist } = useTemplateWishlist({
    onSaved: (template) =>
      showToast({ title: `${template.title} saved`, description: "You'll find it in your dashboard's My Templates." }),
    onRemoved: (template) =>
      showToast({ title: `${template.title} removed`, description: "No longer in your saved templates." }),
  });
  const accessSlugs = useTemplateAccess();

  // No containerRef - scans the whole document, same as Hero.jsx/
  // ExplainVault.jsx's page-wide useFadeUp() calls. This is the only
  // fadeup-driving call anywhere on /templates, so it also picks up
  // page.js's own <Breadcrumb className="fadeup" /> above this grid, which
  // previously had the class with nothing to activate it.
  useFadeUp();

  const categories = useMemo(() => {
    const seen = new Set();
    const list = [];

    for (const template of templates) {
      if (template.category && !seen.has(template.category)) {
        seen.add(template.category);
        list.push(template.category);
      }
    }

    return list;
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === "all") return templates;
    return templates.filter((template) => template.category === activeCategory);
  }, [templates, activeCategory]);

  return (
    <>
      {categories.length > 1 && (
        <div className="fadeup mx-auto px-14 pb-7 pt-10 max-md:px-0">
          <div className="relative max-[1025px]:w-full flex items-start gap-4">
            <div className="relative min-w-0 flex-1">
              <div
                className={[
                  "flex items-center gap-2.5 max-[1025px]:px-[7vw]",
                  "flex-nowrap",
                  "max-[1025px]:flex-nowrap max-[1025px]:overflow-x-auto",
                  "scrollbar-thin [scrollbar-color:#CC4C04_transparent]",
                  "[&::-webkit-scrollbar]:h-1",
                  "[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-track]:",
                  "[&::-webkit-scrollbar-thumb]:bg-[#CC4C04] [&::-webkit-scrollbar-thumb]:",
                  "max-[1025px]:pb-3",
                ].join(" ")}
              >
                {categories.map((category) => {
                  const isSelected = activeCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() =>
                        setActiveCategory(isSelected ? "all" : category)
                      }
                      aria-label={
                        isSelected
                          ? `Clear ${formatLabel(category)} category filter`
                          : `Filter by ${formatLabel(category)}`
                      }
                      className={`
                        px-6 py-3 text-[1vw] text-center relative max-md:px-5
                        backdrop-blur-[6px] font-mono group flex items-center justify-center gap-2 cursor-pointer
                        shrink-0 whitespace-nowrap
                        transition-colors duration-300 max-[1025px]:text-[2.5vw] max-md:text-[4.2vw]
                        ${isSelected
                          ? "bg-[#ff5f00] text-black hover:text-black hover:bg-[#ff5f00]"
                          : "bg-[#161616] text-[#FFFFFF] hover:text-black hover:bg-[#ff5f00]"
                        }
                      `}
                    >
                      <span className="leading-none">{formatLabel(category)}</span>
                      {isSelected && (
                        <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto px-14 pb-12 max-md:px-0">
        <div className="grid grid-cols-2 gap-4 rounded-xl max-[1025px]:grid-cols-1 max-md:grid-cols-1 max-md:px-[7vw] max-[1025px]:gap-10">
          {filteredTemplates.map((template, index) => (
            // FadeUp per card (not one fadeup around the whole grid) so each
            // card animates independently via its own mount-scoped
            // useFadeUp() call inside FadeUp itself - switching the category
            // filter mounts a fresh FadeUp instance for any newly-shown
            // card, which sets up and fires its own ScrollTrigger without
            // needing to re-scan (and re-hide) cards already on screen.
            <FadeUp key={template.slug}>
              <TemplateCard
                template={template}
                priority={index === 0}
                isWishlisted={wishlist.includes(template.slug)}
                toggleWishlist={toggleWishlist}
                showPurchase
                hasAccess={accessSlugs.includes(template.slug)}
              />
            </FadeUp>
          ))}
        </div>
      </div>

      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </>
  );
}
