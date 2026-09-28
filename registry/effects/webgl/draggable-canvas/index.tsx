// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import MaskedContainer from "./MaskedContainer";
import DragCursor from "./DragCursor";

gsap.registerPlugin(Draggable, InertiaPlugin);

export default function DraggableCanvas({
  friction = 0.12,
  scaleOnDrag = 1.04,
  backgroundColor = "#000000",
  canvasBorderColor = "#71717a",
  rounded = 0,
}: {
  friction?: number;
  scaleOnDrag?: number;
  backgroundColor?: string;
  canvasBorderColor?: string;
  rounded?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isHoveringDraggable, setIsHoveringDraggable] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [, setContainerPositions] = useState({
    large: { x: 0, y: 0 },
    medium: { x: 0, y: 0 },
    small: { x: 0, y: 0 },
    extra1: { x: 0, y: 0 },
    extra2: { x: 0, y: 0 },
    extra3: { x: 0, y: 0 }
  });

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoElement(node);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;

    const syncReducedMotion = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion("matches" in event ? event.matches : mediaQuery.matches);
    };

    syncReducedMotion(mediaQuery);
    mediaQuery.addEventListener("change", syncReducedMotion);
    return () => mediaQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    const video = videoElement;

    if (!video) return;

    // Set canvas size
    const updateCanvasSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    // Video event handlers
    const handleVideoCanPlay = () => {
      setIsVideoReady(true);
    };

    const handleVideoError = () => {
      console.error("Video failed to load");
      setIsVideoReady(false);
    };

    // Add video event listeners
    video.addEventListener("canplay", handleVideoCanPlay);
    video.addEventListener("error", handleVideoError);

    // Force video to load
    video.load();

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      video.removeEventListener("canplay", handleVideoCanPlay);
      video.removeEventListener("error", handleVideoError);
    };
  }, [videoElement]);

  
  const handlePositionUpdate = useCallback(
    (size: any, position: { x: number, y: number }) => {
      setContainerPositions(prev => ({
        ...prev,
        [size]: position
      }));
    },
    []
  );

  const handleHoverChange = useCallback((isHovering: boolean) => {
    setIsHoveringDraggable(isHovering);
  }, []);

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ backgroundColor }}
    >
        <DragCursor isHoveringDraggable={isHoveringDraggable}/>
        <div className="absolute w-full h-full inset-0  z-10"></div>
        <p className="pointer-events-none absolute bottom-8 right-8 z-40 max-w-[31vw] max-[1025px]:max-w-[55vw] max-md:max-w-[85vw] px-6 text-right max-[1025px]:text-center max-[1025px]:mx-auto font-mono text-sm  leading-relaxed text-white/75 [text-shadow:0_3px_18px_rgba(0,0,0,0.85)] max-[1025px]:text-base max-md:text-sm max-md:bottom-18">
          Drag the floating canvases - each window steals a different slice of the same moving dream.<span className="lg:hidden"> (best experience on desktop)</span>
        </p>
        {prefersReducedMotion && (
         <div
            aria-live="polite"
            className="pointer-events-none fixed bottom-4 left-4 z-40 w-fit max-w-75 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-[1025px]:hidden"
          >
            <h2 className="text-sm leading-none text-white">
              The canvas keep drifting.
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/65">
              Draggable Canvas is built on continuous drag and inertia
              physics. Since the motion is the entire effect, reduced motion
              can&apos;t be applied here.
            </p>
          </div>
        )}
      {/* Hidden video element - single source for all masks */}
      <video
        ref={setVideoRef}
        src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/draggable-video.mp4"
        className="opacity-0 absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      />
    

      {isVideoReady && (
        <MaskedContainer
          size="large"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[60vw] h-[35vw] absolute top-[10vh] left-[10vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}

      {isVideoReady && (
        <MaskedContainer
          size="medium"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[17vw] h-[9vw] max-md:h-[35vw] max-md:top-[30%] absolute top-[8%] left-[5vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}

    

      {isVideoReady && (
        <MaskedContainer
          size="extra1"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[35vw] h-[19vw] max-md:h-[50vw] absolute top-[8vh] max-md:top-[25vh] right-[5vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}

      {isVideoReady && (
        <MaskedContainer
          size="extra2"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[38vw] h-[22vw] absolute top-[50vh] left-[5vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}

      {isVideoReady && (
        <MaskedContainer
          size="extra3"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[25vw] h-[14vw] max-md:h-[25vh] absolute bottom-[20%] right-[10vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}
        {isVideoReady && (
        <MaskedContainer
          size="small"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[22vw] max-md:w-[45vw] max-md:h-[20vh] h-[12vw] absolute bottom-[15vh] max-md:left-[40%] left-1/2 -translate-x-1/2"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}
    </div>
  );
}
