import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import focusTextRegistry from "../../../../../../registry/effects/text/focus-text/registry.json";

export default function Page() {
  return <DemoContent registry={focusTextRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("focus-text");
}
