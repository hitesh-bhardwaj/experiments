import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import rectangularTextRevealRegistry from "../../../../../../registry/effects/text/rectangular-text-reveal/registry.json";

export default function Page() {
  return <DemoContent registry={rectangularTextRevealRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("rectangular-text-reveal");
}
