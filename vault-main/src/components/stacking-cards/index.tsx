// Built using Hyperiux Vault: https://vault.hyperiux.com

import StackingCardComp from './StackingCardComp';

const data = [
  {
    id: "01",
    category: "Astronomy",
    title: "Black Holes, Deep Space, Cosmic Discoveries",
    backgroundColor: "bg-[#F7FFDC]",
    description:
      "Explore mysterious galaxies, collapsing stars, and the endless possibilities hidden across the universe.",
    image: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg",
  },
  {
    id: "02",
    category: "Architecture",
    title: "Modern Homes, Urban Design, Smart Structures",
    backgroundColor: "bg-[#D1F3F5]",
    description:
      "Discover innovative spaces blending sustainability, functionality, and futuristic design philosophies.",
    image: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-06.jpg",
  },
  {
    id: "03",
    category: "Wildlife",
    title: "Rare Species, Nature Expeditions, Conservation",
    backgroundColor: "bg-[#DDD9FF]",
    description:
      "Dive into the natural world through breathtaking ecosystems and stories of survival in the wild.",
    image: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-07.jpg",
  },
  {
    id: "04",
    category: "Music",
    title: "Electronic Beats, Indie Sounds, Global Rhythms",
    backgroundColor: "bg-[#FFDDCA]",
    description:
      "Experience evolving sound cultures, underground artists, and genre-defining musical experiments.",
    image: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-08.jpg",
  },
  {
    id: "05",
    category: "Technology",
    title: "Robotics, Quantum Computing, Future Devices",
    backgroundColor: "bg-[#DDD9FF]",
    description:
      "Uncover emerging innovations shaping how humans interact with machines and digital ecosystems.",
    image: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-09.jpg",
  },
  {
    id: "06",
    category: "Travel",
    title: "Hidden Cities, Scenic Routes, Cultural Journeys",
    backgroundColor: "bg-[#E4F5D4]",
    description:
      "Journey through breathtaking destinations, local traditions, and unforgettable travel experiences.",
    image: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-10.jpg",
  },
];

export default function StackingCards({
  imageZoomEnabled = true,
  tiltEnabled = true,
  cardCornerRadius = "3vw",
  stackPerspective = 1200,
}) {
  return (
    <StackingCardComp
      data={data}
      imageZoomEnabled={imageZoomEnabled}
      tiltEnabled={tiltEnabled}
      cardCornerRadius={cardCornerRadius}
      stackPerspective={stackPerspective}
    />
  );
}
