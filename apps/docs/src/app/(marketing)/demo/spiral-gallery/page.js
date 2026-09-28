import DemoHeader from '@/components/WebsiteComps/DemoHeader'
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import SpiralGallery from '../../../../components/spiral-gallery';

const page = () => {
 return (
 <div>
    <DemoHeader logoColor='#FFFFFF' textColor='#ffffff' />
 <SpiralGallery/>
 </div>
 )
}

export default page

export async function generateMetadata() {
  return getDemoPageMetadata("spiral-gallery");
}
