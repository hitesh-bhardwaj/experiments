
import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import fractalGlassRegistry from "../../../../../../registry/effects/webgl/fractal-glass/registry.json";

export default function Page() {
  return <DemoContent registry={fractalGlassRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("fractal-glass");
}
