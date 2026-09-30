"use client";

import dynamic from "next/dynamic";

const ButterflyTrailCursor = dynamic(() => import("@/components/butterfly-trail-cursor"), {
    ssr: false,
});

export default function CursorDemo() {
    return (
        <div className="relative h-full w-full overflow-hidden bg-[#1a1a1a]">
            <ButterflyTrailCursor
                embedded
                backgroundColor="#1a1a1a"
                wingColor="#ff5f00"
            />
        </div>
    );
}
