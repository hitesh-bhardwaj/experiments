import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import textConvergenceRegistry from "../../../../../../registry/effects/scroll/text-convergence/registry.json";

export default function Page() {
  return <DemoContent registry={textConvergenceRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("text-convergence");
}
