"use client";

import SideNavbar from "@/components/side-navbar";
import type { NavLinkItem } from "@/components/side-navbar";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

// This effect carries its own nav, so the demo points two of its existing
// links at the usual targets rather than layering a DemoHeader over it.
const LI_CLASS = "overflow-hidden max-lg:mb-[2vw] mb-[1vw]";

const DEMO_NAV_LINKS: NavLinkItem[] = [
  { href: "/", text: "Home", liClassName: LI_CLASS },
  { href: "/effects/navigation/side-navbar", text: "Read Article", liClassName: LI_CLASS },
  { href: "/effects", text: "Explore Effects", liClassName: LI_CLASS },
  { href: "#", text: "Pricing", liClassName: LI_CLASS },
  { href: "#", text: "Docs", liClassName: LI_CLASS },
];

export default function DemoContent({ registry }: { registry: RegistryLike }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values) => <SideNavbar {...values} navLinks={DEMO_NAV_LINKS} />}
      copyCodeOptions={{ propsVariableName: "sideNavbarProps" }}
    >
      {({ effect }) => <div className="relative h-screen w-screen bg-white"><DemoHeader />{effect}</div>}
    </RegistryRemixerDemo>
  );
}
