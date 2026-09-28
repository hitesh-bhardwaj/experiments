import React from "react";

export interface GridDotsProps extends React.ComponentProps<"div"> {
  rows?: number;
  cols?: number;
  size?: number;
  squareSize?: number;
  dotSize?: number;
  color?: string;
}

export function GridDots({
  rows = 3,
  cols = 3,
  size = 48,
  squareSize,
  dotSize = 6,
  color = "currentColor",
  className = "",
  style,
  ...props
}: GridDotsProps) {
  const total = rows * cols;
  const itemSize = squareSize ?? dotSize;

  return (
    <>
      <style>{`
        @keyframes amicro-grid-square-wave {
          0%, 100% {
            transform: scale(0.35) translateY(0);
            opacity: 0.2;
          }
          40% {
            transform: scale(1.15) translateY(-2px);
            opacity: 1;
          }
          70% {
            transform: scale(0.65) translateY(0);
            opacity: 0.55;
          }
        }
      `}</style>
      <div
        role="status"
        aria-label="Loading"
        className={`inline-grid gap-1 items-center justify-center select-none ${className}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          width: size,
          height: size,
          ...style,
        }}
        {...props}
      >
        {Array.from({ length: total }).map((_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const delay = (row + col) * 0.12;

          return (
            <span
              key={i}
              className="rounded-none will-change-transform"
              style={{
                width: itemSize,
                height: itemSize,
                borderRadius: 0,
                backgroundColor: color,
                animation: "amicro-grid-square-wave 1.4s ease-in-out infinite",
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
        <span className="sr-only">Loading</span>
      </div>
    </>
  );
}

export default GridDots;
