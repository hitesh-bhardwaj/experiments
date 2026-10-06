"use client";

import React from "react";
import { ToastViewport, useToastQueue } from "../ui/Toast";

// Derive an anchor id from plain-text heading children when no id is passed.
export function slugify(node) {
  const text = React.Children.toArray(node)
    .filter((c) => typeof c === "string" || typeof c === "number")
    .join("");
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Link icon shown on heading hover; copies a URL to that section.
export default function HeadingAnchor({ id, label }) {
  const { toast, showToast, dismissToast } = useToastQueue(2500);

  if (!id) return null;

  const onClick = async () => {
    const url = `${window.location.href.split("#")[0]}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    window.history.replaceState(null, "", `#${id}`);
    showToast({ title: "Link to this section copied." });
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Copy link to ${label || "this section"}`}
        className="ml-2 inline-grid h-7 w-7 place-items-center align-middle text-primary opacity-0 transition-[opacity,background-color] duration-300 group-hover/htext:opacity-100 focus-visible:opacity-100 hover:bg-primary/12"
      >
        <svg
          aria-hidden="true"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </svg>
      </button>
      <ToastViewport
        toast={toast}
        onDismiss={dismissToast}
        position="bottom-center"
      />
    </>
  );
}
