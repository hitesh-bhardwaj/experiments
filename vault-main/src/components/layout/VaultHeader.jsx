"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GlobalSearch } from "./SearchBar";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Dynamic so ProfileDropDown's Clerk imports never load on marketing routes -
// it only renders when isSignedIn, which is always false there.
const ProfileDropdown = dynamic(() => import("./ProfileDropDown"), {
  ssr: false,
});
import Image from "next/image";
import { ChevronRight, User as UserIcon } from "lucide-react";
import { HyperiuxLogo } from "@/utils/Icons";
import { effectCategories, getEffectCategoryHref } from "@/lib/categories";
import { WISHLIST_CHANGED_EVENT } from "@/lib/wishlistEvents";
import { prefersReducedMotion } from "@/lib/motion";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import SoundToggle from "@/homepage-v3/components/SoundToggle";

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// Matches NavbarMobileV3's own overlay-reveal mechanism exactly - a
// clip-path wipe from the bottom up, rather than a translate/slide.
const CLOSED_CLIP = "inset(0% 0% 100% 0%)";
const OPEN_CLIP = "inset(0% 0% 0% 0%)";

const DOCS_TOP_LINKS = [
  { href: "/docs", label: "Introduction" },
  { href: "/docs/installation", label: "Installation" },
  { href: "/docs/cli", label: "CLI" },
  { href: "/docs/dependencies", label: "Dependencies" },
  { href: "/docs/license", label: "License" },
];

const MOBILE_SECONDARY_LINKS = [
   { href: "/pricing", label: "Pricing" },
  {
    href: "https://github.com/Hyperiux-Immersion-Labs/hyperiux-components",
    label: "Github",
    external: true,
  },
  {
    href: "https://www.npmjs.com/package/hyperiux",
    label: "NPM",
    external: true,
  },
  { href: "/docs/mcp", label: "MCP Doc" },
];

function categoryLabel(category) {
  return category.name.replace("Website ", "").replace("Page ", "");
}

// Copied from NavbarMobileV3's Accordion verbatim - animates to the
// measured height (then releases it to "auto" once open, so the panel can
// still reflow on orientation change/font swap) rather than a fixed guess.
function MobileNavAccordion({ open, children }) {
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);

  useIsoLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    gsap.killTweensOf(wrapper);

    const duration = prefersReducedMotion() ? 0 : open ? 0.4 : 0.3;

    gsap.to(wrapper, {
      height: open ? content.scrollHeight : 0,
      opacity: open ? 1 : 0,
      duration,
      ease: open ? "power3.out" : "power2.inOut",
      onComplete: () => {
        if (open) gsap.set(wrapper, { height: "auto" });
      },
    });

    return () => gsap.killTweensOf(wrapper);
  }, [open]);

  return (
    <div ref={wrapperRef} className="h-0 overflow-hidden opacity-0">
      <div ref={contentRef} className="pb-[6vw] max-[1025px]:pb-[3.5vw]">
        {children}
      </div>
    </div>
  );
}

// Clerk-free by design: auth state arrives via props (anonymous defaults) so
// marketing routes (docs/legal/tech) render this without ClerkProvider. App
// routes use AppVaultHeader, which supplies live useUser() state.
//
// Mobile/tablet (<=1025px) is built to match NavbarMobileV3's bar + overlay
// exactly (translucent blurred bar, custom two-span hamburger, full-screen
// clip-path reveal, GSAP-height accordions) - see MobileNavAccordion above
// and the effect below driving the overlay's own open/close timeline. The
// desktop header (>1025px) is untouched.
export function VaultHeader({
  effectName,
  showSearch = false,
  effects = [],
  isLoaded = true,
  isSignedIn = false,
  user = null,
  // Dashboard renders its own desktop nav (back button + tabs in
  // DashboardShell) - it only needs this component for the mobile/tablet
  // bar + hamburger overlay, so it opts out of the >1025px header bar here
  // rather than showing a second, redundant one.
  mobileOnly = false,
}) {
  const [openTrigger, setOpenTrigger] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [usage, setUsage] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(null);
  const overlayRef = useRef(null);
  const timelineRef = useRef(null);
  const openedRef = useRef(false);
  const desktopHeaderRef = useRef(null);
  const mobileBarRef = useRef(null);
  const lenis = useLenis();

  const pathname = usePathname();
  const [routeShown, setRouteShown] = useState(pathname);

  useEffect(() => {
    if (!isSignedIn) return;

    async function loadWishlistCount() {
      try {
        const res = await fetch("/api/wishlist");

        if (!res.ok) return;

        const data = await res.json();

        setWishlistCount(data.length);
      } catch (err) {
        console.error(err);
      }
    }

    loadWishlistCount();
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return;

    async function loadUsage() {
      try {
        const res = await fetch("/api/copy-usage");

        if (!res.ok) return;

        const data = await res.json();

        setUsage(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadUsage();
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return;

    const handleWishlistChanged = (e) => {
      setWishlistCount((count) =>
        e.detail?.saved ? count + 1 : Math.max(0, count - 1)
      );
    };

    window.addEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChanged);

    return () => {
      window.removeEventListener(WISHLIST_CHANGED_EVENT, handleWishlistChanged);
    };
  }, [isSignedIn]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.pageYOffset > 40);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Both fixed bars (desktop header, mobile/tablet bar) slide fully out of
  // view once the page's footer (FooterV3, id="footer") starts entering the
  // viewport, instead of staying pinned on top of it - reverses the moment
  // the user scrolls back up past that point. Pages that don't render a
  // #footer (e.g. /tech) just never trigger this, nothing to guard beyond
  // the null check.
  useEffect(() => {
    const footer = document.getElementById("footer");
    const targets = [desktopHeaderRef.current, mobileBarRef.current].filter(Boolean);

    if (!footer || !targets.length) return;

    const setVisibility = (isPastFooter) =>
      gsap.to(targets, {
        yPercent: isPastFooter ? -100 : 0,
        duration: 0.4,
        ease: "power2.out",
      });

    // onToggle (not onEnter/onLeaveBack) re-derives the header's visibility
    // from ScrollTrigger's own current isActive boolean every time it
    // changes, rather than reacting only to a live scroll crossing the
    // trigger edge. onEnter/onLeaveBack are one-shot direction-specific
    // events - if ScrollTrigger recalculates its cached trigger position
    // (see the refresh() below) and that recalculation alone flips isActive
    // without the user actually scrolling across the edge in that instant,
    // onEnter fires (hiding the header) with no matching onLeaveBack to ever
    // undo it, leaving it stuck hidden until a full reload. onToggle stays
    // correct regardless of *why* isActive changed.
    const trigger = ScrollTrigger.create({
      trigger: footer,
      start: "top bottom",
      onToggle: (self) => setVisibility(self.isActive),
    });

    // A backgrounded/occluded tab or window doesn't reliably get layout
    // updates - switching windows or opening another one can leave
    // ScrollTrigger's cached measurements stale by the time this tab is
    // visible again. Forcing a refresh on return recalculates them against
    // reality immediately, so onToggle above corrects any state that drifted
    // while hidden instead of leaving the header stuck.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") ScrollTrigger.refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);

    return () => {
      trigger.kill();
      gsap.killTweensOf(targets);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, []);

  // Opt-in scroll-away: a page can mark an element with data-vault-header-scroll-away
  // (the effects listing marks its sticky controls bar). Once that element's top
  // reaches 10% of the viewport, the desktop header slides up in step with the
  // scroll until it's fully out of view, and stays out while the element is stuck;
  // scrolling back above that point brings it back the same way. Uses the pixel `y`
  // so it adds to (and never fights) the footer hide above, which tweens yPercent.
  useEffect(() => {
    const marker = document.querySelector("[data-vault-header-scroll-away]");
    const header = desktopHeaderRef.current;
    if (!marker || !header) return;

    const tween = gsap.fromTo(
      header,
      { y: 0 },
      {
        y: () => -header.offsetHeight,
        ease: "none",
        scrollTrigger: {
          trigger: marker,
          start: "top 10%",
          end: () => `+=${header.offsetHeight}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(header, { y: 0 });
    };
  }, [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    setSection(null);
  }, []);

  // A tapped link navigates under the open overlay, so the route landing is
  // what dismisses it. Adjusted during render (not from an effect) so the
  // overlay never paints once over the page it just left - same technique
  // as NavbarMobileV3.
  if (pathname !== routeShown) {
    setRouteShown(pathname);
    setOpen(false);
    setSection(null);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop?.();

    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      lenis?.start?.();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, lenis, close]);

  useIsoLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const rows = overlay.querySelectorAll("[data-mobile-row]");
    const targets = [overlay, ...rows];

    timelineRef.current?.kill();
    gsap.killTweensOf(targets);

    const cleanup = () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      gsap.killTweensOf(targets);
    };

    // Nothing to play back on the first render - the overlay just needs to
    // start out of the way.
    if (!open && !openedRef.current) {
      gsap.set(overlay, { autoAlpha: 0, clipPath: CLOSED_CLIP });
      return cleanup;
    }

    const reduce = prefersReducedMotion();
    const timeline = gsap.timeline();
    timelineRef.current = timeline;

    if (open) {
      openedRef.current = true;

      gsap.set(overlay, { autoAlpha: 1 });

      if (reduce) {
        timeline
          .set(overlay, { clipPath: OPEN_CLIP })
          .fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2 })
          .set(rows, { opacity: 1, y: 0 });

        return cleanup;
      }

      timeline
        .fromTo(
          overlay,
          { clipPath: CLOSED_CLIP },
          { clipPath: OPEN_CLIP, duration: 0.5, ease: "power3.inOut" },
          0
        )
        .fromTo(
          rows,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power3.out",
            stagger: 0.05,
            clearProps: "opacity,transform",
          },
          0.18
        );

      return cleanup;
    }

    if (reduce) {
      timeline.to(overlay, { autoAlpha: 0, duration: 0.15 });

      return cleanup;
    }

    timeline
      .to(
        rows,
        {
          opacity: 0,
          y: 12,
          duration: 0.2,
          ease: "power2.in",
          stagger: { each: 0.02, from: "end" },
        },
        0
      )
      .to(
        overlay,
        { clipPath: CLOSED_CLIP, duration: 0.38, ease: "power3.inOut" },
        0.06
      )
      .set(overlay, { autoAlpha: 0 });

    return cleanup;
  }, [open]);

  const openSearch = () => {
    setOpenTrigger((value) => value + 1);
  };

  const handleSearch = useCallback(() => {
    close();
    setOpenTrigger((value) => value + 1);
  }, [close]);

  const toggleSection = (key) => {
    setSection((current) => (current === key ? null : key));
  };

  return (
    <>
      {/* Desktop header - untouched, >1025px only (or never, when mobileOnly). */}
      <header
        ref={desktopHeaderRef}
        className={`fixed left-0 right-0 top-(--announcement-offset) transition-[top] duration-300 ease-out z-50 px-[2vw] py-3.5 ${mobileOnly ? "hidden" : "max-[1025px]:hidden"} ${isScrolled ? "bg-black/20 backdrop-blur-sm" : ""
          }`}
      >
        <div className="flex h-full items-center justify-end gap-3">
          {/* items-stretch: search, sound and the buttons all share the buttons' height */}
          <div className="flex items-stretch gap-3">
            {showSearch && (
              <button
                type="button"
                onClick={openSearch}
                className="group flex cursor-pointer items-center gap-4 bg-[#161616] px-3 text-xs text-white backdrop-blur-md transition-colors duration-300 hover:bg-white/10 hover:border-[#ff5f00] hover:text-forground max-md:hidden max-md:gap-3"
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
                <kbd className="space-x-2 rounded bg-foreground/20 px-1.5 py-0.5 text-sm text-current max-[1025px]:hidden">
                  ⌘ K
                </kbd>
              </button>
            )}

            {/* fit: same height as the search button (both stretch to the row). */}
            <SoundToggle fit className="self-stretch bg-[#161616]! transition-colors duration-300 hover:bg-white/10!" />

            {isLoaded && user?.publicMetadata?.plan !== "pro" && (
              <div className="flex max-[1025px]:hidden">
                <ButtonV3
                  text="Upgrade to Pro"
                  id={"upgrade-to-pro-navbar"}
                  href="/pricing#pricing-cards"
                  onClick={markScrollToPricingCards}
                  className="border-white/50!"
                  variant="outline"
                />
              </div>
            )}

            {isLoaded && (!isSignedIn ? (
              <div className="flex max-[1025px]:hidden">
                <ButtonV3
                  text="Sign In"
                  id={"sign-in-navbar"}
                  href="/sign-in"
                  variant="outline2"
                />
              </div>
            ) : (
              <div className="flex max-[1025px]:hidden">
                <ProfileDropdown savedCount={wishlistCount} usage={usage} plan={user?.publicMetadata?.plan || "free"} />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile/tablet bar - <=1025px only, matches NavbarMobileV3. */}
      <div
        ref={mobileBarRef}
        className="fixed top-0 left-0 z-950 hidden max-[1025px]:flex w-full items-center justify-between border-b border-white/8 bg-background/60 px-[6vw] py-[5vw] backdrop-blur-xl max-[1025px]:px-[3.5vw] max-[1025px]:py-[2.5vw]"
      >
        <Link
          href="/"
          onClick={close}
          aria-label="Hyperiux Vault home"
          className="w-[36vw] max-[1025px]:w-[15vw]"
        >
          <HyperiuxLogo className="size-full text-primary" />
        </Link>

        <div className="flex items-center gap-[3vw] max-[1025px]:gap-[2vw]">
          {showSearch && (
            <button
              type="button"
              onClick={handleSearch}
              aria-label="Search effects"
              className="relative flex size-[10vw] shrink-0 items-center justify-center bg-[#161616] text-primary max-[1025px]:size-[5vw]"
            >
              <svg
                className="size-[4.5vw] shrink-0 max-[1025px]:size-[2.4vw]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            className="relative flex size-[10vw] shrink-0 items-center justify-center bg-[#161616] text-primary max-[1025px]:size-[5vw]"
          >
            <span
              aria-hidden="true"
              className={`absolute h-px w-[4.5vw] bg-current transition-transform duration-300 ease-out motion-reduce:transition-none max-[1025px]:w-[2.4vw] ${open ? "rotate-45" : "-translate-y-[1.2vw] max-[1025px]:translate-y-[-0.6vw]"
                }`}
            />
            <span
              aria-hidden="true"
              className={`absolute h-px w-[4.5vw] bg-current transition-transform duration-300 ease-out motion-reduce:transition-none max-[1025px]:w-[2.4vw] ${open ? "-rotate-45" : "translate-y-[1.2vw] max-[1025px]:translate-y-[0.6vw]"
                }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile/tablet overlay - full-screen clip-path reveal. */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-940 hidden bg-background max-[1025px]:block"
        style={{ visibility: "hidden", opacity: 0 }}
      >
        <div
          data-lenis-prevent
          className="mobile-nav-scroll absolute inset-0 overflow-y-auto px-[6vw] pt-[22vw] pb-[12vw] max-[1025px]:px-[3.5vw] max-[1025px]:pt-[11vw] max-[1025px]:pb-[7vw]"
        >
          {isSignedIn && user && (
            <Link
              data-mobile-row
              href="/dashboard"
              onClick={close}
              className="flex w-full my-[5vw] items-center justify-between gap-[3vw] border border-white/10 bg-[#121212] px-[4vw] py-[3.5vw] text-left text-white/90 max-[1025px]:my-[3vw] max-[1025px]:gap-[1.8vw] max-[1025px]:px-[2.3vw] max-[1025px]:py-[2vw]"
            >
              <div className="flex min-w-0 items-center gap-[3vw] max-[1025px]:gap-[1.8vw]">
                {user.hasImage ? (
                  <Image
                    src={user.imageUrl}
                    alt={user.fullName || "User"}
                    width={40}
                    height={40}
                    className="size-[9vw] shrink-0 rounded-full object-cover max-[1025px]:size-[4.6vw]"
                  />
                ) : (
                  <div className="flex size-[9vw] shrink-0 items-center justify-center rounded-full bg-[#1f1f1f] text-white/70 max-[1025px]:size-[4.6vw]">
                    <UserIcon className="size-[4.5vw] max-[1025px]:size-[2.2vw]" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate max-md:text-[4vw] text-white/90 max-[1025px]:text-[2.75vw]">
                    {user.fullName || user.username || "Account"}
                  </p>
                  <p className="truncate text-[3.2vw] text-white/50 max-[1025px]:text-[1.7vw]">
                    {user.primaryEmailAddress?.emailAddress || user.username}
                  </p>
                </div>
              </div>

              <ChevronRight className="size-[4.5vw] shrink-0 max-[1025px]:size-[2.6vw]" />
            </Link>
          )}

          <div className="mt-[2vw] max-[1025px]:mt-[1.2vw]">
            <Link
              data-mobile-row
              href="/effects"
              onClick={close}
              className="flex border-t border-white/10 py-[4.5vw] max-md:text-[4.75vw] max-[1025px]:text-[3.75vw] text-white/90 max-md:py-[4.5vw] max-[1025px]:py-[3vw] "
            >
              All Effects
            </Link>

            

            <div data-mobile-row className="border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleSection("categories")}
                aria-label={`${section === "categories" ? "Collapse" : "Expand"} Categories`}
                aria-expanded={section === "categories"}
                className="flex w-full items-center justify-between py-[4.5vw] text-left max-md:text-[4.75vw] max-[1025px]:text-[3.75vw] text-white/90 max-md:py-[4.5vw] max-[1025px]:py-[3vw] "
              >
                <span>Effect Categories</span>
                <div className="relative flex size-[8vw] shrink-0 items-center justify-center bg-[#161616] text-primary max-[1025px]:size-[4.6vw]">
                  <span aria-hidden="true" className="absolute h-px w-[3.5vw] bg-current max-[1025px]:w-[2vw]" />
                  <span
                    aria-hidden="true"
                    className={`absolute h-px w-[3.5vw] bg-current max-[1025px]:w-[2vw] transition-transform duration-300 ease-out motion-reduce:transition-none ${section === "categories" ? "rotate-180" : "rotate-90"
                      }`}
                  />
                </div>
              </button>

              <MobileNavAccordion open={section === "categories"}>
                <div className="flex flex-col">
                  {effectCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={getEffectCategoryHref(category.id)}
                      onClick={close}
                      className="flex items-center max-md:py-[1.5vw] max-md:text-[4vw] w-fit text-white/75 active:text-primary max-[1025px]:py-[1.5vw] max-[1025px]:text-[2.75vw]"
                    >
                      {categoryLabel(category)}
                    </Link>
                  ))}
                </div>
              </MobileNavAccordion>
            </div>
            <Link
              data-mobile-row
              href="/templates"
              onClick={close}
              className="flex border-t border-white/10 py-[4.5vw] max-md:text-[4.75vw] max-[1025px]:text-[3.75vw] text-white/90 max-md:py-[4.5vw] max-[1025px]:py-[3vw] "
            >
              Templates
            </Link>

            <div data-mobile-row className="border-t border-white/10">
              <button
                type="button"
                onClick={() => toggleSection("documentation")}
                aria-label={`${section === "documentation" ? "Collapse" : "Expand"} Documentation`}
                aria-expanded={section === "documentation"}
                className="flex w-full items-center justify-between py-[4.5vw] text-left max-md:text-[4.75vw] max-[1025px]:text-[3.75vw] text-white/90 max-md:py-[4.5vw] max-[1025px]:py-[3vw]"
              >
                <span>Documentation</span>
                <div className="relative flex size-[8vw] shrink-0 items-center justify-center bg-[#161616] text-primary max-[1025px]:size-[4.6vw]">
                  <span aria-hidden="true" className="absolute h-px w-[3.5vw] bg-current max-[1025px]:w-[2vw]" />
                  <span
                    aria-hidden="true"
                    className={`absolute h-px w-[3.5vw] bg-current max-[1025px]:w-[2vw] transition-transform duration-300 ease-out motion-reduce:transition-none ${section === "documentation" ? "rotate-180" : "rotate-90"
                      }`}
                  />
                </div>
              </button>

              <MobileNavAccordion open={section === "documentation"}>
                <div className="flex flex-col">
                  {DOCS_TOP_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={close}
                      className="flex items-center max-md:py-[1.5vw] max-md:text-[4vw] w-fit text-white/75 active:text-primary max-[1025px]:py-[1.5vw] max-[1025px]:text-[2.75vw]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </MobileNavAccordion>
            </div>

            {MOBILE_SECONDARY_LINKS.map((link) => (
              <Link
                key={link.href}
                data-mobile-row
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                onClick={close}
                className="flex border-t border-white/10 py-[4.5vw]  max-md:text-[4.75vw] text-white/90 max-md:py-[4.5vw] max-[1025px]:py-[3vw] max-[1025px]:text-[3.75vw]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {isLoaded && (
            <div data-mobile-row className="mt-[8vw] flex flex-col gap-[3vw] max-[1025px]:mt-[4.6vw] max-[1025px]:gap-[1.5vw]">
              {user?.publicMetadata?.plan !== "pro" && (
                <ButtonV3
                  text="Upgrade to Pro"
                  href="/pricing#pricing-cards"
                  onClick={() => {
                    close();
                    markScrollToPricingCards();
                  }}
                  variant="outline"
                  className="w-full border-white/50! max-[1025px]:py-[1.5vw] max-[1025px]:text-[2vw] max-[1025px]:[--btn-pad:2.4vw] max-[1025px]:[--btn-gap:1vw] max-[1025px]:[--btn-square:1.4vw] max-[1025px]:[--btn-arrow:2vw]"
                />
              )}

              {!isSignedIn && (
                <ButtonV3
                  text="Sign In"
                  href="/sign-in"
                  onClick={close}
                  className="w-fit max-md:w-full max-[1025px]:w-[22vw] max-[1025px]:py-[1.5vw] max-[1025px]:text-[2vw] max-[1025px]:[--btn-pad:2.4vw] max-[1025px]:[--btn-gap:1vw] max-[1025px]:[--btn-square:1.4vw] max-[1025px]:[--btn-arrow:2vw]"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <GlobalSearch effects={effects} externalOpen={openTrigger} />
    </>
  );
}
