import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import curvedPlaneRegistry from "../../../../../../../registry/effects/webgl/curved-plane/registry.json";

export default function Page() {
  return <DemoContent registry={curvedPlaneRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("curved-plane");
}
