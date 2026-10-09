"use client";

import { useRef } from "react";
import CardFluid from "../CardFluid";
import InstallationProcess from "../InstallationProcess";

export default function CodeCard({ play }) {
    const cardRef = useRef(null);

    return (
        <div
            ref={cardRef}
            className="relative isolate overflow-hidden bg-dark-card p-3.5 text-white md:aspect-[16/11] md:[&>section]:h-full md:[&>section>div]:h-full md:[&>section>div>div]:h-full md:[&_.fadeup]:min-h-0! md:[&_.fadeup]:flex-1 md:[&_.fadeup]:overflow-hidden [&_[data-panel-body]]:[overflow-wrap:anywhere] [&_[data-panel-body]_*]:min-w-0"
        >
            {/* Dotted grid + orange mouse fluid behind the code panels. No swish sound here:
                the Why Vault section turns cursor sounds off (data-sound-flow="off"). */}
            <CardFluid />
            <InstallationProcess id="" play={play} />
        </div>
    );
}
