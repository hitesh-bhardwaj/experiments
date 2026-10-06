// Built using Hyperiux Vault: https://vault.hyperiux.com

import AnimatedTabsComp from "./AnimatedTabsComp";

const tabsData = [
  {
    id: "overview",
    label: "Overview",
    content: (
      <div className="h-full w-full rounded-[1.5vw] border border-black/20  p-[2vw] text-black backdrop-blur-sm max-[1025px]:rounded-[2.5vw] max-[1025px]:p-[4vw] max-md:rounded-[4vw] max-md:p-[5vw]">
        <h2 className="mb-[1vw] text-[2.2vw] font-medium leading-[1.1] max-[1025px]:mb-[2vw] max-[1025px]:text-[4.5vw] max-md:mb-[3vw] max-md:text-[7vw]">
          Digital Experiences That Feel Expensive
        </h2>

        <p className="w-[72%] text-[1.1vw] leading-relaxed text-black/70 max-[1025px]:w-[90%] max-[1025px]:text-[2.2vw] max-md:w-full max-md:text-[4vw] max-md:leading-[1.6]">
          Hyperiux designs and builds premium websites, product interfaces, and
          interaction systems for brands that cannot afford to look like another
          polite rectangle on the internet.
        </p>

        <div className="mt-[2vw] flex gap-[1.5vw] max-[1025px]:mt-[3vw] max-[1025px]:gap-[2.2vw] max-md:mt-[5vw] max-md:flex-col max-md:gap-[3vw]">
          <div className="flex-1 rounded-[1vw] border border-white/10  p-[1.5vw] max-[1025px]:rounded-[1.8vw] max-[1025px]:p-[2.5vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h3 className="mb-[0.5vw] text-[2vw] font-semibold leading-none max-[1025px]:mb-[1vw] max-[1025px]:text-[3.8vw] max-md:mb-[1.5vw] max-md:text-[6vw]">
              UX
            </h3>
            <p className="text-[1vw] leading-[1.4] text-black/60 max-[1025px]:text-[1.9vw] max-md:text-[3.7vw] max-md:leading-relaxed">
              Strategy, structure, and product thinking before pixels start behaving.
            </p>
          </div>

          <div className="flex-1 rounded-[1vw] border border-white/10  p-[1.5vw] max-[1025px]:rounded-[1.8vw] max-[1025px]:p-[2.5vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h3 className="mb-[0.5vw] text-[2vw] font-semibold leading-none max-[1025px]:mb-[1vw] max-[1025px]:text-[3.8vw] max-md:mb-[1.5vw] max-md:text-[6vw]">
              UI
            </h3>
            <p className="text-[1vw] leading-[1.4] text-black/60 max-[1025px]:text-[1.9vw] max-md:text-[3.7vw] max-md:leading-relaxed">
              Interfaces with sharper hierarchy, stronger taste, and fewer filler sections.
            </p>
          </div>

          <div className="flex-1 rounded-[1vw] border border-white/10  p-[1.5vw] max-[1025px]:rounded-[1.8vw] max-[1025px]:p-[2.5vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h3 className="mb-[0.5vw] text-[2vw] font-semibold leading-none max-[1025px]:mb-[1vw] max-[1025px]:text-[3.8vw] max-md:mb-[1.5vw] max-md:text-[6vw]">
              Motion
            </h3>
            <p className="text-[1vw] leading-[1.4] text-black/60 max-[1025px]:text-[1.9vw] max-md:text-[3.7vw] max-md:leading-relaxed">
              Scroll, hover, transition, and WebGL details that earn their place.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: "services",
    label: "Services",
    content: (
      <div className="h-full w-full rounded-[1.5vw] border border-black/20  p-[2vw] text-black backdrop-blur-sm max-[1025px]:rounded-[2.5vw] max-[1025px]:p-[4vw] max-md:rounded-[4vw] max-md:p-[5vw]">
        <h2 className="mb-[1vw] text-[2.2vw] font-medium leading-[1.1] max-[1025px]:mb-[2vw] max-[1025px]:text-[4.5vw] max-md:mb-[3vw] max-md:text-[7vw]">
          From Strategy to the Last Hover State
        </h2>

        <div className="mt-[2vw] grid grid-cols-2 gap-[1.5vw] max-[1025px]:mt-[3vw] max-[1025px]:gap-[2.2vw] max-md:mt-[5vw] max-md:grid-cols-1 max-md:gap-[4vw]">
          <div className="rounded-[1vw] border border-white/10  p-[1.4vw] max-[1025px]:rounded-[1.8vw] max-[1025px]:p-[2.2vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h4 className="mb-[0.5vw] text-[1.3vw] font-medium leading-[1.2] max-[1025px]:mb-[1vw] max-[1025px]:text-[2.4vw] max-md:mb-[1.5vw] max-md:text-[4.5vw]">
              Website Redesign
            </h4>
            <p className="text-[1vw] leading-relaxed text-black/60 max-[1025px]:text-[1.9vw] max-md:text-[3.8vw] max-md:leading-[1.6]">
              Rebuild tired pages into sharper digital experiences with clearer journeys.
            </p>
          </div>

          <div className="rounded-[1vw] border border-white/10  p-[1.4vw] max-[1025px]:rounded-[1.8vw] max-[1025px]:p-[2.2vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h4 className="mb-[0.5vw] text-[1.3vw] font-medium leading-[1.2] max-[1025px]:mb-[1vw] max-[1025px]:text-[2.4vw] max-md:mb-[1.5vw] max-md:text-[4.5vw]">
              Product UX Design
            </h4>
            <p className="text-[1vw] leading-relaxed text-black/60 max-[1025px]:text-[1.9vw] max-md:text-[3.8vw] max-md:leading-[1.6]">
              Flows, screens, systems, and decisions designed for real product use.
            </p>
          </div>

          <div className="rounded-[1vw] border border-white/10  p-[1.4vw] max-[1025px]:rounded-[1.8vw] max-[1025px]:p-[2.2vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h4 className="mb-[0.5vw] text-[1.3vw] font-medium leading-[1.2] max-[1025px]:mb-[1vw] max-[1025px]:text-[2.4vw] max-md:mb-[1.5vw] max-md:text-[4.5vw]">
              Creative Frontend
            </h4>
            <p className="text-[1vw] leading-relaxed text-black/60 max-[1025px]:text-[1.9vw] max-md:text-[3.8vw] max-md:leading-[1.6]">
              Next.js, animation, interaction systems, and frontend polish that feels deliberate.
            </p>
          </div>

          <div className="rounded-[1vw] border border-white/10  p-[1.4vw] max-[1025px]:rounded-[1.8vw] max-[1025px]:p-[2.2vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h4 className="mb-[0.5vw] text-[1.3vw] font-medium leading-[1.2] max-[1025px]:mb-[1vw] max-[1025px]:text-[2.4vw] max-md:mb-[1.5vw] max-md:text-[4.5vw]">
              CRO & Performance
            </h4>
            <p className="text-[1vw] leading-relaxed text-black/60 max-[1025px]:text-[1.9vw] max-md:text-[3.8vw] max-md:leading-[1.6]">
              Cleaner paths, faster pages, stronger messaging, and fewer leaks in the funnel.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: "contact",
    label: "Contact",
    content: (
      <div className="h-full w-full rounded-[1.5vw] border border-black/20  p-[2vw] text-black backdrop-blur-sm max-[1025px]:rounded-[2.5vw] max-[1025px]:p-[4vw] max-md:rounded-[4vw] max-md:p-[5vw]">
        <h2 className="mb-[1vw] text-[2.2vw] font-medium leading-[1.1] max-[1025px]:mb-[2vw] max-[1025px]:text-[4.5vw] max-md:mb-[3vw] max-md:text-[7vw]">
          Bring Us the Messy Part
        </h2>

        <p className="w-[72%] text-[1.1vw] leading-relaxed text-black/70 max-[1025px]:w-[90%] max-[1025px]:text-[2.2vw] max-md:w-full max-md:text-[4vw] max-md:leading-[1.6]">
          Send the brief, the broken homepage, the product flow, or the idea that
          still sounds better in your head. We will help turn it into something
          structured, useful, and memorable.
        </p>

        <div className="mb-[3vw] mt-[2vw] flex gap-[3vw] max-[1025px]:mt-[3vw] max-[1025px]:gap-[5vw] max-md:mt-[5vw] max-md:flex-col max-md:gap-[4vw]">
          <div className="flex flex-col gap-[0.3vw] max-[1025px]:gap-[0.7vw] max-md:gap-[1vw]">
            <p className="text-[0.9vw] leading-[1.3] text-black/45 max-[1025px]:text-[1.7vw] max-md:text-[3.4vw]">
              Email
            </p>
            <span className="text-[1.1vw] font-medium leading-[1.4] max-[1025px]:text-[2.1vw] max-md:text-[4vw]">
              hello@hyperiux.com
            </span>
          </div>

          <div className="flex flex-col gap-[0.3vw] max-[1025px]:gap-[0.7vw] max-md:gap-[1vw]">
            <p className="text-[0.9vw] leading-[1.3] text-black/45 max-[1025px]:text-[1.7vw] max-md:text-[3.4vw]">
              Work With Us
            </p>
            <span className="text-[1.1vw] font-medium leading-[1.4] max-[1025px]:text-[2.1vw] max-md:text-[4vw]">
              Strategy, UX, UI, frontend, CRO
            </span>
          </div>
        </div>
      </div>
    ),
  },
];

interface AnimatedTabsProps {
  defaultActiveIndex?: number;
  animationType?: "fade" | "slide";
  slideDistance?: number;
  accentColor?: string;
  duration?: number;
}

export default function AnimatedTabs({
  defaultActiveIndex = 0,
  animationType = "slide",
  slideDistance = 40,
  accentColor = "#ff6b00",
  duration = 0.35,
}: AnimatedTabsProps) {
  return (
    <section className="min-h-screen w-full bg-white">
      <AnimatedTabsComp
        key={`${defaultActiveIndex}-${animationType}-${slideDistance}`}
        tabs={tabsData}
        defaultActiveIndex={defaultActiveIndex}
        animationType={animationType}
        slideDistance={slideDistance}
        accentColor={accentColor}
        duration={duration}
      />
    </section>
  );
}
