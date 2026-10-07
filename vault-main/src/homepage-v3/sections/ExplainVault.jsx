'use client'
import { useEffect, useRef, useState } from 'react'
import TextFillPixelV3 from '../components/TextFillPixelV3'
import { useFadeUp } from '@/components/Animations/gsapAnimations'

const SOLUTION_TEXT = "Scroll systems, cursor effects, text reveals, page transitions, and WebGL scenes, refined on real client launches. Preview the moment you need, install it with one command, then tune it in your own repo. It’s not a black box. It’s not another UI kit. It’s real, inspectable code you own."

export default function ExplainVault() {
    useFadeUp()

    const workflowRef = useRef(null)
    const [armed, setArmed] = useState(false)
    const [active, setActive] = useState(false)

    useEffect(() => {
        const line = workflowRef.current
        if (!line) return

        const armObserver = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting) return
                armObserver.disconnect()
                setArmed(true)
            },
            { rootMargin: '500px 0px' },
        )

        const revealObserver = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting) return
                revealObserver.disconnect()
                setActive(true)
            },
            { rootMargin: '0px 0px -15% 0px' },
        )

        armObserver.observe(line)
        revealObserver.observe(line)

        return () => {
            armObserver.disconnect()
            revealObserver.disconnect()
        }
    }, [])

    return (
        <section id='explain-vault' className='mx-auto h-fit w-full max-w-[1536px] px-[calc(var(--cvw)*4.5)] py-[7%] max-md:px-[calc(var(--cvw)*5)] max-sm:px-[calc(var(--cvw)*7)]'>

            <TextFillPixelV3
                as="h2"
                text={SOLUTION_TEXT}
                id="break-heading"
                textColor="#ffffff"
                primaryColor="#ff5f00"
                dimColor="#272727"
                pixelSize={3}
                direction='up'
                stagger={40}
                bandFraction={0.65}
                settleBlend={0.45}
                className="text-[calc(var(--cvw)*2.6)] max-md:text-[calc(var(--cvw)*6)]"
                wrapperClassName="w-[80%] max-md:w-full"
                containerClassName="py-[calc(var(--cvw)*15)] font-avenir max-md:py-24"
            />
        </section>
    )
}
