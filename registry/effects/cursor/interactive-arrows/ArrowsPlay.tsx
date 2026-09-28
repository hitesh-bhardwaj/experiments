import React, { useCallback, useEffect, useRef } from 'react';
import { Point, lerpAngle } from './utils';
import { createSuspendedRaf } from './createSuspendedRaf';

class Arrow {
  pos: Point;
  dx: number;
  dy: number;
  angle: number;
  rotationEase: number;

  constructor(position: Point) {
    this.pos = position;
    this.dx = 0;
    this.dy = 0;
    this.angle = 0;
    this.rotationEase = 0.12;
  }

  update(mouseX: number, mouseY: number, smoothing: number) {
    this.dx = mouseX - this.pos.x;
    this.dy = mouseY - this.pos.y;
    const targetAngle = Math.atan2(this.dy, this.dx);

    this.angle = lerpAngle(this.angle, targetAngle, smoothing);
  }

  draw(ctx: CanvasRenderingContext2D, arrowColor: string, activeColor: string, mouseX: number, mouseY: number, reactionRadius: number) {
    const isActive = Math.hypot(mouseX - this.pos.x, mouseY - this.pos.y) < reactionRadius;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(-30, 0);
    ctx.moveTo(30, 0);
    ctx.lineTo(10, -20);
    ctx.moveTo(30, 0);
    ctx.lineTo(10, 20);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isActive ? activeColor : arrowColor;
    ctx.stroke();
    ctx.restore();
  }
}

const ArrowsPlay = ({
  arrowCount = 50,
  arrowColor = "black",
  activeColor = "black",
  reactionRadius = 30,
  smoothing = 0.12,
}: {
  arrowCount?: number;
  arrowColor?: string;
  activeColor?: string;
  reactionRadius?: number;
  smoothing?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const arrowsRef = useRef<Arrow[]>([]);
  const divRef = useRef<HTMLDivElement | null>(null); // For the center div with text

  const initializeArrows = useCallback((canvas: HTMLCanvasElement) => {
    const arrows: Arrow[] = [];
    const count = Math.max(1, Number(arrowCount) || 50);
    const spacing = 120 * Math.sqrt(50 / count);

    const cols = Math.floor(canvas.width / spacing);
    const rows = Math.floor(canvas.height / spacing);

    const xPadding = (canvas.width - (cols * spacing)) / 2;
    const yPadding = (canvas.height - (rows * spacing)) / 2;

    // Get div position relative to canvas
    const divRect = (divRef.current as HTMLDivElement).getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    const divLeft = divRect.left - canvasRect.left;
    const divRight = divRect.right - canvasRect.left;
    const divTop = divRect.top - canvasRect.top;
    const divBottom = divRect.bottom - canvasRect.top;
  
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        const arrowPos = new Point(
          x * spacing + xPadding,
          y * spacing + yPadding
        );
  
        
        if (
          arrowPos.x >= divLeft &&
          arrowPos.x <= divRight &&
          arrowPos.y > divTop + spacing &&
          arrowPos.y < divBottom - spacing
        ) {
          continue;
        }
  
        arrows.push(new Arrow(arrowPos));
      }
    }
    return arrows;
  }, [arrowCount]);
  

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      arrowsRef.current = initializeArrows(canvas);
    }
  }, [initializeArrows]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();


    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      mouseRef.current = {
        x: e.clientX - rect.left,  
        y: e.clientY - rect.top, 
      };
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const arrows = arrowsRef.current;
    const mouse = mouseRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    arrows.forEach(arrow => {
      arrow.update(mouse.x, mouse.y, smoothing);
      arrow.draw(ctx, arrowColor, activeColor, mouse.x, mouse.y, reactionRadius);
    });
  }, [activeColor, arrowColor, reactionRadius, smoothing]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    mouseRef.current = {
      x: width / 2,
      y: height / 2,
    };

    arrowsRef.current = initializeArrows(canvas);
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: drawFrame,
    });
    loop.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      loop.destroy();
    };
  }, [drawFrame, handleMouseMove, handleResize, initializeArrows]);

  return (
    <div className="relative w-full h-full ">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
      />
      <div
        ref={divRef}
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center cursor-pointer h-[25vw] w-[32vw] bg-transparent"
      >
        <h1 className='text-center text-[15vw] leading-none transition-all duration-500 ease' style={{ color: arrowColor }}>
          Play
        </h1>
      </div>
    </div>
  );
};

export default ArrowsPlay;
