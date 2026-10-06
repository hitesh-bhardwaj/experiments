"use client";

import LenisSmoothScroll from '@/components/SmoothScroll/LenisScroll'
import NavbarMobile from '@/components/WebsiteComps/NavbarMobile'
import Navbar from '@/components/WebsiteComps/Navbar'
import React from 'react'
import { useUser } from '@clerk/nextjs'
import NavbarV3 from '@/homepage-v3/components/NavbarV3'

// NavbarV3 carries its own sheet below `lg`, so the pre-v3 NavbarMobile is not
// mounted here any more - two mobile bars would stack on top of each other.
//
// VaultShell is only ever used from (app)-group pages (currently just
// /pricing), which have ClerkProvider available - same pattern as
// AppVaultHeader supplying VaultHeader with live auth state, so NavbarV3's
// Sign In button correctly hides (in favor of the profile dropdown) for a
// signed-in visitor instead of always defaulting to signed-out.
export default function VaultShell({ children, effects = [] }) {
    const { isSignedIn, user } = useUser();

    return (
        <>
            <NavbarV3 effects={effects} isSignedIn={isSignedIn} user={user} />
            {/* <Navbar/>
            <NavbarMobile/> */}
            <LenisSmoothScroll />
            {children}
        </>
    )
}
