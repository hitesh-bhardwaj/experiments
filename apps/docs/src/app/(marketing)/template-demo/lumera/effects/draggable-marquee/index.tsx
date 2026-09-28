// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import Link from "next/link";
import DraggableMarqueeComp from "./DraggableMarqueeComp";

const serviceButtons = [
  { id: "brochure", text: "Download Brochure", link: "#" },
  { id: "floor-plan", text: "Download Floor Plan", link: "#" },
  { id: "payment-plan", text: "Download Payment Plan", link: "#" },
  { id: "drawings", text: "Download Architectural Drawings", link: "#" },
  { id: "amenities", text: "View Amenities", link: "#" },
  { id: "visit", text: "Schedule a Visit", link: "#" },
  { id: "sales", text: "Contact Sales Team", link: "#" },
];

interface ServiceButtonProps {
  link: string;
  btnText: string;
  className?: string;
}

const ServiceButton = ({ link, btnText, className }: ServiceButtonProps) => {
  return (
    <Link
      href={link}
      className={`fadeUp group relative inline-flex h-[7.2vw] min-w-[30vw] items-center justify-center overflow-hidden rounded-full border border-[#ca8216] bg-white px-[2.5vw] text-center text-[1.6vw] hover:border-black text-[#111111] [text-rendering:geometricPrecision] transition-colors duration-500 max-[1025px]:h-[7vw] max-[1025px]:min-w-[33.5vw] max-[1025px]:px-[2.5vw] max-[1025px]:text-[2.2vw] max-[1025px]:font-normal max-md:h-[15vw] max-md:min-w-[65vw] max-md:px-[4.5vw] max-md:text-[4.2vw] max-md:font-normal ${className ?? ""}`}
    >
      <span className="absolute inset-0 origin-bottom scale-y-0 rounded-full bg-black transition-transform duration-300 ease-out group-hover:scale-y-100" />
      <span className="relative z-10 transition-colors duration-500 group-hover:text-white">
        {btnText}
      </span>
    </Link>
  );
};

interface DraggableMarqueeProps {
  speed?: number;
  pauseOnHover?: boolean;
  throwMultiplier?: number;
  throwFriction?: number;
}

const DraggableMarquee = ({
  speed = 1.2,
  pauseOnHover = false,
  throwMultiplier = 2.8,
  throwFriction = 0.975,
}: DraggableMarqueeProps) => {
  return (
    <DraggableMarqueeComp
      items={serviceButtons}
      speed={speed}
      pauseOnHover={pauseOnHover}
      throwMultiplier={throwMultiplier}
      throwFriction={throwFriction}
      repeatCount={4}
      gapClassName="gap-[2vw] max-[1025px]:gap-[4vw]"
      className="fadeup w-full py-[0.4vw]"
      itemClassName="select-none"
      renderItem={(item) => (
        <ServiceButton
          link={item.link ?? "#"}
          btnText={item.text ?? ""}
          className="shrink-0"
        />
      )}
    />
  );
};

export default DraggableMarquee;
