import React from 'react'
import LineReveal from '../Animations/LineReveal'

const Problem = () => {
    return (
        <section className='w-full h-fit px-[3vw] relative z-100 pt-[15%] pb-[5%]' id='problem'>
            <LineReveal as="h2" className='text110 w-full text-center'>
                Most Modern Websites Look Polished. Too Few Feel <span className='gradient-text-animate'> Memorable.</span>
            </LineReveal>
          
        </section>
    )
}

export default Problem