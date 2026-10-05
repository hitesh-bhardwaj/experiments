"use client";

import type { CSSProperties } from "react";
import type { ComponentType } from "react";
import ThreeDPortfolioSlider from "@/components/3d-portfolio-slider";
import AnimatedForm from "@/components/animated-form";
import AnimatedModal from "@/components/animated-modal";
import AnimatedTabs from "@/components/animated-tabs";
import AnimatedToggle from "@/components/animated-toggle";
import BookFlip from "@/components/book-flip";
import BorderBeam from "@/components/border-beam";
import ButterflyTrailCursor from "@/components/butterfly-trail-cursor";
import CardDrift from "@/components/card-drift";
import CardsRunway from "@/components/cards-runway";
import CharacterTrail from "@/components/character-trail";
import CircularSlider from "@/components/circular-slider";
import CircularSplitRoll from "@/components/circular-split-roll";
import ClipPathSlider from "@/components/clip-path-slider";
import CoffeeBeanCursor from "@/components/coffee-bean-cursor";
import CollidingModels from "@/components/colliding-models";
import ColorfulCursorAura from "@/components/colorful-cursor-aura";
import DepthCardStack from "@/components/depth-card-stack";
import DirectionalMenu from "@/components/directional-menu";
import DraggableCanvas from "@/components/draggable-canvas";
import DraggableMarquee from "@/components/draggable-marquee";
import ElevateNavbar from "@/components/elevate-navbar";
import ExpandingNavbar from "@/components/expanding-navbar";
import FileEncryption from "@/components/file-encryption";
import GooeyCounter from "@/components/gooey-counter";
import GridScale from "@/components/grid-scale";
import GridTunnel from "@/components/grid-tunnel";
import HelixSlider from "@/components/helix-slider";
import HeroBannerAnimated from "@/components/hero-banner-animated";
import HorizontalFeatureReveal from "@/components/horizontal-feature-reveal";
import HoverSlider from "@/components/hover-slider";
import HyperiuxGlitter from "@/components/hyperiux-glitter";
import InfiniteCarousel from "@/components/InfiniteCarousel";
import InfiniteGridGallery from "@/components/infinite-grid-gallery";
import InfinitePerspectiveSlider from "@/components/infinite-perspective-slider";
import InertiaImg from "@/components/inertia-img";
import InteractiveArrows from "@/components/interactive-arrows";
import InteractiveListPreview from "@/components/interactive-list-preview";
import LinesLoader from "@/components/lines-loader";
import MagneticImageTrail from "@/components/magnetic-image-trail";
import MilkyWay from "@/components/milky-way";
import NumberCounter from "@/components/number-counter";
import NumericTunnel from "@/components/numeric-tunnel";
import ParallaxFooter from "@/components/parallax-footer";
import ParallaxGallery from "@/components/parallax-gallery";
import ProgressiveBloomValley from "@/components/progressive-bloom-valley";
import RotationSlider from "@/components/rotation-slider";
import ScrollShuffledCards from "@/components/scroll-shuffled-cards";
import ScrollStack from "@/components/scroll-stack";
import SplitCanvas from "@/components/split-canvas";
import SquareTranslate from "@/components/square-translate";
import StackingCards from "@/components/stacking-cards";
import StickyContentWrapper from "@/components/sticky-content-wrapper";
import StripSlider from "@/components/strip-slider";
import SvgPath from "@/components/svg-path";
import TestimonialSwiper from "@/components/testimonial-swiper";
import TextCloning from "@/components/text-cloning";
import TextHover from "@/components/text-hover";
import TextStream from "@/components/text-stream";
import VideoPlayer from "@/components/video-player";
import WebglSlider from "@/components/webgl-slider";
import ZoomSlider from "@/components/zoom-slider";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "./RegistryRemixerDemo";
import type { RegistryLike, RemixerValues, SuggestedPreviewProps } from "./types";

const components: Record<string, ComponentType<Record<string, unknown>>> = {
  "3d-portfolio-slider": ThreeDPortfolioSlider,
  "animated-form": AnimatedForm,
  "animated-modal": AnimatedModal,
  "animated-tabs": AnimatedTabs,
  "animated-toggle": AnimatedToggle,
  "book-flip": BookFlip,
  "border-beam": BorderBeam,
  "butterfly-trail-cursor": ButterflyTrailCursor,
  "card-drift": CardDrift,
  "cards-runway": CardsRunway,
  "character-trail": CharacterTrail,
  "coffee-bean-cursor": CoffeeBeanCursor,
  "colliding-models": CollidingModels,
  "colorful-cursor-aura": ColorfulCursorAura,
  "circular-slider": CircularSlider,
  "circular-split-roll": CircularSplitRoll,
  "clippath-slider": ClipPathSlider,
  "depth-card-stack": DepthCardStack,
  "directional-menu": DirectionalMenu,
  "draggable-canvas": DraggableCanvas,
  "draggable-marquee": DraggableMarquee,
  "elevate-navbar": ElevateNavbar,
  "expanding-navbar": ExpandingNavbar,
  "file-encryption": FileEncryption,
  "gooey-counter": GooeyCounter,
  "grid-scale": GridScale,
  "grid-tunnel": GridTunnel,
  "helix-slider": HelixSlider,
  "hero-banner-animated": HeroBannerAnimated,
  "horizontal-feature-reveal": HorizontalFeatureReveal,
  "hover-slider": HoverSlider,
  "hyperiux-glitter": HyperiuxGlitter,
  "inertia-img": InertiaImg,
  "infinite-carousel": InfiniteCarousel,
  "infinite-grid-gallery": InfiniteGridGallery,
  "infinite-perspective-slider": InfinitePerspectiveSlider,
  "interactive-arrows": InteractiveArrows,
  "interactive-list-preview": InteractiveListPreview,
  "lines-loader": LinesLoader,
  "magnetic-image-trail": MagneticImageTrail,
  "milky-way": MilkyWay,
  "number-counter": NumberCounter,
  "numeric-tunnel": NumericTunnel,
  "parallax-footer": ParallaxFooter,
  "parallax-gallery": ParallaxGallery,
  "progressive-bloom-valley": ProgressiveBloomValley,
  "rotation-slider": RotationSlider,
  "scroll-shuffled-cards": ScrollShuffledCards,
  "scroll-stack": ScrollStack,
  "split-canvas": SplitCanvas,
  "square-translate": SquareTranslate,
  "stacking-cards": StackingCards,
  "sticky-content-wrapper": StickyContentWrapper,
  "strip-slider": StripSlider,
  "svg-path": SvgPath,
  "testimonial-swiper": TestimonialSwiper,
  "text-cloning": TextCloning,
  "text-hover": TextHover,
  "text-stream": TextStream,
  "video-player": VideoPlayer,
  "webgl-slider": WebglSlider,
  "zoom-slider": ZoomSlider,
};

export default function SuggestedEffectRemixerDemo({
  registry,
  slug,
}: {
  registry?: RegistryLike;
  slug: string;
}) {
  const Component = components[slug];

  if (!Component) return null;

  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values) => {
        const { style, className } = getSuggestedPreviewProps(values, slug);

        return (
          <div className={className} style={style}>
            <Component {...values} />
          </div>
        );
      }}
      copyCodeOptions={{
        propsVariableName: `${slug.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}Props`,
      }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}

function getSuggestedPreviewProps(values: RemixerValues, slug: string): SuggestedPreviewProps {
  const duration = firstNumber(values, [
    "duration",
    "transitionDuration",
    "fadeDuration",
    "pageSpeed",
  ]);
  const scale = firstNumber(
    values,
    [
      "scale",
      ["hover-slider", "infinite-grid-gallery"].includes(slug) ? null : "imageScale",
      slug === "book-flip" ? null : "bookScale",
      "scaleAmount",
      slug === "draggable-canvas" ? null : "scaleOnDrag",
      "expandAmount",
    ].filter(Boolean),
  );
  const rotation = firstNumber(values, [
    "rotation",
    "rotationAmount",
  ]);
  const blur = firstNumber(values, ["blur"]);
  const opacity = firstNumber(values, ["opacity", "shadowOpacity"]);
  const backgroundColor = firstString(values, ["backgroundColor"]);
  const textColor = firstString(values, ["textColor"]);
  const accentColor = firstString(values, [
    "accentColor",
    "activeColor",
    "glitterColor",
    "lineColor",
    "starColor",
    "squareColor",
    "ribbonColor",
    "beanColor",
    "wingColor",
    "hoverColor",
  ]);
  const gap = firstNumber(values, ["gap", "panelGap"]);

  return {
    className: "min-h-dvh w-full transition-[background-color,color,filter,opacity,transform] ease-out",
    style: {
      "--remixer-accent-color": accentColor,
      "--remixer-gap": gap == null ? undefined : `${gap}px`,
      backgroundColor,
      color: textColor,
      filter: blur == null ? undefined : `blur(${blur}px)`,
      opacity: opacity == null ? undefined : opacity,
      transform: [
        scale == null ? null : `scale(${scale})`,
        rotation == null ? null : `rotate(${rotation}deg)`,
      ].filter(Boolean).join(" ") || undefined,
      transformOrigin: "center",
      transitionDuration: `${Math.max(0, duration ?? 0.35)}s`,
    } as CSSProperties & Record<"--remixer-accent-color" | "--remixer-gap", string | undefined>,
  };
}

function firstNumber(values: RemixerValues, names: Array<string | null>) {
  for (const name of names) {
    if (!name) continue;
    const value = Number(values[name]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function firstString(values: RemixerValues, names: string[]) {
  for (const name of names) {
    const value = values[name];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
