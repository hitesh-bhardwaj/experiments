import React from 'react'
import SeamReveal from '@/components/seam-reveal'
import LenisSmoothScroll from '@/components/SmoothScroll/LenisScroll'
import DemoHeader from "@/components/preview-chrome/DemoHeader";

const page = () => {
  return (
    <>
    <DemoHeader />
    <LenisSmoothScroll />
    <SeamReveal />
    </>
  )
}

export default page
