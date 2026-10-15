import React from "react";
import { getRegistryIndex } from "@/lib/registry";
import { getAiCatalogue } from "@/lib/ai-catalogue";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import AiComponentsBody from "./AiComponentsBody";

export default async function Layout({ children }) {
  const registry = getRegistryIndex();
  const { totals } = await getAiCatalogue();

  return (
    <div className="h-fit w-full text-foreground">
      <React.Suspense fallback={<div className="h-12" />}>
        <VaultHeader showSearch totalEffects={registry?.items?.length ?? 0} effects={registry?.items || []} />
      </React.Suspense>
      <LenisSmoothScroll lerp={0.065} wheelMultiplier={0.85} allowNestedScroll />
      <AiComponentsBody
        stats={[
          [totals.effects, "Effects"],
          [totals.free, "Free"],
          [totals.pro, "Pro"],
          [totals.categories, "Categories"],
          [totals.templates, "Templates"],
        ]}
      >
        {children}
      </AiComponentsBody>
    </div>
  );
}
