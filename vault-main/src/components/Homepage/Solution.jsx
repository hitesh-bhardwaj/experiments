'use client'

import TextFillAnimationCustom from '@/components/WebsiteComps/TextFillAnimationCustom'
import CodeBlockWorkflow from './CodeBlockWorkFlow'
import LineReveal from '../Animations/LineReveal'
import LinkButton from '../WebsiteComps/LinkButton'

const SOLUTION_TEXT ='Scroll systems, cursor effects, text reveals, page transitions, and WebGL scenes, refined on real client launches. Preview the moment you need, install it with one command, then tune it in your own repo. It’s not a black box. It’s not another UI kit. It’s real, inspectable code you own.'

const Solution = () => {
    return (
        <section className='w-full h-fit px-[3vw] py-[10%]' id='solution'>
            <LineReveal as="h2" className="text110 w-full text-center">
                Vault is That Layer, Ready to <span className='gradient-text-animate'> Install. </span>
            </LineReveal>

            <TextFillAnimationCustom
                as="p"
                text={SOLUTION_TEXT}
                textColor="#ffffff"
                primaryColor="#ff5f00"
                dimColor="#272727"
                id="break-heading"
                textSize="3.25vw"
                textWidth="90%"
                mobileTextSize="7vw"
                mobileTextWidth="95%"
                tabletTextSize="5vw"
                tabletTextWidth="88%"
            />

            <div className='w-full h-fit px-[2vw]' id="code-block">
                <CodeBlockWorkflow />

                <div className='flex w-full justify-center max-lg:justify-center mt-[2vw] max-lg:mt-0'>
                    <div className="pl-[0.65vw] text24 max-md:leading-[1.4] max-lg:text-center leading-relaxed text-[#939393] max-lg:pl-0 max-lg:text-sm! ">
                        <span className="inline-block">That&apos;s the whole workflow. The files land in your project. You change anything you want.&nbsp;</span>
                        <LinkButton href={"#Workflow"} shimmer tilted={false} showArrow text={"See How it Works"} />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Solution
