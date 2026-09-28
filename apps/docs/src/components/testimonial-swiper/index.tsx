// Built using Hyperiux Vault: https://vault.hyperiux.com

import TestimonialComp from "./TestimonialComp";

const data = [
  {
    quote:
      "Design that feels completely effortless, yet performs like it's been engineered with precision. Every interaction flows naturally, every detail feels intentional, and the entire experience just makes sense without the user ever needing to think about it.",
    name: "Aarav Mehta",
    title: "Product Lead, InnovateX",
    image:
      "https://picsum.photos/seed/1/800/600",
  },
  {
    quote:
      "Hyperiux didn't just improve our UI - it transformed the way users interact with our product. It pushed us to rethink our entire approach to design, making every screen more intuitive, more fluid, and far more engaging than we thought possible.",
    name: "Sofia Patel",
    title: "Frontend Developer",
    image:
      "https://picsum.photos/seed/2/800/600",
  },
  {
    quote:
      "Everything feels intentional. Every hover, every transition, every detail - it's crafted, not just built.",
    name: "Rohan Kapoor",
    title: "UX Designer, PixelCraft",
    image:
      "https://picsum.photos/seed/3/800/600",
  },
  {
    quote:
      "We didn't just ship faster - we shipped something we're genuinely proud of. The design quality improved, the development flow became smoother, and for the first time, everything felt aligned between vision and execution.",
    name: "Ananya Sharma",
    title: "Founder, Buildspace Studio",
    image:
      "https://picsum.photos/seed/4/800/600",
  },
  {
    quote:
      "It's rare to find a UI system that's both aesthetic and brutally practical. This one just gets it.",
    name: "Dev Malhotra",
    title: "Full Stack Engineer",
    image:
      "https://picsum.photos/seed/5/800/600",
  },
];

const TestimonialSwiper = ({
  bgColor = "#edeae2",
  autoplay = true,
  autoplayDelay = 4500,
  showNavigation = true,
  imageSize = 1,
}) => {
  return (
    <div className="h-screen bg-white max-md:h-fit">
      <TestimonialComp
        testimonials={data}
        bgColor={bgColor}
        autoplay={autoplay}
        autoplayDelay={autoplayDelay}
        showNavigation={showNavigation}
        imageSize={imageSize}
      />
    </div>
  );
};

export default TestimonialSwiper;
