import React from "react";
import { getRegistryIndex } from "@/lib/registry";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import LegalBody from "./LegalBody";

export default function Layout({ children }) {
  const registry = getRegistryIndex();
  const totalEffects = registry?.items?.length ?? 0;

  return (
    <div className="h-fit w-full text-foreground">
      <React.Suspense fallback={<div className="h-12" />}>
        <VaultHeader showSearch totalEffects={totalEffects} effects={registry?.items || []} />
      </React.Suspense>
      <LenisSmoothScroll lerp={0.065} wheelMultiplier={0.85} allowNestedScroll />
      <LegalBody>{children}</LegalBody>
    </div>
  );
}
