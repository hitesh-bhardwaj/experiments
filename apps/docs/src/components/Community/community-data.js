// Copy for the /community page. Plain data (no "use client") so the server
// page can build the FAQ JSON-LD from the same items the accordion renders.

export const STACKS = ["React", "Next.js", "GSAP", "Three.js", "WebGL", "Motion", "Lenis", "Vue", "Svelte", "Webflow"];

// `em` is the word the concept picks out in orange
export const FAMILIAR = [
  { text: "You’ve rebuilt the same scroll reveal six times this year." },
  { text: "You spent an hour on one easing curve. Nobody noticed.", em: "You", after: " did." },
  { text: "Someone called your page transition “just an animation.”" },
  { text: "You shipped something beautiful, with nobody around who’d really get it." },
];

export const PERKS = [
  { title: "A founding badge", text: "Permanent, visible, earned by being early." },
  { title: "A direct line to the Hyperiux team", text: "The people who build Vault, in the same room as you." },
  { title: "A vote on the roadmap from day one", text: "What gets built next starts with you." },
  // NEEDS PRODUCT CONFIRMATION: the concept left the founding offer as a placeholder
  { title: "[Founding offer on Vault Pro]", text: "[To confirm: e.g. a founding-member discount or extended trial.]" },
];

export const STEPS = [
  { title: "Join the waitlist", text: "Thirty seconds. Just your email and your stack." },
  { title: "Get your invite", text: "We open the doors in small waves, waitlist first, so every conversation stays good." },
  { title: "Walk in", text: "Your first teardown and a room full of people who get it are waiting inside." },
];

// NEEDS PRODUCT CONFIRMATION: the bracketed answers are placeholders from the concept
export const COMMUNITY_FAQ = [
  {
    id: "cm-faq1",
    question: "Who is it for?",
    answer: "Front-end and creative developers, designers who code, and anyone who has ever re-timed an animation at 2am because it didn’t feel right. You don’t need to be an expert. You need to care.",
  },
  { id: "cm-faq2", question: "Is it free?", answer: "Joining the waitlist is free. [To confirm: community membership pricing.]" },
  {
    id: "cm-faq3",
    question: "Do I need Vault Pro to join?",
    answer: "[To confirm.] The community is built for anyone who cares about motion on the web, whether you use the free core or Pro.",
  },
  {
    id: "cm-faq4",
    question: "Where will the community live?",
    answer: "[To confirm: platform, e.g. Discord or Circle.] Waitlist members will get the invite link directly.",
  },
  { id: "cm-faq5", question: "When does it open?", answer: "[To confirm: launch date.] Waitlist members hear first and get invited first." },
];
