"use client";

import dynamic from "next/dynamic";

const GridTunnel = dynamic(() => import("@/components/grid-tunnel"), {
    ssr: false,
});

export default function ScrollDemo() {
    return (
        <div className="relative h-full w-full overflow-hidden bg-[#080808]">
            <GridTunnel
                interactive={false}
                backgroundColor="#080808"
                lineColor="#3a3a3a"
                className="relative h-full w-full overflow-hidden"
            />
        </div>
    );
}
