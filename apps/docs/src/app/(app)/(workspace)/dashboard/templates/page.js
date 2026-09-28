"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Download, Eye } from "lucide-react";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { TemplateCard } from "@/components/ui/TemplateCard";
import { getTemplateBySlug } from "@/lib/mock-templates";
import { useTemplateWishlist } from "@/app/(app)/(workspace)/templates/useTemplateWishlist";
import { useTemplateAccess } from "@/app/(app)/(workspace)/templates/useTemplateAccess";

// Sibling to dashboard/saved/page.js, same client-fetch-on-mount shape, but
// for templates the user can download (purchased standalone, or included
// via an active annual-Pro subscription - see
// api/dashboard/template-purchases/route.js) rather than saved effects.
// Also renders a second "Saved" section below - templates hearted via
// TemplateCard's Save button (wishlisted_templates, not a purchase).
//
// No shared card for the "Purchased" section - TemplateCard.jsx (used for
// "Saved" below, and "Related Templates" on the template detail page) is
// built around a wishlist toggle and a View-Detail arrow, neither of which
// apply to "a template you already own" - its own header comment explains
// why it was forked from EffectCardNew instead of branching that component
// on two concerns; same reasoning applies to not forcing the Purchased list
// through TemplateCard.

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function AccessBadge({ reason }) {
  const label = reason === "annual-pro-included" ? "Included in Pro" : "Purchased";

  return (
    <span className="shrink-0 bg-primary px-3 py-1 text-xs font-medium text-white">
      {label}
    </span>
  );
}

function OwnedTemplateCard({ template, onDownload }) {
  const screenshot = template.screenshots?.[0];
  const purchasedLabel = formatDate(template.purchasedAt);

  return (
    <div className="group relative flex flex-col bg-[#161616]">
      <div className="relative aspect-16/10 w-full overflow-hidden bg-[#202020]">
        {screenshot ? (
          <Image
            src={screenshot}
            alt={template.title}
            fill
            sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(50vw - 40px), 400px"
            quality={75}
            className="object-cover object-top"
          />
        ) : (
          <div className="h-full w-full bg-[#202020]" />
        )}

        <div className="absolute right-3 top-3">
          <AccessBadge reason={template.accessReason} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-medium text-white">{template.title}</h3>
          <p className="mt-1 text-xs text-white/50">
            {purchasedLabel
              ? `Purchased ${purchasedLabel}`
              : "Included with your annual Vault Pro plan"}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-3 w-fit">
          <button
            type="button"
            onClick={() => {
              // Content-Disposition: attachment on this route means the
              // browser downloads it in place rather than navigating away,
              // so the toast stays on screen through and after the download.
              window.location.href = template.downloadHref;
              onDownload(template);
            }}
            className="flex flex-1  h-10 w-10 cursor-pointer items-center justify-center gap-2 bg-primary text-sm font-medium text-white transition-colors hover:bg-[#e0540a]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            
          </button>

          <Link
            href={template.previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center bg-white/5 text-white transition-colors hover:bg-white/10"
            aria-label="Preview"
          >
            <Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, dismissToast } = useToastQueue();
  const { wishlist, toggleWishlist } = useTemplateWishlist({
    onRemoved: (template) =>
      showToast({ title: `${template.title} removed`, description: "No longer in your saved templates." }),
  });
  const accessSlugs = useTemplateAccess();

  const savedTemplates = wishlist.map(getTemplateBySlug).filter(Boolean);

  const handleDownload = (template) => {
    showToast({
      title: `${template.title} downloaded`,
      description: `${template.title} has been downloaded.`,
    });
  };

  useEffect(() => {
    let active = true;

    async function loadTemplates() {
      try {
        const res = await fetch("/api/dashboard/template-purchases");
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load templates");
        if (active) setTemplates(data.templates || []);
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    }

    const frame = requestAnimationFrame(loadTemplates);

    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400">Loading your templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ToastViewport toast={toast} onDismiss={dismissToast} />

      <div>
        <h1 className="text-4xl font-display text-white">My Templates</h1>
        <p className="mt-2 text-white">
          Templates you&apos;ve purchased or unlocked through Vault Pro, ready to download.
        </p>
      </div>

      {templates.length === 0 && savedTemplates.length === 0 ? (
        <div className="rounded-md bg-[#272727] p-12 text-center">
          <h3 className="mb-2 text-2xl text-white">No templates yet</h3>
          <p className="text-zinc-400">
            Browse the template library and buy one, or upgrade to annual Vault Pro
            for every template included.
          </p>
          <Link
            href="/templates"
            className="mt-6 inline-flex bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#e0540a]"
          >
            Browse Templates
          </Link>
        </div>
      ) : (
        <>
          {templates.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-white">Purchased</h2>
              <div className="grid grid-cols-3 gap-4 max-[1025px]:grid-cols-2 max-md:grid-cols-1">
                {templates.map((template) => (
                  <OwnedTemplateCard
                    key={template.slug}
                    template={template}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            </div>
          )}

          {savedTemplates.length > 0 && (
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-white">Saved</h2>
              <div className="grid grid-cols-3 gap-4 max-[1025px]:grid-cols-2 max-md:grid-cols-1">
                {savedTemplates.map((template) => (
                  <TemplateCard
                    key={template.slug}
                    template={template}
                    isWishlisted
                    toggleWishlist={toggleWishlist}
                    showPurchase
                    hasAccess={accessSlugs.includes(template.slug)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
