// Built using Hyperiux Vault: https://vault.hyperiux.com

import PortfolioSlider from './PortfolioSlider';

const items = [
  { url: "https://picsum.photos/seed/port1/1200/800", description: "PORTFOLIO 01" },
  { url: "https://picsum.photos/seed/port2/1200/800", description: "PORTFOLIO 02" },
  { url: "https://picsum.photos/seed/port3/1200/800", description: "PORTFOLIO 03" },
  { url: "https://picsum.photos/seed/port4/1200/800", description: "PORTFOLIO 04" },
  { url: "https://picsum.photos/seed/port5/1200/800", description: "PORTFOLIO 05" },
  { url: "https://picsum.photos/seed/port6/1200/800", description: "PORTFOLIO 06" },
  { url: "https://picsum.photos/seed/port7/1200/800", description: "PORTFOLIO 07" },
  { url: "https://picsum.photos/seed/port8/1200/800", description: "PORTFOLIO 08" },
  { url: "https://picsum.photos/seed/port9/1200/800", description: "PORTFOLIO 09" },
  { url: "https://picsum.photos/seed/port10/1200/800", description: "PORTFOLIO 10" },
  { url: "https://picsum.photos/seed/port11/1200/800", description: "PORTFOLIO 11" },
  { url: "https://picsum.photos/seed/port12/1200/800", description: "PORTFOLIO 12" },
  { url: "https://picsum.photos/seed/port13/1200/800", description: "PORTFOLIO 13" },
  { url: "https://picsum.photos/seed/port14/1200/800", description: "PORTFOLIO 14" },
  { url: "https://picsum.photos/seed/port15/1200/800", description: "PORTFOLIO 15" },
  { url: "https://picsum.photos/seed/port16/1200/800", description: "PORTFOLIO 16" },
  { url: "https://picsum.photos/seed/port17/1200/800", description: "PORTFOLIO 17" },
  { url: "https://picsum.photos/seed/port18/1200/800", description: "PORTFOLIO 18" },
  { url: "https://picsum.photos/seed/port19/1200/800", description: "PORTFOLIO 19" },
  { url: "https://picsum.photos/seed/port20/1200/800", description: "PORTFOLIO 20" },
  { url: "https://picsum.photos/seed/port21/1200/800", description: "PORTFOLIO 21" },
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
