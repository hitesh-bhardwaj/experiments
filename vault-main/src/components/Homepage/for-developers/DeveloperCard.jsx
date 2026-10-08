'use client'

import LinkButton from "@/components/WebsiteComps/LinkButton"

// import LinkButton from '@/components/link-button'

export default function DeveloperCard({ group, onCtaClick }) {
    return (
        <div className="dev-card relative flex flex-col items-start justify-between px-[2.5vw] py-[1.5vw] max-lg:px-[4vw] max-lg:py-[4vw] max-md:px-[6vw] max-md:py-[6vw] overflow-hidden border border-white/5 w-full backdrop-blur-md">
            <div className="card-overlay absolute inset-0 z-0 overflow-hidden! opacity-0">
                <div className="blob absolute size-full left-[-10%] top-[-10%] bg-white rounded-full blur-[3vw] max-md:blur-[10vw] max-md:h-[200%] "></div>
                <div className="blob absolute size-full right-[-10%] bottom-[-10%] bg-white rounded-full blur-[3vw] max-md:blur-[10vw] max-md:h-[200%] "></div>
                {/* <div className="blob absolute size-[80%] left-[10%] bottom-[-10%] bg-white rounded-full blur-[3vw] "></div>
                <div className="blob absolute size-[80%] right-[10%] top-[-10%] bg-white rounded-full blur-[3vw] "></div> */}

                {/* <div className='noise-layer absolute inset-0 opacity-[0.25] mix-blend-overlay pointer-events-none' style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div> */}

                {/* <div className='solid-fill absolute inset-0 opacity-0 pointer-events-none' style={{ background: 'radial-gradient(120% 100% at 50% 100%, rgba(255, 255, 255, 1) 0%, rgba(230, 230, 230, 1) 100%)' }}></div> */}
            </div>

            <div className="relative z-10 flex flex-col gap-[3vw] max-md:gap-[4vw] w-full">
                <p className="text34 font-heading card-title opacity-0 max-md:font-normal font-medium tracking-tight max-lg:text-[6vw] max-md:text-[4.6vw]! max-md:wrap-break-word">
                    {group.title}
                </p>
                <p className="text-[1.3vw] max-md:text-[4vw] max-lg:text-[2.2vw] card-text opacity-0 leading-[1.4]">
                    {group.text}
                </p>
            </div>
            <LinkButton
                href={group.link || '#'}
                onClick={onCtaClick}
                className="card-link z-10 text-sm opacity-0 font-medium max-lg:text-lg max-md:text-base max-md:font-normal text-black"
            >
                {group.cta}
            </LinkButton>
        </div>
    )
}
