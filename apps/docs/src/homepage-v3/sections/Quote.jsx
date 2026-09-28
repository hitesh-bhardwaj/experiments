import LineReveal from '@/components/Animations/LineReveal'
import React from 'react'

export default function Quote() {
    return (
        <section className='w-full mt-[8vw] mb-[5vw] relative  max-md:relative max-md:z-500! max-[1025px]:mt-[25vw] py-[12vw]'>
            <LineReveal as='h2' start="20% 70%" markers={false} className='t96 relative capitalize mx-auto w-[80vw] text-center'>Most websites are not broken. They are <span className='gradient-text-animate  '>forgettable!</span></LineReveal>
        </section>
    )
}
