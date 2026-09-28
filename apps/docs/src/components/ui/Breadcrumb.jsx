"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function formatSegmentLabel(segment) {
  return segment.replace(/-/g, " ");
}

function itemsFromPathname(pathname) {
  const segments = (pathname || "/").split("/").filter(Boolean);

  return [
    { label: "Home", href: "/" },
    ...segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");

      return {
        label: formatSegmentLabel(segment),
        // `/legal` has no real landing page - send "Legal" to the license agreement.
        href: href === "/legal" ? "/legal/license-agreement" : href,
      };
    }),
  ];
}

// Long slugs (blog titles especially) make the last crumb wrap the whole
// nav. Opt in with `maxWords` to clip it to a few words plus an ellipsis.
function trimToWords(label, maxWords) {
  if (!maxWords) return label;

  const words = label.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) return label;

  return `${words.slice(0, maxWords).join(" ")}....`;
}

/**
 * URL-driven breadcrumb. `/` is Home; each path segment is a crumb.
 *
 * @param {number} [maxWords] - clip the final crumb to this many words.
 */
export function Breadcrumb({ className = "", lastItemClassName = "", maxWords }) {
  const pathname = usePathname();
  const items = itemsFromPathname(pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className={[
        "flex w-fit max-w-full fadeup flex-wrap items-center gap-2 text-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span
            key={`${item.href}-${item.label}`}
            className="flex items-center gap-2"
          >
            {index > 0 && <span className="text-white/25">/</span>}

            {isLast ? (
              <span
                title={item.label}
                className={[
                  "capitalize text-primary text20",
                  lastItemClassName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {trimToWords(item.label, maxWords)}
              </span>
            ) : (
              <Link
                href={item.href}
                scroll={false}
                className="capitalize text20 transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
