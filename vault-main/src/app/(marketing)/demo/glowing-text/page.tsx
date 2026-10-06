import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import glowingTextRegistry from "../../../../../../registry/effects/text/glowing-text/registry.json";

export default function Page() {
  return <DemoContent registry={glowingTextRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("glowing-text");
}
