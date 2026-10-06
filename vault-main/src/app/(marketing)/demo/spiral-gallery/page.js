import DemoHeader from "@/components/preview-chrome/DemoHeader"
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import SpiralGallery from '../../../../components/spiral-gallery';

const page = () => {
 return (
 <div>
    <DemoHeader />
 <SpiralGallery/>
 </div>
 )
}

export default page

export async function generateMetadata() {
  return getDemoPageMetadata("spiral-gallery");
}
