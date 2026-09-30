'use client'
import { useEffect, useRef, useState } from 'react'
import LinkButton from '@/components/WebsiteComps/LinkButton'
import InstallationProcess from '../components/InstallationProcess'
import { openTutorialVideo } from '../components/TutorialVideoButton'
import TextFillPixelV3 from '../components/TextFillPixelV3'
import ScrambleTextV3 from '../components/ScrambleTextV3'
import { useFadeUp } from '@/components/Animations/gsapAnimations'

const SOLUTION_TEXT = "Scroll systems, cursor effects, text reveals, page transitions, and WebGL scenes, refined on real client launches. Preview the moment you need, install it with one command, then tune it in your own repo. It’s not a black box. It’s not another UI kit. It’s real, inspectable code you own."

const WORKFLOW_TEXT =
    'That’s the whole workflow. The files land in your project. You can change anything you want.'

export default function ExplainVault() {
    useFadeUp()

    const workflowRef = useRef(null)
    const [armed, setArmed] = useState(false)
    const [active, setActive] = useState(false)

    useEffect(() => {
        const line = workflowRef.current
        if (!line) return

        // Arming blanks the line, so it only happens once the reveal is close
        // enough to follow immediately - the copy stays readable otherwise.
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
        <section id='explain-vault' className='w-full h-fit'>

            {/* <TextFillAnimationV3
                as="p"
                text={SOLUTION_TEXT}
                textColor="#ffffff"
                primaryColor="#ff5f00"
                dimColor="#272727"
                id="break-heading"
                textSize="3.25vw"
                textWidth="90%"
                mobileTextSize="8vw"
                mobileTextWidth="90%"
                tabletTextSize="5vw"
                tabletTextWidth="88%"
                containerClassName="py-[15vw] font-neue-haas max-md:py-24"
            /> */}
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
                className="text64"
                wrapperClassName="w-[88%]"
                containerClassName="py-[15vw] font-neue-haas max-md:py-24"
            />
            {/* <div className='w-full  h-fit px-[3vw] max-[1025px]:px-[5vw]' id="code-block">
                <InstallationProcess />

                <div className='flex w-full justify-center max-md:justify-center mt-[2vw] max-md:mt-0'>
                    <div
                        ref={workflowRef}
                        className="text18 max-md:text-center text-light-grey font-geist-mono [--scramble-flash:var(--primary)] [--scramble-pre:var(--primary)] "
                    >
                        <ScrambleTextV3 text={WORKFLOW_TEXT} active={active} armed={armed} />
                        &nbsp;
                        <span className="fadeup inline-block">
                            <LinkButton underline={true} className='max-md:mt-[2vw]' href={"#"} onClick={openTutorialVideo} shimmer shimmerColor="var(--primary)" tilted={false} showArrow text={"See How it Works"} />
                        </span>
                    </div>
                </div>
            </div> */}
        </section>
    )
}
