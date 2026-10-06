import { getDemoPageMetadata } from "@/lib/demo-metadata";
import DemoContent from "./DemoContent";
import blurTextRegistry from "../../../../../../registry/effects/text/blur-text/registry.json";

export async function generateMetadata() {
  return getDemoPageMetadata("blur-text");
}

export default function Page() {
  return <DemoContent registry={blurTextRegistry} />;
}
