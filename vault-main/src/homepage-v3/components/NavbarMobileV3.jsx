"use client";

import SoundToggle from "./SoundToggle";
import TutorialVideoButton from "./TutorialVideoButton";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import gsap from "gsap";

import { HyperiuxLogo } from "@/utils/Icons";
import { prefersReducedMotion } from "@/lib/motion";
import ButtonV3 from "./ButtonV3";
import NavMenuIconV3 from "./NavMenuIconV3";
import { NAV_MENUS_V3 } from "./nav-menu-v3";

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const CLOSED_CLIP = "inset(0% 0% 100% 0%)";
const OPEN_CLIP = "inset(0% 0% 0% 0%)";
const SHOW_HEADER_TUTORIAL = false;
const SHOW_HEADER_SEARCH = false;

// Same items, same order, as the desktop bar (NavbarV3.jsx): Effects,
// Templates, Docs, Pricing, Community, Github - "section" rows expand an accordion in
// place, "link" rows are plain links. One ordered list (rather than the old
// separate SECTIONS/LINKS arrays rendered one after the other) so Templates
// can sit between Effects and Docs instead of always trailing both menus.
const NAV_ROWS = [
  { type: "section", key: "categories", label: "Effects" },
  { type: "link", label: "Templates", href: "/templates" },
  { type: "section", key: "docs", label: "Docs" },
  { type: "link", label: "Pricing", href: "/pricing" },
  { type: "link", label: "Community", href: "/community" },
  { type: "link", label: "Github", href: "https://github.com/hyperiux" },
];

function Accordion({ open, children }) {
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  // `children` here is every icon + link for one nav section (mask-image
  // SVGs, fetched the moment they're in the DOM regardless of this
  // wrapper's collapsed height). Both SECTIONS render one of these
  // unconditionally on mount - so without this gate, every section's icons
  // load on first paint whether or not the sheet has even been opened.
  // Mounted lazily on first expand and left mounted after that so a
  // collapse still has real content to measure/animate down from.
  const [everOpened, setEverOpened] = useState(open);
  // Adjusted during render (React's own pattern for this - see NavDropdownV3's
  // identical `if (panel && panel !== visible) setVisible(panel)`), not from an
  // effect: the layout effect below reads `content.scrollHeight` synchronously
  // in the same commit `open` flips true, and that only measures real content
  // if `everOpened` is already true by then. A plain effect fires a commit too
  // late - the open animation would measure an empty div's zero height on the
  // very first expand.
  if (open && !everOpened) setEverOpened(true);

  useIsoLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    gsap.killTweensOf(wrapper);

    const duration = prefersReducedMotion() ? 0 : open ? 0.4 : 0.3;

    gsap.to(wrapper, {
      // Animating to the measured height and then releasing it keeps the panel
      // able to reflow (orientation change, font swap) once it is open.
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
      <div ref={contentRef} className="pb-[6vw] md:pb-[3.5vw]">
        {everOpened ? children : null}
      </div>
    </div>
  );
}

/**
 * The v3 bar below `lg`, where the desktop pill is hidden - phones and tablets
 * alike. The `md:` overrides below re-scale the phone-tuned `vw` ramp for the
 * 768–1024px band, where raw viewport units would render everything oversized.
 *
 * @param {boolean} visible - the desktop bar's scroll-reveal state, so both
 *   halves hide together on scroll.
 * @param {boolean} intro - whether the bar has been let in yet. Held back until
 *   the loader's mark lands on the logo, and then a fade in place rather than a
 *   slide: the mark is already sitting where the logo goes.
 * @param {() => void} onSearch - opens the single GlobalSearch instance the
 *   navbar owns; the sheet closes itself first so the modal isn't buried.
 * @param {boolean} isSignedIn - NavbarV3's own `isSignedIn || cachedSignedIn`
 *   (a Clerk-cookie cache check, not a live Clerk hook - see NavbarV3's own
 *   comment on why), so the sheet's bottom CTA matches the desktop bar's
 *   account-icon-vs-Sign-In swap instead of always showing Sign In.
 * @param {boolean} hideSignIn - drops the signed-out Sign In CTA (NavbarV3's prop).
 */
export default function NavbarMobileV3({
  visible = true,
  intro = true,
  onSearch,
  isSignedIn = false,
  hideSignIn = false,
}) {
  const overlayRef = useRef(null);
  const timelineRef = useRef(null);
  const openedRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(null);

  const pathname = usePathname();
  const [routeShown, setRouteShown] = useState(pathname);
  const lenis = useLenis();

  const close = useCallback(() => {
    setOpen(false);
    setSection(null);
  }, []);

  // A tapped link navigates under the open sheet, so the route landing is what
  // dismisses it. Adjusted during render rather than from an effect so the
  // sheet never paints once over the page it just left.
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

    // Nothing to play back on the first render - the sheet just needs to start
    // out of the way.
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

  const handleSearch = useCallback(() => {
    close();
    onSearch?.();
  }, [close, onSearch]);

  return (
    <>
      <div
        // Lets pages that sit under the fixed header measure it (vault-door auth)
        data-site-header
        // Translucent rather than solid: the hero's ASCII field keeps moving
        // under the bar, and the blur is what keeps the logo readable over it.
        className={`fixed top-0 left-0 z-1000 hidden max-[1025px]:flex w-full items-center justify-between border-b border-white/8 bg-background/30 px-[6vw] py-[5vw] backdrop-blur-xl transition-[transform,translate,opacity] duration-500 ease-out motion-reduce:transition-none md:px-[3.5vw] md:py-[2.5vw]  ${!intro
          ? "pointer-events-none translate-y-0 opacity-0"
          : visible || open
            ? "translate-y-0 opacity-100"
            : "translate-y-[-120%] opacity-100"
          }`}
        style={{ willChange: "transform" }}
      >
        <Link
          // `data-nav-logo` is what the loader measures to find where to dock.
          data-nav-logo
          prefetch={false}
          href="/"
          onClick={close}
          aria-label="Hyperiux Vault home"
          className="w-[36vw] md:w-[15vw]"
        >
          <HyperiuxLogo className="size-full text-primary" />
        </Link>

        <div className="flex items-center gap-[3vw] md:gap-[2vw]">
          {SHOW_HEADER_TUTORIAL && (
            <TutorialVideoButton
              className={`relative flex size-[10vw] shrink-0 items-center justify-center bg-grey/30 text-primary backdrop-blur-md transition-opacity duration-500 delay-200 ease-out motion-reduce:transition-none md:size-[5vw] ${intro ? "opacity-100" : "opacity-0"}`}
              iconClassName="size-[4.5vw] md:size-[2.4vw]"
            />
          )}
          <SoundToggle
            size={40}
            className={`bg-[#121212]/30 backdrop-blur-md transition-opacity duration-500 delay-200 ease-out motion-reduce:transition-none ${intro ? "opacity-100" : "opacity-0"}`}
          />
          {SHOW_HEADER_SEARCH && (
            <button
              type="button"
              onClick={handleSearch}
              aria-label="Search effects"
              // Trails the logo on the way in, same as the hamburger beside it.
              className={`relative flex size-[10vw] shrink-0 items-center justify-center bg-grey/30 text-primary backdrop-blur-md transition-opacity duration-500 delay-200 ease-out motion-reduce:transition-none md:size-[5vw] ${intro ? "opacity-100" : "opacity-0"}`}
            >
              <svg
                className="size-[4.5vw] shrink-0 md:size-[2.4vw]"
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
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            // Trails the logo on the way in, the way the desktop bar's links do.
            className={`relative flex size-[10vw] shrink-0 items-center justify-center bg-grey text-primary transition-opacity duration-500 delay-200 ease-out motion-reduce:transition-none md:size-[5vw] ${intro ? "opacity-100" : "opacity-0"}`}
          >
            <span
              aria-hidden="true"
              className={`absolute h-px w-[4.5vw] bg-current transition-transform duration-300 ease-out motion-reduce:transition-none md:w-[2.4vw] ${open ? "rotate-45" : "-translate-y-[1.2vw] md:translate-y-[-0.6vw]"
                }`}
            />
            <span
              aria-hidden="true"
              className={`absolute h-px w-[4.5vw] bg-current transition-transform duration-300 ease-out motion-reduce:transition-none md:w-[2.4vw] ${open ? "-rotate-45" : "translate-y-[1.2vw] md:translate-y-[0.6vw]"
                }`}
            />
          </button>
        </div>
      </div>

      <div
        ref={overlayRef}
        className="fixed inset-0 z-990 hidden bg-background max-[1025px]:block"
        style={{ visibility: "hidden", opacity: 0 }}
      >
        <div
          data-lenis-prevent
          className="mobile-nav-scroll absolute inset-0 overflow-y-auto px-[6vw] pt-[22vw] pb-[12vw] md:px-[3.5vw] md:pt-[11vw] md:pb-[7vw]"
        >
          <div className="mt-[2vw] md:mt-[1.2vw]">
            {NAV_ROWS.map((row) => {
              if (row.type === "link") {
                const external = row.href.startsWith("http");

                return (
                  <Link
                    key={row.label}
                    data-mobile-row
                    prefetch={false}
                    href={row.href}
                    onClick={close}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="flex border-t border-white/10 max-[1025px]:py-[3vw] max-md:text-[4.75vw] text-white/90 max-md:py-[4.5vw] max-[1025px]:text-[3.75vw]"
                  >
                    {row.label}
                  </Link>
                );
              }

              const { key, label } = row;
              const expanded = section === key;

              return (
                <div
                  key={key}
                  data-mobile-row
                  className="border-t border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setSection((current) => (current === key ? null : key))
                      }
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
                      aria-expanded={expanded}
                      className="flex w-full items-center justify-between py-[4.5vw] text-left  text-white/90 max-md:py-[4.5vw] max-[1025px]:py-[3vw] max-[1025px]:text-[3.75vw] max-md:text-[4.75vw]"
                    >
                      <span>{label}</span>
                      <div className="relative flex size-[8vw] shrink-0 items-center justify-center bg-grey text-primary md:size-[4.6vw]">
                        <span
                          aria-hidden="true"
                          className="absolute h-px w-[3.5vw] bg-current md:w-[2vw]"
                        />
                        <span
                          aria-hidden="true"
                          className={`absolute h-px w-[3.5vw] bg-current md:w-[2vw] transition-transform duration-300 ease-out motion-reduce:transition-none ${expanded ? "rotate-180" : "rotate-90"
                            }`}
                        />
                      </div>
                    </button>
                  </div>

                  <Accordion open={expanded}>
                    {NAV_MENUS_V3[key].columns.map((column) => (
                      <div key={column.title} className=" last:mb-0">
                        {/* <p className="font-mono text-[2.5vw] mb-[3vw] tracking-[0.18em] text-light-grey uppercase">
                          {column.title}
                        </p> */}

                        <div className="mt-[1.5vw] flex flex-col md:mt-[0.9vw]">
                          {column.items.map((item) => (
                            <Link
                              key={item.label}
                              prefetch={false}
                              href={item.href}
                              onClick={close}
                              className="flex items-center gap-[3vw] py-[2.6vw] text-[4vw] text-white/75 active:text-primary md:gap-[1.8vw] md:py-[1.5vw] md:text-[2.2vw]"
                            >
                              <NavMenuIconV3
                                src={item.icon}
                                className="size-[4.5vw] text-light-grey md:size-[2.6vw]"
                              />
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </Accordion>
                </div>
              );
            })}
          </div>

          {!(hideSignIn && !isSignedIn) && (
          <div data-mobile-row className="mt-[8vw] flex md:mt-[4.6vw]">
            {isSignedIn ? (
              <ButtonV3
                text="Go to Dashboard"
                href="/dashboard"
                className="w-full max-md:py-[1.5vw] max-[1025px]:py-[3vw] max-md:text-[4vw] max-[1025px]:text-[3vw] md:[--btn-pad:2.4vw] md:[--btn-gap:1vw] md:[--btn-square:1.4vw] md:[--btn-arrow:2vw]"
              />
            ) : (
              <ButtonV3
                text="Sign In"
                // The button's own ramp jumps to desktop sizing above `md`; inside
                // the tablet sheet it needs to stay touch-sized.
                href="/sign-in"
                className="w-full md:py-[1.5vw] md:text-[2vw] md:[--btn-pad:2.4vw] md:[--btn-gap:1vw] md:[--btn-square:1.4vw] md:[--btn-arrow:2vw]"
              />
            )}
          </div>
          )}
        </div>
      </div>
    </>
  );
}
