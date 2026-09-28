import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import donutParticlesRegistry from "../../../../../../../registry/effects/webgl/donut-particles/registry.json";

const index = () => {
  return <DemoContent registry={donutParticlesRegistry} />;
};

export default index;

export async function generateMetadata() {
  return getDemoPageMetadata("donut-particles");
}
