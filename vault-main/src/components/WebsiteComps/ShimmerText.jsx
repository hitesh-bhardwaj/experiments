"use client";

import React, { useRef, useLayoutEffect } from "react";
import gsap from "gsap";

export default function ShimmerText({
    children,
    baseColor = "#ffffff",
    shimmerColor = "#ff5f00",
    className = "",
    as: Component = "span"
}) {
    const shimmerRef = useRef(null);

    useLayoutEffect(() => {
        const shimmerEl = shimmerRef.current;
        if (!shimmerEl) return;

        gsap.set(shimmerEl, {
            color: "transparent",
            backgroundImage: `linear-gradient(90deg, ${baseColor} 0%, ${baseColor} 42%, ${shimmerColor} 50%, ${baseColor} 58%, ${baseColor} 100%)`,
            backgroundSize: "130% 100%",
            backgroundPosition: "120% 0%",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            willChange: "background-position",
        });

        const shimmerTimeline = gsap.timeline({ repeat: -1 });

        shimmerTimeline
            .set(shimmerEl, { backgroundPosition: "250% 0%" })
            .to(shimmerEl, { backgroundPosition: "-150% 0%", duration: 2, ease: "none" })
            .to({}, { duration: 2 });

        return () => {
            shimmerTimeline.kill();
            gsap.set(shimmerEl, {
                clearProps: "color,backgroundImage,backgroundSize,backgroundPosition,backgroundClip,WebkitBackgroundClip,WebkitTextFillColor,willChange",
            });
        };
    }, [baseColor, shimmerColor]);

    return (
        <Component ref={shimmerRef} className={className}>
            {children}
        </Component>
    );
}
