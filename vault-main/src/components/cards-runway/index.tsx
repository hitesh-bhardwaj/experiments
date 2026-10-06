// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import CardsRunwayComponent from "./CardsRunway";

const UI_CARDS = [
  {
    id: 1,
    title: "A smarter assistant in your pocket",
    text: "AI now drafts your messages, sets your reminders, and answers questions before you finish typing them. What once meant opening five apps is increasingly a single spoken sentence.",
  },
  {
    id: 2,
    title: "Recommendations that just fit",
    text: "The songs you discover, the shows you binge, the products you didn't know you wanted - quietly ranked by models learning your taste. Personalization has become the default, not the feature.",
  },
  {
    id: 3,
    title: "Language is no longer a wall",
    text: "Real-time translation turns menus, road signs, and conversations abroad into something you actually understand. AI is slowly erasing the friction of speaking a different tongue.",
  },
  {
    id: 4,
    title: "Creativity, on tap",
    text: "Write a prompt, get an image, a melody, or a first draft in seconds. AI doesn't replace the spark, it hands more people the tools to act on theirs.",
  },
  {
    id: 5,
    title: "Everyday coding, accelerated",
    text: "From autocompleting a function to explaining an error, AI sits beside developers as a tireless pair. The gap between an idea and a working prototype keeps getting shorter.",
  },
];

export default function CardsRunway({
  accentColor = "#ff5f00",
  cardColor = "#161616",
  speed = 1,
  gap = 48,
  perspective = 900,
}) {
  return (
    <CardsRunwayComponent
      data={UI_CARDS}
      accentColor={accentColor}
      cardColor={cardColor}
      speed={speed}
      gap={gap}
      perspective={perspective}
    />
  );
}
