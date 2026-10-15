import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import animatedFaqRegistry from "../../../../../../registry/effects/components/animated-faq/registry.json";

export default function Page() {
  return <DemoContent registry={animatedFaqRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("animated-faq");
}
