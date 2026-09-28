import React, { Suspense } from "react";
import {
  getEffectTierCounts,
  getEffectsByCategory,
  getRegistryIndex,
} from "@/lib/registry";
import { VaultLayout } from "@/components/layout/VaultLayout";
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
