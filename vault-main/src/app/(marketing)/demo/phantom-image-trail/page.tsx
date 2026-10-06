import { getDemoPageMetadata } from "@/lib/demo-metadata";
import DemoContent from "./DemoContent";
import phantomImageTrailRegistry from "../../../../../../registry/effects/cursor/phantom-image-trail/registry.json";

export async function generateMetadata() {
  return getDemoPageMetadata("phantom-image-trail");
}

export default function Page() {
  return <DemoContent registry={phantomImageTrailRegistry} />;
}
