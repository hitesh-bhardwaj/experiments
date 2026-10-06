"use client";

import { useEffect, useMemo, useState } from "react";
import { EffectCard } from "@/components/ui/EffectCardNew";
import {
  effectCategories,
  getQuickCategoryLabel,
  resolveEffectCategoryId,
} from "@/lib/categories";
import { getFeaturedEffects } from "@/lib/featured-effects";
import { emitWishlistChanged } from "@/lib/wishlistEvents";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { FilterMenu, FILTER_OPTIONS } from "@/app/(app)/(workspace)/effects/FilterMenu";

export default function SavedPage() {
  const [savedEffects, setSavedEffects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast: wishlistToast, showToast: showWishlistToast, dismissToast: dismissWishlistToast } = useToastQueue();

  async function loadSavedEffects() {
    try {
      const res = await fetch("/api/dashboard/saved");

      if (!res.ok) {
        throw new Error("Failed to load saved effects");
      }

      const data = await res.json();

      setSavedEffects(data.savedEffects || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const toggleWishlist = async (effect) => {
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ effect }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        return;
      }

      if (data.saved === false) {
        setSavedEffects((prev) =>
          prev.filter((item) => item.name !== effect.name)
        );
        showWishlistToast({
          title: `${effect.title || effect.name} removed`,
          description: "It's no longer in your dashboard's Saved Effects.",
        });
      } else {
        loadSavedEffects();
        showWishlistToast({
          title: `${effect.title || effect.name} saved`,
          description: "You'll find it in your dashboard's Saved Effects.",
        });
      }

      emitWishlistChanged(data.saved);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      loadSavedEffects();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const featuredEffects = useMemo(
    () => getFeaturedEffects(savedEffects),
    [savedEffects]
  );

  // Everything - featured/free/pro plus every category actually present -
  // collapsed into one dropdown, ordered to match the site's category
  // order first. Unlike the vault listing, there's no separate chips row.
  const dropdownOptions = useMemo(() => {
    const presentCategories = new Set();

    savedEffects.forEach((effect) => {
      const id = resolveEffectCategoryId(effect);
      if (id) presentCategories.add(id);
    });

    const knownCategories = effectCategories
      .filter(
        (category) =>
          category.id !== "featured" && presentCategories.has(category.id)
      )
      .map((category) => category.id);

    const extraCategories = [...presentCategories].filter(
      (id) => !knownCategories.includes(id)
    );

    return ["all", ...FILTER_OPTIONS, ...knownCategories, ...extraCategories];
  }, [savedEffects]);

  const activeFilter = categoryFilter === "all" ? null : categoryFilter;

  const filteredEffects = useMemo(() => {
    if (categoryFilter === "all") return savedEffects;

    if (categoryFilter === "featured") {
      const featuredNames = new Set(featuredEffects.map((effect) => effect.name));
      return savedEffects.filter((effect) => featuredNames.has(effect.name));
    }

    if (categoryFilter === "free") {
      return savedEffects.filter((effect) => effect.tier !== "pro");
    }

    if (categoryFilter === "pro") {
      return savedEffects.filter((effect) => effect.tier === "pro");
    }

    return savedEffects.filter(
      (effect) => resolveEffectCategoryId(effect) === categoryFilter
    );
  }, [categoryFilter, savedEffects, featuredEffects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400">
          Loading saved effects...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ToastViewport toast={wishlistToast} onDismiss={dismissWishlistToast} />

      {/* Header */}
      <div>
        <h1 className="text-4xl font-display text-white">
          Saved Effects
        </h1>

        <p className="text-white mt-2">
          Your wishlist of saved effects.
        </p>
      </div>

      {savedEffects.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <FilterMenu
            activeFilter={activeFilter}
            categoryFilter={categoryFilter}
            getLabel={getQuickCategoryLabel}
            onSelect={setCategoryFilter}
            options={dropdownOptions}
            variant="label"
            panelClassName="max-h-[20vw] max-md:max-h-[50vh] overflow-y-auto"
          />
        </div>
      )}

      {/* Empty State */}
      {savedEffects.length === 0 ? (
        <div className="rounded-md p-12 bg-[#272727] text-center">
          <h3 className="text-2xl text-white mb-2">
            No saved effects yet
          </h3>

          <p className="text-zinc-400">
            Start exploring the vault and save your
            favourite effects.
          </p>
        </div>
      ) : filteredEffects.length === 0 ? (
        <div className="border border-white/10 rounded-lg p-12 text-center bg-white/5 backdrop-blur-lg ">
          <h3 className="text-xl text-white mb-2">
            No saved effects in this category
          </h3>

          <p className="text-zinc-400">
            Choose another category to view your saved effects.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 max-[1025px]:grid-cols-2 max-md:grid-cols-1 max-md:gap-12">
          {filteredEffects.map((effect) => (
            <EffectCard
              key={effect.id}
              effect={effect}
              isWishlisted={true}
              toggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
