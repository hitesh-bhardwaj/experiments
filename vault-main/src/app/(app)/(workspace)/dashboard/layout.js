import { DashboardShell } from "@/components/Dashboard/DashboardShell";
import { getRegistryIndex } from "@/lib/registry";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }) {
  const registry = getRegistryIndex();
  const totalEffects = registry?.items?.length ?? 0;

  return (
    <DashboardShell totalEffects={totalEffects} effects={registry?.items || []}>
      {children}
    </DashboardShell>
  );
}
