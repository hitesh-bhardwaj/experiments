import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import chromaticTextRegistry from "../../../../../../../registry/effects/text/chromatic-text/registry.json";

export default function Page() {
  return <DemoContent registry={chromaticTextRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("chromatic-text");
}
