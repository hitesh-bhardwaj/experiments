'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { vaultLinks } from '@/utils/Links'
import NavDropdown from './NavDropdown'

export default function NavLinks({
    activeItem,
    onNavEnter,
    onNavLeave,
    isHighlighted,
}) {
    const reduceMotion = useReducedMotion()

    return (
        <div
            className="relative ml-[calc(var(--hx-vw,1vw)*13.5)]"
            onMouseLeave={onNavLeave}
        >
            <div className="text20 relative flex gap-[calc(var(--hx-vw,1vw)*0.6)] bg-grey p-[calc(var(--hx-vw,1vw)*0.6)] py-[calc(var(--hx-vw,1vw)*0.4)] font-medium">
                {vaultLinks.map(({ label, href, dropdown }, index) => {
                    const highlighted = isHighlighted(index, dropdown)
                    const isExternal = href.startsWith('http')
                    const itemClassName = `relative z-10 p-[calc(var(--hx-vw,1vw)*0.4)] px-[calc(var(--hx-vw,1vw)*1.2)] text-[calc(var(--hx-vw,1vw)*1.15)] font-medium tracking-wide transition-colors duration-300 motion-reduce:transition-none ${
                        highlighted ? 'text-foreground' : 'text-white/70'
                    }`

                    const pill = (
                        <AnimatePresence>
                            {highlighted && (
                                <motion.span
                                    // Without layoutId the pill cross-fades in
                                    // place rather than sliding between items.
                                    layoutId={
                                        reduceMotion ? undefined : 'nav-pill'
                                    }
                                    className="absolute inset-0 -z-10 bg-primary"
                                    initial={{
                                        opacity: 0,
                                    }}
                                    animate={{
                                        opacity: 1,
                                    }}
                                    exit={{
                                        opacity: 0,
                                    }}
                                    transition={
                                        reduceMotion
                                            ? {
                                                  duration: 0.2,
                                                  ease: 'easeOut',
                                              }
                                            : {
                                                  stiffness: 0,
                                                  damping: 20,
                                              }
                                    }
                                />
                            )}
                        </AnimatePresence>
                    )

                    if (dropdown) {
                        return (
                            <button
                                key={label}
                                type="button"
                                onMouseEnter={() => onNavEnter(index, dropdown)}
                                className={itemClassName}
                            >
                                <span className="inline-flex items-center gap-[calc(var(--hx-vw,1vw)*0.3)]">
                                    {label}
                                    <ChevronDown
                                        className={`size-[calc(var(--hx-vw,1vw)*0.9)] transition-transform duration-300 motion-reduce:transition-none ${
                                            highlighted ? 'rotate-180' : ''
                                        }`}
                                    />
                                </span>
                                {pill}
                            </button>
                        )
                    }

                    return (
                        <Link
                            key={label}
                            href={href}
                            target={isExternal ? '_blank' : undefined}
                            rel={
                                isExternal ? 'noopener noreferrer' : undefined
                            }
                            onMouseEnter={() => onNavEnter(index, dropdown)}
                            className={itemClassName}
                        >
                            {label}
                            {pill}
                        </Link>
                    )
                })}
            </div>

            <NavDropdown panel={activeItem?.dropdown ?? null} />
        </div>
    )
}
