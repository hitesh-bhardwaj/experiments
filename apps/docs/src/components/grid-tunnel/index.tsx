import React from 'react'
import GridTunnelComp from './GridTunnelComp';

const P = "/api/media-proxy?url=";
const B = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images";

const defaultImages = [
  `${P}${B}/h-01.jpg`,
  `${P}${B}/h-02.jpg`,
  `${P}${B}/h-03.jpg`,
  `${P}${B}/h-05.jpg`,
  `${P}${B}/h-06.jpg`,
  `${P}${B}/h-07.jpg`,
  `${P}${B}/h-08.jpg`,
  `${P}${B}/h-09.jpg`,
  `${P}${B}/h-10.jpg`,
  `${P}${B}/h-11.jpg`,
  `${P}${B}/h-12.jpg`,
  `${P}${B}/h-13.jpg`,
  `${P}${B}/h-14.jpg`,
  `${P}${B}/h-15.jpg`,
  `${P}${B}/v-01.jpg`,
  `${P}${B}/v-02.jpg`,
  `${P}${B}/v-03.jpg`,
  `${P}${B}/v-04.jpg`,
  `${P}${B}/v-05.jpg`,
  `${P}${B}/v-06.jpg`,
  `${P}${B}/v-07.jpg`,
  `${P}${B}/v-08.jpg`,
  `${P}${B}/v-09.jpg`,
  `${P}${B}/v-10.jpg`,
  `${P}${B}/h-01.jpg`,
  `${P}${B}/h-02.jpg`,
  `${P}${B}/h-03.jpg`,
  `${P}${B}/h-05.jpg`,
  `${P}${B}/h-06.jpg`,
  `${P}${B}/h-07.jpg`,
  `${P}${B}/h-08.jpg`,
  `${P}${B}/h-09.jpg`,
  `${P}${B}/h-10.jpg`,
  `${P}${B}/h-11.jpg`,
  `${P}${B}/h-12.jpg`,
  `${P}${B}/h-13.jpg`,
  `${P}${B}/h-14.jpg`,
  `${P}${B}/h-15.jpg`,
  `${P}${B}/v-01.jpg`,
  `${P}${B}/v-02.jpg`,
  `${P}${B}/v-03.jpg`,
  `${P}${B}/v-04.jpg`,
  `${P}${B}/v-05.jpg`,
  `${P}${B}/v-06.jpg`,
  `${P}${B}/v-07.jpg`,
  `${P}${B}/v-08.jpg`,
  `${P}${B}/v-09.jpg`,
  `${P}${B}/v-10.jpg`,
];

const GridTunnel = ({
  images = defaultImages,
  gridSize = 24,
  speed = 1,
  depth = 1000,
  lineColor = "#9ca3af",
  backgroundColor = "#ffffff",
}) => {
  return (
   <GridTunnelComp
     images={images}
     gridSize={gridSize}
     speed={speed}
     depth={depth}
     lineColor={lineColor}
     backgroundColor={backgroundColor}
   />
  )
}

export default GridTunnel
