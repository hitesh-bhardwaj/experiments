"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NumericTunnelLoader } from "./NumericTunnelLoader";
import Button from "../WebsiteComps/Button";

interface NumericTunnelProps {
  digitCount?: number;
  speed?: number;
  depth?: number;
  textColor?: string;
  backgroundColor?: string;
}

export default function NumericTunnel({
  digitCount = 50,
  speed = 1,
  depth = 900,
  textColor = "#ffffff",
  backgroundColor = "#000000",
}: NumericTunnelProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [tunnelInstance, setTunnelInstance] = useState(0);
  const didMountRef = useRef(false);
  const tunnelConfig = useMemo(
    () => ({ digitCount, speed, depth, textColor, backgroundColor }),
    [backgroundColor, depth, digitCount, speed, textColor]
  );

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    setIsComplete(false);
    setTunnelInstance((currentInstance) => currentInstance + 1);
  }, [tunnelConfig]);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  const handleReplay = useCallback(() => {
    setIsComplete(false);
    setTunnelInstance((currentInstance) => currentInstance + 1);
  }, []);

  return (
    <NumericTunnelLoader
      key={tunnelInstance}
      onComplete={handleComplete}
      config={tunnelConfig}
    >
      <div className="h-screen w-full bg-white">
        <div className="h-full w-full flex flex-col items-center justify-center gap-6">
          <h1 className=" text-black text-[4vw] font-bold max-md:text-[8vw]">
            HYPERIUX VAULT
          </h1>
          <Button
            text=" Explore All Effects"
            href="/effects"
            variant="orange"
            className=" border border-primary!"
          />
          <Button
            text=" Read Article"
            href="/effects/loaders/numeric-tunnel"
            variant="outline2"
            className="bg-black! border-black!"
          />
          <button
            type="button"
            onClick={handleReplay}
            className={`
    rounded-full border border-black/10 bg-white/60 px-5 py-2
    text-sm font-medium text-black backdrop-blur-md

    transition-all duration-300
    hover:scale-105 hover:border-black/20 hover:bg-white/80
    active:scale-95
    ${isComplete ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            ↻ Replay
          </button>
        </div>
      </div>
    </NumericTunnelLoader>
  );
}
