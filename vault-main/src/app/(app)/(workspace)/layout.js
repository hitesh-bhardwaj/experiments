import React, { Suspense } from "react";
import {
  getEffectTierCounts,
  getEffectsByCategory,
  getRegistryIndex,
} from "@/lib/registry";
import { VaultLayout } from "@/components/layout/VaultLayout";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
// import NavbarMobile from "@/components/WebsiteComps/NavbarMobile";
import WorkspaceFooter from "./WorkspaceFooter";

function VaultLayoutFallback() {
  return (
    <div className="flex">
      <aside className="sticky bottom-0 left-0 top-0 h-screen border-r border-white/10 bg-[#060606] w-22" />
      <div className="flex-1 bg-background" />
    </div>
  );
}

export default function WorkspaceLayout({ children }) {
  const categories = getEffectsByCategory();
  const registry = getRegistryIndex();

  const effectCounts = {};
  for (const [category, effects] of Object.entries(categories)) {
    effectCounts[category] = effects.length;
  }

  Object.assign(effectCounts, getEffectTierCounts());

  const totalEffects = registry?.items?.length ?? 0;

  return (
    <Suspense fallback={<VaultLayoutFallback />}>
      {/* One smooth scroll for every workspace page, mounted here rather than per
          section so it stays alive across page changes - the page-change loader
          (loading.js) can then stop it, and there is never a moment without it.
          allowNestedScroll lets inner scroll areas (playground panel, dropdowns,
          code blocks) scroll under the cursor before handing the wheel back. */}
      <LenisSmoothScroll allowNestedScroll />
      {/* <NavbarMobile /> */}
      <VaultLayout
        effectCounts={effectCounts}
        totalEffects={totalEffects}
        effects={registry?.items || []}
      >
        {children}
      </VaultLayout>
      <WorkspaceFooter />
    </Suspense>
  );
}
