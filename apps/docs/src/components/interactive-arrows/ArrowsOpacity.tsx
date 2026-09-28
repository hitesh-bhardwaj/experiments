import React, { useEffect, useRef } from 'react';
import { Point } from './utils';
import { createSuspendedRaf } from './createSuspendedRaf';

class Arrow {
  pos: Point;
  dx: number;
  dy: number;
  angle: number;
  dist: number;

  constructor(position: Point) {
    this.pos = position;
    this.dx = 0;
    this.dy = 0;
    this.angle = 0;
    this.dist = 0;
  }

  update(mx: number, my: number, smoothing: number) {
    this.dx = mx - this.pos.x;
    this.dy = my - this.pos.y;
    this.dist = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    const targetAngle = Math.atan2(this.dy, this.dx);
    this.angle += (targetAngle - this.angle) * smoothing;
  }

  draw(ctx: CanvasRenderingContext2D, arrowColor: string, activeColor: string, reactionRadius: number) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(-30, 0);
    ctx.moveTo(30, 0);
    ctx.lineTo(5, -30);
    ctx.moveTo(30, 0);
    ctx.lineTo(5, 30);
    ctx.lineWidth = 5;
    const alpha = 1 - (this.dist / 300);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.strokeStyle = this.dist < reactionRadius ? activeColor : arrowColor;
    ctx.stroke();
    ctx.restore();
  }
}

const ArrowsOpacity = ({
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
  const arrowArrRef = useRef<Arrow[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const initializeArrows = (canvas: HTMLCanvasElement) => {
      arrowArrRef.current = [];
      const count = Math.max(1, Number(arrowCount) || 50);
      const spacing = 75 * Math.sqrt(50 / count);
      for (let y = 0; y < canvas.height / 20; y++) {
        for (let x = 0; x < canvas.width / 50; x++) {
          const arr = new Arrow(new Point(x * spacing, y * spacing));
          arrowArrRef.current.push(arr);
        }
      }
    };

    const handleResize = () => {
      const canvas = canvasRef.current as HTMLCanvasElement;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initializeArrows(canvas);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
        mouseRef.current = { x: mouseX, y: mouseY };
      }
    };

    const canvas = canvasRef.current as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initializeArrows(canvas);
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: () => {
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const { x: mx, y: my } = mouseRef.current;
        for (let y = 0; y < canvas.height / 20; y++) {
          for (let x = 0; x < canvas.width / 50; x++) {
            const arrow = arrowArrRef.current[y * 10 + x];
            if (arrow) {
              arrow.update(mx, my, smoothing === 0.12 ? 1 : smoothing);
              arrow.draw(ctx, arrowColor, activeColor, reactionRadius);
            }
          }
        }
      },
    });
    loop.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      loop.destroy();
    };
  }, [activeColor, arrowColor, arrowCount, reactionRadius, smoothing]);

  return (
      <canvas ref={canvasRef} className="w-full h-full pointer-events-auto" />
  );
};

export default ArrowsOpacity;
