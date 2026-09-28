import PortfolioSlider from './PortfolioSlider';

const P = "/api/media-proxy?url=";
const B = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images";

const items = [
  { url: `${P}${B}/h-01.jpg`, description: "PORTFOLIO 01" },
  { url: `${P}${B}/h-02.jpg`, description: "PORTFOLIO 02" },
  { url: `${P}${B}/h-03.jpg`, description: "PORTFOLIO 03" },
  { url: `${P}${B}/h-05.jpg`, description: "PORTFOLIO 04" },
  { url: `${P}${B}/h-06.jpg`, description: "PORTFOLIO 05" },
  { url: `${P}${B}/v-10.jpg`, description: "PORTFOLIO 06" },
  { url: `${P}${B}/h-08.jpg`, description: "PORTFOLIO 07" },
  { url: `${P}${B}/h-09.jpg`, description: "PORTFOLIO 08" },
  { url: `${P}${B}/h-10.jpg`, description: "PORTFOLIO 09" },
  { url: `${P}${B}/h-11.jpg`, description: "PORTFOLIO 10" },
  { url: `${P}${B}/h-12.jpg`, description: "PORTFOLIO 11" },
  { url: `${P}${B}/h-13.jpg`, description: "PORTFOLIO 12" },
  { url: `${P}${B}/h-14.jpg`, description: "PORTFOLIO 13" },
  { url: `${P}${B}/h-15.jpg`, description: "PORTFOLIO 14" },
  { url: `${P}${B}/v-01.jpg`, description: "PORTFOLIO 15" },
  { url: `${P}${B}/v-02.jpg`, description: "PORTFOLIO 16" },
  { url: `${P}${B}/v-03.jpg`, description: "PORTFOLIO 17" },
  { url: `${P}${B}/v-04.jpg`, description: "PORTFOLIO 18" },
  { url: `${P}${B}/v-05.jpg`, description: "PORTFOLIO 19" },
  { url: `${P}${B}/v-06.jpg`, description: "PORTFOLIO 20" },
  { url: `${P}${B}/v-07.jpg`, description: "PORTFOLIO 21" },
];

export default function PortfolioSlider3D({
  zoomFactor = 1,
  scrollSpeed = 0.01,
  showCaption = true,
}) {
  return (
    <PortfolioSlider
      items={items}
      zoomFactor={zoomFactor}
      scrollSpeed={scrollSpeed}
      showCaption={showCaption}
    />
  )
}
