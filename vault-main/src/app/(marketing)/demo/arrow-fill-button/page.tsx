import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import arrowFillButtonRegistry from "../../../../../../registry/effects/buttons/arrow-fill-button/registry.json";

export default function Page() {
  return <DemoContent registry={arrowFillButtonRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("arrow-fill-button");
}
