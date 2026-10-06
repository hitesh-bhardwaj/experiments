"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useLenis } from "lenis/react";

function ensureHeadingId(el, index) {
  if (!el.id) {
    el.id =
      el.textContent
        ?.toLowerCase()
        .replaceAll(" ", "-")
        .replace(/[^\w-]/g, "") || `section-${index}`;
  }

  return el.id;
}

export function TableOfContents({
  containerRef,
  stopRef,
  watchKey,
  hideNearFooter = false,
  // Which way the flyout panel opens from the dashes. "right" (the default)
  // opens it leftward for the effects/docs pages, which pin the widget to the
  // right edge; the blog rail sits on the left and passes "left".
  side = "right",
  // Effects/docs reveal the widget only while you're inside the article; the
  // blog rail keeps it mounted for the whole column.
  alwaysVisible = false,
}) {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isFooterNearby, setIsFooterNearby] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  const lenis = useLenis();
  const activeLockRef = useRef({
    id: "",
    targetTop: 0,
    timeoutId: null,
  });
  const scrollTweenRef = useRef(null);

  const clearActiveLock = useCallback(() => {
    if (activeLockRef.current.timeoutId) {
      window.clearTimeout(activeLockRef.current.timeoutId);
    }

    activeLockRef.current = {
      id: "",
      targetTop: 0,
      timeoutId: null,
    };
  }, []);

  const onTocClick = useCallback(
    (event, id) => {
      event.preventDefault();
      event.stopPropagation();

      const el = document.getElementById(id);

      if (!el || typeof window === "undefined") return;

      const topOffset = window.innerHeight * 0.2;
      const targetTop =
        el.getBoundingClientRect().top + window.scrollY - topOffset;

      clearActiveLock();

      activeLockRef.current = {
        id,
        targetTop,
        timeoutId: null,
      };

      setActiveId(id);
      scrollTweenRef.current?.kill();
      scrollTweenRef.current = null;

      const scrollDuration = 1.15;
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      if (lenis) {
        window.history.pushState(null, "", `#${id}`);

        lenis.scrollTo(targetTop, {
          duration: scrollDuration,
          easing: easeOutCubic,
          lock: true,
          force: true,
          onComplete: clearActiveLock,
        });

        // Safety net in case onComplete never fires (e.g. target clamped).
        activeLockRef.current.timeoutId = window.setTimeout(
          clearActiveLock,
          scrollDuration * 1000 + 300
        );

        return;
      }

      const scrollState = {
        y: window.scrollY,
      };

      scrollTweenRef.current = gsap.to(scrollState, {
        y: targetTop,
        duration: scrollDuration,
        ease: "power4.out",
        overwrite: true,
        onUpdate: () => {
          window.scrollTo({
            top: scrollState.y,
            left: 0,
            behavior: "auto",
          });
        },
        onComplete: () => {
          scrollTweenRef.current = null;
          window.history.replaceState(null, "", `#${id}`);

          activeLockRef.current.timeoutId = window.setTimeout(() => {
            clearActiveLock();
          }, 120);
        },
      });
    },
    [clearActiveLock, lenis]
  );

  useEffect(() => {
    const root = containerRef?.current;

    if (!root) return;

    const updateVisibility = () => {
      const rect = root.getBoundingClientRect();
      const stopRect = stopRef?.current?.getBoundingClientRect();

      const hasReachedStop = stopRect
        ? stopRect.top <= window.innerHeight * 0.65
        : false;

      setIsVisible(
        !hasReachedStop &&
        rect.top <= window.innerHeight * 0.45 &&
        rect.bottom >= window.innerHeight * 0.25
      );
    };

    updateVisibility();

    window.addEventListener("scroll", updateVisibility, {
      passive: true,
    });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [containerRef, stopRef, watchKey]);

  // Reset the footer-proximity flag when the feature is off - derived
  // purely from `hideNearFooter`, which is already available during render.
  if (!hideNearFooter && isFooterNearby) {
    setIsFooterNearby(false);
  }

  useEffect(() => {
    if (!hideNearFooter) {
      return;
    }

    const footer = document.querySelector("footer");

    if (!footer || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsFooterNearby(entries.some((entry) => entry.isIntersecting));
      },
      {
        rootMargin: "0px 0px 0% 0px",
      }
    );

    observer.observe(footer);

    return () => observer.disconnect();
  }, [hideNearFooter, watchKey]);

  useEffect(() => {
    const root = containerRef?.current;

    if (!root) return;

    const collect = () => {
      const headings = Array.from(root.querySelectorAll("h2")).map(
        (el, index) => {
          const id = ensureHeadingId(el, index);

          return {
            id,
            text: el.textContent || "",
            level: el.tagName.toLowerCase(),
          };
        }
      );

      setItems((prev) =>
        prev.length === headings.length && prev.every((p, i) => p.id === headings[i].id && p.text === headings[i].text)
          ? prev
          : headings
      );
    };

    collect();
    // After a client-side page change (docs prev / next) the new content can
    // arrive after this runs - re-collect whenever headings show up or change.
    const observer = new MutationObserver(collect);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [containerRef, watchKey]);

  useEffect(() => {
    const root = containerRef?.current;

    if (!root) return;

    const headings = Array.from(root.querySelectorAll("h2"));

    headings.forEach((el, index) => {
      ensureHeadingId(el, index);
    });

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (activeLockRef.current.id) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) =>
            a.boundingClientRect.top > b.boundingClientRect.top ? 1 : -1
          )[0];

        const id = visible?.target?.id;

        if (id) {
          setActiveId(id);
        }
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: [0, 1],
      }
    );

    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [containerRef, items.length]);

  useEffect(() => {
    return () => {
      scrollTweenRef.current?.kill();

      if (activeLockRef.current.timeoutId) {
        window.clearTimeout(activeLockRef.current.timeoutId);
      }
    };
  }, []);

  if (items.length === 0 || (!alwaysVisible && (!isVisible || isFooterNearby))) {
    return null;
  }

  const isLeft = side === "left";

  return (
    <div className="group relative flex items-center gap-4">
      <span
        aria-hidden="true"
        className={`absolute top-1/2 h-full min-h-48 w-8 -translate-y-1/2 ${isLeft ? "left-full" : "right-full"}`}
      />

      <div
        className={`pointer-events-none absolute top-1/2 w-[18vw] max-h-[60vh] -translate-y-1/2 overflow-hidden border border-[rgba(29,29,29,.1)] bg-[#F4F4F4] p-2 opacity-0 shadow-[0_20px_50px_-24px_rgba(0,0,0,.35)] transition-[opacity,translate,scale] duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100 ${isLeft ? "left-[calc(100%+1rem)] -translate-x-3" : "right-[calc(100%+1rem)] translate-x-3"} scale-[.97]
          }`}
      >
        <ul
          data-lenis-prevent
          className="flex flex-col gap-1 overflow-y-auto overscroll-contain max-h-[calc(60vh-1rem)] toc"
          onMouseLeave={() => setHoveredId(null)}
        >
          {items.map((item) => {
            // Hover takes precedence; falls back to the active section so the
            // pill still rests somewhere when nothing is hovered.
            const highlighted = hoveredId
              ? hoveredId === item.id
              : activeId === item.id;

            return (
              <li key={item.id}>
                <Link
                  href={`#${item.id}`}
                  onMouseEnter={() => setHoveredId(item.id)}
                  className="group relative isolate block"
                  onClick={(event) => onTocClick(event, item.id)}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 -z-10 origin-top bg-[#ff5f00] transition-transform duration-300 ease-out motion-reduce:transition-none ${highlighted ? "scale-y-100" : "scale-y-0"
                      }`}
                  />
                  <span className={`relative z-10 block px-3 py-2 text20 font-normal leading-tight transition-colors duration-300 ${highlighted ? "text-[#141414]" : "text-(--docs-body,#3a3a3a)"}`}>
                    {item.text}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <ul className="flex w-12 flex-col items-end gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`#${item.id}`}
              aria-label={item.text}
              className="block cursor-pointer py-1"
              onClick={(event) => onTocClick(event, item.id)}
            >
              <span
                className={[
                  "block h-0.5 rounded-full transition-all duration-300 ease-out",
                  activeId === item.id
                    ? "w-8 bg-primary"
                    : "w-8 bg-[#1D1D1D]/25 hover:w-8 hover:bg-[#1D1D1D]/60",
                ].join(" ")}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
