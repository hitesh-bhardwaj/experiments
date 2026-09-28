"use client";
import { useRef, useCallback, useEffect, useState } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { createSuspendedRaf } from "./createSuspendedRaf";

gsap.registerPlugin(Draggable, InertiaPlugin);

interface MaskedContainerProps {
  size: any
  initialPosition: { x: number, y: number }
  className?: string
  video: HTMLVideoElement | null
  canvasSize: { width: number, height: number }
  friction?: number
  scaleOnDrag?: number
  canvasBorderColor?: string
  rounded?: number
  onPositionUpdate: (size: any, position: { x: number, y: number }) => void
  onHoverChange?: (hovering: boolean) => void
}

export default function MaskedContainer({
  size,
  initialPosition,
  className,
  video,
  canvasSize,
  friction = 0.12,
  scaleOnDrag = 1.04,
  canvasBorderColor = "#71717a",
  rounded = 0,
  onPositionUpdate,
  onHoverChange,
}: MaskedContainerProps) {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const safeFriction = Math.min(10, Math.max(0, Number(friction) || 0));
  const safeScaleOnDrag = Math.min(1.5, Math.max(0.85, Number(scaleOnDrag) || 1));
  const safeRounded = Math.min(80, Math.max(0, Number(rounded) || 0));

  // Canvas drawing function for individual mask
  const drawMaskedVideo = useCallback(() => {
    const canvas = canvasRef.current;
    const maskElement = maskRef.current;

    if (!canvas || !video || !maskElement) return;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const rect = maskElement.getBoundingClientRect();

    // Set canvas size to match mask
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas with black background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate video position relative to the mask position
    const maskX = rect.left;
    const maskY = rect.top;

    // Draw the portion of the video that should be visible through this mask
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.clip();

    // Draw video with offset to show the correct portion
    ctx.drawImage(video, -maskX, -maskY, canvasSize.width, canvasSize.height);
    ctx.restore();
  }, [video, canvasSize]);

  // Start animation when video is available
  useEffect(() => {
    if (!video) return;

    const loop = createSuspendedRaf({
      root: maskRef.current,
      onFrame: () => {
        drawMaskedVideo();
      },
    });
    loop.start();

    return () => loop.destroy();
  }, [video, drawMaskedVideo]);

  // GSAP Draggable functionality
  useEffect(() => {
    if (maskRef.current) {
      gsap.set(maskRef.current, { scale: 1, transformOrigin: "center center" });

      const draggable = Draggable.create(maskRef.current, {
        type: "x,y",
        inertia: true,
        bounds: "body",
        zIndexBoost: false,
        edgeResistance: 0.3,
        throwProps: {
          resistance: Math.max(50, safeFriction * 4000),
          minDuration: 2,
          maxDuration: 3,
        },
        onPress: function () {
          gsap.to(this.target, {
            scale: safeScaleOnDrag,
            duration: 0.18,
            ease: "power2.out",
            overwrite: true,
          });
        },
        onRelease: function () {
          gsap.to(this.target, {
            scale: 1,
            duration: 0.28,
            ease: "power2.out",
            overwrite: true,
          });
        },
        onDrag: function () {
          setPosition({ x: this.x, y: this.y });
          onPositionUpdate(size, { x: this.x, y: this.y });
        },
        onThrowUpdate: function () {
          setPosition({ x: this.x, y: this.y });
          onPositionUpdate(size, { x: this.x, y: this.y });
        },
      })[0];

      return () => {
        if (draggable) {
          draggable.kill();
        }
      };
    }
  }, [safeFriction, safeScaleOnDrag, size, onPositionUpdate]);

  return (
    <div
      ref={maskRef}
      className={`${className} cursor-grab active:cursor-grabbing z-10 overflow-hidden border`}
      style={{
        borderColor: canvasBorderColor,
        borderRadius: `${safeRounded}px`,
        zIndex: 20,
      }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <div className=" absolute flex gap-2 text-white/70 h-fit w-fit text-[.6vw] px-[.5vw] pt-[.3vw] py-[.1vw]">
        <p>X:{position.x.toFixed(2)}</p>
        <p>Y:{position.y.toFixed(2)}</p>
      </div>
      {/* Canvas for rendering masked video */}
      <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />
    </div>
  );
}
