"use client";

import LenisSmoothScroll from '@/components/SmoothScroll/LenisScroll'
import { useUser } from '@clerk/nextjs'
import Navbar from '@/homepage/components/Navbar'

export default function VaultShell({ children, effects = [] }) {
    const { isSignedIn, user } = useUser();

    return (
        <>
            <Navbar effects={effects} isSignedIn={isSignedIn} user={user} />
            <LenisSmoothScroll />
            {children}
        </>
    )
}
