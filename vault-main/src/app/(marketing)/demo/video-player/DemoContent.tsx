"use client";

import VideoPlayer from "@/components/video-player";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

const featurePoints = [
  "Custom play, pause, mute, close, and progress controls",
  "Auto-hiding controls that reappear on hover, touch, or interaction",
  "Smooth seek bar with draggable timeline support",
  "Responsive control sizing across desktop, tablet, and mobile",
];

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={VideoPlayer}
      copyCodeOptions={{ propsVariableName: "videoPlayerProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <section className="flex min-h-screen w-screen items-center max-md:items-start bg-[#111111] p-[5vw] max-md:h-auto max-md:py-[8vw] max-md:pt-24 max-sm:pt-24 max-md:pb-[8vw] max-sm:px-[5vw] max-sm:py-[12vw]">
            <div className="flex w-full justify-between gap-[5vw] max-md:flex-col max-md:gap-[6vw] max-sm:gap-[8vw]">
              {/* LEFT VIDEO */}
              <div className="aspect-video h-[27vw] w-[43vw] max-md:h-auto max-md:w-full fadeup">
                {effect}
              </div>

              {/* RIGHT CONTENT */}
              <div className="flex w-1/2 flex-col gap-[2vw] text-white max-md:w-full max-md:gap-[3vw]">
                <h1 className="text-[3vw] leading-[1.1] font-medium max-md:text-[6vw] max-sm:text-[8.5vw]">
                  <SplitLine>
                    A Custom Video Player Built for Polished Interfaces
                  </SplitLine>
                </h1>
                <SplitLine>
                  <p className="w-[85%] text-[1.1vw] leading-[1.8] opacity-80 max-md:w-full max-md:text-[2.2vw] max-sm:text-[3.8vw] max-sm:leading-[1.7]">
                    This video player gives you a clean, cinematic playback experience
                    without relying on the browser’s default controls. It handles
                    play, pause, mute, progress tracking, seeking, poster support,
                    autoplay behavior, and optional close actions inside a fully
                    styled interface.
                  </p>
                </SplitLine>


                <ul className="flex list-none flex-col gap-[0.5vw] p-0 text-[1vw] opacity-80 max-md:gap-[1vw] max-md:text-[2vw] max-sm:gap-[2vw] max-sm:text-[3.5vw] max-sm:pl-[2vw]">
                  {featurePoints.map((point) => (

                    <li key={point} className="flex gap-[0.35em]">
                      <SplitLine>
                        <span> • {point}</span>
                      </SplitLine>
                    </li>

                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
