import MultiTextScroll from '@/components/multi-text-scroll'
import ReactLenis from 'lenis/react'
import React from 'react'
import DemoHeader from "@/components/preview-chrome/DemoHeader";

const page = () => {
  return (
   <>
   <ReactLenis root>
   <DemoHeader />
   <MultiTextScroll/>

   </ReactLenis>
   </>
  )
}

export default page