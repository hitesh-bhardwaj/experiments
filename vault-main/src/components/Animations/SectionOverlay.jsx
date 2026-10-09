"use client";

import { useRef } from "react";
import { useSectionOverlay } from "./useSectionOverlay";

// Wraps several sections so they come in and leave as one overlay (see useSectionOverlay)
export default function SectionOverlay({ children, options, ...props }) {
    const ref = useRef(null);
    useSectionOverlay(ref, options);
    return <div ref={ref} {...props}>{children}</div>;
}
