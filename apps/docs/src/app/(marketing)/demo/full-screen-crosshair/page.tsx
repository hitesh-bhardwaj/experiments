import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import fullScreenCrosshairRegistry from "../../../../../../../registry/effects/cursor/full-screen-crosshair/registry.json";

export default function Page() {
  return <DemoContent registry={fullScreenCrosshairRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("full-screen-crosshair");
}
