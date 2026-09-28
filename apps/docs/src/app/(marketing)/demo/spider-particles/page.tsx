import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import spiderParticlesRegistry from "../../../../../../../registry/effects/backgrounds/spider-particles/registry.json";

export default function Page() {
  return <DemoContent registry={spiderParticlesRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("spider-particles");
}
