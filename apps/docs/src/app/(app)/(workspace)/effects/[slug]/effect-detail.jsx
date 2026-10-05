"use client";

import {
  Fragment,
  useRef,
  useState,
  useEffect,
  useCallback,
  Suspense,
  forwardRef,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";
import { EffectCard } from "@/components/ui/EffectCardNew";
import { CodeBlock, CodeBlockLanguageProvider } from "@/components/ui/CodeBlock";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import {
  FAQContent,
  FAQGroup,
  FAQTitle,
  FAQWrapper,
} from "@/components/animated-faq";
import { getEffectHref, getEffectPreviewHref } from "@/lib/categories";
import { resolveEffectVideoUrl, resolveMediaUrl } from "@/lib/media";
import HeadAnim from "@/components/Animations/HeadAnim";
import Copy from "@/components/Animations/Copy";
import { useFadeUp, useLineAnim } from "@/components/Animations/gsapAnimations";
import styles from "./effect-content.module.css";
import { LockKeyhole } from "lucide-react";
import { CustomAnimationFormTrigger } from "@/components/WebsiteComps/modals/CustomAnimationFormModal";
import { CopyLimitProvider, useCopyLimit } from "./useCopyLimit";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { ArrowIcon } from "@/components/WebsiteComps/Icons";
import EffectStage from "./EffectStage";

function formatEffectDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={[
        "relative overflow-hidden bg-[#272727]",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.4s_infinite]",
        "before:bg-linear-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className,
      ].join(" ")}
    />
  );
}

function EffectDetailMainSkeleton() {
  return (
    <main className="mx-auto w-full relative px-14 max-[1025px]:px-0 pt-25 pb-12 max-md:pt-36">
      <section className="space-y-7">
        <div className="flex items-start max-md:px-[7vw] max-[1025px]:px-[6vw] justify-between gap-5">
          <div className="w-full space-y-5">
            <div className="mb-6 flex w-fit max-w-full flex-wrap items-center gap-2 max-[1025px]:mx-auto max-[1025px]:justify-center">
              <SkeletonBlock className="h-4 w-12  bg-[#272727]" />
              <span className="text-white/25">/</span>
              <SkeletonBlock className="h-4 w-16  bg-[#272727]" />
              <span className="text-white/25">/</span>
              <SkeletonBlock className="h-4 w-24  bg-[#272727]" />
              <span className="text-white/25">/</span>
              <SkeletonBlock className="h-4 w-40  bg-[#272727]" />
            </div>

            <SkeletonBlock className="h-[5.2vw] w-[62%]  bg-[#272727] max-[1025px]:mx-auto max-[1025px]:h-14 max-[1025px]:w-[82%] max-md:h-12" />

            <div className="space-y-3 max-[1025px]:mx-auto max-[1025px]:w-[90%]">
              <SkeletonBlock className="h-5 w-[72%]  bg-[#272727] max-[1025px]:mx-auto" />
              <SkeletonBlock className="h-5 w-[54%]  bg-[#272727] max-[1025px]:mx-auto" />
            </div>

            <div className="mt-12 flex w-full items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonBlock className="h-10 w-20  bg-[#272727]" />
                <SkeletonBlock className="h-10 w-24  bg-[#272727]" />
                <SkeletonBlock className="h-10 w-18  bg-[#272727]" />
              </div>

              <div className="ml-auto shrink-0 max-md:hidden">
                <SkeletonBlock className="h-12 w-36  bg-[#ff5f00]/45" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-md:px-[7vw] max-[1025px]:px-[6vw] h-[46vw]  w-full">
          <SkeletonBlock className="h-full w-full bg-[#272727]" />
        </div>

        <div className="max-md:flex max-md:px-[7vw] max-[1025px]:px-[6vw] w-full max-md:pt-4 justify-center shrink-0 hidden">
          <SkeletonBlock className="h-12 w-36  bg-[#ff5f00]/45" />
        </div>

        <div className="relative max-md:px-[7vw] max-[1025px]:px-[6vw] pt-[1.5vw]">
          <div className="space-y-8 w-[70%] max-[1025px]:w-full">
            <SkeletonBlock className="h-10 w-[58%]  bg-[#272727]" />

            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-full  bg-[#272727]" />
              <SkeletonBlock className="h-5 w-[92%]  bg-[#272727]" />
              <SkeletonBlock className="h-5 w-[76%]  bg-[#272727]" />
            </div>

            <SkeletonBlock className="h-9 w-[46%]  bg-[#272727]" />

            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-full  bg-[#272727]" />
              <SkeletonBlock className="h-5 w-[88%]  bg-[#272727]" />
              <SkeletonBlock className="h-5 w-[64%]  bg-[#272727]" />
            </div>

            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-[82%]  bg-[#272727]" />
              <SkeletonBlock className="h-5 w-[70%]  bg-[#272727]" />
              <SkeletonBlock className="h-5 w-[74%]  bg-[#272727]" />
            </div>

            <SkeletonBlock className="h-[18vw] w-full  bg-[#171717] max-[1025px]:h-64" />
          </div>
        </div>

        <div className="w-[70%] max-[1025px]:w-full max-md:px-[7vw] max-[1025px]:px-[6vw] max-md:mt-[10vw]">
          <div className="w-full  bg-[#272727] my-[5vw] mx-auto px-10 max-[1025px]:px-6 max-md:px-[7vw] py-15">
            <SkeletonBlock className="h-10 w-[52%]  bg-[#333333] max-md:h-8 max-md:w-[84%]" />

            <div className="mt-5 space-y-3">
              <SkeletonBlock className="h-5 w-[78%]  bg-[#333333]" />
              <SkeletonBlock className="h-5 w-[58%]  bg-[#333333]" />
            </div>

            <SkeletonBlock className="mt-7 h-12 w-36  bg-white/40" />
          </div>
        </div>

        <section className="my-20 relative space-y-10 max-[1025px]:space-y-10">
          <div className="flex items-center justify-between gap-5 max-[1025px]:flex-col">
            <SkeletonBlock className="h-12 w-[30%]  bg-[#272727] max-[1025px]:w-[60%] max-md:w-[80%]" />
            <SkeletonBlock className="h-12 w-44  bg-[#ff5f00]/45 max-[1025px]:hidden" />
          </div>

          <div className="flex gap-6 overflow-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`related-effect-skeleton-${index}`}
                className="min-w-[31vw] max-[1025px]:min-w-[44vw] max-[1025px]:min-w-[55vw] max-md:min-w-full"
              >
                <div className="relative aspect-[1.02/1] w-full overflow-hidden  bg-[#272727] p-[2vw] max-[1025px]:p-5 max-md:p-5">
                  <div className="flex h-full w-full items-center justify-center">
                    <SkeletonBlock className="aspect-[1.78/1] w-[88%]  bg-[#111111]" />
                  </div>
                </div>

                <div className="mt-5 px-3">
                  <SkeletonBlock className="mb-2 h-5 w-[58%] bg-[#2f2f2f]" />
                  <SkeletonBlock className="h-4 w-[34%] bg-[#242424]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export function EffectDetailContent({
  slug,
  categorySlug,
  effect,
  content,
  relatedEffects = [],
  effectCounts,
  totalEffects,
  isLocked = false,
  userPlan = "free",
  searchEffects = [],
}) {
  useFadeUp();
  useLineAnim();

  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [showSignInToCopyModal, setShowSignInToCopyModal] = useState(false);

  // SSR-safe mounted flag - `mounted` gates a createPortal() call further
  // down, which needs document.body and so can only run after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef(null);
  const contentRef = useRef(null);
  const ctaSectionRef = useRef(null);
  const relatedEffectsRef = useRef(null);
  const relatedSliderRef = useRef(null);

  const relatedSliderDragRef = useRef({
    isPointerDown: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);


  //testing purpose

  const TEST_MAIN_SKELETON_DELAY = 0; // set to 0 before production

  const [hasPassedMainSkeletonDelay, setHasPassedMainSkeletonDelay] = useState(
    TEST_MAIN_SKELETON_DELAY === 0
  );

  useEffect(() => {
    if (TEST_MAIN_SKELETON_DELAY === 0) {
      queueMicrotask(() => {
        setHasPassedMainSkeletonDelay(true);
      });
      return;
    }

    queueMicrotask(() => {
      setHasPassedMainSkeletonDelay(false);
    });

    const timeoutId = window.setTimeout(() => {
      setHasPassedMainSkeletonDelay(true);
    }, TEST_MAIN_SKELETON_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [slug, categorySlug]);

  const isMainDataLoading =
    !hasPassedMainSkeletonDelay || !effect || !content;

  const safeEffect = effect || {};
  const safeContent = content || null;
  const safeRelatedEffects = Array.isArray(relatedEffects)
    ? relatedEffects
    : [];

  const videoPreviewUrl = resolveEffectVideoUrl({
    videoUrl: content?.videoUrl || safeEffect.videoUrl || `${slug}.mp4`,
    categorySlug: content?.categorySlug || categorySlug || safeEffect.categorySlug,
    effectSlug: slug,
  });

  const updateRelatedScrollState = useCallback(() => {
    const slider = relatedSliderRef.current;

    if (!slider) return;

    const { scrollLeft, scrollWidth, clientWidth } = slider;

    setCanScrollPrev(scrollLeft > 8);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);


  const showVideo = videoPreviewUrl && !videoError && videoReady;
  const showRelatedSliderControls = safeRelatedEffects.length > 2;

  const pageTitle = safeContent
    ? safeContent.title?.trim()
    : safeEffect.title;

  const pageSummary = safeContent
    ? safeContent.summary?.trim()
    : safeEffect.description;

  const hasCtaSection = Boolean(
    safeContent?.ctaBanner?.heading || safeContent?.ctaBanner?.buttonText
  );
  const addedAtLabel = formatEffectDate(safeContent?.addedAt ?? safeEffect.addedAt);
  const lastUpdatedLabel = formatEffectDate(
    safeContent?.lastUpdated ??
    safeContent?.updatedAt ??
    safeEffect.lastUpdated ??
    safeEffect.updatedAt
  );
  const shouldShowEffectDates = Boolean(addedAtLabel && lastUpdatedLabel);

  const scrollRelatedEffects = (direction) => {
    const slider = relatedSliderRef.current;

    if (!slider) return;

    const scrollAmount = slider.clientWidth * 0.86;

    slider.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });

    requestAnimationFrame(updateRelatedScrollState);
    setTimeout(updateRelatedScrollState, 250);
  };

  useEffect(() => {
    const slider = relatedSliderRef.current;

    if (!slider) return;

    queueMicrotask(() => {
      updateRelatedScrollState();
    });

    slider.addEventListener("scroll", updateRelatedScrollState, {
      passive: true,
    });

    return () => {
      slider.removeEventListener("scroll", updateRelatedScrollState);
    };
  }, [updateRelatedScrollState, safeRelatedEffects.length]);

  const handleRelatedPointerDown = (event) => {
    const slider = relatedSliderRef.current;

    if (!slider) return;

    relatedSliderDragRef.current = {
      isPointerDown: true,
      isDragging: false,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: slider.scrollLeft,
    };
  };

  const handleRelatedPointerMove = (event) => {
    const slider = relatedSliderRef.current;
    const dragState = relatedSliderDragRef.current;

    if (!slider || !dragState.isPointerDown) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    const isHorizontalDrag =
      Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY);

    if (!isHorizontalDrag && !dragState.isDragging) return;

    dragState.isDragging = true;

    event.preventDefault();

    slider.scrollLeft = dragState.scrollLeft - deltaX;
  };

  const handleRelatedPointerEnd = () => {
    const dragState = relatedSliderDragRef.current;

    dragState.isPointerDown = false;

    window.setTimeout(() => {
      dragState.isDragging = false;
    }, 0);
  };

  const handleRelatedCardClick = useCallback(
    (event, relatedEffect) => {
      const dragState = relatedSliderDragRef.current;

      if (dragState.isDragging) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const interactiveEl = event.target.closest(
        "button, input, textarea, select, [role='button'], [data-no-card-link]"
      );

      if (interactiveEl) return;

      event.preventDefault();
      event.stopPropagation();

      router.push(getEffectHref(relatedEffect));
    },
    [router]
  );

  const handleVideoReady = () => {
    const video = videoRef.current;

    setVideoReady(true);

    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.play?.().catch(() => { });
  };

  const previewHref = getEffectPreviewHref({
    ...safeEffect,
    effectSlug: slug,
    categorySlug,
  });

  const dependencies = Array.isArray(content?.tags) && content.tags.length > 0
    ? content.tags
    : safeEffect.dependencies || [];

  const coverImage =
    resolveMediaUrl(content?.coverImage || safeEffect.coverImage || slug, {
      defaultDirectory: "vault-listing-images",
      defaultExtension: "png",
    }) || "/assets/img/image01.webp";

  return (
    <CopyLimitProvider effectSlug={slug} onRequireSignIn={() => setShowSignInToCopyModal(true)}>
      <div className="min-h-screen text-foreground">
          <Suspense fallback={<div className="h-12" />}>
            <VaultHeader effectName={pageTitle || safeEffect.title}
              showSearch={true}
              effects={searchEffects} />
          </Suspense>

          {isMainDataLoading ? (
            <EffectDetailMainSkeleton />
          ) : (
            <main className="mx-auto w-full relative px-14 max-[1025px]:px-0 pt-25 pb-12 max-md:pt-36">
              <section className="space-y-7">
                <div className="flex items-start max-md:px-[7vw] max-[1025px]:px-[6vw] justify-between gap-5">
                  <div className="w-full space-y-5">
                    <Breadcrumb />

                    {pageTitle && (
                      <HeadAnim>
                        <h1 className="w-full max-md:text-[6vw] max-md:font-bold max-[1025px]:w-[90%] max-md:w-[80%]  font-semibold leading-[1.3]! text-foreground text80">
                          {pageTitle}
                        </h1>
                      </HeadAnim>
                    )}

                    {pageSummary && (
                      <Copy delay={0.5}>
                        <p className="mt-4 w-full max-[1025px]:w-[90%] text-foreground opacity-90 text22 leading-relaxed max-[1025px]:leading-[1.3]">
                          {pageSummary}
                        </p>
                      </Copy>
                    )}
                    {shouldShowEffectDates && (
                      <div className="mt-5 flex items-start gap-x-5 gap-y-1 text18 text-white/80 max-md:text-[3vw]! max-md:flex-col ">
                        <Copy delay={0.6} animationKey={addedAtLabel}>
                          <div><span className="font-laygrotesk">Published On: </span>{addedAtLabel}</div>
                        </Copy>
                        <Copy delay={0.7} animationKey={lastUpdatedLabel}>
                          <div><span className="font-laygrotesk">Last Updated: </span>{lastUpdatedLabel}</div>
                        </Copy>
                      </div>
                    )}

                    <div className="mt-10 flex w-full items-center justify-between gap-3 fadeup max-md:mt-8">
                      {(dependencies.length > 0 || (content?.tier ?? safeEffect.tier) === "pro") && (
                        <div className="flex flex-wrap items-center gap-3">
                          {dependencies.map((dep) => (
                            <span
                              key={dep}
                              className=" bg-[#272727] px-2 py-1 text20 capitalize text-foreground max-md:text-muted max-md:px-6"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                </div>

                <div className="fadeup max-md:px-[7vw] max-[1025px]:px-[6vw] h-auto  w-full">
                  {/* Live stage + Playground (remixer), in place of the preview video */}
                  <EffectStage effect={effect} title={pageTitle} previewHref={previewHref} />
                </div>


                <div className="relative max-md:px-[7vw] max-[1025px]:px-[6vw] pt-0">
                  <div className="fixed right-4 top-1/2 z-30 block -translate-y-1/2 max-[1025px]:hidden">
                    <TableOfContents
                      containerRef={contentRef}
                      stopRef={hasCtaSection ? ctaSectionRef : relatedEffectsRef}
                      watchKey={slug}
                    />
                  </div>

                  <EffectDynamicContent
                    ref={contentRef}
                    content={safeContent}
                    isLocked={isLocked}
                    effectProps={effect?.props}
                    effectRemixerControls={effect?.remixer?.controls}
                    changelog={safeEffect.changelog}
                  />
                </div>

                <div className="w-[70%] max-[1025px]:w-full max-md:px-[7vw] max-[1025px]:px-[6vw] max-md:mt-[10vw]">
                  <EffectCtaSection
                    cta={safeContent?.ctaBanner}
                    sectionRef={ctaSectionRef}
                  />
                </div>

                {safeRelatedEffects?.length > 0 && (
                  <section
                    ref={relatedEffectsRef}
                    className="my-20 relative space-y-10 max-[1025px]:space-y-10"
                  >
                    <div className="flex items-center justify-between gap-5 max-[1025px]:flex-col">
                      <HeadAnim>
                        <h2 className="text-center text-[3.32vw] max-[1025px]:text-[5vw] max-md:text-[2rem] font-medium text-foreground">
                          Related Effects
                        </h2>
                      </HeadAnim>

                      <div className="fadeup flex max-[1025px]:hidden flex-col justify-center items-end gap-5 max-[1025px]:w-full max-[1025px]:items-stretch">
                        <ButtonV3
                          text="Explore All Effects"
                          href="/effects"
                          variant="orange"
                          className="shrink-0"
                        />
                      </div>
                    </div>

                    <div className="max-[1025px]:hidden">
                      {showRelatedSliderControls && (
                        <div className="flex items-center justify-end gap-2 max-[1025px]:justify-center">
                          <button
                            type="button"
                            onClick={() => scrollRelatedEffects("previous")}
                            disabled={!canScrollPrev}
                            aria-label="Show previous related effects"
                            className={`group relative flex h-8 w-8 items-center justify-center overflow-hidden   bg-[#161616] text-white  transition-colors duration-300 ${!canScrollPrev ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-[#ff5f00] hover:text-black"}`}
                          >
                            <ArrowIcon className={`h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 -rotate-135  ${!canScrollPrev?"":"group-hover:translate-x-[-180%] duration-300 ease-in-out"}`} />
                            <ArrowIcon className={`h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 -rotate-135 absolute translate-x-[180%]  ${!canScrollPrev?"":" group-hover:translate-x-0 duration-300 ease-in-out"} `} />

                          </button>

                          <button
                            type="button"
                            onClick={() => scrollRelatedEffects("next")}
                            disabled={!canScrollNext}
                            aria-label="Show next related effects"
                            className={`group relative flex h-8 w-8 items-center justify-center overflow-hidden  bg-[#161616] text-white transition-colors duration-300 ${!canScrollNext ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-[#ff5f00] hover:text-black"}`}
                          >
                            <ArrowIcon className={`h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 rotate-45  ${!canScrollNext ? "" : "group-hover:translate-x-[180%] duration-300 ease-in-out"}`} />
                            <ArrowIcon className={`h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 rotate-45 absolute translate-x-[-180%]  ${!canScrollNext?"":" group-hover:translate-x-0 duration-300 ease-in-out"} `} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className=" fadeup">
                      <div
                        ref={relatedSliderRef}
                        onPointerDown={handleRelatedPointerDown}
                        onPointerMove={handleRelatedPointerMove}
                        onPointerUp={handleRelatedPointerEnd}
                        onPointerLeave={handleRelatedPointerEnd}
                        onPointerCancel={handleRelatedPointerEnd}
                        onDragStart={(event) => event.preventDefault()}
                        className="flex cursor-grab snap-x snap-mandatory  bg select-none gap-6 overflow-x-auto max-md:gap-6 max-[1025px]:gap-2 scroll-smooth pb-4 active:cursor-grabbing"
                      >
                        {safeRelatedEffects.map((relatedEffect) => (
                          <div
                            key={relatedEffect.name}
                            onClick={(event) =>
                              handleRelatedCardClick(event, relatedEffect)
                            }
                            className="min-w-[31vw] pl-1!  cursor-pointer max-md:px-[7vw] max-[1025px]:px-[6vw] snap-start max-[1025px]:min-w-[44vw] max-[1025px]:min-w-[55vw]! max-md:min-w-full!"
                          >
                            <EffectCard
                              effect={relatedEffect}
                              sizes="(max-width: 639px) 100vw, (max-width: 767px) 55vw, (max-width: 1023px) 44vw, 31vw"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="hidden max-[1025px]:block">
                      {showRelatedSliderControls && (
                        <div className="flex items-center justify-end gap-2 max-[1025px]:justify-center">
                          <button
                            type="button"
                            onClick={() => scrollRelatedEffects("previous")}
                            disabled={!canScrollPrev}
                            aria-label="Show previous related effects"
                            className={`group relative flex size-10 items-center justify-center overflow-hidden  bg-[#161616] text-white transition-colors duration-300 ${!canScrollPrev ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-[#ff5f00]"}`}
                          >
                            <ArrowIcon className={`h-4.5 w-4.5 max-md:size-4 -rotate-135  ${!canScrollPrev?"":"group-hover:translate-x-[-180%] duration-300 ease-in-out"}`}/>
                            <ArrowIcon className={`h-4.5 w-4.5 max-md:size-4 -rotate-135 absolute translate-x-[180%]  ${!canScrollPrev?"":"group-hover:translate-x-0 duration-300 ease-in-out"}`} />

                          </button>

                          <button
                            type="button"
                            onClick={() => scrollRelatedEffects("next")}
                            disabled={!canScrollNext}
                            aria-label="Show next related effects"
                            className={`group relative flex size-10 items-center justify-center overflow-hidden  bg-[#161616] text-white transition-colors duration-300 ${!canScrollNext ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-[#ff5f00]"}`}
                          >
                            <ArrowIcon className={`h-4.5 w-4.5 max-md:size-4 rotate-45  ${!canScrollNext?"":"group-hover:translate-x-[180%] duration-300 ease-in-out"}`} />
                            <ArrowIcon className={`h-4.5 w-4.5 max-md:size-4 rotate-45 absolute translate-x-[-180%]  ${!canScrollNext?"":"group-hover:translate-x-0 duration-300 ease-in-out"}`} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="fadeup max-[1025px]:mx-auto max-[1025px]:flex hidden flex-col justify-center items-end gap-5 max-[1025px]:w-fit max-[1025px]:items-stretch">
                      <ButtonV3
                        text="Explore all effects"
                        href="/effects"
                        variant="orange"
                        className="shrink-0"
                      />
                    </div>
                  </section>
                )}
              </section>
            </main>
          )}
        </div>

      {mounted && createPortal(
        <div
          className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity duration-300 ${showSignInToCopyModal ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setShowSignInToCopyModal(false)}
        >
          <div
            className={`flex w-[35vw] max-md:w-full max-[1025px]:w-[70%] flex-col gap-6 items-center  border border-white/20 bg-[#0e0e0e] p-10 max-[1025px]:p-6 shadow-2xl transition-transform duration-300 relative ${showSignInToCopyModal ? "scale-100" : "scale-95"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowSignInToCopyModal(false)}
              className="max-[1025px]:hidden group absolute right-5 top-5 flex h-10 w-10 items-center justify-center  border border-white/20 bg-white/10 text-xl leading-none text-white/70 transition-all duration-500 ease-in-out hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white "
            >
              <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
                <span className="h-px w-4 rotate-45 bg-white" />
                <span className="absolute h-px w-4 -rotate-45 bg-white" />
              </div>
            </button>

            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-medium text-white">Sign in to copy code</h2>
            </div>
            <p className="text-sm text-white/60 text-center">
              Create a free account or sign in to copy code and install
              commands from the vault.
            </p>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
              className="inline-flex w-fit items-center gap-1.5  bg-[#ff5f00] px-4 py-2 text-sm font-medium text-white hover:bg-[#e05500] transition-colors"
              onClick={() => setShowSignInToCopyModal(false)}
            >
              Sign In
            </Link>
          </div>
        </div>,
        document.body
      )}
    </CopyLimitProvider>
  );
}

const EffectDynamicContent = forwardRef(function EffectDynamicContent(
  { content, isLocked = false, effectProps, effectRemixerControls, changelog = [] },
  ref
) {
  if (!content) return null;

  return (
    <div
      ref={ref}
      className={`space-y-8 w-[70%] max-[1025px]:w-full ${styles.content}`}
    >
      <SanityBodyRenderer
        body={content.body}
        isLocked={isLocked}
        effectProps={effectProps}
        effectRemixerControls={effectRemixerControls}
        changelog={changelog}
      />
    </div>
  );
});

function EffectCtaSection({ cta, sectionRef }) {
  if (!cta?.heading && !cta?.buttonText) return null;

  const buttonLink = cta.buttonLink || "#";

  return (
    <section
      ref={sectionRef}
      className="fadeup w-full bg-[#272727]  my-[5vw] max-md:mt-[20vw] mx-auto"
    >
      <div className="mx-auto w-full flex flex-col items-start max-w-6xl px-10 max-[1025px]:px-6 max-md:px-[6vw] py-15">
        {cta.heading && (
          <h2 className="text-[2.5vw] font-medium text-foreground max-md:text-[7vw]">
            {cta.heading}
          </h2>
        )}

        {cta.description && (
          <p className="mt-4 max-w-3xl text20 text-muted">
            {cta.description}
          </p>
        )}

        <div className="w-fit max-md:mt-[8vw] mt-6">
          <CustomAnimationFormTrigger>
            {cta.buttonText && (

              <ButtonV3
                preventDefault={false}
                text={cta.buttonText}
                href={buttonLink}
                scaleClass="group-hover:scale-[100]! "
                target="_blank"
                variant="white"
                className=" shrink-0 w-fit max-md:w-[90%] max-md:pl-[5vw]! max-md:pr-[12vw]! bg-white"
              />
            )}
          </CustomAnimationFormTrigger>
        </div>
      </div>
    </section>
  );
}

function formatChangelogDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function EffectChangelogSection({ changelog = [] }) {
  if (!changelog?.length) return null;

  return (
    <section className={`fadeup ${styles.faqAccordion}`}>
      <h2 className={styles.changelogTitle}>Changelog</h2>

      <FAQGroup
        allowMultiple={false}
        defaultOpenItems={changelog[0]?.version ? [changelog[0].version] : []}
      >
        <div className={styles.changelogTimeline}>
          {changelog.map((entry, index) => {
            const itemId = entry.version || `changelog-${index}`;

            return (
              <div key={itemId} className={styles.changelogTimelineItem}>
                <div
                  className={styles.changelogTimelineMarker}
                  aria-hidden="true"
                >
                  <span className={styles.changelogTimelineDot} />
                </div>

                <FAQWrapper
                  itemId={itemId}
                  className={`${styles.faqAccordionItem} ${styles.changelogTimelineCard}`}
                  titleClassName={styles.faqAccordionQuestion}
                  iconClassName={styles.faqAccordionIcon}
                  iconSize={18}
                  iconStrokeWidth={1.8}
                >
                  <FAQTitle
                    className={styles.changelogTrigger}
                    iconPosition="right"
                  >
                    <div className={styles.changelogRow}>
                      <h3 className={styles.changelogVersion}>
                        v{entry.version}
                      </h3>
                      {entry.date && (
                        <span className={styles.changelogDate}>
                          {formatChangelogDate(entry.date)}
                        </span>
                      )}
                      {entry.breaking && (
                        <span className={styles.changelogBreaking}>
                          Breaking
                        </span>
                      )}
                    </div>
                  </FAQTitle>

                  {entry.summary && (
                    <FAQContent className={styles.changelogSummary}>
                      {entry.summary}
                    </FAQContent>
                  )}
                </FAQWrapper>
              </div>
            );
          })}
        </div>
      </FAQGroup>
    </section>
  );
}

function SanityBodyRenderer({
  body = [],
  isLocked = false,
  effectProps,
  effectRemixerControls,
  changelog = [],
}) {
  if (!body.length) return null;

  const groupedBlocks = groupBodyBlocks(body);
  const remixerControlNames = new Set(
    (effectRemixerControls || []).map((control) => control?.name).filter(Boolean)
  );

  const remixableProps = (effectProps || []).filter(
    (prop) =>
      (prop?.remixer?.control || remixerControlNames.has(prop?.name)) &&
      prop?.remixer?.enabled !== false &&
      prop?.remixer?.disabled !== true
  );
  const showPropsTable = remixableProps.length > 0;
  const hasFaqBlock = groupedBlocks.some(
    (block) => block._type === "effectFaqAccordion"
  );
  const firstFaqIndex = groupedBlocks.findIndex(
    (block) => block?._type === "effectFaqAccordion"
  );
  const shouldRenderChangelog = changelog?.length > 0;

  return (
    <CodeBlockLanguageProvider>
    <div className="space-y-6">
      {shouldRenderChangelog && firstFaqIndex === -1 && (
        <EffectChangelogSection changelog={changelog} />
      )}

      {groupedBlocks.map((block, index) => {
        const key = block._key || block._groupKey || `${block._type}-${index}`;

        return (
          <Fragment key={key}>
            {shouldRenderChangelog && index === firstFaqIndex && (
              <EffectChangelogSection changelog={changelog} />
            )}
            {showPropsTable && block._type === "effectFaqAccordion" && (
              <EffectPropsTable props={remixableProps} />
            )}
            <SanityBodyBlock block={block} isLocked={isLocked} />
          </Fragment>
        );
      })}

      {showPropsTable && !hasFaqBlock && <EffectPropsTable props={remixableProps} />}
    </div>
    </CodeBlockLanguageProvider>
  );
}

function formatPropDefault(value) {
  if (value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function EffectPropsTable({ props = [] }) {
  if (!props.length) return null;

  return (
    <div className="space-y-5! mt-4! fadeup">
      <h3 className="text-xl tracking-tighter  text-foreground">Props</h3>

      <div className={`${styles.tableWrap} ${styles.propsTableWrap}`} data-variant="vault">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Prop</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>

          <tbody>
            {props.map((prop) => (
              <tr key={prop.name}>
                <td>
                  <code>{prop.name}</code>
                </td>
                <td>{prop.type || "-"}</td>
                <td>
                  <code>{formatPropDefault(prop.default)}</code>
                </td>
                <td>{prop.description || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SanityBodyBlock({ block, isLocked = false }) {
  const {
    isLocked: copyLimitLocked,
    selectable: copySelectable,
    requestCopy,
    lockedCtaHref,
  } = useCopyLimit();

  if (!block) return null;

  if (block._type === "block") {
    return <PortableTextBlock block={block} isLocked={isLocked} />;
  }

  if (block._type === "listGroup") {
    const ListTag = block.listItem === "number" ? "ol" : "ul";

    const listClassName =
      block.listItem === "number" ? `fadeup ${styles.numberList}` : "fadeup";

    return (
      <ListTag className={listClassName}>
        {block.items.map((item, index) => (
          <li key={item._key || `${block._groupKey}-${index}`}>
            {buildMarkedChildren(item)}
          </li>
        ))}
      </ListTag>
    );
  }

  if (block._type === "effectImage") {
    if (!block.url) return null;

    return (
      <figure className="fadeup">
        <div className={styles.imageFrame}>
          <Image
            src={block.url}
            alt={block.alt || ""}
            width={1600}
            height={900}
            sizes="(max-width: 768px) 100vw, 800px"
            className={styles.image}
          />
        </div>

        {block.caption && (
          <figcaption className={styles.caption}>{block.caption}</figcaption>
        )}
      </figure>
    );
  }

  if (block._type === "effectCodeBlock") {
    if (isLocked) {
      return (
        <LockedCodePlaceholder
          filename={block.filename}
          language={block.language || "jsx"}
        />
      );
    }

    return (
      <div className="fadeup">
        <CodeBlock
          code={normalizeCodeString(block.code || "")}
          tsxCode={block.tsxCode ? normalizeCodeString(block.tsxCode) : undefined}
          language={block.language || "jsx"}
          filename={block.filename}
          hideHeaderWhenNoFilename
          className={!block.filename ? styles.contentCodeBlockNoFilename : ""}
          copyLocked={copyLimitLocked}
          selectable={copySelectable}
          onBeforeCopy={requestCopy}
          lockedCtaHref={block.language === "bash" ? null : lockedCtaHref}
        />
      </div>
    );
  }

  if (block._type === "horizontalRule") {
    return <hr className={`fadeup ${styles.contentDivider}`} />;
  }

  if (block._type === "effectFaqAccordion") {
    const faqItems = block.items || [];

    if (!faqItems.length) return null;

    return (
      <section className={`fadeup ${styles.faqAccordion}`}>
        {block.title && (
          <h2 className={styles.faqAccordionTitle}>{block.title}</h2>
        )}

        <FAQGroup
          allowMultiple={false}
          defaultOpenItems={faqItems[0]?._key ? [faqItems[0]._key] : []}
        >
          <div className="border border-grey">
            {faqItems.map((item, index) => {
              const itemId = item._key || `faq-${index}`;

              return (
                <FAQWrapper
                  key={itemId}
                  itemId={itemId}
                  className={`group border-grey px-[2.5vw] py-[2vw] max-[1025px]:px-[4vw] max-[1025px]:py-[4vw] max-md:px-[6vw] max-md:py-[6vw] ${index > 0 ? "border-t" : ""
                    }`}
                  iconClassName="mt-[0.55vw] max-md:mt-[1vw] max-md:mt-[1.5vw] text-light-grey transition-colors duration-500 ease-out group-hover:text-white"
                  iconSize={18}
                  iconStrokeWidth={1.5}
                  duration={0.6}
                >
                  <FAQTitle
                    className="pb-0 items-start! justify-start! gap-[1.5vw]! max-[1025px]:gap-[3vw]! max-md:gap-[4vw]!"
                    iconPosition="left"
                    iconMode="rotate-left-down"
                  >
                    <h3 className="text-[1.55vw]! font-neue-haas leading-tight! my-0! max-[1025px]:text-[3.4vw]! max-md:text-[5.2vw]!">
                      {item.question}
                    </h3>
                  </FAQTitle>

                  <FAQContent className="pt-[1.2vw] pl-[2.8vw] max-[1025px]:pt-[2.5vw] max-[1025px]:pl-[7vw] max-md:pt-[4vw] max-md:pl-[8vw]">
                    <p className="text-[1.15vw]! font-neue-haas text-white! leading-[1.45]! max-[1025px]:text-[2.2vw]! max-md:text-[4vw]!">
                      {item.answer}
                    </p>
                  </FAQContent>
                </FAQWrapper>
              );
            })}
          </div>
        </FAQGroup>
      </section>
    );
  }

  if (block._type === "effectTableBlock") {
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const rows = Array.isArray(block.rows) ? block.rows : [];
    const columnCount = Math.max(
      headers.length,
      rows.reduce(
        (max, row) => Math.max(max, Array.isArray(row?.cells) ? row.cells.length : 0),
        0
      )
    );

    if (!columnCount) return null;

    return (
      <div className="space-y-3 fadeup">
        {block.caption && (
          <h3 className="text-xl tracking-tighter text-foreground">
            {block.caption}
          </h3>
        )}

        <div
          className={styles.tableWrap}
          data-variant={block.colorVariant || "vault"}
        >
          <table className={styles.table}>
            {headers.length ? (
              <thead>
                <tr>
                  {Array.from({ length: columnCount }).map((_, index) => (
                    <th key={`${headers[index] || "header"}-${index}`}>
                      {headers[index] || ""}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row._key || `${rowIndex}`}>
                  {Array.from({ length: columnCount }).map((_, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`}>
                      {row.cells?.[cellIndex] || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (block._type === "effectCalloutBlock") {
    const toneClass =
      block.tone === "info"
        ? styles.calloutInfo
        : block.tone === "warning"
          ? styles.calloutWarning
          : block.tone === "success"
            ? styles.calloutSuccess
            : "";

    const shouldRenderAsCardGrid = !block.tone || block.tone === "default";

    return (
      <section className={`fadeup ${styles.callout} ${toneClass}`}>
        {block.title && <h3 className={styles.calloutTitle}>{block.title}</h3>}

        {shouldRenderAsCardGrid ? (
          <CalloutCardGrid body={block.content || []} />
        ) : (
          <SanityBodyRenderer body={block.content || []} isLocked={isLocked} />
        )}
      </section>
    );
  }

  return null;
}

function CalloutCardGrid({ body = [] }) {
  const items = body.map((block) => extractPlainBlockText(block)).filter(Boolean);

  if (!items.length) {
    return <SanityBodyRenderer body={body} />;
  }

  return (
    <div className={styles.calloutGrid}>
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className={styles.calloutGridItem}>
          {item}
        </div>
      ))}
    </div>
  );
}

function LockedCodePlaceholder({ filename }) {
  const teaserLines = [
    "const premiumSnippet = unlock({ technique: 'inspect-element-jutsu' });",
    "if (devtools.open) throw new Error('nice try, detective');",
    "console.log('inspect will not work every time, boss');",
    "const fallbackPlan = subscribe({ reason: 'time saved > ego' });",
    "return 'blurred until your Pro arc begins';",
  ];

  const subtitle =
    "You can preview it now. Upgrade to Pro for instant install access.";

  return (
    <section className="fadeup relative min-h-[40vh] max-md:min-h-[40vh] max-[1025px]:min-h-[30vh] overflow-hidden  border  border-white/30">
      <div
        aria-hidden="true"
        className="absolute inset-0 "
      />
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">

        <div className="absolute left-2 top-0 max-[1025px]:top-3 max-[1025px]:left-3 max-md:top-5 max-md:left-0 px-6 py-5 text-[11px] leading-6 text-white max-md:text-[10px]">
          {teaserLines.map((line, index) => (
            <p
              key={`${line}-${index}`}
              className="whitespace-nowrap  blur-md select-none"
            >
              <span className="mr-3 text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              {line}
            </p>
          ))}
          <p className="mt-4 whitespace-nowrap blur-md  text-[#9ad0ff]/25 select-none">
            {"// inspect won't work every time... time to subscribe ;)"}
          </p>
          <p className="whitespace-nowrap blur-md  text-[#b7ffb0]/25 select-none">
            {"export default function AccessDenied() {}"}
          </p>
        </div>
      </div>

      <div className="relative z-10 min-h-[40vh] max-md:min-h-[40vh] max-[1025px]:min-h-[30vh] flex   flex-col items-center justify-center gap-2  bg-white/5 px-8 py-6 text-center  max-md:px-6">
        <LockKeyhole className="h-16 w-16 text-white" strokeWidth={1.2} />

        <div className="flex flex-col items-center gap-0">
          <h3 className="text-3xl font-bold text-white  max-md:text-xl">
            This is a Pro Effect.
          </h3>

          <p className="max-w-sm text-sm leading-[1.2]! max-[1025px]:leading-relaxed text-white/50">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center pt-3 max-[1025px]:pt-6 justify-center gap-3">
          <ButtonV3
            text="Upgrade to Pro"
            variant="orange"
            href="/pricing"
            className="shrink-0 text-black!"
          />
        </div>


      </div>
    </section>
  );
}

function PortableTextBlock({ block, isLocked = false }) {
  const {
    isLocked: copyLimitLocked,
    selectable: copySelectable,
    requestCopy,
    lockedCtaHref,
  } = useCopyLimit();

  if (isCodeOnlyBlock(block)) {
    const code = normalizeCodeString(getBlockText(block));

    if (!code.trim()) return null;

    if (isLocked) {
      return <LockedCodePlaceholder language={inferCodeLanguage(code)} />;
    }

    return (
      <div className="fadeup">
        <CodeBlock
          code={code}
          language={inferCodeLanguage(code)}
          copyLocked={copyLimitLocked}
          selectable={copySelectable}
          onBeforeCopy={requestCopy}
          lockedCtaHref={inferCodeLanguage(code) === "bash" ? null : lockedCtaHref}
        />
      </div>
    );
  }

  const children = buildMarkedChildren(block);
  const style = block.style || "normal";

  if (style === "h2") {
    return <h2 className="fadeup">{children}</h2>;
  }

  if (style === "h3") {
    return <h3 className="fadeup">{children}</h3>;
  }

  if (style === "blockquote") {
    return <blockquote className="fadeup">{children}</blockquote>;
  }

  if (block.listItem === "bullet") {
    return (
      <ul className="fadeup">
        <li>{children}</li>
      </ul>
    );
  }

  if (block.listItem === "number") {
    return (
      <ol className="fadeup">
        <li>{children}</li>
      </ol>
    );
  }

  return <p className="fadeup">{children}</p>;
}

function groupBodyBlocks(body) {
  const grouped = [];

  for (const block of body) {
    if (block?._type === "block" && block.listItem) {
      const previous = grouped[grouped.length - 1];

      if (
        previous?._type === "listGroup" &&
        previous.listItem === block.listItem &&
        (previous.level || 1) === (block.level || 1)
      ) {
        previous.items.push(block);
        continue;
      }

      grouped.push({
        _type: "listGroup",
        _groupKey: `list-${block._key || grouped.length}`,
        listItem: block.listItem,
        level: block.level || 1,
        items: [block],
      });

      continue;
    }

    grouped.push(block);
  }

  return grouped;
}

function isCodeOnlyBlock(block) {
  const children = block?.children || [];

  if (!children.length) return false;

  return children.every((child) => {
    if (child?._type !== "span") return false;

    const marks = child.marks || [];

    return marks.includes("code");
  });
}

function getBlockText(block) {
  return (block?.children || []).map((child) => child?.text || "").join("");
}

function extractPlainBlockText(block) {
  if (block?._type !== "block") return "";

  const text = getBlockText(block).trim();

  if (!text) return "";

  return text;
}

function inferCodeLanguage(code) {
  const trimmed = code.trim();

  if (
    trimmed.startsWith("npm ") ||
    trimmed.startsWith("npx ") ||
    trimmed.startsWith("pnpm ") ||
    trimmed.startsWith("yarn ")
  ) {
    return "bash";
  }

  return "jsx";
}

function normalizeCodeString(code) {
  return code
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function buildMarkedChildren(block) {
  const markDefs = block.markDefs || [];

  return (block.children || []).map((child, index) => {
    if (!child?.text) return null;

    let node = child.text;

    for (const mark of child.marks || []) {
      if (mark === "strong") {
        node = <strong key={`strong-${index}`}>{node}</strong>;
        continue;
      }

      if (mark === "em") {
        node = <em key={`em-${index}`}>{node}</em>;
        continue;
      }

      if (mark === "code") {
        node = (
          <code key={`code-${index}`} className={styles.contentInlineCode}>
            {node}
          </code>
        );
        continue;
      }

      const markDef = markDefs.find((item) => item._key === mark);

      if (markDef?._type === "link" && markDef.href) {
        node = (
          <a
            key={`link-${index}`}
            href={markDef.href}
            target="_blank"
            rel="noreferrer"
          >
            {node}
          </a>
        );
      }
    }

    return <span key={child._key || index}>{node}</span>;
  });
}
