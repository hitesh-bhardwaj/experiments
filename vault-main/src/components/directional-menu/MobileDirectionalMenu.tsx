"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { useFocusTrap } from "./useFocusTrap";
import type { DirectionalMenuItem } from "./DirectionalMegaMenu";

const hasDropdownContent = (item?: DirectionalMenuItem): boolean => Boolean(item?.customContent);

interface MobileDirectionalMenuProps {
  items?: DirectionalMenuItem[];
}

export function MobileDirectionalMenu({ items = [] }: MobileDirectionalMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setActiveIndex(null);
  };

  useFocusTrap({
    active: isMenuOpen,
    containerRef,
    initialFocusRef: toggleButtonRef,
    onEscape: closeMenu,
  });

  const onToggleMenu = () => {
    setIsMenuOpen((currentValue) => {
      const nextValue = !currentValue;

      if (!nextValue) {
        setActiveIndex(null);
      }

      return nextValue;
    });
  };

  const onToggleSection = (index: number) => {
    setActiveIndex((currentValue) => (currentValue === index ? null : index));
  };

  return (
    <div ref={containerRef} className="relative hidden max-[1025px]:block px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <Link prefetch={false} href="/" className="flex items-center  gap-3 cursor-pointer">
          <Image
            src="/hyperiux.svg"
            alt="Hyperiux"
            width={35}
            height={35}
          />
          <Image
            src="/hyperiux-wordmark.svg"
            alt="Hyperiux"
            width={166}
            height={55}
          />
        </Link>

        <button
          ref={toggleButtonRef}
          type="button"
          onClick={onToggleMenu}
          className="flex h-11 w-11 items-center justify-center rounded-full  text-white transition-colors duration-200 hover:bg-white/10 motion-reduce:bg-transparent motion-reduce:transition-none"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X className="max-md:h-5 max-md:w-5 h-10 w-10" /> : <Menu className=" max-md:h-7 max-md:w-7 h-10 w-10" />}
        </button>
      </div>

      <div
        className={`absolute left-6 right-6 top-18 z-50 overflow-hidden pb-8! rounded-lg bg-white text-black transition-all duration-300 ease-in-out motion-reduce:transition-none ${
          isMenuOpen
            ? "max-h-[80vh] overflow-y-scroll p-8 opacity-100 max-md:max-h-[90vh] max-md:p-3"
            : "max-h-0 p-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMenuOpen}
      >
          <div className="flex flex-col max-md:gap-2 gap-5">
            {items.map((item, index) => {
              const isOpen = activeIndex === index;
              const isDropdown = hasDropdownContent(item);

              if (!isDropdown) {
                return (
                  <Link
                    key={item.label}
                    href={item.href || "#"}
                    className="rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 py-4 max-md:text-sm max-[1025px]:text-lg font-semibold uppercase tracking-[0.14em] text-neutral-500 transition-all duration-300 ease-in-out hover:bg-neutral-100 motion-reduce:bg-neutral-50/60 motion-reduce:transition-none max-[1025px]:rounded-none max-[1025px]:border-x-0 max-[1025px]:border-t-0"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <section
                  key={item.label}
                  className="rounded-lg border border-neutral-200 bg-neutral-50/60 transition-all duration-300 ease-in-out motion-reduce:transition-none max-[1025px]:rounded-none max-[1025px]:border-x-0 max-[1025px]:border-t-0"
                >
                  <button
                    type="button"
                    onClick={() => onToggleSection(index)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-all duration-300 ease-in-out motion-reduce:transition-none"
                    aria-expanded={isOpen}
                  >
                    <span className="max-md:text-sm max-[1025px]:text-lg font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      {item.label}
                    </span>

                    <ChevronDown
                      className={`h-4 w-4 max-md:h-5 max-md:w-5 max-[1025px]:h-6 max-[1025px]:w-6 text-neutral-500 transition-transform duration-300 ease-in-out motion-reduce:rotate-0 motion-reduce:transition-none ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out motion-reduce:transition-none ${
                      isOpen
                        ? "max-h-[60rem]  px-4 py-4 opacity-100"
                        : "max-h-0 border-t-0 px-4 py-0 opacity-0"
                    }`}
                  >
                      <div className="max-[1025px]:[&_.grid]:grid-cols-2 max-md:[&_.grid]:grid-cols-1 ">
                        {item.customContent}
                      </div>
                    </div>
                </section>
              );
            })}
          </div>
      </div>
    </div>
  );
}
