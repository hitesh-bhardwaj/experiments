import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import registry from "../../../../../../registry/effects/navigation/displacement-navbar/registry.json";

export default function Page() {
  return <DemoContent registry={registry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("displacement-navbar", { title: "Displacement Navbar" });
}
