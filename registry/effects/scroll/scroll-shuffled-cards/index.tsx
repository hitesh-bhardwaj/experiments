// Built using Hyperiux Vault: https://vault.hyperiux.com

import ScrollShuffledCardsComp from "./ScrollShuffledCardsComp";


const ScrollShuffledCards = ({
 background = "#FFFBEB",
 cardsGap = 6,
 sectionHeight = 400,
 shuffleIntensity = 1,
}: { background?: string; cardsGap?: number; sectionHeight?: number; shuffleIntensity?: number }) => {
 const scaleRange = ([min, max]: [number, number]): [number, number] => [min * shuffleIntensity, max * shuffleIntensity];

 return (
    <>

 <section className="w-screen h-screen">
 <ScrollShuffledCardsComp
 cards={cardsData}
 heading="Scroll Shuffled Cards"
 sectionHeight={sectionHeight}
 cardWidth="25vw"
 cardHeight="30vw"
 cardsGap={`${cardsGap}vw`}
 background={background}
 initialContainerXPercent={100}
 finalContainerXPercent={-100}
 startXRange={scaleRange([-4, 4])}
 startYRange={scaleRange([-4, 4])}
 startRotateRange={scaleRange([-6, 6])}
 endXRange={scaleRange([-20, 30])}
 endYRange={scaleRange([-10, 10])}
 endRotateRange={scaleRange([-10, 10])}
 />
 </section>

 </>
 );
};

export default ScrollShuffledCards;


const cardsData = [
 {
 id: 1,
 bgOuter:"bg-[#932F6D]",
 bgInner:"bg-[#E07BE0]",
 text:"text-[#932F6D]",
 eyebrow:"Residential",
 title:"Luxury Living",
 description:
"Curated homes designed for buyers who want premium finishes, strong location value, and a lifestyle that feels elevated from day one.",
 },
 {
 id: 2,
 bgOuter:"bg-[#29BF12]",
 bgInner:"bg-[#ABFF4F]",
 text:"text-[#29BF12]",
 eyebrow:"Commercial",
 title:"Retail Growth",
 description:
"High-visibility spaces built for ambitious brands that need stronger walk-ins, better frontage, and a location that supports scale.",
 },
 {
 id: 3,
 bgOuter:"bg-[#4C6085]",
 bgInner:"bg-[#39A0ED]",
 text:"text-[#4C6085]",
 eyebrow:"Investment",
 title:"Future Value",
 description:
"Properties selected for long-term upside, resilient demand, and the kind of positioning that attracts serious investors.",
 },
 {
 id: 4,
 bgOuter:"bg-[#8c42b7]",
 bgInner:"bg-[#BC96E6]",
 text:"text-[#8c42b7]",
 eyebrow:"Coastal",
 title:"Beach Escape",
 description:
"Private living environments that combine calm surroundings, direct access, and a premium everyday experience by the water.",
 },
 {
 id: 5,
 bgOuter:"bg-[#b66f3b]",
 bgInner:"bg-[#ECE4B7]",
 text:"text-[#b66f3b]",
 eyebrow:"Urban",
 title:"City Edge",
 description:
"Sharply positioned spaces built for people who want access, energy, and a stronger connection to the city’s best districts.",
 },
];
