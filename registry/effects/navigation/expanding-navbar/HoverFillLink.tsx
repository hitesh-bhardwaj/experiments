
import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from "react";

interface HoverFillLinkOwnProps {
  href: string;
  children?: ReactNode;
  className?: string;
  isActive?: boolean;
  activeColor?: string;
}

type HoverFillLinkProps = HoverFillLinkOwnProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof HoverFillLinkOwnProps>;

export function HoverFillLink({ href, children, className = "", isActive, activeColor = "#ff5f00", style, ...props }: HoverFillLinkProps) {
  const text = typeof children === "string" ? children : "";

  return (
    <>
      <a
        href={href}
        data-content={text}
        data-active={isActive ? "true" : undefined}
        className={`relative inline-block overflow-hidden text-[rgba(255,255,255,0.92)] no-underline before:absolute before:inset-0 before:content-[attr(data-content)] before:text-[var(--hover-fill-color)] before:[clip-path:polygon(0_0,0_0,0_100%,0_100%)] before:transition-[clip-path] before:duration-300 before:ease-[ease] hover:before:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%)] focus-visible:before:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%)] data-[active=true]:before:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%)] ${className}`}
        style={{ "--hover-fill-color": activeColor, ...style } as CSSProperties}
        {...props}
      >
        {children}
      </a>

      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          [data-content]::before {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}
