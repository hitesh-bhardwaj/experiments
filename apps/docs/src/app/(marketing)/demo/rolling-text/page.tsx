import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import rollingTextRegistry from "../../../../../../../registry/effects/text/rolling-text/registry.json";

export default function Page() {
  return <DemoContent registry={rollingTextRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("rolling-text");
}
