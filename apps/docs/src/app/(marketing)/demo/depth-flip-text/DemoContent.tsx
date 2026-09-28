"use client";

import { useState } from "react";
import DepthFlipText from "@/components/depth-flip-text";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <RegistryRemixerDemo
      registry={registry}
      component={DepthFlipText}
      render={(values) => <DepthFlipText key={replayKey} {...values} />}
      copyCodeOptions={{ propsVariableName: "depthFlipTextProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen overflow-hidden bg-[#f6f5f2] text-[#050505]">
          <DemoHeader logoColor="#ffffff" textColor="#ffffff" />
          {effect}
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center px-6">
            <button
              type="button"
              onClick={() => setReplayKey((value) => value + 1)}
              className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.28em] text-white transition hover:border-white/30 hover:bg-white/10"
            >
              Replay animation
            </button>
          </div>
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
