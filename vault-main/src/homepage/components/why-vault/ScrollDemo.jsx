"use client";

import dynamic from "next/dynamic";

const ScrollDistortion = dynamic(() => import("@/homepage/components/why-vault/effects/scroll-distortion"), {
    ssr: false,
});

export default function ScrollDemo() {
    return (
        <div className="relative h-full w-full overflow-hidden bg-background">
            <ScrollDistortion contained />
        </div>
    );
}
