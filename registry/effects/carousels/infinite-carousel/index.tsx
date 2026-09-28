// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import InfiniteCarouselComp from "./InfiniteCarouselComp";

interface CarouselCardProps {
    title: string;
    subtitle: string;
    description: string;
    themeClass: string;
    points: string[];
    cardSize?: number;
    cardWidth?: number;
    cardHeight?: number;
}

function CarouselCard({ title, subtitle, description, themeClass, points, cardSize = 1, cardWidth = 512, cardHeight = 52 }: CarouselCardProps) {
    const resolvedCardSize = Math.max(0.5, Number(cardSize) || 1);
    const resolvedCardWidth = Math.max(260, Number(cardWidth) || 512) * resolvedCardSize;
    const resolvedCardHeight = Math.max(28, Number(cardHeight) || 52) * resolvedCardSize;

    return (
        <div
            className="h-full w-lg px-3 max-[1025px]:w-md max-[1025px]:min-w-md max-[1025px]:max-w-[calc(100vw-5.5rem)] max-[1025px]:px-3 max-md:w-[calc(100vw-1.5rem)] max-md:min-w-[calc(100vw-1.5rem)] max-md:max-w-[calc(100vw-1.5rem)] max-md:px-2"
            style={{ width: `${resolvedCardWidth}px`, minWidth: `${resolvedCardWidth}px` }}
        >
            <div
                className={`flex h-full min-h-[52vh] w-full flex-col gap-[1.2vw] border max-[1025px]:min-h-[58vh] max-[1025px]:gap-[2vw] max-md:min-h-[50vh] max-md:w-full max-md:gap-[4vw] p-[2vw] max-[1025px]:p-[3vw] max-md:px-6 max-md:py-10 overflow-hidden rounded-4xl max-md:rounded-2xl ${themeClass}`}
                style={{ minHeight: `${resolvedCardHeight}vh`, borderRadius: "1.2vw", borderColor: "rgba(0,0,0,0.2)" }}
            >
                <div className="flex h-full flex-col gap-5">
                    <span className="inline-flex w-fit items-center rounded-full border border-current px-4 py-2 text-[0.75rem] font-bold tracking-[0.12em] uppercase max-md:text-[0.68rem]">{subtitle}</span>
                    <h2 className="m-0 text-5xl leading-[0.92] tracking-tighter max-[1025px]:text-[1.75rem] max-md:text-[1.45rem]">{title}</h2>
                    <p className="m-0 max-w-[92%] text-[1.05rem] leading-[1.45] max-[1025px]:max-w-full max-[1025px]:text-[0.92rem] max-md:text-[0.88rem]">{description}</p>

                    <div className="mt-auto flex flex-col gap-3.5">
                        {points.map((point, pointIndex) => (
                            <p key={pointIndex} className="m-0 border-t border-current pt-3.5 text-[0.96rem] leading-[1.45] max-[1025px]:text-[0.92rem] max-md:text-[0.88rem]">
                                {point}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function InfiniteCarousel({
    draggable = true,
    gap = 32,
    cardSize = 1,
    cardWidth = 512,
    cardHeight = 52,
}) {
    const cards = cardsData;
    const showNav = true;
    const mobileBreakpoint = 640;
    const speed = 1;
    const pauseOnHover = true;
    const direction = "left";
    const resolvedGap = Number(gap) || 32;
    const resolvedCardSize = Math.max(0.5, Number(cardSize) || 1);
    const resolvedCardWidth = Math.max(260, Number(cardWidth) || 512);
    const resolvedCardHeight = Math.max(28, Number(cardHeight) || 52);
    const carouselLayoutKey = `${resolvedGap}-${resolvedCardSize}-${resolvedCardWidth}-${resolvedCardHeight}`;

    return (
        <section className="min-h-screen w-full overflow-hidden bg-[#f4f0ea] px-0 pt-4 max-[1025px]:pt-6 max-[1025px]:pb-12 max-md:min-h-0 max-md:h-auto max-md:pb-0">


            <div className="w-full">
                <InfiniteCarouselComp
                    key={carouselLayoutKey}
                    controlsClassName="pl-8 max-[1025px]:px-3 max-md:px-2"
                    wrapperStyle={{
                        width: "100%",
                        minHeight: "auto",
                        alignItems: "stretch",
                        gap: `${resolvedGap}px`,
                    }}
                    pageClassName="gap-8 max-[1025px]:gap-6 max-md:gap-4"
                    prevLabel={<ArrowLeft />}
                    nextLabel={<ArrowRight />}
                    prevBtnStyle={{
                        borderRadius: "999px",
                        padding: "0.85rem 1rem",
                    }}
                    nextBtnStyle={{
                        borderRadius: "999px",
                        padding: "0.85rem 1rem",
                    }}
                    draggable={draggable}
                    showNav={showNav}
                    mobileBreakpoint={mobileBreakpoint}
                    speed={speed}
                    pauseOnHover={pauseOnHover}
                    direction={direction}
                >
                    {cards.map((card) => (
                        <CarouselCard key={card.id} {...card} cardSize={resolvedCardSize} cardWidth={resolvedCardWidth} cardHeight={resolvedCardHeight} />
                    ))}
                </InfiniteCarouselComp>
            </div>
        </section>
    );
}

const cardsData = [
    {
        id: 1,
        title: "Luxury Residences",
        subtitle: "Dubai Marina",
        description:
            "Experience premium waterfront living with unmatched skyline views, private amenities, and a location built for modern luxury.",
        themeClass: "bg-[#111844] text-white",
        points: [
            "Private infinity pool, spa, and concierge access.",
            "Floor-to-ceiling glass with panoramic marina views.",
            "Designed for buyers who want prestige and convenience.",
        ],
    },
    {
        id: 2,
        title: "Commercial Spaces",
        subtitle: "Downtown Business Bay",
        description:
            "High-performance office environments crafted for ambitious brands, fast-growing teams, and companies that want presence.",
        themeClass: "bg-[#EAE0CF] text-[#111111]",
        points: [
            "Flexible layouts for studios, offices, and hybrid teams.",
            "Prime location close to transport, hotels, and retail.",
            "Ideal for startups, agencies, and enterprise hubs.",
        ],
    },
    {
        id: 3,
        title: "Beachfront Villas",
        subtitle: "Palm Jumeirah",
        description:
            "Escape into private coastal living with architectural elegance, serene surroundings, and direct beach access.",
        themeClass: "bg-[#4B5694] text-[#ffffff]",
        points: [
            "Private beach entry and landscaped outdoor decks.",
            "Large family spaces with premium interior finishes.",
            "Created for a calmer, more exclusive lifestyle.",
        ],
    },
    {
        id: 4,
        title: "Skyline Penthouses",
        subtitle: "Jumeirah Lake Towers",
        description:
            "Elevated urban living for buyers who want privacy, prestige, and dramatic city views from every level.",
        themeClass: "bg-[#8CC0EB] text-[#ffffff]",
        points: [
            "Expansive terraces with lounge and dining zones.",
            "Premium finishes and double-height living spaces.",
            "Perfect for statement living in the heart of the city.",
        ],
    },
    {
        id: 5,
        title: "Retail Boutiques",
        subtitle: "Dubai Hills",
        description:
            "Commercial retail environments positioned for visibility, high-value footfall, and strong brand presence.",
        themeClass: "bg-[#2C5EAD] text-[#FFFFFF]",
        points: [
            "High-traffic locations inside premium districts.",
            "Flexible layouts for flagship retail experiences.",
            "Built for visibility, conversion, and long-term value.",
        ],
    },
    {
        id: 6,
        title: "Family Townhomes",
        subtitle: "Arabian Ranches",
        description:
            "Well-planned residential communities designed for spacious family living, convenience, and long-term comfort.",
        themeClass: "bg-[#E8DDB4] text-[#111111]",
        points: [
            "Community parks, schools, and lifestyle amenities.",
            "Spacious interiors with practical modern layouts.",
            "A balanced choice for comfort and investment.",
        ],
    },
];
