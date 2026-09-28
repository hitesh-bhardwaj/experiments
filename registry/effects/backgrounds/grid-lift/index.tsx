// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useEffect, useRef, useState } from "react";
import { createSuspendedRaf } from "./createSuspendedRaf";

function usePrefersReducedMotion() {
 const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

 useEffect(() => {
 const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
 const update = () => setPrefersReducedMotion(mediaQuery.matches);
 update();
 mediaQuery.addEventListener("change", update);
 return () => mediaQuery.removeEventListener("change", update);
 }, []);

 return prefersReducedMotion;
}

const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

const DEFAULT_SVG_MASK_URL = null;

interface GridLiftDesktopProps {
 maskScale?: number; fontSize?: number; fontWeight?: number; interactionRange?: number; hoverRadius?: number; hoverFalloff?: number; liftRotation?: number; liftHeight?: number; liftSmoothness?: number; gridSpacing?: number; strokeSize?: number; baseOpacity?: number; hoverOpacity?: number; backgroundColor?: string; gridColor?: string; hoverColor?: string;
}

interface GridCell {
 x: number
 y: number
 cx: number
 cy: number
 lift: number
 targetLift: number
 topInside: boolean
 leftInside: boolean
 rightInside: boolean
 bottomInside: boolean
}

function GridLiftDesktop({
 maskScale = 1.08,
 fontSize = 350,
 fontWeight = 200,
 interactionRange = 120,
 hoverRadius = 550,
 hoverFalloff = 1.55,
 liftRotation = -88,
 liftHeight = 58,
 liftSmoothness = 0.08,
 gridSpacing = 13,
 strokeSize = 1.15,
 baseOpacity = 1,
 hoverOpacity = 0.6,
 backgroundColor = "#000000",
 gridColor = "#272727",
 hoverColor = "#ffffff",
}: GridLiftDesktopProps) {
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
 const fileInputRef = useRef<HTMLInputElement | null>(null);
 const isDesktop = true;
 const prefersReducedMotion = usePrefersReducedMotion();

 const mouseRef = useRef({ x: -9999, y: -9999, active: false });
 const cellsRef = useRef<GridCell[]>([]);
 const svgImageRef = useRef<HTMLImageElement | null>(null);

 const [svgName, setSvgName] = useState<string | null>(null);
 const [svgVersion, setSvgVersion] = useState(0);
 const [maskSourceState, setMaskSourceState] = useState("Text");
 const [maskText, setMaskText] = useState("DESIGN");

 // Live ref - Leva's render() callbacks close over this, not stale state
 const maskSourceRef = useRef("Text");
 const handleSetMask = (val: string) => {
 maskSourceRef.current = val;
 setMaskSourceState(val);
 };

 const maskSource = maskSourceState;

 const safeText =
 typeof maskText ==="string" && maskText.trim().length > 0 ? maskText :"LSD";

 const handleSVGUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;
 if (file.type !=="image/svg+xml" && !file.name.endsWith(".svg")) {
 alert("Please upload an SVG file.");
 return;
 }
 const reader = new FileReader();
 reader.onload = () => {
 let svgText = typeof reader.result ==="string" ? reader.result :"";
 // Some SVGs have no intrinsic size, which results in `naturalWidth/Height` being 0
 // and the canvas draw being invisible. Ensure a width/height based on viewBox.
 if (svgText) {
 const hasWidth = /\bwidth\s*=/.test(svgText);
 const hasHeight = /\bheight\s*=/.test(svgText);
 if (!hasWidth || !hasHeight) {
 const viewBoxMatch = svgText.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
 let vw = 512;
 let vh = 512;
 if (viewBoxMatch) {
 const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
 if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
 vw = Math.max(1, parts[2]);
 vh = Math.max(1, parts[3]);
 }
 }
 svgText = svgText.replace(
 /<svg\b([^>]*)>/i,
 (m, attrs) =>
 `<svg${attrs}${hasWidth ?"" : ` width="${vw}"`}${hasHeight ?"" : ` height="${vh}"`}>`,
 );
 }
 }

 const blob = new Blob([(svgText || reader.result) as BlobPart], { type:"image/svg+xml" });
 const url = URL.createObjectURL(blob);
 const image = new Image();
 image.crossOrigin = "anonymous";
 image.onload = () => {
 svgImageRef.current = image;
 setSvgName(file.name);
 setSvgVersion((v) => v + 1);
 URL.revokeObjectURL(url);
 };
 image.src = url;
 };
 reader.readAsText(file);
 // allow re-uploading the same file (fires `change` again)
 event.target.value ="";
 };

// Default SVG mask - only loads if a URL is provided
useEffect(() => {
  if (!DEFAULT_SVG_MASK_URL) return;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    svgImageRef.current = image;
    setSvgVersion((v) => v + 1);
  };
  image.src = DEFAULT_SVG_MASK_URL;
}, []);

useEffect(() => {
 if (!isDesktop) return;
 const canvas = canvasRef.current as HTMLCanvasElement;
 const ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
 const maskCanvas = document.createElement("canvas");
 const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;

 let width = 0, height = 0, dpr = 1;

 const createTextMask = () => {
 maskCtx.clearRect(0, 0, width, height);
 maskCtx.save();
 maskCtx.fillStyle ="#ffffff";
 maskCtx.textAlign ="center";
 maskCtx.textBaseline ="middle";

 const lines = safeText.split("\n").filter(Boolean);
 const safeLines = lines.length > 0 ? lines : ["LSD"];
 const maxTextWidth = width * 0.72 * maskScale;
 const maxTextHeight = height * 0.48 * maskScale;
 let fittedFontSize = fontSize || 230;

 for (let size = fittedFontSize; size > 10; size -= 2) {
 maskCtx.font = `${fontWeight || 900} ${size}px Anton, Impact, Haettenschweiler,"Arial Black", sans-serif`;
 const widestLine = Math.max(...safeLines.map((l) => maskCtx.measureText(l).width));
 const totalHeight = safeLines.length * size * 0.9;
 if (widestLine <= maxTextWidth && totalHeight <= maxTextHeight) { fittedFontSize = size; break; }
 }

 maskCtx.font = `${fontWeight || 900} ${fittedFontSize}px Anton, Impact, Haettenschweiler,"Arial Black", sans-serif`;
 const lineHeight = fittedFontSize * 0.9;
 const startY = height / 2 - ((safeLines.length - 1) * lineHeight) / 2;
 safeLines.forEach((line, i) => maskCtx.fillText(line, width / 2, startY + i * lineHeight));
 maskCtx.restore();
 };

 const createSVGMask = () => {
 maskCtx.clearRect(0, 0, width, height);
 const image = svgImageRef.current;
 if (!image) return;
 const iw = image.naturalWidth || image.width || 1;
 const ih = image.naturalHeight || image.height || 1;
 const imageRatio = iw / ih;
 const screenRatio = width / height;
 let drawWidth, drawHeight;
 if (imageRatio > screenRatio) { drawWidth = width * 0.62 * maskScale; drawHeight = drawWidth / imageRatio; }
 else { drawHeight = height * 0.5 * maskScale; drawWidth = drawHeight * imageRatio; }
 maskCtx.save();
 maskCtx.drawImage(image, width / 2 - drawWidth / 2, height / 2 - drawHeight / 2, drawWidth, drawHeight);
 maskCtx.restore();
 };

 const createMask = () => {
 maskCtx.clearRect(0, 0, width, height);
 maskSource ==="Text" ? createTextMask() : createSVGMask();
 };

 const isInsideMask = (x: number, y: number) => {
 if (x < 0 || y < 0 || x >= width || y >= height) return false;
 const pixel = maskCtx.getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data;
 return pixel[3] > 20 || pixel[0] > 20 || pixel[1] > 20 || pixel[2] > 20;
 };

 const buildCells = () => {
 const cells: GridCell[] = [];
 for (let x = 0; x <= width; x += gridSpacing) {
 for (let y = 0; y <= height; y += gridSpacing) {
 const cx = x + gridSpacing / 2;
 const cy = y + gridSpacing / 2;
 if (!isInsideMask(cx, cy)) continue;
 cells.push({
 x, y, cx, cy, lift: 0, targetLift: 0,
 topInside: isInsideMask(cx, y),
 leftInside: isInsideMask(x, cy),
 rightInside: isInsideMask(x + gridSpacing, cy),
 bottomInside: isInsideMask(cx, y + gridSpacing),
 });
 }
 }
 cellsRef.current = cells;
 };

 const resize = () => {
 dpr = Math.min(window.devicePixelRatio || 1, 2);
 width = window.innerWidth;
 height = window.innerHeight;
 canvas.width = width * dpr; canvas.height = height * dpr;
 canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
 maskCanvas.width = width * dpr; maskCanvas.height = height * dpr;
 ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
 maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
 createMask(); buildCells();
 };

 const getNearestMaskDistance = (mouseX: number, mouseY: number) => {
 let nearest = Infinity;
 for (const cell of cellsRef.current) {
 const dx = cell.cx - mouseX, dy = cell.cy - mouseY;
 const d = Math.sqrt(dx * dx + dy * dy);
 if (d < nearest) nearest = d;
 }
 return nearest;
 };

 const getHoverInfluence = (x: number, y: number) => {
 const mouse = mouseRef.current;
 if (!mouse.active) return 0;
 if (getNearestMaskDistance(mouse.x, mouse.y) > interactionRange) return 0;
 const dx = x - mouse.x, dy = y - mouse.y;
 const distance = Math.sqrt(dx * dx + dy * dy);
 if (distance > hoverRadius) return 0;
 return Math.pow(1 - distance / hoverRadius, hoverFalloff);
 };

 const updateCells = () => {
 for (const cell of cellsRef.current) {
 cell.targetLift = getHoverInfluence(cell.cx, cell.cy);
 cell.lift = lerp(cell.lift, cell.targetLift, liftSmoothness);
 if (cell.lift < 0.001) cell.lift = 0;
 }
 };

 const drawBaseGrid = () => {
 ctx.save();
 ctx.strokeStyle = gridColor; ctx.globalAlpha = baseOpacity; ctx.lineWidth = strokeSize;
 ctx.beginPath();
 for (let x = 0; x <= width; x += gridSpacing) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
 for (let y = 0; y <= height; y += gridSpacing) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
 ctx.stroke(); ctx.restore();
 };

 const drawCellEdges = (
 cell: GridCell,
 ox: number,
 oy: number,
 alpha: number,
 lw: number,
 color: string
 ) => {
 const x1 = cell.x + ox, y1 = cell.y + oy;
 const x2 = cell.x + gridSpacing + ox, y2 = cell.y + gridSpacing + oy;
 ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lw;
 ctx.beginPath();
 if (cell.topInside) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); }
 if (cell.leftInside) { ctx.moveTo(x1, y1); ctx.lineTo(x1, y2); }
 if (cell.rightInside) { ctx.moveTo(x2, y1); ctx.lineTo(x2, y2); }
 if (cell.bottomInside) { ctx.moveTo(x1, y2); ctx.lineTo(x2, y2); }
 ctx.stroke();
 };

 const drawRaisedMaskGrid = () => {
 const angle = (liftRotation * Math.PI) / 180;
 const liftX = Math.cos(angle) * liftHeight;
 const liftY = Math.sin(angle) * liftHeight;
 ctx.save(); ctx.lineCap ="square"; ctx.lineJoin ="miter";

 for (const cell of cellsRef.current) {
 const influence = cell.lift;
 if (influence <= 0.001) continue;
 const ox = liftX * influence, oy = liftY * influence;
 const x1 = cell.x, y1 = cell.y, x2 = cell.x + gridSpacing, y2 = cell.y + gridSpacing;
 const alpha = hoverOpacity * influence;

 for (let i = 0; i < 30; i++) {
 const t = i / 30;
 drawCellEdges(cell, ox * t, oy * t, alpha * (0.025 + t * 0.075), strokeSize * 0.8, hoverColor);
 }

 ctx.globalAlpha = alpha * 0.34; ctx.strokeStyle = hoverColor;
 ctx.lineWidth = Math.max(0.6, strokeSize * 0.7); ctx.beginPath();
 if (cell.topInside) { ctx.moveTo(x1,y1); ctx.lineTo(x1+ox,y1+oy); ctx.moveTo(x2,y1); ctx.lineTo(x2+ox,y1+oy); }
 if (cell.leftInside) { ctx.moveTo(x1,y1); ctx.lineTo(x1+ox,y1+oy); ctx.moveTo(x1,y2); ctx.lineTo(x1+ox,y2+oy); }
 if (cell.rightInside) { ctx.moveTo(x2,y1); ctx.lineTo(x2+ox,y1+oy); ctx.moveTo(x2,y2); ctx.lineTo(x2+ox,y2+oy); }
 if (cell.bottomInside) { ctx.moveTo(x1,y2); ctx.lineTo(x1+ox,y2+oy); ctx.moveTo(x2,y2); ctx.lineTo(x2+ox,y2+oy); }
 ctx.stroke();
 drawCellEdges(cell, ox, oy, alpha, strokeSize + influence * 0.8, hoverColor);
 }
 ctx.restore();
 };

 const loop = createSuspendedRaf({
  root: canvas,
  onFrame: () => {
    updateCells();
    ctx.fillStyle = backgroundColor; ctx.fillRect(0, 0, width, height);
    drawBaseGrid(); drawRaisedMaskGrid();
  },
 });

 const onPointerMove = (e: PointerEvent) => {
  if (!isDesktop) return;
  mouseRef.current.x = e.clientX;
  mouseRef.current.y = e.clientY;
  mouseRef.current.active = true;
 };
 const onPointerLeave = () => { mouseRef.current.active = false; };

 resize(); loop.start();
 window.addEventListener("resize", resize);
 // Only attach pointer listeners on desktop-capable devices
 if (isDesktop) {
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerleave", onPointerLeave);
 } else {
  // ensure no active hover state on non-desktop
  mouseRef.current.active = false;
 }

 return () => {
  loop.destroy();
  window.removeEventListener("resize", resize);
  if (isDesktop) {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerleave", onPointerLeave);
  }
 };
 }, [
 maskSource, safeText, fontSize, fontWeight, maskScale,
 gridSpacing, strokeSize, hoverRadius, hoverFalloff, interactionRange,
 liftHeight, liftRotation, liftSmoothness, baseOpacity, hoverOpacity,
 backgroundColor, gridColor, hoverColor, svgVersion,
 isDesktop,
 ]);

 return (
 <>
 <div className="fixed  inset-0 h-screen w-screen overflow-hidden bg-black" data-mask-source={maskSourceState}>
 {isDesktop && (
 <>
 <div className="fixed max-[1025px]:hidden left-4 top-25 z-50 pointer-events-auto max-[1025px]:bottom-3 max-[1025px]:left-3 max-[1025px]:right-3 max-[1025px]:top-auto">
 <div className="flex flex-col items-stretch gap-2 rounded-[12px] border border-[#232323] bg-[#0f0f0f] p-[10px] max-md:w-full max-md:rounded-[16px]">
 <div className="flex items-center justify-between gap-[10px]">
  <div className="text-[12px] font-black tracking-[0.18em] text-white">HYPERIUX</div>
 <div className="inline-flex gap-[6px] rounded-[10px] border border-[#2a2a2a] bg-[#141414] p-1">
 <button
 type="button"
 className={`h-[26px] cursor-pointer rounded-[8px] border px-[10px] text-[12px] font-semibold ${
 maskSourceState ==="Text"
 ? "border-[#ff5f00] bg-[#ff5f00] text-black"
 : "border-transparent bg-transparent text-[#bdbdbd] hover:bg-[#1f1f1f] hover:text-white"
 }`}
 onClick={() => handleSetMask("Text")}
 >
 Text
 </button>
 <button
 type="button"
  className={`h-6.5 cursor-pointer rounded-md border px-2.5 text-[12px] font-semibold ${
 maskSourceState ==="SVG"
 ? "border-[#ff5f00] bg-[#ff5f00] text-black"
 : "border-transparent bg-transparent text-[#bdbdbd] hover:bg-[#1f1f1f] hover:text-white"
 }`}
 onClick={() => handleSetMask("SVG")}
 >
 SVG
 </button>
 </div>
 </div>

 <div className="flex items-center gap-2.5 max-md:w-full">
 {maskSourceState ==="Text" && (
 <input
 className="h-7.5 w-full rounded-md border border-[#2a2a2a] bg-[#141414] px-2.5 text-[12px] font-bold tracking-[0.04em] text-white outline-none focus:border-[#ff5f00] max-md:min-w-0 max-md:flex-1"
 value={maskText}
 onChange={(e) => setMaskText(e.target.value)}
 placeholder="Text…"
 />
 )}
 {maskSourceState ==="SVG" && (
 <button
 type="button"
 className="h-7.5 cursor-pointer rounded-md border border-[#2a2a2a] bg-[#141414] px-2.5 text-[12px] font-bold text-white hover:border-[#ff5f00] hover:bg-[#1f1f1f]"
 onClick={() => fileInputRef.current?.click()}
 title={svgName ?? undefined}
 >
 Upload
 </button>
 )}
 </div>
 <div className="mt-0.5 hidden text-[3.5vw] font-semibold tracking-[0.02em] text-white/70 pointer-events-none max-md:block">
 Best on desktop: hover and drift through the grid - mobile shows a preview.
 </div>
 </div>
 </div>
 <canvas
 ref={canvasRef}
 aria-hidden="true"
 className="fixed inset-0 block h-screen w-screen cursor-crosshair"
 style={{ background: backgroundColor }}
 />
 </>
 )}

 {!isDesktop && (
   <div className="absolute inset-0 z-50 flex items-center justify-center px-8 text-center pointer-events-none">
     <div className="flex max-w-sm flex-col items-center gap-3 text-white">
       <p className="text-[11vw] font-light leading-none tracking-tight uppercase">
         Open on desktop
       </p>
       <p className="text-sm uppercase tracking-[0.3em] text-white/35">
         Grid Lift
       </p>
       <p className="text-sm leading-relaxed text-white/55">
         Drift your cursor through the grid to lift the form and reveal the motion.
       </p>
     </div>
   </div>
 )}
 
 
 
 {/* Creative clue hint */}
 {isDesktop && (
 <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none max-[1025px]:bottom-4 max-[1025px]:hidden">
 <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/70 text-sm font-medium tracking-wide">
 Drift your cursor through the grid to lift
 </div>
 </div>
 )}

 {prefersReducedMotion && (
 <div
   aria-live="polite"
   className="pointer-events-none fixed bottom-4 left-4 z-40 w-fit max-w-75 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-md:hidden"
 >
   <h2 className="text-sm leading-none text-white">
     The grid keeps lifting.
   </h2>
   <p className="mt-2 text-xs leading-5 text-white/65">
     Grid Lift raises the mask grid wherever your cursor drifts, in
     real time. Since the motion is the entire effect, reduced motion
     can&apos;t be applied here.
   </p>
 </div>
 )}

 <input
 ref={fileInputRef}
 type="file"
 accept=".svg,image/svg+xml"
 onChange={handleSVGUpload}
 style={{ display:"none" }}
 />
 </div>
 <style jsx global>{`
 @import url("https://fonts.googleapis.com/css2?family=Anton&display=swap");
 `}</style>
 </>
 );
}

export default function GridLift({
 maskScale = 1.08,
 fontSize = 350,
 fontWeight = 200,
 interactionRange = 120,
 hoverRadius = 550,
 hoverFalloff = 1.55,
 liftRotation = -88,
 liftHeight = 58,
 liftSmoothness = 0.08,
 gridSpacing = 13,
 strokeSize = 1.15,
 baseOpacity = 1,
 hoverOpacity = 0.6,
 backgroundColor = "#000000",
 gridColor = "#272727",
 hoverColor = "#ffffff",
} = {}) {
 const [isDesktop, setIsDesktop] = useState(true);

 useEffect(() => {
  const updateDesktop = () => {
   const gw = typeof window !== "undefined" && typeof (window as any).globalWidth === "number"
    ? (window as any).globalWidth
    : (typeof window !== "undefined" ? window.innerWidth : 0);
   setIsDesktop(!(gw < 1025));
  };

  updateDesktop();
  window.addEventListener("resize", updateDesktop);
  return () => window.removeEventListener("resize", updateDesktop);
 }, []);

 if (!isDesktop) {
  return (
   <div className="flex min-h-screen w-screen items-center justify-center bg-black px-8 pb-8 pt-24 text-center max-[1025px]:pt-28">
    <div className="pointer-events-none flex max-w-sm flex-col items-center gap-3 text-white">
     <p className="text-[11vw] font-light leading-none tracking-tight uppercase">
      Open on desktop
     </p>
     <p className="text-sm uppercase tracking-[0.3em] text-white/35">
      Grid Lift
     </p>
     <p className="text-sm leading-relaxed text-white/55">
      Drift your cursor through the grid to lift the form and reveal the motion.
     </p>
    </div>
   </div>
  );
 }

 return (
 <GridLiftDesktop
 maskScale={maskScale}
 fontSize={fontSize}
 fontWeight={fontWeight}
 interactionRange={interactionRange}
 hoverRadius={hoverRadius}
 hoverFalloff={hoverFalloff}
 liftRotation={liftRotation}
 liftHeight={liftHeight}
 liftSmoothness={liftSmoothness}
 gridSpacing={gridSpacing}
 strokeSize={strokeSize}
 baseOpacity={baseOpacity}
 hoverOpacity={hoverOpacity}
 backgroundColor={backgroundColor}
 gridColor={gridColor}
 hoverColor={hoverColor}
 />
 );
}
