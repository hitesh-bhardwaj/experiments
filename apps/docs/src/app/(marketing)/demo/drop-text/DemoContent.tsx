"use client";

import { useState } from "react";
import DropText from "@/components/drop-text";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <RegistryRemixerDemo
      registry={registry}
      component={DropText}
      render={(values) => <DropText key={replayKey} {...values} />}
      copyCodeOptions={{ propsVariableName: "dropTextProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen overflow-hidden bg-[#101113] text-white">
          <DemoHeader />
          {effect}
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center px-6">
            <button
              type="button"
              onClick={() => setReplayKey((value) => value + 1)}
              className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/20 bg-white/8 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.28em] text-white transition hover:border-white/40 hover:bg-white/14"
            >
              Replay animation
            </button>
          </div>
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
