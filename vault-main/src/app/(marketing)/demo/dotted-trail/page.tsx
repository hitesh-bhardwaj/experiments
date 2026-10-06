import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";

import registry from "../../../../../../registry/effects/backgrounds/dotted-trail/registry.json";

export default function DottedTrailDemoPage() {
  return (
    <>
    <DemoContent registry={registry} />
    </>
  )
  
}

export async function generateMetadata() {
  return getDemoPageMetadata("dotted-trail");
}
