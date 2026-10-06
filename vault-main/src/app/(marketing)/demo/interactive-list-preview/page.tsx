import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import registry from "../../../../../../registry/effects/components/interactive-list-preview/registry.json";

export default function Page() {
  return <DemoContent registry={registry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("interactive-list-preview");
}
