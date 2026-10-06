import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import spotlightButtonRegistry from "../../../../../../registry/effects/buttons/spotlight-button/registry.json";

export default function Page() {
  return <DemoContent registry={spotlightButtonRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("spotlight-button");
}
