import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import variableTextProximityRegistry from "../../../../../../../registry/effects/text/variable-text-proximity/registry.json";

export default function Page() {
  return <DemoContent registry={variableTextProximityRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("variable-text-proximity");
}
