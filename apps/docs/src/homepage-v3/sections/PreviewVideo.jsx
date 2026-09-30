"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import LazyVideo from "@/components/WebsiteComps/LazyVideo";
import { prefersReducedMotion } from "@/lib/motion";

import {
  TUTORIAL_VIDEO_POSTER as VIDEO_POSTER,
  TUTORIAL_VIDEO_SRC as VIDEO_SRC,
} from "../components/tutorial-video";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export default function PreviewVideo() {
  const sectionRef = useRef(null);
  const videoWrapRef = useRef(null);

  useGSAP(
    () => {
      const wrap = videoWrapRef.current;
      if (!wrap) return;

      if (prefersReducedMotion()) {
        gsap.set(wrap, { scale: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        wrap,
        { scale: 0.6, y: "10vw" },
        {
          scale: 1,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 90%",
            end: "top 10%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="Workflow"
      className="relative p-[2vw]  flex items-center justify-center mt-[20vw] h-screen w-full max-[1025px]:h-fit max-[1025px]:px-[4vw] max-[1025px]:mt-[24vw] max-md:h-fit max-md:px-[4vw]"
    >
      <div
        ref={videoWrapRef}
        className="h-full w-full  border border-grey origin-center will-change-transform"
      >
        <LazyVideo
          src={VIDEO_SRC}
          poster={VIDEO_POSTER}
          loop
          className="h-full w-full max-md:border border-foreground/15 object-cover"
        />
      </div>
    </section>
  );
}
