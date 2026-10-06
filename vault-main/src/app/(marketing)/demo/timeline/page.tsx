import DemoContent from "./DemoContent";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import registry from "../../../../../../registry/effects/components/timeline/registry.json";

export default function TimelineDemoPage() {
  return (
    <>
      <DemoContent registry={registry} />
      <ScrollBottom textColor="text-[#111111]" />
    </>
  );
}

export async function generateMetadata() {
  return getDemoPageMetadata("timeline");
}
