
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
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-03.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-06.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-07.jpg",
];
