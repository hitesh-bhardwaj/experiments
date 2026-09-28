import Image from 'next/image'
import React from 'react'
import SlotCounter from './effects/slot-counter/SlotCounter'
import SplitTextLines from './effects/split-text-lines/SplitTextLines'
import WhyUsBg from './assets/oris-whyus.webp'

const WHY_STATS = [
    {
        number: '15+',
        label: 'Years of Experience',
    },
    {
        number: '30+',
        label: 'Dental Treatments',
    },
    {
        number: '8',
        label: 'Skilled Dentists',
    },
    {
        number: '98%',
        label: 'Patient Satisfaction',
    },
]

export default function WhyOris() {
    return (
        <section id="why-oris" className="min-h-screen max-[1025px]:min-h-0! oris-paddx py-[6vw]  max-[1025px]:py-12 max-[1025px]:pb-18! max-md:py-8 mt-[-6vw] max-[1025px]:mt-0  w-full">
            <div className="h-full min-h-[85vh] max-[1025px]:min-h-0!  rounded-[1.8vw] max-[1025px]:rounded-2xl max-md:rounded-xl overflow-hidden mx-auto w-[90%] max-[1025px]:w-full relative ">
                <Image
                    alt="why-oris"
                    fill
                    src={WhyUsBg}
                    className="h-full w-full absolute inset-0 object-cover"
                />

                {/* Subtle dark gradient overlay for optimal contrast */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/30 pointer-events-none" />

                <div className="relative p-[4vw] max-[1025px]:p-8 max-md:p-6 text-white h-full min-h-[85vh] max-[1025px]:min-h-0 max-md:min-h-0 w-full flex flex-col items-start justify-between max-[1025px]:gap-12">
                    <div className="space-y-[1vw] max-[1025px]:space-y-2 max-w-[40vw] max-[1025px]:max-w-[70vw] max-md:max-w-full">
                        <SplitTextLines as="h2" className="oris-text64 text-white leading-tight">
                            Why Choose Us
                        </SplitTextLines>
                        <SplitTextLines as="p" className="oris-text22 text-white/90" delay={0.15}>
                            Built where patient comfort meets expertise.
                        </SplitTextLines>
                    </div>

                    {/* 4 Counter Columns with Divider Lines */}
                    <div className="grid grid-cols-4 gap-[4vw] max-[1025px]:grid-cols-2 max-[1025px]:gap-6 max-md:grid-cols-2 max-md:gap-5 w-full pt-[4vw] max-[1025px]:pt-0">
                        {WHY_STATS.map((stat, idx) => (
                            <div key={idx} className="flex flex-col">
                                <SlotCounter
                                    value={stat.number}
                                    className="oris-text64 font-normal text-white leading-none tracking-tight"
                                    baseDelay={idx * 0.12}
                                    duration={1.6}
                                />
                                <div className="w-full h-[1px] bg-white/40 my-[1vw] max-[1025px]:my-2 max-md:my-2" />
                                <SplitTextLines
                                    as="p"
                                    className="text-white/85 text-[1.1vw] max-[1025px]:text-sm max-md:text-xs font-normal leading-snug"
                                    delay={idx * 0.06}
                                >
                                    {stat.label}
                                </SplitTextLines>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
