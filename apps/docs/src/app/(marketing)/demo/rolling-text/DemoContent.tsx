"use client";

import { useState } from "react";
import RollingText from "@/components/rolling-text";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <RegistryRemixerDemo
      registry={registry}
      component={RollingText}
      render={(values) => <RollingText key={replayKey} {...values} />}
      copyCodeOptions={{ propsVariableName: "rollingTextProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen">
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
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
