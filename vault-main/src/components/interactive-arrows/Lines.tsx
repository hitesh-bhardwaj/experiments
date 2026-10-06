import React, { useCallback, useEffect, useRef } from 'react';
import { createSuspendedRaf } from './createSuspendedRaf';

class Point {
  x: number;
  y: number;

  constructor(x?: number, y?: number) {
    this.x = x || 0;
    this.y = y || 0;
  }

  draw(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number, lineLength: number, arrowColor: string, activeColor: string, reactionRadius: number) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const unitX = dx / distance;
    const unitY = dy / distance;
    const lineEndX = this.x + unitX * lineLength;
    const lineEndY = this.y + unitY * lineLength;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.strokeStyle = distance < reactionRadius ? activeColor : arrowColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

const Lines = ({
  arrowCount = 50,
  arrowColor = "black",
  activeColor = "black",
  reactionRadius = 30,
}: {
  arrowCount?: number;
  arrowColor?: string;
  activeColor?: string;
  reactionRadius?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const pointsRef = useRef<Point[]>([]);
  const lineLength = 30;

  const initializePoints = useCallback((canvas: HTMLCanvasElement) => {
    const points: Point[] = [];
    const count = Math.max(1, Number(arrowCount) || 50);
    const spacing = 60 * Math.sqrt(50 / count);
    const cols = Math.ceil(canvas.width / spacing);
    const rows = Math.ceil(canvas.height / spacing);

    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        points.push(new Point(x * spacing, y * spacing));
      }
    }
    return points;
  }, [arrowCount]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      pointsRef.current = initializePoints(canvas);
    }
  }, [initializePoints]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsRef.current.forEach(point => point.draw(ctx, mouseRef.current.x, mouseRef.current.y, lineLength, arrowColor, activeColor, reactionRadius));
  }, [activeColor, arrowColor, reactionRadius]);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    pointsRef.current = initializePoints(canvas);
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: drawFrame,
    });
    loop.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      loop.destroy();
    };
  }, [drawFrame, handleMouseMove, handleResize, initializePoints]);

  return <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />;
};

export default Lines;
