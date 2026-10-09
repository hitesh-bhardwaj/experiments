"use client";
import SoundToggle from "./SoundToggle";
import TutorialVideoButton, { TutorialVideoHost } from "./TutorialVideoButton";
import { HyperiuxLogo } from "@/utils/Icons";
import React, { useRef, useState, useCallback, useEffect } from "react";
import Button from "./Button";
import HoverLink from "./HoverLink";
import { PlusIcon, User } from "lucide-react";
import { useLenis } from "lenis/react";
import { GlobalSearch } from "@/components/layout/SearchBar";
import { hasCachedClerkSession } from "@/lib/clerkSessionCache";
import { useLoaderComplete, useLoaderHandoff } from "./loader-state";
import NavDropdown from "./NavDropdown";
import NavbarMobile from "./NavbarMobile";
import Link from "next/link";

// Fallback only. The loader normally lands its mark on the logo and says so,
// and the bar comes in on that beat - this is what covers an exit that never
// gets there (the burst, or the loader bailing out early).
const INTRO_DELAY_MS = 2400;
const SHOW_HEADER_TUTORIAL = false;
const SHOW_HEADER_SEARCH = false;

// isSignedIn defaults to signed-out (not Clerk-aware by itself) since this
// component is also rendered on marketing routes with no ClerkProvider in
// the tree (see Homepage.jsx). Deliberately not wired to the rich
// Clerk-based ProfileDropdown anywhere (including pages that do have a
// ClerkProvider, like the pricing page via VaultShell) - every page just
// gets the same plain avatar icon linking to /dashboard when signed in, so
// this bar never depends on Clerk being loaded.
export default function Navbar({
  effects = [],
  introOnLoader = false,
  isSignedIn = false,
  // Drops the signed-out "Sign In" CTA (desktop bar + mobile sheet), e.g. on /sign-in itself
  hideSignIn = false,
}) {
  const navRef = useRef(null);
  // isSignedIn defaults to false here (no ClerkProvider on marketing
  // routes - see the component comment above), so a browser that's
  // actually signed in would otherwise see a "Sign In" prompt every time
  // it lands back on the homepage/pricing/etc. This is a client-only cache
  // check (Clerk's __client_uat cookie) that swaps the prompt for the same
  // generic account icon pointing at /dashboard.
  const [cachedSignedIn, setCachedSignedIn] = useState(false);
  const [reveal, setReveal] = useState(true);
  const [introTimedOut, setIntroTimedOut] = useState(!introOnLoader);
  const [openTrigger, setOpenTrigger] = useState(0);
  const [openPanel, setOpenPanel] = useState(null);
  // Touch (and pen) on a desktop-width bar still fires hover then click in one
  // tap: pointerenter opens, the click toggle closes, then a compatibility
  // mouseleave closes again. Hover is mouse-only; a tap toggles and stays.
  const pointerTypeRef = useRef("mouse");
  const openSearch = useCallback(() => {
    setOpenTrigger((value) => value + 1);
  }, []);
  const closePanel = useCallback(() => setOpenPanel(null), []);
  const markPointer = useCallback((event) => {
    pointerTypeRef.current = event.pointerType || "mouse";
  }, []);
  const openOnHover = useCallback((key) => (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    pointerTypeRef.current = "mouse";
    setOpenPanel(key);
  }, []);
  const closeOnHover = useCallback(() => {
    if (pointerTypeRef.current !== "mouse") return;
    setOpenPanel(null);
  }, []);
  const openOnFocus = useCallback((key) => (event) => {
    // A tap focuses the link; opening here races the click and shuts the panel.
    if (!event.target.matches(":focus-visible")) return;
    pointerTypeRef.current = "mouse";
    setOpenPanel(key);
  }, []);
  const togglePanel = useCallback((event, key) => {
    event.preventDefault();
    setOpenPanel((current) => (current === key ? null : key));
  }, []);
  const loaderComplete = useLoaderComplete();
  const loaderHandoff = useLoaderHandoff();
  // The handoff is the real cue: the loader's mark has come to rest on the logo
  // and the bar fades up around it, in place. It must not slide in on this -
  // the logo is already where it belongs and moving it would undo the merge.
  const introReady = introTimedOut || loaderHandoff;

  useEffect(() => {
    if (introTimedOut || !loaderComplete) return;

    const timer = window.setTimeout(() => setIntroTimedOut(true), INTRO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [introTimedOut, loaderComplete]);

  // Runs once on mount, client-only - reads the cookie as soon as this
  // component hydrates rather than waiting on any network round-trip.
  // Skipped entirely once a real ClerkProvider is already reporting
  // isSignedIn, since the live value is always more current than the cache.
  useEffect(() => {
    if (isSignedIn) return;
    // Reads document.cookie, a real external system, not derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCachedSignedIn(hasCachedClerkSession());
  }, [isSignedIn]);

  useEffect(() => {
    if (!openPanel) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenPanel(null);
    };

    const onPointerDownOutside = (event) => {
      if (navRef.current?.contains(event.target)) return;
      setOpenPanel(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDownOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDownOutside);
    };
  }, [openPanel]);

  useLenis(({ scroll, velocity }) => {
    if (scroll < 100) {
      setReveal(true);
      return;
    }
    if (velocity > 0.1) {
      setReveal(false);
      setOpenPanel(null);
    } else if (velocity < -0.2) {
      setReveal(true);
    }
  });

  return (
    <>
      <nav
        ref={navRef}
        // Lets pages that sit under the fixed header measure it (vault-door auth)
        data-site-header
        // The intro is a fade in place - the loader's mark lands on the logo
        // where it already sits, so the bar can only appear around it. Sliding
        // is reserved for the scroll reveal, once the bar is its own again.
        // `translate` is listed alongside `transform`: the translate-y utilities
        // set the `translate` property, so leaving it out snaps the slide and
        // only the opacity reads.
        className={`py-[2vw] flex max-lg:hidden items-center justify-between w-full fixed z-900 top-0 left-0 px-[3vw] transition-[transform,translate,opacity] duration-500 ease-out motion-reduce:transition-none ${!introReady
          ? "translate-y-0 opacity-0 pointer-events-none"
          : reveal
            ? "translate-y-0 opacity-100"
            : "translate-y-[-120%] opacity-100"
          }`}
        style={{ willChange: "transform" }}
        onPointerDownCapture={markPointer}
        onMouseLeave={closeOnHover}
      >
        {/* `data-nav-logo` is what the loader measures to find where to dock. */}
        <Link
          href="/"
          data-nav-logo
          aria-label="Hyperiux Vault home"
          className="w-[10vw]  h-auto "
        >
          <HyperiuxLogo className="text-primary size-full " />
        </Link>

        {/* Everything that isn't the logo trails it, so the mark reads as
            having been there first and the bar as assembling around it. */}
        <div
          className={`flex bg-[#121212]/60 text20 px-[1.5vw] py-[1vw] absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 items-center gap-[2.5vw] backdrop-blur-md transition-opacity duration-500 delay-200 ease-out motion-reduce:transition-none ${introReady ? "opacity-100" : "opacity-0"}`}
        >
          <div
            className="flex"
            onPointerEnter={openOnHover("categories")}
            onFocusCapture={openOnFocus("categories")}
          >
            <HoverLink
              href="/effects"
              text="Effects"
              className="group"
              onClick={(event) => togglePanel(event, "categories")}
            >
              <div className="size-[1.65vw] flex items-center justify-center bg-grey p-1 text-primary">
                <div
                  className={`group-hover:rotate-180 transition-all duration-300 ${openPanel === "categories" ? "rotate-180" : ""}`}
                >
                  <PlusIcon className="size-full" />
                </div>
              </div>
            </HoverLink>
          </div>
          <div
            className="flex"
            onPointerEnter={closeOnHover}
            onFocusCapture={closeOnHover}
          >
            <HoverLink href="/templates" text="Templates" />
          </div>
          <div
            className="flex"
            onPointerEnter={openOnHover("docs")}
            onFocusCapture={openOnFocus("docs")}
          >
            <HoverLink
              href="/docs"
              text="Docs"
              className="group"
              onClick={(event) => togglePanel(event, "docs")}
            >
              <div className="size-[1.65vw] flex items-center justify-center bg-grey p-1 text-primary">
                <div
                  className={`group-hover:rotate-180 size-full transition-all duration-300 ${openPanel === "docs" ? "rotate-180" : ""}`}
                >
                  <PlusIcon className="size-full" />
                </div>
              </div>
            </HoverLink>
          </div>
          <div
            className="flex"
            onPointerEnter={closeOnHover}
            onFocusCapture={closeOnHover}
          >
            <HoverLink href="/pricing" text="Pricing" />
          </div>
          {/* <div
            className="flex"
            onPointerEnter={closeOnHover}
            onFocusCapture={closeOnHover}
          >
            <HoverLink href="/community" text="Community" />
          </div> */}
          {/* <div
            className="flex"
            onPointerEnter={closeOnHover}
            onFocusCapture={closeOnHover}
          >
            <HoverLink href="/blog" text="Blog" />
          </div> */}
          {/* <div
            className="flex"
            onPointerEnter={closeOnHover}
            onFocusCapture={closeOnHover}
          >
            <HoverLink
              href="https://github.com/hyperiux"
              target_blank
              text="Github"
            />
          </div> */}
        </div>
        <div
          className={`flex items-center gap-2 transition-opacity duration-500 delay-200 ease-out motion-reduce:transition-none ${introReady ? "opacity-100" : "opacity-0"}`}
        >
          {SHOW_HEADER_TUTORIAL && (
            <TutorialVideoButton className="self-stretch bg-[#121212]/60 px-3.5 backdrop-blur-md hover:bg-white/10 max-md:hidden" />
          )}
          <SoundToggle className="self-stretch bg-[#121212]/60! backdrop-blur-md transition-colors duration-300 max-md:hidden" />
          {SHOW_HEADER_SEARCH && (
            <button
              type="button"
              onClick={openSearch}
              className="group flex cursor-pointer items-center gap-4 bg-[#121212]/60 px-3 py-[.86vw] text-xs text-foreground backdrop-blur-md transition-colors duration-300 hover:bg-white/10 hover:text-forground max-md:hidden max-md:gap-3"
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
              </div>

              <kbd className="font-avenir space-x-2 bg-foreground/20 px-1.5 py-0.5 text-sm text-current max-md:hidden">
                ⌘ K
              </kbd>
            </button>
          )}
          {isSignedIn || cachedSignedIn ? (
            <Link
              href="/dashboard"
              aria-label="Account"
              className="group flex size-12 items-center justify-center rounded-full border border-primary bg-[#161616] text-white/80 transition-colors hover:bg-[#1f1f1f] hover:text-foreground"
            >
              <User className="size-4" />
            </Link>
          ) : (
            !hideSignIn && <Button href="/sign-in" text="Sign In" />
          )}
        </div>

        <NavDropdown panel={openPanel} onNavigate={closePanel} />
      </nav>

      <NavbarMobile
        visible={reveal}
        intro={introReady}
        onSearch={openSearch}
        isSignedIn={isSignedIn || cachedSignedIn}
        hideSignIn={hideSignIn}
      />

      <GlobalSearch effects={effects} externalOpen={openTrigger} />
      <TutorialVideoHost />
    </>
  );
}
