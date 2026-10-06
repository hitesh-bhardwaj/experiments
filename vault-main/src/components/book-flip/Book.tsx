'use client'
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { usePage } from "./PageContext";
import { useEffect, useMemo, useRef, useState } from "react";
import {
 Bone,
 BoxGeometry,
 Color,
 Float32BufferAttribute,
 MeshStandardMaterial,
 Skeleton,
 SkinnedMesh,
 SRGBColorSpace,
 Uint16BufferAttribute,
 Vector3,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";

/**
 * CONFIG CONSTANTS - Adjust these to customize the book appearance and animation
 */
const EASING_FACTOR = 0.5; // Controls the speed of page rotation easing (lower = slower)
const EASING_FACTOR_FOLD = 0.3; // Controls the speed of page fold animation
const INSIDE_CURVE_STRENGTH = 0.18; // How much the inside of the page curves when opened
const OUTSIDE_CURVE_STRENGTH = 0.05; // How much the outside edges curve
const TURNING_CURVE_STRENGTH = 0.09; // Curve strength during page turning animation

const PAGE_WIDTH = 1.28; // Width of a single page
const PAGE_HEIGHT = 1.71; // Height of a single page (4:3 aspect ratio)
const PAGE_DEPTH = 0.003; // Thickness of paper
const PAGE_SEGMENTS = 30; // Number of bone segments (more = more flexible, but slower)
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

/**
 * GEOMETRY SETUP
 * Creates a segmented geometry that can be deformed by skeleton bones
 * Each segment is controlled by 2 bones for smooth deformation
 */
const pageGeometry = new BoxGeometry(
 PAGE_WIDTH,
 PAGE_HEIGHT,
 PAGE_DEPTH,
 PAGE_SEGMENTS,
 2
);

// Translate geometry so rotation happens from the left edge
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

// Setup skin weights and indices for skeletal animation
const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];

for (let i = 0; i < position.count; i++) {
 vertex.fromBufferAttribute(position, i);
 const x = vertex.x;

 // Each vertex is influenced by 2 adjacent bones
 const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
 let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;

 // Store bone influences (up to 4 per vertex, we use 2)
 skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
 skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}

pageGeometry.setAttribute(
"skinIndex",
 new Uint16BufferAttribute(skinIndexes, 4)
);
pageGeometry.setAttribute(
"skinWeight",
 new Float32BufferAttribute(skinWeights, 4)
);

// Base materials for pages
const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

const pageMaterials = [
 new MeshStandardMaterial({ color: whiteColor }),
 new MeshStandardMaterial({ color:"#111" }),
 new MeshStandardMaterial({ color: whiteColor }),
 new MeshStandardMaterial({ color: whiteColor }),
];

/**
 * Helper function to generate page pairs from image array
 * Creates front/back pairs: [0,1], [2,3], [4,5], etc.
 */
interface BookPage {
 front: string
 back: string
}

const generatePages = (imageArray: string[]) => {
 if (!imageArray || imageArray.length === 0) {
 return [];
 }

 const pages = [
 {
 front: imageArray[0],
 back: imageArray[1] || imageArray[0],
 },
 ];

 for (let i = 2; i < imageArray.length - 1; i += 2) {
 pages.push({
 front: imageArray[i],
 back: imageArray[i + 1],
 });
 }

 if (imageArray.length % 2 === 1) {
 pages.push({
 front: imageArray[imageArray.length - 1],
 back: imageArray[0],
 });
 }

 return pages;
};

/**
 * Preload textures for better performance
 */
const resolveTexturePath = (name: string, pathPattern: string) =>
 name.startsWith("http") ? name : `${pathPattern}/${name}.png`;

const preloadTextures = (pages: BookPage[], pathPattern: string) => {
 pages.forEach((page) => {
 useTexture.preload(resolveTexturePath(page.front, pathPattern));
 useTexture.preload(resolveTexturePath(page.back, pathPattern));
 });
};

/**
 * PAGE COMPONENT
 * Represents a single page in the book with skinned mesh deformation
 *  * ANIMATION LOGIC:
 * - Uses skeleton with 31 bones along the page width
 * - Each bone rotates based on whether the page is opened
 * - Inner bones curve more (3D effect), outer bones curve less
 * - During turning, bones follow a sine wave for smooth animation
 */
interface PageOwnProps {
 number: number
 front: string
 back: string
 page: number
 opened: boolean
 bookClosed: boolean
 pathPattern: string
 pages: BookPage[]
 pageSpeed?: number
}

const Page = ({  number,  front,  back,  page,  opened,  bookClosed,
 pathPattern,
 pages,
 pageSpeed = 0.8,
 ...props }: PageOwnProps & Record<string, any>) => {
 const frontPath = resolveTexturePath(front, pathPattern);
 const backPath = resolveTexturePath(back, pathPattern);

 const [frontTexture, backTexture] = useTexture([frontPath, backPath]);

 const picture = useMemo(() => {
 const texture = frontTexture.clone();
 texture.colorSpace = SRGBColorSpace;
 texture.needsUpdate = true;
 return texture;
 }, [frontTexture]);

 const picture2 = useMemo(() => {
 const texture = backTexture.clone();
 texture.colorSpace = SRGBColorSpace;
 texture.needsUpdate = true;
 return texture;
 }, [backTexture]);

 const group = useRef<any>(null);
 const turnedAt = useRef(0);
 const lastOpened = useRef(opened);
 const skinnedMeshRef = useRef<any>(null);
 const safePageSpeed = Math.min(5, Math.max(0.1, Number(pageSpeed) || 0.8));
 const normalizedPageSpeed = safePageSpeed / 0.8;

 /**
 * Create the skeletal mesh for this page
 * - Creates 31 bones in a chain
 * - Attaches them hierarchically so rotation cascades
 * - Wraps geometry in skeleton for deformation
 */
 const manualSkinnedMesh = useMemo(() => {
 const bones: Bone[] = [];
  // Create bone chain
 for (let i = 0; i <= PAGE_SEGMENTS; i++) {
 let bone = new Bone();
 bones.push(bone);
  if (i === 0) {
 bone.position.x = 0; // Root bone at spine
 } else {
 bone.position.x = SEGMENT_WIDTH; // Each subsequent bone positioned relative to parent
 }
  if (i > 0) {
 bones[i - 1].add(bone); // Attach to parent bone
 }
 }

 const skeleton = new Skeleton(bones);

 // Materials: 4 base materials + 2 textured materials (front and back)
 const materials = [
 ...pageMaterials,
 new MeshStandardMaterial({
 color: whiteColor,
 map: picture,
 roughness: 0.1,
 emissive: emissiveColor,
 emissiveIntensity: 0,
 }),
 new MeshStandardMaterial({
 color: whiteColor,
 map: picture2,
 roughness: 0.1,
 emissive: emissiveColor,
 emissiveIntensity: 0,
 }),
 ];

 const mesh = new SkinnedMesh(pageGeometry, materials);
 mesh.frustumCulled = false;
 mesh.add(skeleton.bones[0]);
 mesh.bind(skeleton); // Bind skeleton to mesh
  return mesh;
 }, [picture, picture2]);

 /**
 * RESOURCE DISPOSAL
 * Release this page's GPU resources when it unmounts. The cloned textures,
 * the two textured materials (indexes 4 and 5), and the skeleton are created
 * per page and must be disposed explicitly. The shared module-level
 * pageGeometry and pageMaterials (indexes 0-3) are intentionally left intact.
 */
 useEffect(() => {
 return () => {
 picture.dispose();
 picture2.dispose();
 const materials = manualSkinnedMesh.material;
 materials[4]?.dispose();
 materials[5]?.dispose();
 manualSkinnedMesh.skeleton?.dispose();
 };
 }, [picture, picture2, manualSkinnedMesh]);

 /**
 * ANIMATION LOOP
 * Updates bone rotations each frame to create page flip effect
 */
 useFrame((_, delta) => {
 if (!skinnedMeshRef.current) return;

 // Highlight page on hover by increasing emissive intensity
 // const emissiveIntensity = highlighted ? 0.22 : 0;
 // skinnedMeshRef.current.material[4].emissiveIntensity =
 // skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
 // skinnedMeshRef.current.material[4].emissiveIntensity,
 // emissiveIntensity,
 // 0.1
 // );

 // Track when page opened state changed for animation timing
 if (lastOpened.current !== opened) {
 turnedAt.current = +new Date();
 lastOpened.current = opened;
 }

 // Calculate animation progress (0 to 1, then sin for smooth curve)
 const turnDuration = 400 / normalizedPageSpeed;
 let turningTime = Math.min(turnDuration, Date.now() - turnedAt.current) / turnDuration;
 turningTime = Math.sin(turningTime * Math.PI);

 // Target rotation: opened = -90°, closed = +90°
 let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
  // Add slight extra rotation based on page number (pages fan out slightly)
 if (!bookClosed) {
 targetRotation += degToRad(number * 0.8);
 }

 /**
 * BONE ANIMATION CALCULATION
 * Each bone along the page rotates differently:
 * - Inside bones (0-8): Follow sin curve for inside curl effect
 * - Outside bones (8+): Follow cos curve for outside edge effect
 * - All bones smoothly interpolate to target rotation using dampAngle
 */
 const bones = skinnedMeshRef.current.skeleton.bones;
 for (let i = 0; i < bones.length; i++) {
 const target = i === 0 ? group.current : bones[i];

 // Inner curve: creates 3D curl effect on the inside
 const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
  // Outer curve: pages don't rotate as much at the edges
 const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
  // Turning animation: smooth wave during the page turn
 const turningIntensity =
 Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;

 // Combine all rotation influences
 let rotationAngle =
 INSIDE_CURVE_STRENGTH * insideCurveIntensity * targetRotation -
 OUTSIDE_CURVE_STRENGTH * outsideCurveIntensity * targetRotation +
 TURNING_CURVE_STRENGTH * turningIntensity * targetRotation;

 // Fold rotation: subtle X-axis rotation for paper fold effect
 let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);

 // When book is closed, only root bone rotates
 if (bookClosed) {
 if (i === 0) {
 rotationAngle = targetRotation;
 foldRotationAngle = 0;
 } else {
 rotationAngle = 0;
 foldRotationAngle = 0;
 }
 }

 // Smoothly ease bones to target rotation
 easing.dampAngle(
 target.rotation,
"y",
 rotationAngle,
 EASING_FACTOR * normalizedPageSpeed,
 delta
 );

 // Add fold effect to middle/end bones during turning
 const foldIntensity =
 i > 8
 ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
 : 0;
 easing.dampAngle(
 target.rotation,
"x",
 foldRotationAngle * foldIntensity,
 EASING_FACTOR_FOLD * normalizedPageSpeed,
 delta
 );
 }
 });

 const { setPage } = usePage();
// const [highlighted, setHighlighted] = useState(false);
// useCursor(highlighted);

 return (
 <group
 {...props}
 ref={group}
 // onPointerEnter={(e) => {
 // e.stopPropagation();
 // setHighlighted(true);
 // }}
 // onPointerLeave={(e) => {
 // e.stopPropagation();
 // setHighlighted(false);
 // }}
 onClick={(e) => {
 e.stopPropagation();
 setPage(opened ? number : number + 1);
 // setHighlighted(false);
 }}
 >
 <primitive
 object={manualSkinnedMesh}
 ref={skinnedMeshRef}
 // Stack pages with slight depth offset
 position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
 />
 </group>
 );
};

/**
 * BOOK COMPONENT
 * Main book component that orchestrates page animation
 *  * ANIMATION FLOW:
 * 1. User clicks to change page number in PageContext
 * 2. delayedPage state animates one page at a time toward target
 * 3. Each page renders and receives updated page/opened props
 * 4. Pages animate their bones based on opened state
 */
interface BookOwnProps {
 images?: string[]
 pathPattern?: string
 pageSpeed?: number
 bookScale?: number
}

export const Book = ({  images = [],
 pathPattern ="/assets/nature",
 pageSpeed = 0.8,
 bookScale = 1,
 ...props }: BookOwnProps & Record<string, any>) => {
 const { page } = usePage();
 const [delayedPage, setDelayedPage] = useState(page);
 const [responsiveScale, setResponsiveScale] = useState(1);
 const safePageSpeed = Math.min(5, Math.max(0.1, Number(pageSpeed) || 0.8));
 const normalizedPageSpeed = safePageSpeed / 0.8;
 const safeBookScale = Math.min(3, Math.max(0.2, Number(bookScale) || 1));

 // Generate pages from image array
 const pages = useMemo(() => generatePages(images), [images]);

 // Preload textures
 useEffect(() => {
 if (pages.length > 0) {
 preloadTextures(pages, pathPattern);
 }
 }, [pages, pathPattern]);

 useEffect(() => {
 const updateBookScale = () => {
 if (window.innerWidth <= 640) {
 setResponsiveScale(1.2);
 return;
 }

 if (window.innerWidth <= 1025) {
 setResponsiveScale(0.84);
 return;
 }

 setResponsiveScale(1);
 };

 updateBookScale();
 window.addEventListener("resize", updateBookScale);

 return () => {
 window.removeEventListener("resize", updateBookScale);
 };
 }, []);

 /**
 * PAGE ANIMATION SEQUENCING
 * Animates delayedPage toward target page one page at a time
 * This creates the sequential page-by-page animation
 */
 useEffect(() => {
 let timeout: ReturnType<typeof setTimeout> | undefined;
 const goToPage = () => {
 setDelayedPage((delayedPage: number) => {
 if (page === delayedPage) {
 return delayedPage;
 } else {
 // Faster animation for large jumps, slower for single pages
 const baseDelay = Math.abs(page - delayedPage) > 2 ? 50 : 150;
 timeout = setTimeout(
 () => {
 goToPage();
 },
 baseDelay / normalizedPageSpeed
 );
  if (page > delayedPage) {
 return delayedPage + 1;
 }
 if (page < delayedPage) {
 return delayedPage - 1;
 }
 return delayedPage;
 }
 });
 };
 goToPage();
 return () => {
 clearTimeout(timeout);
 };
 }, [normalizedPageSpeed, page]);

 return (
 <group
 {...props}
 rotation-y={-Math.PI / 2}
 rotation-x={-0.7}
 scale={responsiveScale * safeBookScale}
 >
 {pages.map((pageData, index) => (
 <Page
 key={index}
 page={delayedPage}
 number={index}
 opened={delayedPage > index}
 bookClosed={delayedPage === 0 || delayedPage === pages.length}
 pathPattern={pathPattern}
 pages={pages}
 pageSpeed={safePageSpeed}
 {...pageData}
 />
 ))}
 </group>
 );
};
