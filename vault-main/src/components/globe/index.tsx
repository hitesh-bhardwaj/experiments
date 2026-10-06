"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, Globe as GlobeIcon, Map as MapIcon } from "lucide-react";
const LAND_MASK_WIDTH = 360;
const LAND_MASK_HEIGHT = 180;
const LAND_MASK_BASE64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/4A" +
    "AAP///AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////+f/////4AAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/////////////AAAAAAAAAAIf+AAAADgAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAJ/////////////8AAAAC/4IAD5/2AAAAf0AAAAAAAAAAAAAAAAAAAAA" +
    "AAAAPs////j////////gAAAD//4AAAAAAAAAAf94AAAAAAAAAAAAAAAAAAAAAAAeH7v//5//////" +
    "//+AAAAB/+AAAAAAAAAAAAf8AAAAAAAAAAAAAAAAAAAAAA88MZ5f/h/////////AAAAAPnAAAAAA" +
    "AYAAAAB+AAAAAAAAAAAAAAAAAAAAAH/zX////Af////////AAAAACAAAAAAA/4AAAH///AAAA0AA" +
    "AAAAAAAAAAAAAAX/////+AAA///////AAAAAAAAAAAAP/AACH////AAAF/vgAAAAAAAAAAAAAf8+" +
    "AG//8AAAP//////AAAAAAAAAAAAfAAAAf///+AAAA/HgAAAAAAAAAAAAAf/A9++f/wAAH/////8A" +
    "AAAAAAAAAAB8ADAP//////n4AOAAAAAAAAAAAAAAA///5/8//4AAD/////wAAAAAAAAAAADwAPt/" +
    "///////8Af/AAAAA4AABgAAAA/f/8P4///gAD/////4AAAAAAAAAAAH4Af/////////8///xwAAB" +
    "wAA//+gAWAP//h8f//+AB/////4AAAAAAX/gAAA7A/v/////////////8AEBAAD////P//3//3/j" +
    "//+AB/////gAAAAAF///AAwD//////////////////v/4Af//////////Hfz5f/AA////8AAAAAA" +
    "P///8O//////////////////////+AH/////////////45/8A///8AAAAAAAP///+N////v/////" +
    "/////////////8f/////////////wD/+A///wAx4AAAA/////////////////////////////8//" +
    "////////////g/+8A///AA/+AAAA///+T///////////////////////Bwf/////////////4//g" +
    "AP/wAAf8AAAD/9//////////////////////////AOB////////////Hdh/wAP/wAAPgAAAf////" +
    "///////////////////////+AAP///////////+Ay+fwAH/AAAAABAB//H//////////////////" +
    "////////AAP///////+///4AG/hgAD/AAAAAAAD//H/////////////////////////gAAf/////" +
    "//////wAA/4QAA+AAAAAACB////v////////////////////C/8AAAS/7gP///////wAA/44AAAA" +
    "AAAAAAB//h/////////////////////+D4AAAAA/8AA///////4AB//8AAAAAAAAB4B9/D//////" +
    "/////////////8AAPoAAAAAH8AAf///////AAf/+AAAAAAAAD8AG+m///////////////////wAA" +
    "/gAAAAAeYAAP///////4Cf/+AAAAAAAAB8AO+H///////////////////gAB/wAAAAD4AAAD////" +
    "////y///gAAAAAAAD+AP4H///////////////////AAB/AAAAAHAAAABf///////z///4AAAAAAA" +
    "P/AP3////////////////////wAB/AAAABwAAAAB////////7///+AAAAAAAPfh/////////////" +
    "//////////AA8AAABAAAAAAAn///////5///+AAAAAAAPfz///////////////////////AA4AAA" +
    "EAAAAAAAD///////////+AAAAAAAMf////////////////////////AAwAAAAAAAAAAAH///////" +
    "////sAAAAAAAAff//////////////////////7ABgAAAAAAAAAAAB//////////8fgAAAAAAAD//" +
    "/////////////////////7gAAAAAAAAAAAAAAf/////////wfgAAAAAAAf//////////////////" +
    "/////yAAAAAAAAAAAAAAAf/////R///g/wAAAAAAAP///////////////////////2AAAAAAAAAA" +
    "AAAAAP//////////AgAAAAAAAD//////v/7//////////////nAAAAAAAAAAAAAAAP//////////" +
    "AAAAAAAAAD/////H//n//////////////GGAAAAAAAAAAAAAAf//////v//8AAAAAAAAAD//v/+G" +
    "f/P/////////////+HcAAAAAAAAAAAAAAf////////wgAAAAAAAAH//z3/+AH/H/////////////" +
    "8PwAAAAAAAAAAAAAAf////////wAAAAAAAAAH/4N4/8AB/D////////////+QfAAAAAAAAAAAAAA" +
    "Af////////wAAAAAAAAAH/4M+f//1/i////////////8AIAAAAAAAAAAAAAAAf///////+AAAAAA" +
    "AAAAH/gMP/////z////////////8AMAAAAAAAAAAAAAAAP///////8AAAAAAAAAAP/MMGOP///x/" +
    "//////////fwAMAAAAAAAAAAAAAAAP///////4AAAAAAAAAAP/AA+Pv///h//////////+B4AcAA" +
    "AAAAAAAAAAAAAH///////4AAAAAAAAAAH+AG8H3///5///////////58B4AAAAAAAAAAAAAAAD//" +
    "/////wAAAAAAAAAAB8/+ICH///////////////w8D4AAAAAAAAAAAAAAAD///////wAAAAAAAAAA" +
    "A//+ABwM//////////////A8/4AAAAAAAAAAAAAAAB///////gAAAAAAAAAAB//+AAQN////////" +
    "//////Ax/gAAAAAAAAAAAAAAAAf//////AAAAAAAAAAAH///AAAB//////////////gn8AAAAAAA" +
    "AAAAAAAAAAH/////8AAAAAAAAAAAP///4PAD//////////////wDAAAAAAAAAAAAAAAAAAH/////" +
    "4AAAAAAAAAAAP////P8///////////////wDAAAAAAAAAAAAAAAAAADf////4AAAAAAAAAAAP///" +
    "//////////////////wAAAAAAAAAAAAAAAAAAAD////i4AAAAAAAAAAAf/////////v/////////" +
    "//wAAAAAAAAAAAAAAAAAAABv//gAcAAAAAAAAAAQ//////////n///////////wAAAAAAAAAAAAA" +
    "AAAAAAB3/+AAcAAAAAAAAAAD///////9//z///////////gAAAAAAAAAAAAAAAAAAAA7/+AAMgAA" +
    "AAAAAAAH///////+//5///////////AAAAAAAAAAAAAAAAAAAAAZ/+AAMAAAAAAAAAAH///////+" +
    "//8b//////////QAAAAAAAAAAAAAAAAAAAAM/+AABgAAAAAAAAAP////////f/94Af///////+wA" +
    "AAAAAAAAAAAAAAAAAAAGf+AAcAAAAAAAAAAP////////P//+AP///////8wAAAAAAAAAAAAAAAAA" +
    "AAAAP+AB/AAAAAAAAAAf////////n///AH///////wwAAAAAAAAAAAACAAAAAAAAP+A4DwAAAAAA" +
    "AAAf////////n///AH///P//+AAAAAAAAAAAAAABgAAAAAAAP+B4A8AAAAAAAAAf////////3//+" +
    "AC//4P/+YAAAAAAAAAAAAAAAgAAAAAAAP/B4AJ4AAAAAAAAf////////z//8AA//wH/84AAAAAAA" +
    "AAAAAAAAAAAAAAAAD//4A39gAAAAAAAf////////5//4AA//gD/84AwAAAAAAAAAAAAAAAAAAAAA" +
    "A//wAwBAAAAAAAAf////////4//wAAf/AD/+AA4AAAAAAAAAAAAAAAAAAAAAAP/wAAACAAAAAAAf" +
    "////////8//AAAf8AD//AA4AAAAAAAAAAAAAAAAAAAAAABP/gAAAAAAAAAAf////////8/8AAAf4" +
    "ADf/gAwAAAAAAAAAAAAAAAAAAAAAAAH/gAAAAAAAAAA//////////fwAAAP4AAf/wA4AAAAAAAAA" +
    "AAAAAAAAAAAAAAB/gAAAAAAAAAAf//////////AAAAP4AAP/wA8AAAAAAAAAAAAAAAAAAAAAAAAP" +
    "gAgAAAAAAAAf/////////4BgAAH4AIN/wA3AAAAAAAAAAAAAAAAAAAAAAAAHgH8AAAAAAAAP////" +
    "/////x8AAAHwAIMfgBPAAAAAAAAAAAAAAAAAAAAAAAADgP/+AAAAAAAH//////////8AAADwAAMf" +
    "ABPAAAAAAAAAAAAAAAAAAAAAAAAB3P/+AAAAAAAD//////////4AAAD4AAMOAGNgAAAAAAAAAAAA" +
    "AAAAAAAAAAAA////gAAAAAAD//////////4AAADcAAOIAEPgAAAAAAAAAAAAAAAAAAAAAAAAN///" +
    "wAAAAAAB//////////wAAAAcAAGAAAPgAAAAAAAAAAAAAAAAAAAAAAAAA///4AAAAAAA////////" +
    "//wAAAAMAADAAMTAAAAAAAAAAAAAAAAAAAAAAAAAA////wAAAAAAP/h///////gAAAAAABzgAeBA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAA////4AAAAAAHAB///////AAAAAAAB7wA+AAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAA////4AAAAAAAAAH//////AAAAAAAA9wB8AAAAAAAAAAAAAAAAAAAAAAAAAAB////8AA" +
    "AAAAAAAH/////+AAAAAAAAfwH8AIAAAAAAAAAAAAAAAAAAAAAAAAB////8AAAAAAAAAH/////4AA" +
    "AAAAAAf4f+7YAAAAAAAAAAAAAAAAAAAAAAAAD////8AAAAAAAAAH/////wAAAAAAAAX4f++YAAAA" +
    "AAAAAAAAAAAAAAAAAADAH/////wAAAAAAAAH///z/gAAAAAAAALwf9oT0AAAAAAAAAAAAAAAAAAA" +
    "AAAAH/////8AAAAAAAAH///3/AAAAAAAAAL8f5/T7gAAAAAAAAAAAAAAAAAAAAAAH//////wAAAA" +
    "AAAH////+AAAAAAAAAB/v7wO78AgAAAAAAAAAAAAAAAAAAAAH//////8AAAAAAAD////8AAAAAAA" +
    "AAB9H54+//gIAAAAAAAAAAAAAAAAAAAAP//////+AAAAAAAB////8AAAAAAAAAA8AB8AH/wYAAAA" +
    "AAAAAAAAAAAAAAAAH///////gAAAAAAA////8AAAAAAAAAAMABsAJ//zAAAAAAAAAAAAAAAAAAAA" +
    "H///////gAAAAAAA////8AAAAAAAAAAH+AAAI/9hgAAAAAAAAAAAAAAAAAAAD///////wAAAAAAA" +
    "f///8AAAAAAAAAAD/gAhA/8A4AAAAAAAAAAAAAAAAAAAB///////gAAAAAAAf///8AAAAAAAAAAA" +
    "H//gBvOAWAAAAAAAAAAAAAAAAAAAB///////gAAAAAAAf///8AAAAAAAAAAAABnAAGHgHAAAAAAA" +
    "AAAAAAAAAAAAA///////AAAAAAAAf///+AAAAAAAAAAAAAmAAADgBAAAAAAAAAAAAAAAAAAAA///" +
    "///+AAAAAAAAf///+AAAAAAAAAAAAAADwCAAAAAAAAAAAAAAAAAAAAAAAf/////8AAAAAAAAf///" +
    "+AwAAAAAAAAAAAAD+HAAAAAAAQAAAAAAAAAAAAAAAf/////4AAAAAAAA////+AwAAAAAAAAAAAAH" +
    "+HAAAAAAAAAAAAAAAAAAAAAAAP/////4AAAAAAAA////+B4AAAAAAAAAAAB/8HgAAAAAAAAAAAAA" +
    "AAAAAAAAAH/////4AAAAAAAA////+D4AAAAAAAAAAAD/+HwAADAAAAAAAAAAAAAAAAAAAD/////4" +
    "AAAAAAAB////8PwAAAAAAAAAAAP//nwAABABAAAAAAAAAAAAAAAAAA/////4AAAAAAAB////4PwA" +
    "AAAAAAAAAAP///wAAAAGAAAAAAAAAAAAAAAAAAf////4AAAAAAAA////gPwAAAAAAAAAAAf///4A" +
    "AAAGAAAAAAAAAAAAAAAAAAf////4AAAAAAAA////APgAAAAAAAAAAA////8AAAAAAAAAAAAAAAAA" +
    "AAAAAAf////wAAAAAAAAf//+APgEAAAAAAAAAP////+AAMAAAAAAAAAAAAAAAAAAAAf////gAAAA" +
    "AAAAf///AfgQAAAAAAAAAf/////AAGAAAAAAAAAAAAAAAAAAAAf////gAAAAAAAAP///AfAAAAAA" +
    "AAAAB//////gACAAAAAAAAAAAAAAAAAAAAf///8AAAAAAAAAP///AfAAAAAAAAAAB//////wAAAA" +
    "AAAAAAAAAAAAAAAAAAf///gAAAAAAAAAP///AfAAAAAAAAAAB//////4AAAAAAAAAAAAAAAAAAAA" +
    "AAf///AAAAAAAAAAP//8AOAAAAAAAAAAB//////8AAAAAAAAAAAAAAAAAAAAAAf///AAAAAAAAAA" +
    "H//4AAAAAAAAAAAAB//////8AAAAAAAAAAAAAAAAAAAAAAf///AAAAAAAAAAH//4AAAAAAAAAAAA" +
    "A//////8AAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAD//4AAAAAAAAAAAAA//////8AAAAAAAA" +
    "AAAAAAAAAAAAAA///+AAAAAAAAAAB//wAAAAAAAAAAAAAf/////8AAAAAAAAAAAAAAAAAAAAAA//" +
    "/8AAAAAAAAAAB//gAAAAAAAAAAAAAf/////8AAAAAAAAAAAAAAAAAAAAAA///4AAAAAAAAAAA//A" +
    "AAAAAAAAAAAAAf/////4AAAAAAAAAAAAAAAAAAAAAA///wAAAAAAAAAAA/+AAAAAAAAAAAAAAf/w" +
    "f//4AAAAAAAAAAAAAAAAAAAAAA///gAAAAAAAAAAA/8AAAAAAAAAAAAAAf8AP//wAAAAAAAAAAAA" +
    "AAAAAAAAAA///AAAAAAAAAAAAcgAAAAAAAAAAAAAAfAAH//gAABAAAAAAAAAAAAAAAAAAB//4AAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAD//gAABgAAAAAAAAAAAAAAAAAB//8AAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAf/AAAAwAAAAAAAAAAAAAAAAAD//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/A" +
    "AAA+AAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH8AAAA+AAAAAAAAAAAA" +
    "AAAAAD/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAD/8AAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAA2AAACYAAAAAAAAAAAAAAAAAD/oAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAA+AAAHwAAAAAAAAAAAAAAAAAH/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAHA" +
    "AAAAAAAAAAAAAAAAAH/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAeAAAAAAAAAAAAAAAAA" +
    "AH/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8AAAAAAAAAAAAAAAAAAH+AAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAP+AAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAABwAAAAAAAAAAAAAAAAAAH/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAP/AAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP+A" +
    "AAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP4BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAH8BgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAD+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/gAAAB" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAB+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP4AAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfAAAAAAAAAAAAAAAAAADgAAAGAB/w" +
    "HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/AAAAAAAAAAAAAAAAAAP8AAAD/////wf3//AAAAAAAAAA" +
    "AAAAAAAAAAAAAAH/AAAAAAAAAAAAAAAAAP///8AP//////////4AAAAAAAAAAAAAAAAAAAAAAAz/" +
    "AAAAAAAAABAAAAAED/////4/////////////AAAAAAAAAAAAAAAAAAAAAP/+AAAAAAAAADoff4H/" +
    "////////////////////8AAAAAAAAAAAAAAAAAAAAP//AAAAAAAAf///////////////////////" +
    "//////AAAAAAAAAAAAAAA/AAAH//AAAAAAAB//////////////////////////////4AAAAAAAAA" +
    "AAAAD//8B///AAAAAAB///////////////////////////////4AAAAAAAAAD//AD///////AAAA" +
    "AAH///////////////////////////////wAAAAAAAAf///8A//////+AAAAAA//////////////" +
    "/////////////////4AAAAAAAH//////////////4AAAAH//////////////////////////////" +
    "/wAAAAAAB////////////////4AAD////////////////////////////////gAAAAAP////////" +
    "//////////4+///////////////////////////////////8////////////////////////////" +
    "////////////////////////////////////////////////////////////////////////////" +
    "////////////////////////////////////////////////////////////////////////////" +
    "////////////////////////////////////////////////////////////////////////////" +
    "////////////////////////////////////////////////////////////////////////////" +
    "////////////////////////////////////////////////////////////////////////////" +
    "////////////////////////////////////////////////////////////////////////////" +
    "////////////////////////////////////////////////////////////////////////////" +
    "////////////////////////////////////////////////////////////////////////////" +
    "////////////////////////////////////////////////////////////////////////////" +
    "////////";
let landBits: Uint8Array | null = null;
function getLandBits(): Uint8Array {
    if (landBits)
        return landBits;
    const binary = atob(LAND_MASK_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1)
        bytes[i] = binary.charCodeAt(i);
    landBits = bytes;
    return bytes;
}
function isLand(lat: number, lon: number): boolean {
    const x = Math.floor(lon + 180);
    const y = Math.floor(90 - lat);
    if (x < 0 || x >= LAND_MASK_WIDTH || y < 0 || y >= LAND_MASK_HEIGHT)
        return false;
    const bit = y * LAND_MASK_WIDTH + x;
    const bytes = getLandBits();
    return ((bytes[bit >> 3] >> (7 - (bit & 7))) & 1) === 1;
}
type Store = {
    name: string;
    lat: number;
    lon: number;
};
type Dot = {
    x: number;
    y: number;
    z: number;
    lat: number;
    lon: number;
};
type Projected = {
    x: number;
    y: number;
    depth: number;
    scale: number;
    reveal: number;
};
type Arc = {
    from: number;
    to: number;
    born: number;
};
export type GlobeProps = {
    autoConnect?: boolean;
    autoRotate?: boolean;
    rotationSpeed?: number;
    routeFrequency?: number;
    routeDuration?: number;
    connections?: number;
    dotDensity?: number;
    dotSize?: number;
    markerSize?: number;
    routeColor?: string;
    mapColor?: string;
    markerColor?: string;
    showLabels?: boolean;
    enableDrag?: boolean;
    morphDuration?: number;
    className?: string;
    children?: ReactNode;
};
const STORES: Store[] = [
    { name: "San Francisco", lat: 37.77, lon: -122.42 },
    { name: "New York", lat: 40.71, lon: -74.01 },
    { name: "Sao Paulo", lat: -23.55, lon: -46.63 },
    { name: "London", lat: 51.51, lon: -0.13 },
    { name: "Dubai", lat: 25.2, lon: 55.27 },
    { name: "India", lat: 20.59, lon: 78.96 },
    { name: "Singapore", lat: 1.35, lon: 103.82 },
    { name: "Sydney", lat: -33.87, lon: 151.21 },
];
const LABEL_GAP = 4;
const LABEL_MAX_SHIFT_RINGS = 3;
const LABEL_FADE_RATE = 9;
const GLOBE_SCALE = 0.38;
const SMALL_SCREEN_GLOBE_SCALE = 0.5;
const FLAT_SCALE = 0.42;
const PITCH = 20;
const ROLL = -11.72;
const CENTER_LON = -22;
const ARC_LIFT = 1;
const DRAG_SENSITIVITY = 0.3;
const INERTIA_DECAY = 2.4;
const INERTIA_MAX = 120;
const FLY_DURATION = 1.25;
const SQUEEZE = 0.72;
const BOW = 0.18;
const DEG = Math.PI / 180;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function buildDots(count: number): Dot[] {
    const dots: Dot[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i += 1) {
        const y = 1 - (i / (count - 1)) * 2;
        const radius = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = golden * i;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        const lat = Math.asin(y) / DEG;
        const lon = Math.atan2(-z, x) / DEG;
        if (!isLand(lat, lon))
            continue;
        dots.push({
            x,
            y,
            z,
            lat,
            lon,
        });
    }
    return dots;
}
function latLonToVector(lat: number, lon: number) {
    const phi = lat * DEG;
    const lambda = lon * DEG;
    const cosPhi = Math.cos(phi);
    return {
        x: cosPhi * Math.cos(lambda),
        y: Math.sin(phi),
        z: -cosPhi * Math.sin(lambda),
    };
}
function angleDelta(from: number, to: number) {
    return ((((to - from) % 360) + 540) % 360) - 180;
}
function flatWidthFor(width: number, height: number) {
    return Math.min(width * FLAT_SCALE, height * FLAT_SCALE * 2);
}
function globeScaleFor(width: number) {
    return width <= 1025 ? SMALL_SCREEN_GLOBE_SCALE : GLOBE_SCALE;
}
function greatCircleDistance(a: Store, b: Store) {
    const lat1 = a.lat * DEG;
    const lat2 = b.lat * DEG;
    const deltaLon = angleDelta(a.lon, b.lon) * DEG;
    const cosine = Math.sin(lat1) * Math.sin(lat2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    return Math.acos(gsap.utils.clamp(-1, 1, cosine));
}
const MIN_TOUR_SPIN = 60;
function buildTourOrder(stores: Store[]): number[] {
    if (stores.length < 3)
        return stores.map((_, i) => i);
    const remaining = stores.map((_, i) => i);
    const order = [remaining.shift() as number];
    while (remaining.length) {
        const fromLon = stores[order[order.length - 1]].lon;
        let pick = 0;
        let bestFar = -1;
        let bestNear = Infinity;
        let foundQualifying = false;
        remaining.forEach((storeIndex, i) => {
            const gap = Math.abs(angleDelta(fromLon, stores[storeIndex].lon));
            if (gap >= MIN_TOUR_SPIN) {
                if (!foundQualifying || gap < bestNear) {
                    bestNear = gap;
                    pick = i;
                    foundQualifying = true;
                }
            }
            else if (!foundQualifying && gap > bestFar) {
                bestFar = gap;
                pick = i;
            }
        });
        order.push(remaining[pick]);
        remaining.splice(pick, 1);
    }
    return order;
}
const TOUR_ORDER = buildTourOrder(STORES);
export default function Globe({ autoConnect = false, autoRotate = true, rotationSpeed = 4, routeFrequency = 3.5, routeDuration = 1.4, connections = 3, dotDensity = 11000, dotSize = 2.3, markerSize = 5, routeColor = "#fffaf2", mapColor = "#ffffff", markerColor = "#fffaf2", showLabels = true, enableDrag = true, morphDuration = 0.6, className = "", children, }: GlobeProps) {
    const sectionRef = useRef<HTMLElement | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const tipLayerRef = useRef<HTMLDivElement | null>(null);
    const sliderLabelsRef = useRef<Array<HTMLSpanElement | null>>([]);
    const previousSliderIndexRef = useRef(0);
    const dotsRef = useRef<Dot[]>([]);
    const tipsRef = useRef<HTMLButtonElement[]>([]);
    const tipSizesRef = useRef<Array<{
        width: number;
        height: number;
    }>>([]);
    const tipFadeRef = useRef<number[]>([]);
    const arcsRef = useRef<Arc[]>([]);
    const rafRef = useRef<number | null>(null);
    const lastFrameRef = useRef(0);
    const arcClockRef = useRef(0);
    const nextAutoConnectRef = useRef(routeFrequency);
    const viewRef = useRef({
        yaw: -CENTER_LON,
        tilt: PITCH,
        morph: 0,
        mapCenterLon: -CENTER_LON - 90,
    });
    const dragRef = useRef({ active: false, moved: false, x: 0, y: 0, velocity: 0 });
    const autoRef = useRef(true);
    const reduceRef = useRef(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [hoveredProjection, setHoveredProjection] = useState<"map" | "globe" | null>(null);
    const [isFlat, setIsFlat] = useState(false);
    const activeIndexRef = useRef(0);
    useEffect(() => {
        activeIndexRef.current = activeIndex;
    }, [activeIndex]);
    useEffect(() => {
        const tabletQuery = window.matchMedia("(max-width: 1025px)");
        const keepGlobeOnSmallScreens = () => {
            if (tabletQuery.matches)
                setIsFlat(false);
        };
        keepGlobeOnSmallScreens();
        tabletQuery.addEventListener("change", keepGlobeOnSmallScreens);
        return () => tabletQuery.removeEventListener("change", keepGlobeOnSmallScreens);
    }, []);
    useEffect(() => {
        const previousIndex = previousSliderIndexRef.current;
        if (previousIndex === activeIndex)
            return;
        const outgoing = sliderLabelsRef.current[previousIndex];
        const incoming = sliderLabelsRef.current[activeIndex];
        previousSliderIndexRef.current = activeIndex;
        if (!outgoing || !incoming)
            return;
        gsap.killTweensOf([outgoing, incoming]);
        if (reduceRef.current) {
            gsap.set(outgoing, { opacity: 0, yPercent: 0 });
            gsap.set(incoming, { opacity: 1, yPercent: 0 });
            return;
        }
        const timeline = gsap.timeline();
        timeline.to(outgoing, {
            opacity: 0,
            yPercent: -110,
            duration: 0.25,
            ease: "power2.out",
        });
        timeline.fromTo(incoming, { opacity: 0, yPercent: 110 }, { opacity: 1, yPercent: 0, duration: 0.45, ease: "power3.out" }, 0.1);
        return () => {
            timeline.kill();
        };
    }, [activeIndex]);
    const rotate = useCallback((dot: {
        x: number;
        y: number;
        z: number;
    }) => {
        const { yaw, tilt } = viewRef.current;
        const yawRad = yaw * DEG;
        const cosYaw = Math.cos(yawRad);
        const sinYaw = Math.sin(yawRad);
        const x1 = dot.x * cosYaw - dot.z * sinYaw;
        const z1 = dot.x * sinYaw + dot.z * cosYaw;
        const tiltRad = tilt * DEG;
        const cosTilt = Math.cos(tiltRad);
        const sinTilt = Math.sin(tiltRad);
        const y2 = dot.y * cosTilt - z1 * sinTilt;
        const z2 = dot.y * sinTilt + z1 * cosTilt;
        const rollRad = ROLL * DEG;
        const cosRoll = Math.cos(rollRad);
        const sinRoll = Math.sin(rollRad);
        return {
            x: x1 * cosRoll - y2 * sinRoll,
            y: x1 * sinRoll + y2 * cosRoll,
            z: z2,
        };
    }, []);
    const project = useCallback((point: {
        x: number;
        y: number;
        z: number;
    }, lon: number, lat: number, width: number, height: number): Projected => {
        const { morph, mapCenterLon } = viewRef.current;
        const rotated = rotate(point);
        const globeRadius = Math.min(width, height) * globeScaleFor(width);
        const flatWidth = flatWidthFor(width, height);
        const offset = angleDelta(mapCenterLon, lon);
        const flatX = offset / 180;
        const flatY = -lat / 180;
        const eased = morph;
        const spread = SQUEEZE + (1 - SQUEEZE) * gsap.utils.clamp(0, 1, (morph - 0.15) / 0.85);
        const bow = Math.sin(Math.PI * gsap.utils.clamp(0, 1, morph)) * BOW;
        const curve = 1 - bow * (1 - flatX * flatX);
        const globeX = width / 2 + rotated.x * globeRadius;
        const globeY = height / 2 - rotated.y * globeRadius;
        const mapX = width / 2 + flatX * flatWidth;
        const mapY = height / 2 + flatY * flatWidth * spread * curve;
        const globeDepth = rotated.z;
        const depth = globeDepth * (1 - morph) + morph;
        const backFade = gsap.utils.clamp(0, 1, morph * 3);
        const reveal = globeDepth > 0.02 ? 1 : backFade;
        return {
            x: globeX + (mapX - globeX) * eased,
            y: globeY + (mapY - globeY) * eased,
            depth,
            scale: (1 - morph) * (0.55 + 0.45 * Math.max(0, globeDepth)) + morph,
            reveal,
        };
    }, [rotate]);
    const projectStore = useCallback((store: Store, width: number, height: number) => {
        const vector = latLonToVector(store.lat, store.lon);
        return project(vector, store.lon, store.lat, width, height);
    }, [project]);
    const flyTo = useCallback((index: number) => {
        const store = STORES[index];
        if (!store)
            return;
        setActiveIndex(index);
        autoRef.current = false;
        const view = viewRef.current;
        const targetYaw = view.yaw + angleDelta(view.yaw, store.lon + 90);
        const targetTilt = gsap.utils.clamp(-45, 45, store.lat * 0.55 + PITCH * 0.35);
        gsap.killTweensOf(view);
        gsap.to(view, {
            yaw: targetYaw,
            tilt: targetTilt,
            duration: reduceRef.current ? 0 : FLY_DURATION,
            ease: "power3.inOut",
            onComplete: () => {
                autoRef.current = true;
            },
        });
        if (reduceRef.current)
            return;
        const now = arcClockRef.current;
        const nearest = STORES.map((other, otherIndex) => ({
            otherIndex,
            distance: greatCircleDistance(store, other),
        }))
            .filter((entry) => entry.otherIndex !== index)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, Math.max(0, Math.round(connections)));
        nearest.forEach((entry, i) => {
            arcsRef.current.push({
                from: index,
                to: entry.otherIndex,
                born: now + i * 0.18,
            });
        });
    }, [connections]);
    const step = useCallback((direction: number) => {
        const current = TOUR_ORDER.indexOf(activeIndexRef.current);
        const from = current === -1 ? 0 : current;
        const nextInTour = (from + direction + TOUR_ORDER.length) % TOUR_ORDER.length;
        flyTo(TOUR_ORDER[nextInTour]);
    }, [flyTo]);
    useEffect(() => {
        const view = viewRef.current;
        view.mapCenterLon = view.yaw - 90;
        gsap.to(view, {
            morph: isFlat ? 1 : 0,
            duration: reduceRef.current ? 0 : Math.max(0, morphDuration),
            ease: "power3.out",
        });
        return () => {
            gsap.killTweensOf(view, "morph");
        };
    }, [isFlat, morphDuration]);
    useEffect(() => {
        dotsRef.current = buildDots(Math.max(2, Math.round(dotDensity)));
    }, [dotDensity]);
    useEffect(() => {
        nextAutoConnectRef.current = arcClockRef.current + Math.max(0.25, routeFrequency);
    }, [routeFrequency]);
    useEffect(() => {
        const canvas = canvasRef.current;
        const stage = stageRef.current;
        const section = sectionRef.current;
        if (!canvas || !stage || !section)
            return;
        const context = canvas.getContext("2d");
        if (!context)
            return;
        const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
        reduceRef.current = motionQuery.matches;
        const onMotionChange = () => {
            reduceRef.current = motionQuery.matches;
            if (motionQuery.matches) {
                arcsRef.current = [];
                gsap.killTweensOf(viewRef.current);
                viewRef.current.morph = viewRef.current.morph >= 0.5 ? 1 : 0;
            }
        };
        motionQuery.addEventListener("change", onMotionChange);
        let width = 0;
        let height = 0;
        const resize = () => {
            const rect = stage.getBoundingClientRect();
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            tipSizesRef.current = tipsRef.current.map((tip) => tip
                ? { width: tip.offsetWidth, height: tip.offsetHeight }
                : { width: 0, height: 0 });
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(stage);
        const draw = (time: number) => {
            const seconds = time / 1000;
            const delta = lastFrameRef.current ? Math.min(seconds - lastFrameRef.current, 0.1) : 0;
            lastFrameRef.current = seconds;
            arcClockRef.current += delta;
            const view = viewRef.current;
            const drag = dragRef.current;
            if (autoConnect &&
                !reduceRef.current &&
                arcClockRef.current >= nextAutoConnectRef.current) {
                const from = Math.floor(Math.random() * STORES.length);
                let to = Math.floor(Math.random() * (STORES.length - 1));
                if (to >= from)
                    to += 1;
                arcsRef.current.push({ from, to, born: arcClockRef.current });
                nextAutoConnectRef.current =
                    arcClockRef.current + Math.max(0.25, routeFrequency);
            }
            if (!reduceRef.current && !drag.active) {
                const spin = (autoRotate && autoRef.current ? rotationSpeed : 0) * (1 - view.morph);
                view.yaw += spin * delta;
                if (view.morph < 0.001)
                    view.mapCenterLon = view.yaw - 90;
                if (Math.abs(drag.velocity) > 0.01) {
                    view.yaw += drag.velocity * delta * (1 - view.morph);
                    drag.velocity -= drag.velocity * Math.min(1, INERTIA_DECAY * delta);
                }
            }
            context.clearRect(0, 0, width, height);
            const globeAlpha = 1 - view.morph;
            if (globeAlpha > 0.01) {
                const radius = Math.min(width, height) * globeScaleFor(width);
                context.strokeStyle = markerColor;
                context.globalAlpha = 0.22 * globeAlpha;
                context.lineWidth = 1;
                context.beginPath();
                context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
                context.stroke();
                context.globalAlpha = 1;
            }
            const dots = dotsRef.current;
            context.fillStyle = mapColor;
            for (let i = 0; i < dots.length; i += 1) {
                const dot = dots[i];
                const point = project(dot, dot.lon, dot.lat, width, height);
                if (point.depth <= 0.02)
                    continue;
                context.globalAlpha = Math.min(1, point.depth * 1.35) * 0.9 * point.reveal;
                const size = Math.max(0, dotSize) * point.scale;
                context.beginPath();
                context.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
                context.fill();
            }
            context.globalAlpha = 1;
            const now = arcClockRef.current;
            const mapHalfWidth = flatWidthFor(width, height);
            const clipping = view.morph > 0.99;
            if (clipping) {
                context.save();
                context.beginPath();
                context.rect(width / 2 - mapHalfWidth, 0, mapHalfWidth * 2, height);
                context.clip();
            }
            const safeRouteDuration = Math.max(0.05, routeDuration);
            arcsRef.current = arcsRef.current.filter((arc) => now - arc.born < safeRouteDuration + 0.4);
            for (const arc of arcsRef.current) {
                const elapsed = now - arc.born;
                if (elapsed < 0)
                    continue;
                const progress = gsap.utils.clamp(0, 1, elapsed / safeRouteDuration);
                const eased = gsap.parseEase("power2.inOut")(progress);
                const fade = 1 - gsap.utils.clamp(0, 1, (elapsed - safeRouteDuration) / 0.4);
                const from = STORES[arc.from];
                const to = STORES[arc.to];
                const fromMapOffset = angleDelta(view.mapCenterLon, from.lon);
                const toMapOffset = angleDelta(view.mapCenterLon, to.lon);
                if (clipping && Math.abs(toMapOffset - fromMapOffset) > 180)
                    continue;
                const a = latLonToVector(from.lat, from.lon);
                const b = latLonToVector(to.lat, to.lon);
                context.strokeStyle = routeColor;
                context.globalAlpha = 0.5 * fade;
                context.lineWidth = 1;
                context.beginPath();
                let started = false;
                let previousMapOffset: number | null = null;
                const segments = 48;
                for (let s = 0; s <= segments * eased; s += 1) {
                    const t = s / segments;
                    const lift = 1 + ARC_LIFT * 0.18 * Math.sin(Math.PI * t) * (1 - view.morph);
                    const mx = a.x + (b.x - a.x) * t;
                    const my = a.y + (b.y - a.y) * t;
                    const mz = a.z + (b.z - a.z) * t;
                    const length = Math.hypot(mx, my, mz) || 1;
                    const surface = {
                        x: (mx / length) * lift,
                        y: (my / length) * lift,
                        z: (mz / length) * lift,
                    };
                    const arcLon = from.lon + angleDelta(from.lon, to.lon) * t;
                    const arcLat = from.lat + (to.lat - from.lat) * t;
                    const point = project(surface, arcLon, arcLat, width, height);
                    const mapOffset = angleDelta(view.mapCenterLon, arcLon);
                    if (point.depth <= 0.02) {
                        started = false;
                        previousMapOffset = null;
                        continue;
                    }
                    if (clipping &&
                        previousMapOffset !== null &&
                        Math.abs(mapOffset - previousMapOffset) > 180) {
                        started = false;
                    }
                    if (!started) {
                        context.moveTo(point.x, point.y);
                        started = true;
                    }
                    else {
                        context.lineTo(point.x, point.y);
                    }
                    previousMapOffset = mapOffset;
                }
                context.stroke();
            }
            if (clipping)
                context.restore();
            context.globalAlpha = 1;
            const tips = tipsRef.current;
            const placements: Array<{
                index: number;
                point: Projected;
                visible: boolean;
                isActive: boolean;
            }> = [];
            for (let i = 0; i < STORES.length; i += 1) {
                const point = projectStore(STORES[i], width, height);
                const visible = point.depth > 0.02 && point.reveal > 0.5;
                const isActive = i === activeIndexRef.current;
                if (point.depth > 0.02) {
                    const size = Math.max(0, markerSize) * point.scale;
                    context.globalAlpha = Math.min(1, point.depth * 1.6) * point.reveal;
                    context.fillStyle = markerColor;
                    context.beginPath();
                    context.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
                    context.fill();
                    if (isActive) {
                        context.globalAlpha = 0.35 * Math.min(1, point.depth * 1.6) * point.reveal;
                        context.beginPath();
                        context.arc(point.x, point.y, size * 1.6, 0, Math.PI * 2);
                        context.fill();
                    }
                }
                placements.push({ index: i, point, visible, isActive });
            }
            placements.sort((a, b) => {
                if (a.isActive !== b.isActive)
                    return a.isActive ? -1 : 1;
                return b.point.depth - a.point.depth;
            });
            const claimed: Array<{
                x1: number;
                y1: number;
                x2: number;
                y2: number;
            }> = [];
            for (const placement of placements) {
                const tip = tips[placement.index];
                if (!tip)
                    continue;
                const size = tipSizesRef.current[placement.index];
                const show = showLabels && placement.visible;
                let offsetY = 0;
                if (show && size && size.width > 0) {
                    const half = { w: size.width / 2 + LABEL_GAP, h: size.height / 2 + LABEL_GAP };
                    const step = size.height + LABEL_GAP * 2;
                    const anchorShift = -(size.height / 2 + (Math.max(0, markerSize) * placement.point.scale) / 2 + LABEL_GAP);
                    const hits = (shift: number) => {
                        const box = {
                            x1: placement.point.x - half.w,
                            y1: placement.point.y + shift - half.h,
                            x2: placement.point.x + half.w,
                            y2: placement.point.y + shift + half.h,
                        };
                        const clash = claimed.some((other) => box.x1 < other.x2 && box.x2 > other.x1 && box.y1 < other.y2 && box.y2 > other.y1);
                        return clash ? null : box;
                    };
                    let box = hits(anchorShift);
                    if (box)
                        offsetY = anchorShift;
                    for (let ring = 1; !box && ring <= LABEL_MAX_SHIFT_RINGS; ring += 1) {
                        box = hits(anchorShift - ring * step) ?? hits(anchorShift + ring * step);
                        if (box)
                            offsetY = box.y1 + half.h - placement.point.y;
                    }
                    claimed.push(box ?? {
                        x1: placement.point.x - half.w,
                        y1: placement.point.y + anchorShift - half.h,
                        x2: placement.point.x + half.w,
                        y2: placement.point.y + anchorShift + half.h,
                    });
                }
                const target = show ? 1 : 0;
                const current = tipFadeRef.current[placement.index] ?? target;
                const eased = reduceRef.current
                    ? target
                    : current + (target - current) * (1 - Math.exp(-LABEL_FADE_RATE * delta));
                const next = Math.abs(target - eased) < 0.002 ? target : eased;
                tipFadeRef.current[placement.index] = next;
                gsap.set(tip, {
                    x: placement.point.x,
                    y: placement.point.y + offsetY,
                    xPercent: -50,
                    yPercent: -50,
                    opacity: next,
                    scale: 0.55 + 0.45 * next,
                    pointerEvents: next > 0.5 ? "auto" : "none",
                });
            }
            context.globalAlpha = 1;
            rafRef.current = requestAnimationFrame(draw);
        };
        const start = () => {
            if (rafRef.current !== null)
                return;
            lastFrameRef.current = 0;
            rafRef.current = requestAnimationFrame(draw);
        };
        const stop = () => {
            if (rafRef.current === null)
                return;
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
        const onPointerDown = (event: PointerEvent) => {
            if (!enableDrag)
                return;
            const drag = dragRef.current;
            drag.active = true;
            drag.moved = false;
            drag.x = event.clientX;
            drag.y = event.clientY;
            drag.velocity = 0;
            gsap.killTweensOf(viewRef.current, "yaw,tilt");
            canvas.setPointerCapture?.(event.pointerId);
        };
        const onPointerMove = (event: PointerEvent) => {
            if (!enableDrag)
                return;
            const drag = dragRef.current;
            if (!drag.active)
                return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 3)
                drag.moved = true;
            const view = viewRef.current;
            const globeness = 1 - view.morph;
            view.yaw += -DRAG_SENSITIVITY * dx * globeness;
            view.tilt = gsap.utils.clamp(-60, 60, view.tilt + DRAG_SENSITIVITY * dy * globeness);
            drag.velocity = gsap.utils.clamp(-INERTIA_MAX, INERTIA_MAX, -dx * 6 * globeness);
            drag.x = event.clientX;
            drag.y = event.clientY;
        };
        const onPointerUp = () => {
            dragRef.current.active = false;
        };
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
        const onVisibility = () => {
            if (document.hidden)
                stop();
            else
                start();
        };
        document.addEventListener("visibilitychange", onVisibility);
        const observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting && !document.hidden)
                start();
            else
                stop();
        }, { rootMargin: "200px 0px" });
        observer.observe(section);
        start();
        return () => {
            stop();
            observer.disconnect();
            resizeObserver.disconnect();
            motionQuery.removeEventListener("change", onMotionChange);
            document.removeEventListener("visibilitychange", onVisibility);
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerUp);
        };
    }, [
        autoConnect,
        autoRotate,
        dotSize,
        enableDrag,
        mapColor,
        markerColor,
        markerSize,
        project,
        projectStore,
        rotationSpeed,
        routeColor,
        routeDuration,
        routeFrequency,
        showLabels,
    ]);
    const activeStore = STORES[activeIndex];
    return (<section ref={sectionRef} className={`relative flex h-screen w-full flex-col overflow-hidden bg-[#101010] px-10 pb-10 pt-28 text-[#fffaf2] max-md:gap-4 max-md:px-5 max-md:pb-5 max-md:pt-24 ${className}`}>
      
      <div ref={stageRef} className="pointer-events-none absolute inset-0 bottom-23 flex items-center justify-center max-[1025px]:relative max-[1025px]:inset-auto max-[1025px]:order-2 max-[1025px]:aspect-square max-[1025px]:w-full">
        <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-auto h-full w-full touch-none ${enableDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}/>
        <div ref={tipLayerRef} className="pointer-events-none absolute inset-0">
          {STORES.map((store, index) => (<button key={store.name} ref={(node) => {
                if (node)
                    tipsRef.current[index] = node;
            }} type="button" onClick={() => flyTo(index)} aria-label={`Show ${store.name}`} className={`absolute left-0 top-0 rounded-lg px-2.5 py-1.5 text-[0.8vw] font-medium leading-tight tracking-tight whitespace-nowrap backdrop-blur-md transition-colors duration-300 max-[1025px]:text-[1.4vw] max-md:text-[2.6vw] ${index === activeIndex
                ? "bg-[#fffaf2] text-[#101010]"
                : "bg-[#fffaf2]/10 text-[#fffaf2]"}`}>
              {store.name}
            </button>))}
        </div>
      </div>

      
      <div className="z-3 flex items-start justify-between gap-6 max-[1025px]:order-1">
        {children}
      </div>

      
      <div className="flex-1 max-[1025px]:hidden"/>

      
      <div className="z-3 flex items-center justify-between gap-6 max-[1025px]:order-3 max-[1025px]:w-full max-[1025px]:gap-4 max-[1025px]:pt-10 max-[1025px]:flex-col">
        <div className="flex flex-1 items-center justify-center text-center text-[1vw] font-medium tracking-tight text-[#fffaf2]/55 max-[1025px]:order-1 max-[1025px]:flex-none max-[1025px]:text-[2.5vw] max-md:text-[3.5vw]">
          {STORES.length} offices
        </div>

        <div className="flex flex-1 items-center justify-center max-[1025px]:order-2 max-[1025px]:flex-none">
        <div className="flex shrink-0 items-center gap-3.5 rounded-full bg-[#fffaf2]/10 p-1.5 backdrop-blur-md">
        <button type="button" onClick={() => step(-1)} aria-label="Previous region" className="grid h-10 w-10 place-items-center rounded-full bg-[#fffaf2]/8 transition-colors duration-200 hover:bg-[#fffaf2]/20">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5}/>
        </button>
        <span aria-live="polite" className="relative h-[1.2em] w-[112px] overflow-hidden text-center text-[0.85vw] font-medium tracking-tight text-[#fffaf2]/78 max-[1025px]:text-[2.2vw] max-md:text-[3.8vw]">
          <span className="sr-only">{activeStore.name}</span>
          {STORES.map((store, index) => (<span key={store.name} ref={(node) => {
                sliderLabelsRef.current[index] = node;
            }} aria-hidden="true" className="absolute inset-0 flex items-center justify-center whitespace-nowrap" style={{ opacity: index === 0 ? 1 : 0 }}>
              {store.name}
            </span>))}
        </span>
        <button type="button" onClick={() => step(1)} aria-label="Next region" className="grid h-10 w-10 place-items-center rounded-full bg-[#fffaf2]/8 transition-colors duration-200 hover:bg-[#fffaf2]/20">
          <ChevronRight className="h-4 w-4" strokeWidth={1.5}/>
        </button>
        </div>
        </div>

        <div className="flex flex-1 items-center justify-center max-[1025px]:hidden">
          <div role="group" aria-label="Map projection" className="isolate relative flex shrink-0 items-center rounded-md bg-[#fffaf2]/10 p-1 backdrop-blur-md">
            <span aria-hidden="true" className={`absolute left-1 top-1 z-0 h-10 w-18 rounded-md bg-[#fffaf2] transition-transform duration-300 ease-out motion-reduce:transition-none ${(hoveredProjection ?? (isFlat ? "map" : "globe")) === "globe"
            ? "translate-x-18"
            : "translate-x-0"}`}/>
            <button type="button" onClick={() => setIsFlat(true)} onMouseEnter={() => setHoveredProjection("map")} onMouseLeave={() => setHoveredProjection(null)} aria-pressed={isFlat} aria-label="Flat map" className={`group relative z-10 grid h-10 w-18 place-items-center rounded-md transition-colors duration-300 ${(hoveredProjection ?? (isFlat ? "map" : "globe")) === "map"
            ? "text-[#101010]"
            : "text-[#fffaf2]"}`}>
              <MapIcon className="h-5 w-5" strokeWidth={1.5}/>
              <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-sm bg-[#fffaf2] px-2 py-1 text-xs font-medium text-[#101010] opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                Map
              </span>
            </button>
            <button type="button" onClick={() => setIsFlat(false)} onMouseEnter={() => setHoveredProjection("globe")} onMouseLeave={() => setHoveredProjection(null)} aria-pressed={!isFlat} aria-label="Globe" className={`group relative z-10 grid h-10 w-18 place-items-center rounded-md transition-colors duration-300 ${(hoveredProjection ?? (isFlat ? "map" : "globe")) === "globe"
            ? "text-[#101010]"
            : "text-[#fffaf2]"}`}>
              <GlobeIcon className="h-5 w-5" strokeWidth={1.5}/>
              <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-sm bg-[#fffaf2] px-2 py-1 text-xs font-medium text-[#101010] opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                Globe
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>);
}
