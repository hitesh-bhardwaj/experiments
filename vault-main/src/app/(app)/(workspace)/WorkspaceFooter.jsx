"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Below-the-fold sections load as separate chunks (still server-rendered)
const Footer = dynamic(() => import("@/homepage/sections/Footer"));

// This layout is shared by docs/templates/effects/legal AND dashboard -
// dashboard has its own dense, app-like UI (DashboardShell's own nav/tabs)
// that a marketing-style footer doesn't belong under, so this hides it
// there while leaving every other workspace route unaffected.
export default function WorkspaceFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith("/dashboard")) return null;

  return <Footer animations={false} />;
}
