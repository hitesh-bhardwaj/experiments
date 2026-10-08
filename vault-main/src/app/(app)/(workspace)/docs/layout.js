import React from "react";
import { getRegistryIndex } from "@/lib/registry";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";
import DocsBody from "./DocsBody";

export default function Layout({ children }) {
  const registry = getRegistryIndex();
  const totalEffects = registry?.items?.length ?? 0;

  return (
    <div className="h-fit text-foreground">
      <React.Suspense fallback={<div className="h-12" />}>
        <VaultHeader showSearch totalEffects={totalEffects} effects={registry?.items || []} />
      </React.Suspense>
      {/* Smooth scroll comes from the workspace layout */}
      <DocsBody>{children}</DocsBody>
    </div>
  );
}
