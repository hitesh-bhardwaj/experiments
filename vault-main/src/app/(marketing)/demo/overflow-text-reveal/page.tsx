import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import overflowTextRevealRegistry from "../../../../../../registry/effects/text/overflow-text-reveal/registry.json";


export default function Page() {
  return <DemoContent registry={overflowTextRevealRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("overflow-text-reveal");
}
