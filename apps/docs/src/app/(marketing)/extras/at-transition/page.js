import React from'react'
import WholeExperience from'@/components/ATTransition/WholeExperience'
import LenisSmoothScroll from'@/components/SmoothScroll/LenisScroll'

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const page = () => {
 return (
 <div>
 <LenisSmoothScroll />
 <WholeExperience />
 </div>
 )
}

export default page