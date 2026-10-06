import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import dotFillButtonRegistry from "../../../../../../registry/effects/buttons/dot-fill-button/registry.json";


export default function Page() {
  return <DemoContent registry={dotFillButtonRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("dot-fill-button");
}
