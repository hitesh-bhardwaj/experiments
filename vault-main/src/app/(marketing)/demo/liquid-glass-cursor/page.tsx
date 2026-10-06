import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import liquidGlassCursorRegistry from "../../../../../../registry/effects/cursor/liquid-glass-cursor/registry.json";

export default function Page() {
  return <DemoContent registry={liquidGlassCursorRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("liquid-glass-cursor");
}
