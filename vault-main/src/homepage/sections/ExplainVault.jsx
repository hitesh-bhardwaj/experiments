'use client'
import TextFillPixel from '../components/TextFillPixel'
import { useFadeUp } from '@/components/Animations/gsapAnimations'
import { useCssVar } from '@/lib/useCssVar'

const SOLUTION_TEXT = "Scroll systems, cursor effects, text reveals, page transitions, and WebGL scenes, refined on real client launches. Preview the moment you need, install it with one command, then tune it in your own repo. It’s not a black box. It’s not another UI kit. It’s real, inspectable code you own."

export default function ExplainVault() {
    useFadeUp()
    // Canvas colours come from the site's tokens; until read, TextFillPixel uses its own defaults
    const text = useCssVar('--foreground')
    const primary = useCssVar('--primary')
    const dim = useCssVar('--grey')

    return (
        <section id='explain-vault' className='section-x py-[7%]'>
          <div className='site-container'>

            <TextFillPixel
                as="h2"
                text={SOLUTION_TEXT}
                id="break-heading"
                textColor={text || undefined}
                primaryColor={primary || undefined}
                dimColor={dim || undefined}
                pixelSize={3}
                direction='up'
                stagger={40}
                bandFraction={0.65}
                settleBlend={0.45}
                className="type-h2"
                wrapperClassName="w-[80%] max-md:w-full"
                containerClassName="py-[calc(var(--cvw)*15)] font-avenir max-md:py-[12%]"
            />
          </div>
        </section>
    )
}
