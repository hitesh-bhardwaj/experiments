import React from "react";
import { getRegistryIndex } from "@/lib/registry";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";

// Same header as /templates, plus the effects listing's smooth scroll: the
// corridor is driven by scroll progress, so it reads much better eased.
export default function Layout({ children }) {
  const registry = getRegistryIndex();
  const totalEffects = registry?.items?.length ?? 0;

  return (
    <div className="w-full">
      <LenisSmoothScroll allowNestedScroll />
      <React.Suspense fallback={<div className="h-12" />}>
        <VaultHeader showSearch totalEffects={totalEffects} effects={registry?.items || []} />
      </React.Suspense>
      {children}
    </div>
  );
}
