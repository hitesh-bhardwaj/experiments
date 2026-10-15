"use client";

import { useRef } from "react";
import CardFluid from "../CardFluid";
import InstallationProcess from "../InstallationProcess";

export default function CodeCard({ play }) {
    const cardRef = useRef(null);

    return (
        <div
            ref={cardRef}
            className="relative isolate overflow-hidden bg-dark-card p-3.5 text-foreground aspect-[16/11] [&>section]:h-full [&>section>div]:h-full [&>section>div>div]:h-full [&_.fadeup]:min-h-0! [&_.fadeup]:flex-1 [&_.fadeup]:overflow-hidden max-md:aspect-auto max-md:[&>section]:h-auto max-md:[&>section>div]:h-auto max-md:[&>section>div>div]:h-auto max-md:[&_.fadeup]:min-h-auto! max-md:[&_.fadeup]:flex-initial max-md:[&_.fadeup]:overflow-visible [&_[data-panel-body]]:[overflow-wrap:anywhere] [&_[data-panel-body]_*]:min-w-0"
        >
            {/* Dotted grid + orange mouse fluid behind the code panels. No swish sound here:
                the Why Vault section turns cursor sounds off (data-sound-flow="off"). */}
            <CardFluid />
            <InstallationProcess id="" play={play} />
        </div>
    );
}
