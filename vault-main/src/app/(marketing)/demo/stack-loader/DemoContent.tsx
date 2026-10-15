"use client";

import { useState, type ComponentProps } from "react";
import StackLoader from "@/components/stack-loader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import Button from "@/components/WebsiteComps/Button";

type StackLoaderProps = ComponentProps<typeof StackLoader>;

// Demo-only chrome (title, site links, replay) revealed once the loader
// finishes - kept out of the shipped component.
function StackLoaderDemo(props: StackLoaderProps) {
  const [replayKey, setReplayKey] = useState(0);
  const { imageSize, duration, fadeOutDuration, backgroundColor } = props;

  // StackLoader replays itself on prop changes, so the overlay only shows
  // when the run that completed matches the current props + replay.
  const runKey = JSON.stringify([replayKey, imageSize, duration, fadeOutDuration, backgroundColor]);
  const [completedRunKey, setCompletedRunKey] = useState<string | null>(null);
  const isLoaderComplete = completedRunKey === runKey;

  const handleReplay = () => {
    setReplayKey((currentKey) => currentKey + 1);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-900">
      <div
        className={`absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-center gap-10 transition-all duration-500 ${isLoaderComplete
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-4 opacity-0 pointer-events-none"
          }`}
      >
        <p className="text-center text-[5vw] max-lg:text-4xl font-medium text-neutral-300">
          HYPERIUX VAULT
        </p>
        <div className="space-y-3">
          <Button text="Explore All Effects" href="/effects" variant="orange" />
          <Button text=" Read Article" href="/effects/loaders/stack-loader" variant="outline2" />
        </div>
        <button
          type="button"
          onClick={handleReplay}
          className={`
            rounded-full border border-white/15 bg-white/5 px-5 py-2
            text-sm font-medium text-white backdrop-blur-md
            transition-all duration-300 cursor-pointer
            hover:scale-105 hover:border-white/30 hover:bg-white/10
            active:scale-95`}
        >
          ↻ Replay
        </button>
      </div>

      <div className="absolute inset-0">
        <StackLoader
          key={replayKey}
          {...props}
          onComplete={() => setCompletedRunKey(runKey)}
        />
      </div>
    </div>
  );
}

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={StackLoaderDemo}
      copyCodeOptions={{ propsVariableName: "stackLoaderProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
