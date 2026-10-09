"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

import { prefersReducedMotion } from "@/lib/motion";
import HoverLink from "./HoverLink";
import NavMenuIcon from "./NavMenuIcon";
import { NAV_MENUS } from "./nav-menu";

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const CLOSED_CLIP = "inset(0% 0% 100% 0%)";
const OPEN_CLIP = "inset(0% 0% 0% 0%)";

function MenuItem({ item, onNavigate }) {
  return (
    <HoverLink
      href={item.href}
      text={item.label}
      onClick={onNavigate}
      leading={
        <NavMenuIcon
          src={item.icon}
          className="size-[1.2vw] text-white transition-colors duration-300 group-hover:text-primary motion-reduce:transition-none"
        />
      }
      className="relative isolate px-[0.8vw] py-[0.55vw] text18 leading-[1.15] text-white/75 hover:text-foreground"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 origin-top scale-y-0 bg-white/6 transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
      />
    </HoverLink>
  );
}

/**
 * Full-width menu panel under the v3 navbar.
 *
 * @param {'categories'|'docs'|null} panel - which menu the bar wants open.
 *   The panel keeps rendering the last menu while it plays its close, so a
 *   null here is a request, not an immediate unmount.
 * @param {() => void} onNavigate - called when a row is clicked, so the bar can
 *   drop the menu before the route changes.
 */
export default function NavDropdown({ panel, onNavigate }) {
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const timelineRef = useRef(null);
  const revealedRef = useRef(false);
  // The width the box is *drawn* at right now, not the width it lays out at.
  // It has to live here rather than be read back off the node, because the box
  // is remounted on every switch (see the render below) and a travel cut short
  // takes its in-flight scale to the grave with the old node.
  const visualWidthRef = useRef(0);
  const [visible, setVisible] = useState(null);

  // Adjusted during render rather than from an effect, so a menu-to-menu switch
  // lands in the same commit and the layout effect below always animates the
  // columns it just saw.
  if (panel && panel !== visible) setVisible(panel);

  useIsoLayoutEffect(() => {
    const box = panelRef.current;
    if (!box) return;

    const separators = box.querySelectorAll("[data-nav-v3-sep]");
    const headings = box.querySelectorAll("[data-nav-v3-head]");
    const rows = box.querySelectorAll("[data-nav-v3-item]");
    const content = contentRef.current;
    const targets = [box, content, ...separators, ...headings, ...rows];
    const reduce = prefersReducedMotion();

    // Every path below leaves a timeline running; killing it here covers both
    // the unmount and a hover that switches menus mid-animation. Killing the
    // timeline itself (not just its tweens) also stops a half-played close from
    // reporting complete and unmounting a panel that was re-opened.
    const cleanup = () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      gsap.killTweensOf(targets);
    };

    if (!panel) {
      revealedRef.current = false;
      visualWidthRef.current = 0;

      if (reduce) {
        timelineRef.current = gsap.timeline({
          onComplete: () => setVisible(null),
        });
        timelineRef.current.to(box, { opacity: 0, duration: 0.15 });

        return cleanup;
      }

      timelineRef.current = gsap
        .timeline({ onComplete: () => setVisible(null) })
        .to(
          rows,
          {
            opacity: 0,
            y: 8,
            duration: 0.18,
            ease: "power2.in",
            stagger: { each: 0.012, from: "end" },
          },
          0
        )
        .to(headings, { opacity: 0, duration: 0.15, ease: "power2.in" }, 0)
        .to(
          box,
          {
            clipPath: CLOSED_CLIP,
            y: -6,
            duration: 0.34,
            ease: "power3.inOut",
          },
          0.06
        );

      return cleanup;
    }

    // A menu-to-menu switch leaves the panel standing open and only replays
    // the contents; only a cold open wipes the whole panel down.
    const fresh = !revealedRef.current;
    revealedRef.current = true;

    // The menus are different widths now, so a switch has to travel between
    // them. The travel is a scale, never a width: `width` is a layout property,
    // and tweening it reflows the panel and everything inside it on every one
    // of the ~20 frames, which is exactly what a layout-shift score counts. A
    // switch that lands mid-travel picks up from where the box actually is -
    // the width the interrupted travel had reached, carried on the ref because
    // the node that was drawing it has already been replaced.
    const previousWidth = fresh ? 0 : visualWidthRef.current;

    // Square before measuring: a switch hands us a fresh node, but a re-open
    // that catches its own close reuses the node, and a leftover scale from the
    // killed travel would skew the number read back.
    gsap.set(box, { scaleX: 1 });
    gsap.set(content, { scaleX: 1 });
    const naturalWidth = box.getBoundingClientRect().width;
    visualWidthRef.current = naturalWidth;

    const resizes =
      !fresh && previousWidth > 0 && Math.abs(previousWidth - naturalWidth) > 1;

    if (reduce) {
      gsap.set(box, { clipPath: OPEN_CLIP, y: 0, opacity: 1 });
      gsap.set(separators, { scaleY: 1 });
      timelineRef.current = gsap.timeline();
      timelineRef.current.fromTo(
        [...headings, ...rows],
        { opacity: 0 },
        { opacity: 1, duration: 0.2, clearProps: "opacity" }
      );

      return cleanup;
    }

    const timeline = gsap.timeline();
    timelineRef.current = timeline;

    if (fresh) {
      timeline.fromTo(
        box,
        { clipPath: CLOSED_CLIP, y: -10, opacity: 1 },
        { clipPath: OPEN_CLIP, y: 0, duration: 0.55, ease: "power3.inOut" },
        0
      );
    } else {
      gsap.set(box, { clipPath: OPEN_CLIP, y: 0, opacity: 1 });
    }

    if (resizes) {
      // Squeezing the box to the width the last menu was showing and letting
      // the columns out by the same factor puts the box where it has to travel
      // from with its contents already at their natural size and place, so the
      // pair playing back to 1 walks the box across while the columns hold
      // still. The two scales are read off one value rather than tweened
      // separately - independently eased, they would stop cancelling in the
      // middle and the columns would breathe.
      const travel = { scale: previousWidth / naturalWidth };
      const applyTravel = () => {
        gsap.set(box, { scaleX: travel.scale });
        gsap.set(content, { scaleX: 1 / travel.scale });
        visualWidthRef.current = naturalWidth * travel.scale;
      };

      applyTravel();
      timeline.to(
        travel,
        {
          scale: 1,
          duration: 0.36,
          ease: "power3.out",
          onUpdate: applyTravel,
        },
        0
      );

      // The box clips to its own border box before its scale is applied, so
      // the columns - let out past that box by the inverse scale - are cut to
      // the travelling box for free, the same reveal the width tween got from
      // the clip. It leaves the box's own hairline border scaled with it for
      // the length of the travel; at white/10 that reads as the same line.
    }

    timeline
      .fromTo(
        separators,
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: fresh ? 0.5 : 0.4,
          ease: "power3.out",
          stagger: 0.06,
        },
        fresh ? 0.12 : 0
      )
      .fromTo(
        headings,
        { opacity: 0, y: -8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.06,
          clearProps: "opacity,transform",
        },
        fresh ? 0.16 : 0.02
      )
      .fromTo(
        rows,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.03,
          clearProps: "opacity,transform",
        },
        fresh ? 0.22 : 0.06
      );

    return cleanup;
  }, [panel, visible]);

  const menu = visible ? NAV_MENUS[visible] : null;
  if (!menu) return null;

  return (
    <div
      // The frame is the only node that outlives a menu switch, so it is the
      // only node whose box a switch must not change: it holds the same
      // position and the same size for every menu, and centres whatever is
      // drawn inside it. Sizing this node to the menu instead - `w-max`
      // between the gutters - moved its left edge by half the difference
      // between the two menus every time they swapped, and an existing element
      // whose start position moves is the definition of a layout shift. The
      // scale that walks the panel across does not settle that debt: it is a
      // transform, and the score does not credit transforms with covering a
      // move it has already charged for.
      // It spans the gutters, so it passes pointers through to the page and
      // the panel takes them back.
      className="pointer-events-none absolute top-[85%] right-[3vw] left-[3vw] flex justify-center"
    >
      {/* Keyed on the menu so a switch mounts a new panel rather than resizing
          this one. A node that was not in the previous frame has nowhere to
          have shifted from, so the width the two menus differ by costs
          nothing. `w-max` lets each menu size to its own columns - Docs has
          two, so it comes out narrower than Categories - and `max-w-full`
          keeps a long menu inside the gutters. */}
      <div
        key={visible}
        ref={panelRef}
        className="pointer-events-auto w-max max-w-full border border-white/10 bg-[#121212]/60 backdrop-blur-md will-change-[clip-path,transform]"
      >
        <div ref={contentRef} className="flex min-h-[19vw] w-full">
          {menu.columns.map((column, index) => (
            // A fixed column width is what makes the panel size to its menu:
            // three columns for Categories, two (so two thirds as wide) for
            // Docs, with the same generous gutter inside each either way.
            <div key={column.title} className="relative w-[23vw] shrink-0">
              {index > 0 && (
                <span
                  data-nav-v3-sep
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-px origin-top bg-white/12"
                />
              )}

              <p
                data-nav-v3-head
                className="border-b border-white/10 bg-white/2 px-[1.5vw] py-[0.85vw] text18 flex items-center gap-[1vw] text-white capitalize"
              >

                <span className="size-[.6vw] font-avenir bg-primary inline-block" />
                {column.title}
              </p>

              <div className="flex flex-col px-[0.8vw] py-[0.9vw]">
                {column.items.map((item) => (
                  <div key={item.label} data-nav-v3-item>
                    <MenuItem item={item} onNavigate={onNavigate} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
