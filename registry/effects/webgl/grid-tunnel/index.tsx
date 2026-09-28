// Built using Hyperiux Vault: https://vault.hyperiux.com

import React from 'react'
import GridTunnelComp from './GridTunnelComp';

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

const defaultImages = [
  "https://picsum.photos/seed/gtunnel0/800/600",
  "https://picsum.photos/seed/gtunnel1/800/600",
  "https://picsum.photos/seed/gtunnel2/800/600",
  "https://picsum.photos/seed/gtunnel3/800/600",
  "https://picsum.photos/seed/gtunnel4/800/600",
  "https://picsum.photos/seed/gtunnel5/800/600",
  "https://picsum.photos/seed/gtunnel6/800/600",
  "https://picsum.photos/seed/gtunnel7/800/600",
  "https://picsum.photos/seed/gtunnel8/800/600",
  "https://picsum.photos/seed/gtunnel9/800/600",
  "https://picsum.photos/seed/gtunnel10/800/600",
  "https://picsum.photos/seed/gtunnel11/800/600",
  "https://picsum.photos/seed/gtunnel12/800/600",
  "https://picsum.photos/seed/gtunnel13/800/600",
  "https://picsum.photos/seed/gtunnel14/800/600",
  "https://picsum.photos/seed/gtunnel15/800/600",
  "https://picsum.photos/seed/gtunnel16/800/600",
  "https://picsum.photos/seed/gtunnel17/800/600",
  "https://picsum.photos/seed/gtunnel18/800/600",
  "https://picsum.photos/seed/gtunnel19/800/600",
  "https://picsum.photos/seed/gtunnel20/800/600",
  "https://picsum.photos/seed/gtunnel21/800/600",
   "https://picsum.photos/seed/gtunnel22/800/600",
  "https://picsum.photos/seed/gtunnel23/800/600",
  "https://picsum.photos/seed/gtunnel24/800/600",
  "https://picsum.photos/seed/gtunnel25/800/600",
  "https://picsum.photos/seed/gtunnel26/800/600",
  "https://picsum.photos/seed/gtunnel27/800/600",
  "https://picsum.photos/seed/gtunnel28/800/600",
  "https://picsum.photos/seed/gtunnel29/800/600",
  "https://picsum.photos/seed/gtunnel30/800/600",
  "https://picsum.photos/seed/gtunnel31/800/600",
  "https://picsum.photos/seed/gtunnel32/800/600",
  "https://picsum.photos/seed/gtunnel33/800/600",
  "https://picsum.photos/seed/gtunnel34/800/600",
    "https://picsum.photos/seed/gtunnel35/800/600",
  "https://picsum.photos/seed/gtunnel36/800/600",
  "https://picsum.photos/seed/gtunnel37/800/600",
  "https://picsum.photos/seed/gtunnel38/800/600",
  "https://picsum.photos/seed/gtunnel39/800/600",
  "https://picsum.photos/seed/gtunnel40/800/600",
  "https://picsum.photos/seed/gtunnel41/800/600",
  "https://picsum.photos/seed/gtunnel42/800/600",
  "https://picsum.photos/seed/gtunnel43/800/600",
  "https://picsum.photos/seed/gtunnel44/800/600",
  "https://picsum.photos/seed/gtunnel45/800/600",
   "https://picsum.photos/seed/gtunnel46/800/600",
  "https://picsum.photos/seed/gtunnel47/800/600",
];
