import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import ropeCursorRegistry from "../../../../../../../registry/effects/cursor/rope-cursor/registry.json";

export default function Page() {
  return <DemoContent registry={ropeCursorRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("rope-cursor");
}
