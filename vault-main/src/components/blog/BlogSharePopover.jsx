"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Facebook, Linkedin, Link as LinkIcon, Check, Share } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

// Lucide ships neither the Threads glyph nor the post-rebrand X mark, so
// those two are inlined.
function ThreadsIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.2 11.2c-.1 0-.2-.1-.3-.1-.2-3.2-1.9-5-4.8-5-2.1 0-3.9 1-5 2.6l1.7 1.2c.8-1.2 2-1.5 3.3-1.5 1 0 1.8.3 2.3.9.4.4.7 1 .8 1.8-.9-.2-1.9-.2-2.9-.2-2.9.2-4.8 1.9-4.7 4.2.1 1.2.7 2.2 1.6 2.9.8.6 1.9.9 3 .8 1.5-.1 2.6-.6 3.4-1.7.6-.8 1-1.8 1.2-3.1.7.4 1.2 1 1.5 1.7.5 1.1.5 3-1 4.5-1.3 1.3-2.9 1.9-5.3 1.9-2.7 0-4.7-.9-6-2.5C4.7 17.1 4.1 15 4 12c0-3 .7-5.1 1.9-6.6 1.3-1.6 3.3-2.5 6-2.5 2.7 0 4.7.9 6 2.5.7.8 1.2 1.9 1.5 3.1l2-.5c-.4-1.6-1-2.9-2-4C17.7 1.9 15.2.8 11.9.8h-.1C8.6.8 6.1 1.9 4.4 4 2.9 5.9 2.1 8.5 2 11.9v.2c.1 3.4.9 6 2.4 7.9 1.7 2.1 4.2 3.2 7.4 3.2h.1c2.9 0 4.9-.8 6.6-2.4 2.2-2.2 2.1-5 1.4-6.7-.5-1.3-1.4-2.3-2.7-3zm-4.6 5.6c-1.2.1-2.5-.5-2.6-1.7-.1-.9.6-1.9 2.7-2h.6c.7 0 1.4.1 2 .2-.2 3-1.7 3.4-2.7 3.5z" />
    </svg>
  );
}

function XIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.5L6.3 22H3.2l7.3-8.3L2.8 2h6.4l4.5 5.9L18.9 2zm-1.1 18h1.7L8.3 3.8H6.4L17.8 20z" />
    </svg>
  );
}

// Opening: the panel slides up first, then the rows stagger in behind it
// (delayChildren waits out the panel's own travel). Closing reverses the
// order - staggerDirection -1 fades the rows from the bottom up, and the
// panel only drops once they're gone (`when: "afterChildren"`).
const PANEL_DURATION = 0.32;
const ITEM_DURATION = 0.22;

const panelVariants = {
  hidden: {
    opacity: 0,
    y: 12,
    transition: {
      when: "afterChildren",
      duration: PANEL_DURATION,
      ease: [0.4, 0, 1, 1],
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
      duration: PANEL_DURATION,
      ease: [0, 0, 0.2, 1],
      delayChildren: PANEL_DURATION * 0.5,
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6, transition: { duration: ITEM_DURATION } },
  visible: { opacity: 1, y: 0, transition: { duration: ITEM_DURATION } },
};

// `url` is the absolute canonical URL, computed server-side (getCanonicalUrl)
// and passed in - avoids depending on window.location for the intent links,
// so they're correct even before hydration.
export default function BlogSharePopover({ url, title }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef(null);

  // Dismiss on outside click / Escape, the way a menu should behave.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const encodedUrl = encodeURIComponent(url || "");
  const encodedTitle = encodeURIComponent(title || "");

  const links = [
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      Icon: Facebook,
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      Icon: Linkedin,
    },
    {
      label: "Share on Threads",
      href: `https://www.threads.net/intent/post?text=${encodedTitle}%20${encodedUrl}`,
      Icon: ThreadsIcon,
    },
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      Icon: XIcon,
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) - silently no-op,
      // the other share links still work.
    }
  }

  return (
    <div ref={rootRef} className="relative w-fit">
      <Tooltip label="Share" hideOnClick>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Share this post"
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex size-6 cursor-pointer items-center justify-center "
        >
          <svg className="text-[#AEAEAE] size-4.5" width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fillRule="evenodd" clipRule="evenodd" d="M11.7 0H5.2C2.3283 0 0 2.3283 0 5.2V20.8C0 23.6717 2.3283 26 5.2 26H20.8C23.6717 26 26 23.6717 26 20.8C26 17.8477 26 14.3 26 14.3C26 13.5824 25.4176 13 24.7 13C23.9824 13 23.4 13.5824 23.4 14.3V20.8C23.4 22.2352 22.2352 23.4 20.8 23.4C16.471 23.4 9.5277 23.4 5.2 23.4C3.7635 23.4 2.6 22.2352 2.6 20.8C2.6 16.471 2.6 9.5277 2.6 5.2C2.6 3.7635 3.7635 2.6 5.2 2.6H11.7C12.4176 2.6 13 2.0176 13 1.3C13 0.5824 12.4176 0 11.7 0ZM21.5618 2.6H16.9C16.1824 2.6 15.6 2.0176 15.6 1.3C15.6 0.5824 16.1824 0 16.9 0H24.7C25.4176 0 26 0.5824 26 1.3V9.1C26 9.8176 25.4176 10.4 24.7 10.4C23.9824 10.4 23.4 9.8176 23.4 9.1V4.4382L13.9191 13.9191C13.4121 14.4261 12.5879 14.4261 12.0809 13.9191C11.5726 13.4121 11.5726 12.5879 12.0809 12.0809L21.5618 2.6Z" fill="#AEAEAE"/>
</svg>

        </button>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute bottom-[calc(100%+0.75rem)] left-0 z-50 w-[16vw] min-w-56 overflow-hidden bg-[#161616] shadow-2xl"
          >
            {/* Same hover treatment as the TOC rows: an inset layer that
                scales up from the top rather than a background swap, so the
                orange sweeps in instead of appearing all at once. */}
            <motion.button
              variants={itemVariants}
              type="button"
              role="menuitem"
              onClick={copyLink}
              className="group relative isolate flex w-full cursor-pointer items-center gap-3 border-b border-white/10 px-4 py-3 text-left text-[0.9vw] text-white"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#ff5f00] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
              />
              {copied ? (
                <Check size={18} strokeWidth={1.75} className="shrink-0" />
              ) : (
                <LinkIcon size={18} strokeWidth={1.75} className="shrink-0" />
              )}
              {copied ? "Copied" : "Copy link"}
            </motion.button>

            {links.map(({ label, href, Icon }) => (
              <motion.a
                key={label}
                variants={itemVariants}
                role="menuitem"
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="group relative isolate flex items-center gap-3 px-4 py-3 text-[0.9vw] text-white"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#ff5f00] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
                />
                <Icon size={18} strokeWidth={1.75} className="h-4.5 w-4.5 shrink-0" />
                {label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
