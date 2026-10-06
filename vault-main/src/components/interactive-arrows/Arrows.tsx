import React, { useCallback, useEffect, useRef, type RefObject } from 'react';
import { Point, lerpAngle } from './utils';
import { createSuspendedRaf } from './createSuspendedRaf';

class Arrow {
  pos: Point;
  arrowsRef: RefObject<Arrow[]>;
  dx: number;
  dy: number;
  angle: number;
  isHovered: boolean;
  originalPos: { x: number; y: number };
  targetPos: { x: number; y: number };

  constructor(position: Point, arrowsRef: RefObject<Arrow[]>) {
    this.pos = position;
    this.arrowsRef = arrowsRef;
    this.dx = 0;
    this.dy = 0;
    this.angle = 0;
    this.isHovered = false;
    this.originalPos = { ...position };
    this.targetPos = { ...position };
  }

  update(mouseX: number, mouseY: number, reactionRadius: number, angleSmoothing: number, positionSmoothing: number, allowSpacing: boolean) {
    this.dx = mouseX - this.pos.x;
    this.dy = mouseY - this.pos.y;

    const targetAngle = Math.atan2(this.dy, this.dx) * 0.95;

    this.angle = lerpAngle(this.angle, targetAngle, angleSmoothing);

    // Check if mouse is near this arrow
    const distance = Math.sqrt(
      Math.pow(mouseX - this.pos.x, 2) +
      Math.pow(mouseY - this.pos.y, 2)
    );

    const wasHovered = this.isHovered;
    this.isHovered = distance < reactionRadius;

    // Handle spacing animation
    if (this.isHovered !== wasHovered && allowSpacing) {
      if (this.isHovered) {
        // Push surrounding arrows away
        this.arrowsRef.current.forEach(otherArrow => {
          if (otherArrow !== this) {
            const dx = otherArrow.pos.x - this.pos.x;
            const dy = otherArrow.pos.y - this.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const pushRadius = reactionRadius * (70 / 30);
            if (dist < pushRadius) {
              const pushForce = (pushRadius - dist) / pushRadius;
              otherArrow.targetPos = {
                x: otherArrow.originalPos.x + (dx / dist) * 20 * pushForce,
                y: otherArrow.originalPos.y + (dy / dist) * 20 * pushForce
              };
            }
          }
        });
      } else {
        // Reset surrounding arrows
        this.arrowsRef.current.forEach(arrow => {
          arrow.targetPos = { ...arrow.originalPos };
        });
      }
    }

    // Smooth position transition
    this.pos.x += (this.targetPos.x - this.pos.x) * positionSmoothing;
    this.pos.y += (this.targetPos.y - this.pos.y) * positionSmoothing;
  }

  draw(ctx: CanvasRenderingContext2D, arrowColor: string, activeColor: string) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.beginPath();

    ctx.moveTo(20, 0);
    ctx.lineTo(-20, 0);
    ctx.moveTo(20, 0);
    ctx.lineTo(5, -15);
    ctx.moveTo(20, 0);
    ctx.lineTo(5, 15);
    ctx.lineWidth = this.isHovered ? 3 : 2;
    ctx.strokeStyle = this.isHovered ? activeColor : arrowColor;
    ctx.stroke();
    ctx.restore();
  }
}

const Arrows = ({
  arrowCount = 50,
  arrowColor = "black",
  activeColor = "black",
  reactionRadius = 30,
  smoothing = 0.15,
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
  const controlsRef = useRef({ arrowColor, activeColor, reactionRadius, smoothing });
  const lastReactionRadiusRef = useRef(reactionRadius);
  const suppressSpacingFramesRef = useRef(0);

  useEffect(() => {
    if (lastReactionRadiusRef.current !== reactionRadius) {
      lastReactionRadiusRef.current = reactionRadius;
      suppressSpacingFramesRef.current = 8;
      arrowsRef.current.forEach((arrow) => {
        arrow.targetPos = { ...arrow.originalPos };
      });
    }

    controlsRef.current = { arrowColor, activeColor, reactionRadius, smoothing };
  }, [activeColor, arrowColor, reactionRadius, smoothing]);

  const initializeArrows = useCallback((canvas: HTMLCanvasElement) => {
    const arrows: Arrow[] = [];
    const count = Math.max(1, Number(arrowCount) || 50);
    const spacing = 50 * Math.sqrt(50 / count);
    const cols = Math.floor(canvas.width / spacing);
    const rows = Math.floor(canvas.height / spacing);
    const xPadding = (canvas.width - (cols * spacing)) / 2;
    const yPadding = (canvas.height - (rows * spacing)) / 2;
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        arrows.push(new Arrow(new Point(x * spacing + xPadding, y * spacing + yPadding), arrowsRef));
      }
    }
    return arrows;
  }, [arrowCount]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      arrowsRef.current = initializeArrows(canvas);
    }
  }, [initializeArrows]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const arrows = arrowsRef.current;
    const mouse = mouseRef.current;
    const controls = controlsRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const resolvedSmoothing = controls.smoothing === 0.12 ? 0.15 : controls.smoothing;
    const allowSpacing = suppressSpacingFramesRef.current <= 0;
    arrows.forEach(arrow => {
      arrow.update(mouse.x, mouse.y, controls.reactionRadius, resolvedSmoothing, resolvedSmoothing * (0.1 / 0.15), allowSpacing);
      arrow.draw(ctx, controls.arrowColor, controls.activeColor);
    });
    if (suppressSpacingFramesRef.current > 0) {
      suppressSpacingFramesRef.current -= 1;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
    // <div className="w-full h-full bg-white">
      <canvas ref={canvasRef} className="w-full h-full" />
    // </div>
  );
};

export default Arrows;
