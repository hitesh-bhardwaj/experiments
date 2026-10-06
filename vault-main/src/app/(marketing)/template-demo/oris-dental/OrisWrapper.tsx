import LenisSmoothScroll from './LenisSmoothScroll'
import React from 'react'

interface OrisWrapperProps {
  children: React.ReactNode
}

export default function OrisWrapper({ children }: OrisWrapperProps) {
  return (
    <main id='main' className='bg-white oris-dental-main'>
      <LenisSmoothScroll lerp={.1} />
      {children}
    </main>
  )
}
