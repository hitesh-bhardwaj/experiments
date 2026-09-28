"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { createSuspendedRaf } from "./createSuspendedRaf";

const CELL_SIZE = 50;
const IDLE_TIMEOUT = 120;
const SPAWN_ANIMATION = 180;
const TURN_CELLS = 2;
const MOUSE_LERP = 0.09;

const COLORS = [
 { bg:"#1a1a2e", text:"#ffffff" },
 { bg:"#c8f752", text:"#1a1a2e" },
 { bg:"#7D4E57", text:"#ffffff" },
 { bg:"#5c3d8f", text:"#ffffff" },
 { bg:"#2d2d2d", text:"#ffffff" },
 { bg:"#c3dfe0", text:"#1a1a2e" },
];

interface TrailCellColor {
 bg: string;
 text: string;
}

interface TrailCell {
 id: string;
 cellKey: string;
 col: number;
 row: number;
 char: string;
 color: TrailCellColor;
}

interface GridCell {
 col: number;
 row: number;
}

type TrailAxis = "x" | "y";

interface CharacterTrailCompProps {
 children?: ReactNode;
 characters?: string;
 trailLength?: number;
 fontSize?: number;
 textColor?: string;
 fadeDuration?: number;
}

export default function CharacterTrailComp({
 children,
 characters ="HYPERIUX",
 trailLength = 24,
 fontSize = 18,
 textColor,
 fadeDuration = 0.8,
}: CharacterTrailCompProps) {
 const [trail, setTrail] = useState<TrailCell[]>([]);
 const [fading, setFading] = useState(false);
 const resolvedCharacters = characters?.trim() || "HYPERIUX";
 const resolvedTrailLength = Math.max(0, Math.round(Number(trailLength) || 0));
 const resolvedFontSize = Math.max(0, Number(fontSize) || 0);
 const fadeDurationMs = Math.max(0, Number(fadeDuration) || 0) * 1000;

 const lastCell = useRef<GridCell | null>(null);
 const activeAxis = useRef<TrailAxis | null>(null);
 const charIndexRef = useRef(0);
 const colorIndexRef = useRef(0);
 const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 const fadingRef = useRef(false);
 const mouseTarget = useRef<{x: number, y: number} | null>(null);
 const mouseFollower = useRef<{x: number, y: number} | null>(null);


 const getNextTrailCell = useCallback((col: number, row: number) => {
 const char = resolvedCharacters[charIndexRef.current % resolvedCharacters.length];
 const paletteColor = COLORS[colorIndexRef.current % COLORS.length];
 const color = {
 ...paletteColor,
 text: textColor || paletteColor.text,
 };
 charIndexRef.current++;
 colorIndexRef.current++;

 return {
 id: `${Date.now()}-${charIndexRef.current}-${col}-${row}`,
 cellKey: `${col}:${row}`,
 col,
 row,
 char,
 color,
 };
 }, [resolvedCharacters, textColor]);

 const getLineCells = useCallback((from: GridCell, to: GridCell, axis: TrailAxis, limit: number = Infinity) => {
 const cells: GridCell[] = [];
 const delta = axis ==="x" ? to.col - from.col : to.row - from.row;
 const direction = Math.sign(delta);
 const count = Math.min(Math.abs(delta), limit);

 for (let index = 1; index <= count; index++) {
 const col = axis ==="x" ? from.col + direction * index : from.col;
 const row = axis ==="y" ? from.row + direction * index : from.row;
 cells.push({ col, row });
 }

 return cells;
 }, []);

 const appendCells = useCallback((cells: GridCell[]) => {
 if (resolvedTrailLength <= 0) return;
 if (!cells.length) return;

 const nextCells = cells.map(({ col, row }) => getNextTrailCell(col, row));
 const activatedKeys = new Set(nextCells.map((cell) => cell.cellKey));

 setTrail((prev) => {
 const withoutDuplicates = prev.filter((cell) => !activatedKeys.has(cell.cellKey));
 return [...withoutDuplicates, ...nextCells].slice(-resolvedTrailLength);
 });
 }, [getNextTrailCell, resolvedTrailLength]);

 useEffect(() => {
 fadingRef.current = fading;
 }, [fading]);

 
 const updateTrailPosition = useCallback((mx: number, my: number) => {
 if (fadingRef.current) {
 fadingRef.current = false;
 setFading(false);
 setTrail([]);
 charIndexRef.current = 0;
 colorIndexRef.current = 0;
 lastCell.current = null;
 activeAxis.current = null;
 }

 clearTimeout(idleTimer.current);
 clearTimeout(clearTimer.current);

 idleTimer.current = setTimeout(() => {
 setFading(true);
 fadingRef.current = true;
 clearTimer.current = setTimeout(() => {
 setTrail([]);
 setFading(false);
 fadingRef.current = false;
 charIndexRef.current = 0;
 colorIndexRef.current = 0;
 lastCell.current = null;
 activeAxis.current = null;
 }, fadeDurationMs);
 }, IDLE_TIMEOUT);

 const target = {
 col: Math.floor(mx / CELL_SIZE),
 row: Math.floor(my / CELL_SIZE),
 };

 if (!lastCell.current) {
 lastCell.current = target;
 appendCells([target]);
 return;
 }

 const current = lastCell.current;
 const colDelta = target.col - current.col;
 const rowDelta = target.row - current.row;

 if (colDelta === 0 && rowDelta === 0) return;

 const dominantAxis = Math.abs(colDelta) >= Math.abs(rowDelta) ?"x" :"y";
 const targetAxis = colDelta === 0 ?"y" : rowDelta === 0 ?"x" : dominantAxis;
 const axis = activeAxis.current ?? targetAxis;
 const cells: GridCell[] = [];
 let cursor = current;

 const pushCells = (lineCells: GridCell[]) => {
 if (!lineCells.length) return;
 cells.push(...lineCells);
 cursor = lineCells[lineCells.length - 1];
 };

 if (axis ==="x" && colDelta !== 0) {
 pushCells(getLineCells(cursor, { col: target.col, row: cursor.row },"x"));

 if (target.row !== cursor.row) {
 pushCells(getLineCells(cursor, { col: cursor.col, row: target.row },"y", TURN_CELLS));
 activeAxis.current ="y";
 } else {
 activeAxis.current ="x";
 }
 } else if (axis ==="y" && rowDelta !== 0) {
 pushCells(getLineCells(cursor, { col: cursor.col, row: target.row },"y"));

 if (target.col !== cursor.col) {
 pushCells(getLineCells(cursor, { col: target.col, row: cursor.row },"x", TURN_CELLS));
 activeAxis.current ="x";
 } else {
 activeAxis.current ="y";
 }
 } else {
 pushCells(getLineCells(cursor, target, targetAxis, TURN_CELLS));
 activeAxis.current = targetAxis;
 }

 if (!cells.length) return;

 lastCell.current = cursor;
 appendCells(cells);
 }, [appendCells, fadeDurationMs, getLineCells]);

 const updateMouseFollower = useCallback(() => {
 if (!mouseTarget.current || !mouseFollower.current) return;

 const dx = Math.abs(mouseTarget.current.x - mouseFollower.current.x);
 const dy = Math.abs(mouseTarget.current.y - mouseFollower.current.y);

 if (dx <= 0.5 && dy <= 0.5) {
 mouseFollower.current = { ...mouseTarget.current };
 return;
 }

 mouseFollower.current.x += (mouseTarget.current.x - mouseFollower.current.x) * MOUSE_LERP;
 mouseFollower.current.y += (mouseTarget.current.y - mouseFollower.current.y) * MOUSE_LERP;

 updateTrailPosition(mouseFollower.current.x, mouseFollower.current.y);
 }, [updateTrailPosition]);

 const handleMouseMove = useCallback((e: MouseEvent) => {
 mouseTarget.current = { x: e.clientX, y: e.clientY };

 if (!mouseFollower.current) {
 mouseFollower.current = { ...mouseTarget.current };
 updateTrailPosition(mouseFollower.current.x, mouseFollower.current.y);
 }
 }, [updateTrailPosition]);

 useEffect(() => {
 const loop = createSuspendedRaf({
 root: null,
 observeOffscreen: false,
 onFrame: updateMouseFollower,
 });
 loop.start();

 window.addEventListener("mousemove", handleMouseMove);
 return () => {
 window.removeEventListener("mousemove", handleMouseMove);
 clearTimeout(idleTimer.current);
 clearTimeout(clearTimer.current);
 loop.destroy();
 };
 }, [handleMouseMove, updateMouseFollower]);

 return (
 <div className="relative w-full min-h-screen" >

 {trail.map((dot, index) => {
 const total = trail.length;
 // stagger delay - oldest cells (index 0) fade first
 const staggerDelay = fading
 ? index * (fadeDurationMs / Math.max(total, 1))
 : 0;
 const opacity = fading ? 0 : 1;

 return (
 <div
 key={dot.id}
 className="fixed pointer-events-none rounded-full flex items-center justify-center select-none font-extrabold z-9999 scale-100"
 style={{
 width: CELL_SIZE,
 height: CELL_SIZE,
 left: dot.col * CELL_SIZE,
 top: dot.row * CELL_SIZE,
 backgroundColor: dot.color.bg,
 color: dot.color.text,
 fontSize: resolvedFontSize,
 opacity,
 animation: fading
 ?"none"
 : `charTrailPop ${SPAWN_ANIMATION}ms cubic-bezier(0.2,0.8,0.2,1)`,
 transition: fading
 ? `opacity ${fadeDurationMs * 0.5}ms cubic-bezier(0.4,0,0.2,1) ${staggerDelay}ms`
 :"none",
 willChange:"opacity, transform",
 }}
 >
 {dot.char}
 </div>
 );
 })}

 {children}

 <style>{`
 @keyframes charTrailPop {
 from {
 transform: scale(0);
 }
 to {
 transform: scale(1);
 }
 }
 `}</style>
 </div>
 );
}
