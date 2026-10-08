"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useLenis } from "lenis/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import gsap from "gsap";


import { HyperiuxLogo } from "@/utils/Icons";

import { navCategoryColumns, navDocsItems, vaultLinks } from "@/utils/Links";
import { HamburgerIcon } from "./Icons";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const NAVBAR_INTRO_DELAY = 0.15;

const categoryLinks = navCategoryColumns.flat();

const navLegalItems = [
  { href: "/legal/license-agreement", label: "License Agreement" },
  { href: "/legal/privacy-policy", label: "Privacy Policy" },
  { href: "/legal/refund-policy", label: "Refund Policy" },
  { href: "/legal/terms-of-service", label: "Terms of Service" },
];

const DROPDOWN_DATA = {
  categories: categoryLinks,
  docs: navDocsItems,
  legal: navLegalItems,
};

function cleanPath(path = "") {
  if (!path || path === "#") return "#";

  const withoutHash = path.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];

  if (withoutQuery.length > 1) {
    return withoutQuery.replace(/\/$/, "");
  }

  return withoutQuery || "/";
}

function isExternalHref(href = "") {
  return href.startsWith("http");
}

function isEffectsCategoryRoute(pathname) {
  const path = cleanPath(pathname);

  return path.startsWith("/effects/");
}

function isDocsRoute(pathname) {
  const path = cleanPath(pathname);

  return (path === "/docs" || path.startsWith("/docs/")) && !isLegalRoute(path);
}

function isLegalRoute(pathname) {
  return navLegalItems.some((item) => isLegalItemActive(pathname, item.href));
}

function isCategoryItemActive(pathname, href) {
  if (!href || href === "#" || isExternalHref(href)) return false;

  const path = cleanPath(pathname);
  const itemPath = cleanPath(href);

  if (!itemPath.startsWith("/effects/")) return false;

  return path === itemPath || path.startsWith(`${itemPath}/`);
}

function isDocsItemActive(pathname, href) {
  if (!href || href === "#" || isExternalHref(href)) return false;

  const path = cleanPath(pathname);
  const itemPath = cleanPath(href);

  if (itemPath === "/docs") {
    return path === "/docs";
  }

  return path === itemPath || path.startsWith(`${itemPath}/`);
}

function isLegalItemActive(pathname, href) {
  if (!href || href === "#" || isExternalHref(href)) return false;

  const path = cleanPath(pathname);
  const itemPath = cleanPath(href);

  return path === itemPath || path.startsWith(`${itemPath}/`);
}

function isPlainLinkActive(pathname, href) {
  if (!href || href === "#" || isExternalHref(href)) return false;

  const path = cleanPath(pathname);
  const itemPath = cleanPath(href);

  if (itemPath === "/") {
    return path === "/";
  }

  if (itemPath === "/effects") {
    return path === "/effects";
  }

  if (itemPath === "/docs") {
    return path === "/docs";
  }

  return path === itemPath || path.startsWith(`${itemPath}/`);
}

function isTopNavItemActive(pathname, item) {
  const path = cleanPath(pathname);

  if (item.dropdown === "categories") {
    return isEffectsCategoryRoute(path);
  }

  if (item.dropdown === "docs") {
    return isDocsRoute(path);
  }

  if (item.dropdown === "legal") {
    return isLegalRoute(path);
  }

  if (item.href === "/effects") {
    return path === "/effects";
  }

  return isPlainLinkActive(path, item.href);
}

function MobileDropdownItem({
  label,
  href,
  icon,
  dropdownType,
  onNavigate,
}) {
  const pathname = usePathname();

  const isActive =
    dropdownType === "categories"
      ? isCategoryItemActive(pathname, href)
      : dropdownType === "docs"
        ? isDocsItemActive(pathname, href)
        : dropdownType === "legal"
          ? isLegalItemActive(pathname, href)
          : isPlainLinkActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      prefetch={false}
      className={`flex items-center gap-3 px-3 py-3 transition-colors duration-200 ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon && (
        <span className="flex max-md:size-5 max-lg:size-[4vw] shrink-0 items-center justify-center">
          <Image
            src={icon}
            alt="icon"
            width={28}
            height={28}
            className="size-full object-contain"
          />
        </span>
      )}

      <span className="max-md:text-[4vw] max-lg:text-[3vw] font-medium">
        {label}
      </span>
    </Link>
  );
}

function MobileDropdown({
  label,
  items,
  dropdownType,
  isOpen,
  isActive,
  onToggle,
  onNavigate,
}) {
  const contentRef = useRef(null);
  const wrapperRef = useRef(null);

  useIsomorphicLayoutEffect(() => {
    if (!contentRef.current || !wrapperRef.current) return;

    gsap.killTweensOf(wrapperRef.current);

    if (isOpen) {
      const height = contentRef.current.scrollHeight;

      gsap.to(wrapperRef.current, {
        height,
        opacity: 1,
        duration: 0.35,
        ease: "power2.out",
      });
    } else {
      gsap.to(wrapperRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.25,
        ease: "power2.inOut",
      });
    }
  }, [isOpen]);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span
          className={`max-md:text-[5vw] max-lg:text-[4vw] font-medium transition-colors duration-200 ${
            isActive ? "text-primary" : "text-white/90"
          }`}
        >
          {label}
        </span>

        <ChevronDown
          className={`size-5 transition-transform duration-300 max-lg:size-[4vw] ${
            isOpen || isActive ? "text-primary" : "text-white/50"
          } ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div ref={wrapperRef} className="h-0 overflow-hidden opacity-0">
        <div ref={contentRef} className="flex   flex-col gap-1 pb-4">
          {items.map((item) => (
            <MobileDropdownItem
              key={`${dropdownType}-${item.label}`}
              {...item}
              dropdownType={dropdownType}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NavbarMobile() {
  const navbarRef = useRef(null);
  const menuRef = useRef(null);
  const linksRef = useRef(null);
  const previousBodyOverflow = useRef("");

  const hidden = useRef(false);
  const introPlayed = useRef(false);
  const introTween = useRef(null);

  const pathname = usePathname();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const lenis = useLenis(({ scroll, velocity }) => {
    if (isMenuOpen) return;

    if (scroll < 80) {
      toggleNavbar(false);
      return;
    }

    if (velocity > 0.1) {
      toggleNavbar(true);
    } else if (velocity < -0.15) {
      toggleNavbar(false);
    }
  });

  const forceStartLenis = useCallback(() => {
    if (typeof document !== "undefined") {
      document.body.style.removeProperty("overflow");
    }

    lenis?.start?.();

    requestAnimationFrame(() => {
      lenis?.start?.();
    });

    window.setTimeout(() => {
      lenis?.start?.();
    }, 80);
  }, [lenis]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setOpenDropdown(null);
  }, []);

  const handleNavigate = useCallback(() => {
    forceStartLenis();
    closeMenu();
  }, [forceStartLenis, closeMenu]);

  const toggleDropdown = (id) => {
    setOpenDropdown((current) => (current === id ? null : id));
  };

  function playNavbarIntro() {
    const navbar = navbarRef.current;

    if (!navbar) return;
    if (introPlayed.current) return;

    introPlayed.current = true;
    hidden.current = false;

    introTween.current?.kill();
    gsap.killTweensOf(navbar);

    introTween.current = gsap.delayedCall(NAVBAR_INTRO_DELAY, () => {
      gsap.fromTo(
        navbar,
        {
          autoAlpha: 0,
          y: -18,
          yPercent: 0,
        },
        {
          autoAlpha: 1,
          y: 0,
          yPercent: 0,
          duration: 0.75,
          ease: "power3.out",
        }
      );
    });
  }

  function toggleNavbar(hide) {
    if (!navbarRef.current) return;
    if (!introPlayed.current) return;
    if (hidden.current === hide) return;

    hidden.current = hide;

    gsap.killTweensOf(navbarRef.current);

    gsap.to(navbarRef.current, {
      yPercent: hide ? -100 : 0,
      duration: 0.4,
      ease: "power2.out",
    });
  }

  useIsomorphicLayoutEffect(() => {
    const navbar = navbarRef.current;

    if (!navbar) return;

    gsap.set(navbar, {
      autoAlpha: 0,
      y: -18,
      yPercent: 0,
    });
  }, []);

  useEffect(() => {
    let poll;
    let fallbackTimeout;

    const tryPlayIntro = () => {
      // Loader2 keeps #loader in the DOM until the orange wipe finishes, so
      // isLoaderActive() alone can stay true too long. Also accept the
      // completion flags / session mark that Loader2 writes.
      // if (hasLoaderCompleted() || !isLoaderActive()) {
        if (poll) {
          window.clearInterval(poll);
          poll = null;
        }

        playNavbarIntro();
      // }
    };

    window.addEventListener("loaderComplete", tryPlayIntro);
    window.addEventListener("hyperiux:loader-complete", tryPlayIntro);

    requestAnimationFrame(() => {
      requestAnimationFrame(tryPlayIntro);
    });

    poll = window.setInterval(tryPlayIntro, 80);

    fallbackTimeout = window.setTimeout(() => {
      tryPlayIntro();
    }, 8000);

    return () => {
      window.removeEventListener("loaderComplete", tryPlayIntro);
      window.removeEventListener("hyperiux:loader-complete", tryPlayIntro);

      if (poll) {
        window.clearInterval(poll);
      }

      if (fallbackTimeout) {
        window.clearTimeout(fallbackTimeout);
      }

      introTween.current?.kill();
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      previousBodyOverflow.current = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
      toggleNavbar(false);
    } else {
      document.body.style.overflow = previousBodyOverflow.current || "";

      if (!previousBodyOverflow.current) {
        document.body.style.removeProperty("overflow");
      }

      lenis?.start?.();
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow.current || "";

      if (!previousBodyOverflow.current) {
        document.body.style.removeProperty("overflow");
      }

      lenis?.start?.();
    };
  }, [isMenuOpen, lenis]);

  useEffect(() => {
    const handlePopState = () => {
      forceStartLenis();
      setIsMenuOpen(false);
      setOpenDropdown(null);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [forceStartLenis]);

  useEffect(() => {
    queueMicrotask(() => {
      forceStartLenis();
      closeMenu();
    });
  }, [pathname, forceStartLenis, closeMenu]);

  useIsomorphicLayoutEffect(() => {
    if (!menuRef.current || !linksRef.current) return;

    gsap.killTweensOf([menuRef.current, linksRef.current]);

    if (isMenuOpen) {
      gsap.set(menuRef.current, {
        display: "flex",
        pointerEvents: "auto",
      });

      gsap.fromTo(
        menuRef.current,
        {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        }
      );

      const items = linksRef.current.children;

      gsap.fromTo(
        items,
        {
          y: 30,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.06,
          delay: 0.1,
        }
      );
    } else {
      gsap.to(menuRef.current, {
        opacity: 0,
        duration: 0.25,
        ease: "power2.inOut",
        onComplete: () => {
          if (menuRef.current) {
            gsap.set(menuRef.current, {
              display: "none",
              pointerEvents: "none",
            });
          }
        },
      });
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const navbar = navbarRef.current;
    const menu = menuRef.current;
    const links = linksRef.current;

    return () => {
      gsap.killTweensOf([navbar, menu, links]);
    };
  }, []);

  return (
    <>
      <nav
        id="mobile-navigation"
        ref={navbarRef}
        style={{
          opacity: 0,
          visibility: "hidden",
          transform: "translate3d(0, -18px, 0)",
        }}
        className="fixed left-0 top-(--announcement-offset) transition-[top] duration-300 ease-out z-1100 hidden w-full items-center justify-between border-b border-white/5 bg-black/90 px-6 py-4 backdrop-blur-xl max-lg:flex"
      >
        <Link prefetch={false} href="/" onClick={handleNavigate} aria-label="Hyperiux Vault home">
          <HyperiuxLogo className="h-auto max-md:w-[40vw] text-primary max-lg:w-[25vw]" />
        </Link>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="relative flex max-md:size-[11vw] max-lg:size-[8vw] items-center justify-center rounded-full text-white transition-colors"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <X className="max-md:size-[7vw] max-lg:size-[4vw]" />
          ) : (
            <HamburgerIcon className="max-md:size-[7vw] max-lg:size-[4vw]" />
          )}
        </button>
      </nav>

      <div
        ref={menuRef}
        className="fixed inset-0 z-999 hidden bg-black opacity-0 pointer-events-none max-lg:flex"
      >
        <div
          data-lenis-prevent
          className="absolute inset-0 overflow-y-auto px-[8vw] pt-32 max-md:pt-36 pb-8"
        >
          <div ref={linksRef} className="flex flex-1 flex-col">
            {vaultLinks.map(({ label, href, dropdown }) => {
              const isExternal = href?.startsWith("http");

              const isActive = isTopNavItemActive(pathname, {
                label,
                href,
                dropdown,
              });

              if (dropdown) {
                const dropdownElement = (
                  <MobileDropdown
                    key={label}
                    label={label}
                    dropdownType={dropdown}
                    items={DROPDOWN_DATA[dropdown] || []}
                    isOpen={openDropdown === dropdown}
                    isActive={isActive}
                    onToggle={() => toggleDropdown(dropdown)}
                    onNavigate={handleNavigate}
                  />
                );

                if (dropdown === "docs") {
                  return [
                    dropdownElement,
                    <MobileDropdown
                      key="Legal"
                      label="Legal"
                      dropdownType="legal"
                      items={DROPDOWN_DATA.legal}
                      isOpen={openDropdown === "legal"}
                      isActive={isLegalRoute(pathname)}
                      onToggle={() => toggleDropdown("legal")}
                      onNavigate={handleNavigate}
                    />,
                  ];
                }

                return dropdownElement;
              }

              return (
                <Link
                  key={label}
                  href={href}
                  prefetch={false}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  onClick={handleNavigate}
                  className={` py-5 max-md:text-[5vw] max-lg:text-[4vw] font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-primary"
                      : "text-white/90 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 border-t border-white/10 pt-8 flex max-md:flex-col gap-4 max-md:gap-6">
            {/* Clerk-free by design: marketing routes render without
                ClerkProvider, so the mobile nav always shows the anonymous
                state. */}
            <div className="flex w-fit max-md:w-[88%] max-md:mx-auto justify-center" onClick={handleNavigate}>
              <ButtonV3
                text="Get Pro"
                href="/sign-up"
                className="border-white/50! w-full"
                variant="outline"
              />
            </div>
            <div className="flex w-fit  max-md:w-[88%] max-md:mx-auto justify-center" onClick={handleNavigate}>
              <ButtonV3 text="Install CLI" href="/docs/installation" className="w-fit max-md:w-full" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}