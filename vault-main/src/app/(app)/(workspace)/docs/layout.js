import React from "react";
import { getRegistryIndex } from "@/lib/registry";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";
import DocsBody from "./DocsBody";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";

export default function Layout({ children }) {
  const registry = getRegistryIndex();
  const totalEffects = registry?.items?.length ?? 0;

  return (
    <div className="h-fit text-foreground">
      <React.Suspense fallback={<div className="h-12" />}>
        <VaultHeader showSearch totalEffects={totalEffects} effects={registry?.items || []} />
      </React.Suspense>
      {/* Same smooth scroll as the homepage */}
      <LenisSmoothScroll lerp={0.065} wheelMultiplier={0.85} allowNestedScroll />
      <DocsBody>{children}</DocsBody>
    </div>
  );
}
