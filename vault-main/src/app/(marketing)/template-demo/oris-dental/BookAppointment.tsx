'use client'

import React from 'react'
import Image from 'next/image'
import ContactForm from './effects/contact-form/ContactForm'
import SplitTextLines from './effects/split-text-lines/SplitTextLines'
import FormBg from './assets/animated-form-bg.webp'

export default function BookAppointment() {
    return (
        <section id="oris-form" className="w-full bg-white pt-[6vw] max-lg:pt-12">
            <div className="relative w-full rounded-t-[2.2vw] max-lg:rounded-t-3xl overflow-hidden min-h-[80vh] max-lg:min-h-0 flex items-start justify-between oris-paddx py-[5.6vw] max-lg:p-8 max-md:p-6 max-lg:py-20! max-lg:flex-col max-lg:gap-10">
                {/* Background Image */}
                <Image
                    src={FormBg}
                    alt="Dental clinic background"
                    fill
                    sizes="100vw"
                    className="object-cover pointer-events-none z-0"
                    priority
                />

                {/* Left Content */}
                <div className="z-10 text-white flex pt-[1vw] max-lg:pt-0 flex-col justify-center max-lg:max-w-full">
                    <SplitTextLines as="h2" className="max-lg:text-[6vw] max-md:text-[7.5vw] text-[4.2vw] max-w-[34vw] max-lg:max-w-full">
                        The first step to the smile you deserve
                    </SplitTextLines>
                    <SplitTextLines as="p" className="oris-text22 max-w-[36vw] max-lg:max-w-xl mt-[2vw] max-lg:mt-4" delay={0.2}>
                        Leave a request and our care coordinator will call you back
                        within 15 minutes. Your first consultation with a 3D scan is
                        free.
                    </SplitTextLines>
                </div>

                {/* Right Floating Form Card */}
                <div className="z-10 bg-white rounded-[1.8vw] max-lg:rounded-xl p-[2vw] py-[4vw] max-lg:p-6 max-lg:py-[7vw] w-[45vw] max-lg:w-full">
                    <h3 className="text-[1.8vw] font-medium! max-lg:text-[4.5vw] max-md:text-[7vw] text-[#1A1A1A] mb-[2.5vw] max-lg:mb-4">
                        Get in touch
                    </h3>
                    <ContactForm />
                </div>
            </div>
        </section>
    )
}
