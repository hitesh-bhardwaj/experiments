"use client";

import { usePathname } from "next/navigation";
import FooterV3 from "@/homepage-v3/sections/FooterV3";

// This layout is shared by docs/templates/effects/legal AND dashboard -
// dashboard has its own dense, app-like UI (DashboardShell's own nav/tabs)
// that a marketing-style footer doesn't belong under, so this hides it
// there while leaving every other workspace route unaffected.
export default function WorkspaceFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashboard")) return null;

  return <FooterV3 animations={false} />;
}
