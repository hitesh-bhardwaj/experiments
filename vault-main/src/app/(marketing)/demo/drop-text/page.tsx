import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import dropTextRegistry from "../../../../../../registry/effects/text/drop-text/registry.json";

export default function Page() {
  return <DemoContent registry={dropTextRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("drop-text");
}
