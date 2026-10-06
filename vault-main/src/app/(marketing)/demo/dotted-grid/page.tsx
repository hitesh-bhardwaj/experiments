import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import dottedGridRegistry from "../../../../../../registry/effects/backgrounds/dotted-grid/registry.json";


export default function Page() {
  return <DemoContent registry={dottedGridRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("dotted-grid");
}
