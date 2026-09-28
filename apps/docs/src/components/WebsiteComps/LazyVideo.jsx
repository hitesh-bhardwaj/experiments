"use client";

import { useEffect, useRef } from "react";

// Background-loop video that costs nothing until it approaches the viewport.
// preload="none" + no autoPlay means the browser fetches zero bytes up front;
// the IntersectionObserver starts playback (which triggers the fetch) just
// before the video scrolls into view, and pauses it again off-screen.
export default function LazyVideo({ src, className = "", rootMargin = "300px 0px", ...props }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      className={className}
      {...props}
    />
  );
}
