"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ALL_DATES, CARD, CARD_PAD, DateRangeFilter, FILTER_WIDTH, FilteredCount, inDateRange, resolveDateRange } from "@/components/Dashboard/DashboardUI";
import { Bar } from "@/components/Dashboard/DashboardSkeletons";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { useDashboardData } from "@/components/Dashboard/useDashboardData";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import Button from "@/homepage/components/Button";
import { TemplateCard } from "@/app/(app)/(workspace)/templates/TemplateCard";
import { CARD_LAYOUT_TRANSITION } from "@/app/(app)/(workspace)/effects/EffectCard";
import { FilterMenu } from "@/app/(app)/(workspace)/effects/FilterMenu";
import { CATALOGUES, T13, T14, TEMPLATE_CARD_WIDTH, TEMPLATE_GRID, catalogueOf } from "@/app/(app)/(workspace)/templates/tokens";
import { useTemplateWishlist } from "@/app/(app)/(workspace)/templates/useTemplateWishlist";
import { getDashboardPreview } from "@/lib/dev/dashboardPreview";

const KINDS = [
  { id: "all", label: "All templates" },
  { id: "owned", label: "Owned" },
  { id: "saved", label: "Saved" },
];


/**
 * "My templates": the templates this account can download (bought, redeemed with a
 * credit, or included in its plan - api/dashboard/template-purchases), then the ones
 * it has saved, on the templates listing's cards, with the listing's filters (industry,
 * catalogue) and a date range (bought / saved).
 */
export function MyTemplates({ templates }) {
  const { toast, showToast, dismissToast } = useToastQueue();
  const { wishlist, toggleWishlist } = useTemplateWishlist({
    onRemoved: (template) => showToast({ title: `${template.title} removed`, description: "No longer in your saved templates." }),
  });

  const { username } = useDashboard();
  // What's this account's: { owned: slug -> when it became theirs (bought or redeemed; null
  // if its plan includes it), savedAt: slug -> when it was saved, credits }. Cached across
  // tabs (skeleton on the first load only) and refreshed after every save.
  const { data } = useDashboardData(`templates:${username}`, async () => {
    if (getDashboardPreview()) {
      const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
      return {
        owned: Object.fromEntries(templates.slice(0, 2).map((t, i) => [t.slug, day(i * 9 + 3)])),
        savedAt: Object.fromEntries(templates.map((t, i) => [t.slug, day(i * 4 + 1)])),
        credits: 1,
      };
    }
    const json = (url, fallback) =>
      fetch(url, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : fallback))
        .catch(() => fallback);
    const [purchases, saved, credits] = await Promise.all([json("/api/dashboard/template-purchases", { templates: [] }), json("/api/wishlist-templates", []), json("/api/templates/credits", null)]);
    return {
      owned: Object.fromEntries((purchases.templates || []).map((t) => [t.slug, t.purchasedAt])),
      savedAt: Array.isArray(saved) ? Object.fromEntries(saved.map((row) => [row.template_slug, row.created_at])) : {},
      credits: credits?.balance ?? 0,
    };
  });
  const owned = data?.owned ?? null;
  const savedAt = data?.savedAt ?? {};
  const credits = data?.credits ?? null;
  const [industry, setIndustry] = useState(null);
  // Which templates: all, the ones you own (bought, redeemed or in your plan), or saved ones
  const [kind, setKind] = useState("all");
  const [catalogue, setCatalogue] = useState("all");
  const [dates, setDates] = useState(ALL_DATES);

  // Every template that's this account's in some way - owned (bought, redeemed or in its
  // plan) and/or saved - in one list; the Owned / Saved filter narrows it
  const isOwned = (t) => Boolean(owned && t.slug in owned);
  const isSaved = (t) => wishlist.includes(t.slug);
  const mine = useMemo(() => (owned ? templates.filter((t) => t.slug in owned || wishlist.includes(t.slug)) : []), [templates, owned, wishlist]);

  // The industry dropdown: the industries among this account's templates
  const industries = useMemo(() => [...new Set(mine.map((t) => t.category).filter(Boolean))].map((id) => ({ id })), [mine]);

  // Date: when it became yours (Owned), when you saved it (Saved), either one (All)
  const { from, to } = resolveDateRange(dates);
  const inRange = (t) =>
    !from ||
    (kind !== "saved" && isOwned(t) && inDateRange(owned[t.slug], from, to)) ||
    (kind !== "owned" && isSaved(t) && inDateRange(savedAt[t.slug], from, to));
  const shown = mine.filter(
    (t) =>
      (kind === "all" || (kind === "owned" ? isOwned(t) : isSaved(t))) &&
      (!industry || t.category === industry) &&
      (catalogue === "all" || catalogueOf(t) === catalogue) &&
      inRange(t),
  );
  const total = mine.length;

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*2.4)] max-lg:gap-10">
      <ToastViewport toast={toast} onDismiss={dismissToast} />

      {credits > 0 && (
        <div className="flex items-center justify-between gap-[calc(var(--cvw)*2)] bg-primary/10 px-[calc(var(--cvw)*1.6)] py-[calc(var(--cvw)*1.2)] ring-1 ring-inset ring-primary/30 max-lg:flex-col max-lg:items-start max-lg:gap-4 max-lg:p-6">
          <p className="type-body">
            You have {credits} template credit{credits === 1 ? "" : "s"} left. Redeem one on any template in your catalogue before your plan renews.
          </p>
          <Button href="/templates" text="Browse Templates" />
        </div>
      )}

      {/* owned / saved, industry, catalogue and date */}
      {total > 0 && (
        <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-md:gap-[3vw]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilteredCount shown={shown.length} total={total} noun="templates" />
            <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
              <FilterMenu
                tone="light"
                variant="label"
                alignRight
                widthClassName={FILTER_WIDTH}
                panelClassName="left-auto! right-0"
                options={KINDS.map((k) => k.id)}
                categoryFilter={kind}
                activeFilter={kind === "all" ? null : kind}
                getLabel={(id) => KINDS.find((k) => k.id === id)?.label}
                onSelect={setKind}
              />
              {industries.length > 1 && (
                <FilterMenu
                  tone="light"
                  variant="label"
                  alignRight
                  widthClassName={FILTER_WIDTH}
                  panelClassName="left-auto! right-0"
                  options={["all", ...industries.map((i) => i.id)]}
                  categoryFilter={industry || "all"}
                  activeFilter={industry}
                  getLabel={(id) => (id === "all" ? "All industries" : id)}
                  onSelect={(id) => setIndustry(id === "all" ? null : id)}
                />
              )}
              <FilterMenu
                tone="light"
                alignRight
                panelClassName="left-auto! right-0"
                options={CATALOGUES.map((c) => c.id)}
                activeFilter={catalogue === "all" ? null : catalogue}
                getLabel={(id) => CATALOGUES.find((c) => c.id === id)?.label}
                onSelect={setCatalogue}
                onClear={() => setCatalogue("all")}
              />
              <DateRangeFilter label="Date" value={dates} onChange={setDates} />
            </div>
          </div>
        </div>
      )}

      {/* owned and saved together, one grid */}
      {owned === null ? (
        // the template cards' shape: cover, then title and meta beside the price, tagline
        <div aria-busy="true" aria-label="Loading your templates" className={TEMPLATE_GRID}>
          {[0, 1].map((i) => (
            <div key={i} className={`flex flex-col gap-[calc(var(--cvw)*1.1)] max-lg:gap-4 ${TEMPLATE_CARD_WIDTH}`}>
              <Bar className="aspect-16/10 w-full" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex w-[60%] flex-col gap-[calc(var(--cvw)*0.3)] max-lg:gap-1">
                  <Bar type="type-h3" className="w-[70%]" />
                  <Bar className={`h-[1lh] w-[45%] ${T13}`} />
                </div>
                <Bar type="type-h3" className="w-16" />
              </div>
              <Bar className={`h-[1lh] w-[85%] ${T14}`} />
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
          <p className="type-h3">No templates yet.</p>
          <p className="type-body text-black/60">Buy a template or redeem a credit to download it here any time, or tap the heart on one to save it for later.</p>
          <Button href="/templates" text="Browse Templates" />
        </div>
      ) : shown.length === 0 ? (
        <p className="type-body text-black/60">No templates match these filters.</p>
      ) : (
        <div className={TEMPLATE_GRID}>
          {shown.map((template) => (
            <motion.div key={template.slug} layout transition={CARD_LAYOUT_TRANSITION} className={TEMPLATE_CARD_WIDTH}>
              <TemplateCard template={template} hasAccess={isOwned(template)} isWishlisted={isSaved(template)} onToggleWishlist={toggleWishlist} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
