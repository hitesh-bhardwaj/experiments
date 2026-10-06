"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";

export default function ProjectCard({
    project,
    idx,
    titleRef,
    subtitleRef,
    projectRef,
}) {
    const cursorRef = useRef(null);

    const handleMouseEnter = (e) => {
        if (!cursorRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        // Immediately place cursor under mouse on entry
        gsap.set(cursorRef.current, {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            xPercent: -50,
            yPercent: -50,
        });
        gsap.to(cursorRef.current, {
            scale: 1,
            duration: 0.3,
            ease: "power1.out",
        });
    };

    const handleMouseLeave = () => {
        if (!cursorRef.current) return;
        gsap.to(cursorRef.current, {
            scale: 0,
            duration: 0.3,
            ease: "power1.out",
        });
    };

    const handleMouseMove = (e) => {
        if (!cursorRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        // Smoothly interpolate (lerp/delay) to current cursor coordinates
        gsap.to(cursorRef.current, {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            xPercent: -50,
            yPercent: -50,
            duration: 0.35,
            ease: "power2.out",
            overwrite: "auto",
        });
    };

    return (
        <Link
            ref={projectRef}
            href={project.link}

            className="w-[60vw] relative shrink-0 flex flex-col gap-[2vw]"
            target="_blank"
            rel="noopener noreferrer"
        >
            <div onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove} className="w-full aspect-video rounded-md overflow-hidden relative group">
                <Image
                    src={project.img}
                    className="object-cover"
                    fill
                    alt={project.title}
                />
            </div>

            <div>
                <p
                    ref={titleRef}
                    className="text32 text-white"
                >
                    {project.title}
                </p>
                <p
                    ref={subtitleRef}
                    className="text24 text-light-grey"
                >
                    {project.subtitle}
                </p>
            </div>

            {/* Floating explore cursor inside the card bounds */}
            <div
                ref={cursorRef}
                className="px-[3vw] py-[1.5vw] flex items-center justify-center w-fit h-fit rounded-full absolute left-0 top-0 pointer-events-none font-semibold bg-background text-foreground text20 scale-0 z-10"
                style={{ transition: "scale 0.3s" }}
            >
                <p>Explore</p>
            </div>
        </Link>
    );
}
