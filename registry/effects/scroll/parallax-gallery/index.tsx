// Built using Hyperiux Vault: https://vault.hyperiux.com


import ScrollParallaxGallery from "./ParallaxGallery";

const ParallaxGallery = ({
  bgColor = "#111111",
  rotationDeg = 6,
  offscreenScale = 1.2,
  borderColor = "rgba(255, 255, 255, 0.5)",
  frameScale = 1,
}) => {
  return (
    <>
    <div className="min-h-screen">
      <ScrollParallaxGallery
        images={images}
        bgColor={bgColor}
        rotationDeg={rotationDeg}
        offscreenScale={offscreenScale}
        borderColor={borderColor}
        frameScale={frameScale}
      />
    </div>
    </>
  );
};

export default ParallaxGallery;

const images = [
  "https://picsum.photos/seed/1/800/600",
  "https://picsum.photos/seed/2/800/600",
  "https://picsum.photos/seed/3/800/600",
  "https://picsum.photos/seed/4/800/600",
  "https://picsum.photos/seed/5/800/600",
  "https://picsum.photos/seed/6/800/600",
];
