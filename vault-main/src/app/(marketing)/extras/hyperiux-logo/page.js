import React from 'react'
import { ReactLenis } from "lenis/react";
import HyperiuxLogo from '@/components/HyperiuxLogo';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const page = () => {
  return (
        <ReactLenis root>
            <HyperiuxLogo/>

        </ReactLenis>
    
   
  )
}

export default page