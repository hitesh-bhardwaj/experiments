import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import registry from "../../../../../../../registry/effects/carousels/orbit-flip-slider/registry.json";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function Page() {
  return(
    <>
    <DemoHeader/>
    <DemoContent registry={registry} />
    </>
  ) 
  
}

export async function generateMetadata() {
  return getDemoPageMetadata("orbit-flip-slider");
}
