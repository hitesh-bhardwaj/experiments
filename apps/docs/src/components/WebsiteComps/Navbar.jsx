'use client'

import { useCallback, useRef, useState } from 'react'
import { useLenis } from 'lenis/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { HyperiuxLogo } from '@/utils/Icons'
import { vaultLinks } from '@/utils/Links'
import Button from './Button'
import NavLinks from './navbar/NavLinks'
import { useNavbarLoader } from './navbar/useNavbarLoader'
import { getPageScrollProgress } from './navbar/utils'
import { GlobalSearch } from '../layout/SearchBar'

export default function Navbar({ effects = [] }) {
    const navbarRef = useRef(null)
    const [activeItem, setActiveItem] = useState(null)

    const pathname = usePathname()

    const { hasRevealedRef, toggleNavbar } = useNavbarLoader(
        navbarRef,
        pathname,
        setActiveItem
    )

    const getUpgradeScrollOffset = useCallback(() => {
        if (pathname !== '/') return 0

        return getPageScrollProgress() < 0.85 ? -1000 : 0
    }, [pathname])

    const activeIndex = vaultLinks.findIndex((link) => {
        if (link.href === '/') return pathname === '/'
        return pathname.startsWith(link.href)
    })

    const [openTrigger, setOpenTrigger] = useState(0)
    const openSearch = useCallback(() => {
        setOpenTrigger((value) => value + 1)
    }, [])

    useLenis(({ scroll, velocity }) => {
        if (!hasRevealedRef.current) return

        if (scroll < 100) {
            toggleNavbar(false)
            return
        }

        if (velocity > 0.1) {
            toggleNavbar(true)
        } else if (velocity < -0.2) {
            toggleNavbar(false)
        }
    })

    const handleNavEnter = useCallback((index, dropdown) => {
        setActiveItem({
            index,
            dropdown: dropdown ?? null,
        })
    }, [])

    const handleNavLeave = useCallback(() => {
        setActiveItem(null)
    }, [])

    const isHighlighted = useCallback(
        (index, dropdown) => {
            if (activeItem?.dropdown && dropdown) {
                return activeItem.dropdown === dropdown
            }

            if (activeItem) {
                return activeItem.index === index
            }

            return activeIndex === index
        },
        [activeIndex, activeItem]
    )

    return (
        <>
            <nav
                id="navigation"
                ref={navbarRef}
                style={{
                    opacity: 0,
                    transform: 'translateY(-18px)',
                }}
                className="fixed top-(--announcement-offset) transition-[top] duration-300 ease-out left-0 z-999 flex w-full items-center justify-between overflow-visible px-[3.5vw] py-[2vw] max-[1025px]:hidden"
            >
            <Link prefetch={false} href="/" aria-label="Hyperiux Vault home">
                <HyperiuxLogo className="h-auto w-[13vw] text-primary" />
            </Link>

            <NavLinks
                activeItem={activeItem}
                onNavEnter={handleNavEnter}
                onNavLeave={handleNavLeave}
                isHighlighted={isHighlighted}
            />

            <div className="flex items-center justify-center gap-[1vw]">
                {/* Clerk-free by design: marketing routes render without
                    ClerkProvider, so this navbar always shows the anonymous
                    state. Plan-aware UI lives in the (app) group. */}
                <button
                    type="button"
                    onClick={openSearch}
                    className="group flex py-[.8vw] cursor-pointer items-center gap-10 rounded-full  bg-grey! px-3 text-xs text-white/70 backdrop-blur-md transition-colors duration-300 hover:bg-white/10 hover:border-[#ff5f00] hover:text-white max-[1025px]:hidden max-[1025px]:gap-3"
                    aria-label="Search effects"
                >
                    <div className="flex items-center gap-2">
                        <svg
                            className="h-4 w-4 shrink-0 text-current"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <span className="text-sm text-white/70 max-[1025px]:hidden">Search</span>
                    </div>

                    <kbd className="space-x-2 rounded bg-black/80 px-1 py-0.5 text-sm text-current opacity-50 max-[1025px]:hidden">
                        ⌘K
                    </kbd>
                </button>

                    <Button
                    id={"upgrade-to-pro-navbar"}
                    text="Upgrade to Pro"
                    href="/sign-up"
                    className="border-white/40! bg-[#0E0E0E]!"
                    scrollOffset={getUpgradeScrollOffset}
                />
            </div>
            </nav>

            <GlobalSearch effects={effects} externalOpen={openTrigger} />
        </>
    )
}
