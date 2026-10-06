"use client"

export interface CrossProps {
    isActive?: boolean;
    isHovered?: boolean;
    size?: number;
    prefersReducedMotion?: boolean;
    duration?: number;
    className?: string;
}

const Cross = ({
 isActive = false,
 isHovered = false,
 size = 24,
 prefersReducedMotion = false,
 duration = 0.32,
 className ="",
}: CrossProps) => {
 const rotation = (isActive ? 315 : 180) + (!prefersReducedMotion && isHovered ? 180 : 0);

 return (
 <div
 className={`flex items-center relative justify-center motion-reduce:transition-none ${className}`}
 style={{
  width: size,
  height: size,
  transform: `rotate(${rotation}deg)`,
  transitionProperty: 'transform',
  transitionDuration: prefersReducedMotion ? '0s' : `${duration}s`,
  transitionTimingFunction: 'ease-in-out',
 }}
 >
 <span
 className='absolute block w-full h-0.5 bg-current transition-transform ease-in-out motion-reduce:transition-none'
 style={{ transitionDuration: prefersReducedMotion ? '0s' : `${duration}s` }}
 />
 <span
 className='absolute block w-full h-0.5 bg-current transition-transform rotate-90 ease-in-out motion-reduce:transition-none'
 style={{ transitionDuration: prefersReducedMotion ? '0s' : `${duration}s` }}
 />
 </div>
 );
}

export default Cross
