import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";

import registry from "../../../../../../../registry/effects/backgrounds/dotted-trail/registry.json";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DottedTrailDemoPage() {
  return (
    <>
   <DemoHeader/>
    <DemoContent registry={registry} />
    </>
  )
  
}

export async function generateMetadata() {
  return getDemoPageMetadata("dotted-trail");
}
