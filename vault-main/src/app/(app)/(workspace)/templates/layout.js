import React from "react";
import { getRegistryIndex } from "@/lib/registry";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";

// The templates header. Smooth scroll (which the corridor's scroll-driven camera
// relies on) comes from the workspace layout.
export default function Layout({ children }) {
  const registry = getRegistryIndex();
  const totalEffects = registry?.items?.length ?? 0;

  return (
    <div className="w-full">
      <React.Suspense fallback={<div className="h-12" />}>
        <VaultHeader showSearch totalEffects={totalEffects} effects={registry?.items || []} />
      </React.Suspense>
      {children}
    </div>
  );
}
