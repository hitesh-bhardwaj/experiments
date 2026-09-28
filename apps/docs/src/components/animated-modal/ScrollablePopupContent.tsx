"use client";



export interface PopupSection {
  heading?: string;
  paragraph?: string;
  list?: string[];
}

export interface ScrollablePopupContentProps {
  title?: string;
  subtitle?: string;
  sections?: PopupSection[];
  className?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  roundedness?: number;
}

const ScrollablePopupContent = ({
    title = "Popup Title",
    subtitle = "",
    sections = [],
    className = "",
    size = 72,
    backgroundColor = "#ffffff",
    textColor = "#111111",
    roundedness = 24,
}: ScrollablePopupContentProps) => {
    const safeSize = Math.min(96, Math.max(40, Number(size) || 72));
    const safeRoundedness = Math.max(0, Number(roundedness) || 0);

    return (
        <div
            className={`mx-auto max-h-[82vh] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.18)] max-[1025px]:max-h-[84vh] max-md:max-h-[86vh] ${className}`}
            style={{
                width: `min(${safeSize}%, 960px)`,
                borderRadius: `${safeRoundedness}px`,
                backgroundColor,
                color: textColor,
            }}
        >
            <div className="h-full max-h-[82vh] overflow-y-auto p-[2.4vw] scrollbar-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20 max-[1025px]:max-h-[84vh] max-[1025px]:p-[4vw] max-md:max-h-[86vh] max-md:px-[5vw] max-md:py-[6vw]">
                <div className="border-b border-black/8 pb-[1.6vw]">
                    <p
                        className="mb-[0.6vw] text-[0.85vw] uppercase tracking-[0.08em] opacity-55 font-semibold max-[1025px]:mb-[1vw] max-[1025px]:text-[1.6vw] max-md:mb-[1.8vw] max-md:text-[3vw]"
                    >
                        Overview
                    </p>
                    <h2
                        className="mb-[1vw] text-[2.2vw] leading-none font-semibold max-[1025px]:mb-[1.6vw] max-[1025px]:text-[4.6vw] max-md:mb-[2.5vw] max-md:text-[7vw]"
                    >
                        {title}
                    </h2>
                    {subtitle ? (
                        <p className="w-[80%] text-[1vw] leading-[1.7] opacity-80 max-[1025px]:w-full max-[1025px]:text-[1.9vw] max-md:text-[3.6vw] max-md:leading-[1.7]">
                            {subtitle}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-[2vw] pt-[1.8vw] max-[1025px]:gap-[3.2vw] max-[1025px]:pt-[3vw] max-md:gap-[5vw] max-md:pt-[5vw]">
                    {sections.map((section, index) => (
                        <div key={index} className="flex flex-col gap-[0.9vw] max-[1025px]:gap-[1.4vw] max-md:gap-[2.4vw]">
                            {section.heading ? (
                                <h3
                                    className="text-[1.25vw] leading-[1.2] font-semibold max-[1025px]:text-[2.4vw] max-md:text-[4.4vw]"
                                >
                                    {section.heading}
                                </h3>
                            ) : null}

                            {section.paragraph ? (
                                <p className="text-[1vw] leading-[1.8] opacity-80 max-[1025px]:text-[1.9vw] max-md:text-[3.6vw] max-md:leading-[1.8]">
                                    {section.paragraph}
                                </p>
                            ) : null}

                            {section.list?.length ? (
                                <ul className="flex flex-col gap-[0.6vw] pl-[1.2vw] max-[1025px]:gap-[1vw] max-[1025px]:pl-[2.2vw] max-md:gap-[1.8vw] max-md:pl-[4vw] [&>li]:text-[1vw] [&>li]:leading-[1.7] [&>li]:opacity-80 max-[1025px]:[&>li]:text-[1.85vw] max-md:[&>li]:text-[3.4vw] max-md:[&>li]:leading-[1.7]">
                                    {section.list.map((item, itemIndex) => (
                                        <li key={itemIndex}>{item}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ScrollablePopupContent;
