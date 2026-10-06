import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import fishEyeRegistry from "../../../../../../registry/effects/cursor/fish-eye/registry.json";

export default function Page() {
  return <DemoContent registry={fishEyeRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("fish-eye");
}
