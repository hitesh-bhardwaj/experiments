"use client";

import { useState } from "react";
import { Twitter, Linkedin, Facebook, Link as LinkIcon, Check } from "lucide-react";

// `url` is the absolute canonical URL, computed server-side (getCanonicalUrl)
// and passed in - avoids depending on window.location for the intent links,
// so they're correct even before hydration.
export default function BlogShareLinks({ url, title }) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      Icon: Twitter,
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      Icon: Linkedin,
    },
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      Icon: Facebook,
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
    <div className="blog-share" role="group" aria-label="Share this post">
      {links.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="blog-share-btn">
          <Icon size={16} strokeWidth={1.75} />
        </a>
      ))}

      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className="blog-share-btn"
      >
        {copied ? <Check size={16} strokeWidth={1.75} /> : <LinkIcon size={16} strokeWidth={1.75} />}
      </button>
    </div>
  );
}
