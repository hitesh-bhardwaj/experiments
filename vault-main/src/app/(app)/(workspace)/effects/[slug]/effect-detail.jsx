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
import { EffectCard } from "../EffectCard";
import { CustomAnimationCta } from "../CustomAnimationCta";
import { useEffectCardActions } from "../useEffectCardActions";
import FAQ from "@/homepage/sections/FAQ";
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
import { LockKeyhole } from "lucide-react";
import { CopyLimitProvider, useCopyLimit } from "./useCopyLimit";
import GetCodeMenu from "./GetCodeMenu";
import UpgradeToProModal from "./UpgradeToProModal";
import Button from "@/homepage/components/Button";
import { SliderArrowButton } from "@/components/ui/SliderArrowButton";
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
        "relative overflow-hidden bg-grey",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.4s_infinite]",
        "before:bg-linear-to-r before:from-transparent before:via-foreground/10 before:to-transparent",
        className,
      ].join(" ")}
    />
  );
}

// Mirrors the page: hero, stage, article, CTA and related effects, same wrappers and gaps
function EffectDetailMainSkeleton() {
  return (
    <main className="relative w-full pt-25 max-md:pt-36">
      <div className="flex flex-col gap-[5.5vw] max-md:gap-[15vw]">
        <div className="flex flex-col gap-7">
          <section className="mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw] flex flex-col gap-[1.4vw] max-md:gap-[5vw]">
            <div className="flex w-fit max-w-full flex-wrap items-center gap-[0.5vw] max-md:gap-[2vw]">
              <SkeletonBlock className="h-4 w-12" />
              <span className="text-foreground/25">/</span>
              <SkeletonBlock className="h-4 w-16" />
              <span className="text-foreground/25">/</span>
              <SkeletonBlock className="h-4 w-24" />
              <span className="text-foreground/25">/</span>
              <SkeletonBlock className="h-4 w-40" />
            </div>
            <SkeletonBlock className="h-[5.2vw] w-[62%] max-lg:h-14 max-lg:w-[82%] max-md:h-12" />
            <div className="flex flex-col gap-3">
              <SkeletonBlock className="h-5 w-[72%]" />
              <SkeletonBlock className="h-5 w-[54%]" />
            </div>
            <div className="flex flex-wrap items-center gap-[0.8vw] max-md:gap-[3vw]">
              <SkeletonBlock className="h-10 w-20" />
              <SkeletonBlock className="h-10 w-24" />
              <SkeletonBlock className="h-10 w-18" />
            </div>
          </section>
          <section className="mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw] h-[46vw]">
            <SkeletonBlock className="h-full w-full" />
          </section>
        </div>

        <div className="flex flex-col gap-[5vw] bg-foreground py-[5.5vw] max-md:gap-[10vw] max-md:py-[15vw]">
          <section className="mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw]">
            <div className="flex w-[70%] flex-col gap-8 max-lg:w-full">
              <SkeletonBlock className="h-10 w-[58%] bg-background/10" />
              <div className="flex flex-col gap-3">
                <SkeletonBlock className="h-5 w-full bg-background/10" />
                <SkeletonBlock className="h-5 w-[92%] bg-background/10" />
                <SkeletonBlock className="h-5 w-[76%] bg-background/10" />
              </div>
              <SkeletonBlock className="h-9 w-[46%] bg-background/10" />
              <div className="flex flex-col gap-3">
                <SkeletonBlock className="h-5 w-full bg-background/10" />
                <SkeletonBlock className="h-5 w-[88%] bg-background/10" />
                <SkeletonBlock className="h-5 w-[64%] bg-background/10" />
              </div>
              <SkeletonBlock className="h-[18vw] w-full bg-background/10 max-lg:h-64" />
            </div>
          </section>

          <section className="mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw]">
            <div className="flex flex-col gap-5 bg-ink px-[2.8vw] py-[3.3vw] max-md:px-[7vw] max-md:py-[10vw]">
              <SkeletonBlock className="h-10 w-[52%] bg-light/15 max-md:h-8 max-md:w-[84%]" />
              <div className="flex flex-col gap-3">
                <SkeletonBlock className="h-5 w-[78%] bg-light/15" />
                <SkeletonBlock className="h-5 w-[58%] bg-light/15" />
              </div>
              <SkeletonBlock className="h-12 w-36 bg-primary/45" />
            </div>
          </section>

          <section className="mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw] flex flex-col gap-[2.8vw] max-md:gap-[10vw]">
            <div className="flex items-center justify-between gap-[1.4vw] max-lg:flex-col">
              <SkeletonBlock className="h-12 w-[30%] bg-background/10 max-lg:w-[60%] max-md:w-[80%]" />
              <SkeletonBlock className="h-12 w-44 bg-primary/45 max-lg:hidden" />
            </div>
            <div className="flex gap-[1.5vw] overflow-hidden max-lg:gap-[2vw] max-md:gap-[4vw]">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`related-effect-skeleton-${index}`} className="flex w-[32%] shrink-0 flex-col gap-5 max-lg:w-[60%] max-md:w-full">
                  <div className="flex aspect-[1/1] w-full items-center justify-center bg-background/10 p-[2vw] max-md:p-5">
                    <SkeletonBlock className="aspect-[1.8/1] w-[88%] bg-background/20" />
                  </div>
                  <div className="flex flex-col gap-2 px-3">
                    <SkeletonBlock className="h-5 w-[58%] bg-background/10" />
                    <SkeletonBlock className="h-4 w-[34%] bg-background/10" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
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
  // Related effects use the full listing card: save, copy install / Pro lock, live demo.
  const { cardActions, overlays: cardOverlays } = useEffectCardActions({ userPlan, signInRedirect: pathname });

  const [mounted, setMounted] = useState(false);
  const [showSignInToCopyModal, setShowSignInToCopyModal] = useState(false);
  // "Get code" asks for Pro (a Pro effect, or the daily copy limit) through this modal.
  const [upgradeReason, setUpgradeReason] = useState(null);
  const openUpgradeModal = useCallback((reason) => setUpgradeReason(reason || "pro-effect"), []);
  const closeUpgradeModal = useCallback(() => setUpgradeReason(null), []);

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
  // The article's FAQ block renders as the site FAQ section (FAQ) below the article,
  // exactly like the listing and homepage - not inside the prose.
  const faqItems = (safeContent?.body || [])
    .filter((block) => block?._type === "effectFaqAccordion")
    .flatMap((block) => block.items || [])
    .filter((item) => item?.question && item?.answer)
    .map((item, index) => ({ id: item._key || `effect-faq-${index}`, question: item.question, answer: item.answer, defaultOpen: index === 0 }));
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

  // A drag across the slider ends in a click on whichever card is under the pointer;
  // swallow it (capture phase, before the card or its buttons see it).
  const blockClickAfterDrag = useCallback((event) => {
    if (!relatedSliderDragRef.current.isDragging) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

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


  return (
    <CopyLimitProvider
      effectSlug={slug}
      onRequireSignIn={() => setShowSignInToCopyModal(true)}
      onRequireUpgrade={openUpgradeModal}
    >
      {/* No cursor-movement swish or hover sounds anywhere on the effect page. */}
      <div data-sound-hover="off" data-sound-flow="off" className="min-h-screen text-foreground">
        <Suspense fallback={<div className="h-12" />}>
          <VaultHeader effectName={pageTitle || safeEffect.title}
            showSearch={true}
            effects={searchEffects} />
        </Suspense>

        {isMainDataLoading ? (
          <EffectDetailMainSkeleton />
        ) : (
          <main className="relative w-full pt-25 max-md:pt-36">
            <div className="flex flex-col gap-[5.5vw] max-md:gap-[15vw]">
              <div className="flex flex-col gap-7">
              <section id="effect-hero" className="mx-auto flex w-full max-w-[1536px] flex-col gap-[1.4vw] px-[4.5vw] max-md:gap-[5vw] max-md:px-[6vw]">
                <Breadcrumb />

                {pageTitle && (
                  <HeadAnim rotate={0}>
                    <h1 className="text80 w-full font-aeonik font-normal text-foreground max-lg:w-[90%] max-md:w-[80%]">
                      {pageTitle}
                    </h1>
                  </HeadAnim>
                )}

                {pageSummary && (
                  <Copy delay={0.5}>
                    <p className="text22 w-[70%] leading-[1.6] text-foreground/90 max-lg:w-[90%]">
                      {pageSummary}
                    </p>
                  </Copy>
                )}

                {(dependencies.length > 0 || (content?.tier ?? safeEffect.tier) === "pro") && (
                  <div className="fadeup flex flex-wrap items-center gap-[0.8vw] max-md:gap-[3vw]">
                    {dependencies.map((dep) => (
                      <span
                        key={dep}
                        className="text20 bg-grey px-[0.6vw] py-[0.3vw] capitalize text-foreground max-md:px-[6vw] max-md:py-[1vw] max-md:text-muted"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section id="effect-stage" className="fadeup mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw]">
                {/* Live stage + Playground (remixer), in place of the preview video */}
                <EffectStage
                  effect={effect}
                  title={pageTitle}
                  previewHref={previewHref}
                  getCode={<GetCodeMenu effectSlug={slug} effectTitle={pageTitle || safeEffect.title} isLocked={isLocked} />}
                />
              </section>
              </div>

              {/* One white area for everything below the stage: the article, FAQ + custom
                    animation block, and related effects - so no dark gaps show between them. */}
              <div className="bg-foreground text-background">
                {/* blog-theme-light: blog.css prose in its light colours on this white section */}
                <section id="effect-content" className="blog-theme-light relative mx-auto w-full max-w-[1536px] px-[4.5vw] pt-[5.5vw] pb-6 max-md:px-[6vw] max-md:pt-[15vw]">
                  <div className="fixed right-[1vw] top-1/2 z-30 block -translate-y-1/2 max-lg:hidden">
                    <TableOfContents
                      containerRef={contentRef}
                      stopRef={hasCtaSection ? ctaSectionRef : relatedEffectsRef}
                      watchKey={slug}
                      revealAt={0.2}
                      showBackToTop
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
                </section>

                {/* FAQ + custom animation block - the same components as the effects listing */}
                <div className="flex h-full w-full flex-col gap-[2vw]">
                  {faqItems.length > 0 && <FAQ faqItems={faqItems} translateTop={false} />}
                  <div className="mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw]">
                    <CustomAnimationCta cta={safeContent?.ctaBanner} sectionRef={ctaSectionRef} />
                  </div>
                </div>

                {safeRelatedEffects?.length > 0 && (
                  <section
                    ref={relatedEffectsRef}
                    id="related-effects"
                    className="relative mx-auto flex w-full max-w-[1536px] flex-col gap-[2.8vw] px-[4.5vw] py-[7%] max-md:gap-[10vw] max-md:px-[6vw]"
                  >
                    <div className="flex items-center justify-between gap-[1.4vw] max-lg:flex-col max-lg:gap-[5vw]">
                      <HeadAnim rotate={0}>
                        <h2 className="text64 text-center font-aeonik font-medium text-background">
                          Related Effects
                        </h2>
                      </HeadAnim>
                      {/* The arrows are sized to the Explore button beside them: Button is
                          1.15vw text x 1.5 line height + 1rem padding + 2px border. */}
                      <div className="fadeup flex items-center gap-[0.5vw]">
                        <div className="flex flex-col items-end justify-center max-[1025px]:hidden">
                          <Button
                            text="Explore All Effects"
                            href="/effects"
                            variant="orange"
                            className="shrink-0 border border-primary"
                          />
                        </div>
                        <div className="max-lg:hidden">
                          {showRelatedSliderControls && (
                            <div className="flex h-full items-center justify-end gap-[0.5vw]">
                              <SliderArrowButton
                                direction="prev"
                                tone="light"
                                onClick={() => scrollRelatedEffects("previous")}
                                disabled={!canScrollPrev}
                                ariaLabel="Show previous related effects"
                                className="size-[3vw]"
                              />
                              <SliderArrowButton
                                direction="next"
                                tone="light"
                                onClick={() => scrollRelatedEffects("next")}
                                disabled={!canScrollNext}
                                ariaLabel="Show next related effects"
                                className="size-[3vw]"
                              />
                            </div>
                          )}
                        </div>
                        
                      </div>

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
                        className="flex cursor-grab snap-x snap-mandatory select-none gap-[1.5vw] overflow-x-auto scroll-smooth pb-4 active:cursor-grabbing max-lg:gap-[2vw] max-md:gap-[4vw]"
                      >
                        {safeRelatedEffects.map((relatedEffect) => (
                          <div
                            key={relatedEffect.name}
                            onClickCapture={blockClickAfterDrag}
                            className="w-[32%] shrink-0 cursor-pointer snap-start max-lg:w-[60%] max-md:w-full"
                          >
                            <EffectCard
                              effect={relatedEffect}
                              {...cardActions(relatedEffect)}
                              onOpen={(item) => router.push(getEffectHref(item))}
                              tagClassName="border-black/20"
                              sizes="(max-width: 639px) 100vw, (max-width: 767px) 55vw, (max-width: 1023px) 44vw, 31vw"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="hidden max-lg:block">
                      {showRelatedSliderControls && (
                        <div className="flex items-center justify-center gap-[2vw]">
                          <SliderArrowButton
                            direction="prev"
                            tone="light"
                            onClick={() => scrollRelatedEffects("previous")}
                            disabled={!canScrollPrev}
                            ariaLabel="Show previous related effects"
                          />
                          <SliderArrowButton
                            direction="next"
                            tone="light"
                            onClick={() => scrollRelatedEffects("next")}
                            disabled={!canScrollNext}
                            ariaLabel="Show next related effects"
                          />
                        </div>
                      )}
                    </div>

                    <div className="fadeup hidden w-fit self-center max-[1025px]:flex">
                      <Button
                        text="Explore all effects"
                        href="/effects"
                        variant="orange"
                        className="shrink-0"
                      />
                    </div>
                  </section>
                )}
              </div>
            </div>
          </main>
        )}
      </div>

      {mounted && createPortal(
        <div
          className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-lg transition-opacity duration-300 ${showSignInToCopyModal ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setShowSignInToCopyModal(false)}
        >
          <div
            className={`relative flex w-[35vw] flex-col items-center gap-[1.6vw] border border-foreground/20 bg-background p-10 shadow-2xl transition-transform duration-300 max-lg:w-[70%] max-lg:p-6 max-md:w-full max-md:gap-[6vw] ${showSignInToCopyModal ? "scale-100" : "scale-95"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowSignInToCopyModal(false)}
              className="group absolute right-5 top-5 flex h-10 w-10 items-center justify-center border border-foreground/20 bg-foreground/10 leading-none text-foreground/70 transition-all duration-500 ease-in-out hover:border-primary hover:bg-primary hover:text-foreground max-lg:hidden"
            >
              <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
                <span className="h-px w-4 rotate-45 bg-foreground" />
                <span className="absolute h-px w-4 -rotate-45 bg-foreground" />
              </div>
            </button>

            <h2 className="text24 font-aeonik font-medium text-foreground">Sign in to copy code</h2>
            <p className="text18 text-center text-foreground/60">
              Create a free account or sign in to copy code and install
              commands from the vault.
            </p>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
              className="text18 inline-flex w-fit items-center gap-1.5 bg-primary px-4 py-2 font-medium text-foreground transition-colors hover:bg-primary-hover"
              onClick={() => setShowSignInToCopyModal(false)}
            >
              Sign In
            </Link>
          </div>
        </div>,
        document.body
      )}
      {cardOverlays}
      <UpgradeToProModal open={upgradeReason !== null} reason={upgradeReason ?? "pro-effect"} onClose={closeUpgradeModal} />
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
      className="blog-content space-y-8 w-[70%] max-lg:w-full"
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
    <section className="fadeup blog-faq-section">
      <h2>Changelog</h2>

      <FAQGroup
        allowMultiple={false}
        defaultOpenItems={changelog[0]?.version ? [changelog[0].version] : []}
      >
        <div className="blog-changelog-timeline">
          {changelog.map((entry, index) => {
            const itemId = entry.version || `changelog-${index}`;

            return (
              <div key={itemId} className="blog-changelog-item">
                <div
                  className="blog-changelog-marker"
                  aria-hidden="true"
                >
                  <span className="blog-changelog-dot" />
                </div>

                <FAQWrapper
                  itemId={itemId}
                  className="blog-changelog-card"
                  iconSize={18}
                  iconStrokeWidth={1.8}
                >
                  <FAQTitle
                    className="blog-changelog-trigger"
                    iconPosition="right"
                  >
                    <div className="blog-changelog-row">
                      <h3 className="blog-changelog-version">
                        v{entry.version}
                      </h3>
                      {entry.date && (
                        <span className="blog-changelog-date">
                          {formatChangelogDate(entry.date)}
                        </span>
                      )}
                      {entry.breaking && (
                        <span className="blog-changelog-breaking">
                          Breaking
                        </span>
                      )}
                    </div>
                  </FAQTitle>

                  {entry.summary && (
                    <FAQContent className="blog-changelog-summary">
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
    <CodeBlockLanguageProvider defaultVariant="tsx">
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
      <h3>Props</h3>

      <div className="blog-table-wrap blog-props-table" data-variant="vault">
        <table>
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
      block.listItem === "number" ? "fadeup blog-number-list" : "fadeup";

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
        <div className="blog-image-frame">
          <Image
            src={block.url}
            alt={block.alt || ""}
            width={1600}
            height={900}
            sizes="(max-width: 768px) 100vw, 800px"
            className="blog-image"
          />
        </div>

        {block.caption && (
          <figcaption>{block.caption}</figcaption>
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
          copyLocked={copyLimitLocked}
          selectable={copySelectable}
          onBeforeCopy={requestCopy}
          lockedCtaHref={block.language === "bash" ? null : lockedCtaHref}
        />
      </div>
    );
  }

  if (block._type === "horizontalRule") {
    return <hr className="fadeup blog-divider" />;
  }

  // Rendered below the article as the site FAQ section (see faqItems in EffectDetailContent).
  if (block._type === "effectFaqAccordion") return null;

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
          <h3>
            {block.caption}
          </h3>
        )}

        <div
          className="blog-table-wrap"
          data-variant={block.colorVariant || "vault"}
        >
          <table>
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
        ? "blog-callout-info"
        : block.tone === "warning"
          ? "blog-callout-warning"
          : block.tone === "success"
            ? "blog-callout-success"
            : "";

    const shouldRenderAsCardGrid = !block.tone || block.tone === "default";

    return (
      <section className={`fadeup ${toneClass ? `blog-callout-tone ${toneClass}` : "blog-callout-plain"}`}>
        {block.title && <h3>{block.title}</h3>}

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
    <div className="blog-callout-grid">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="blog-callout-grid-item">
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

  // Stays a dark code panel (like the code blocks) on the white article.
  return (
    <section className="fadeup relative min-h-[40vh] max-md:min-h-[40vh] max-lg:min-h-[30vh] overflow-hidden border border-white/30 bg-[#141414]">
      <div
        aria-hidden="true"
        className="absolute inset-0 "
      />
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">

        <div className="absolute left-2 top-0 max-lg:top-3 max-lg:left-3 max-md:top-5 max-md:left-0 px-6 py-5 text-[11px] leading-6 text-white max-md:text-[10px]">
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

      <div className="relative z-10 min-h-[40vh] max-md:min-h-[40vh] max-lg:min-h-[30vh] flex   flex-col items-center justify-center gap-2  bg-white/5 px-8 py-6 text-center  max-md:px-6">
        <LockKeyhole className="h-16 w-16 text-white" strokeWidth={1.2} />

        <div className="flex flex-col items-center gap-0">
          <h3 className="text-3xl font-bold text-white  max-md:text-xl">
            This is a Pro Effect.
          </h3>

          <p className="max-w-sm text-sm leading-[1.2]! max-lg:leading-relaxed text-white/50">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center pt-3 max-lg:pt-6 justify-center gap-3">
          <Button
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
          <code key={`code-${index}`}>
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
