// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import Draggable from "gsap/Draggable";
import { createVisibilityGate } from "./createSuspendedRaf";
import { prefersReducedMotion } from "../../reducedMotion";

gsap.registerPlugin(Draggable);

interface DraggableMarqueeItem {
    id?: string | number;
    src?: string;
    alt?: string;
    title?: string;
    text?: string;
    link?: string;
    width?: number;
    height?: number;
    imageClassName?: string;
}

interface DraggableMarqueeCompProps {
    items?: DraggableMarqueeItem[];
    speed?: number;
    repeatCount?: number;
    gapClassName?: string;
    className?: string;
    trackClassName?: string;
    itemClassName?: string;
    pauseOnHover?: boolean;
    renderItem?: (item: DraggableMarqueeItem, index: number) => React.ReactNode;
    throwMultiplier?: number;
    throwFriction?: number;
    maxThrowVelocity?: number;
    initialOffset?: number;
    loopStart?: number;
    loopEndMultiplier?: number;
}

const DraggableMarqueeComp = ({
    items = [],
    speed = 1,
    repeatCount = 3,
    gapClassName = "gap-6",
    className = "",
    trackClassName = "",
    itemClassName = "rounded-2xl",
    pauseOnHover = false,
    renderItem,

    // motion controls
    throwMultiplier = 2.8,
    throwFriction = 0.975,
    maxThrowVelocity = 60,

    // loop controls
    initialOffset = 0,
    loopStart = 0,
    loopEndMultiplier = -1.02,
}: DraggableMarqueeCompProps) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<InstanceType<typeof Draggable> | null>(null);

    const duplicatedItems = useMemo(() => {
        return Array.from({ length: repeatCount }).flatMap(() => items);
    }, [items, repeatCount]);

    useLayoutEffect(() => {
        if (!rootRef.current || !trackRef.current || !items.length) return;

        const root = rootRef.current;
        const track = trackRef.current;

        let singleSetWidth = 0;
        let x = initialOffset;
        let throwVelocity = 0;
        let isPointerOver = false;
        let isDragging = false;
        let lastDragX = 0;
        let lastDragTime = 0;

        let wrapValue: (value: number) => number = (value) => value;
        let resizeRaf: number | null = null;

        // Reduced motion: keep the marquee draggable (user-initiated, not
        // imposed motion) but stop the automatic continuous auto-scroll.
        const reducedMotion = prefersReducedMotion();

        const observers: ResizeObserver[] = [];
        const setX = gsap.quickSetter(track, "x", "px");

        const getGap = () => {
            const styles = window.getComputedStyle(track);
            return parseFloat(String(styles.columnGap || styles.gap || 0));
        };

        const buildWrap = () => {
            const min = singleSetWidth * loopEndMultiplier;
            const max = loopStart;
            wrapValue = gsap.utils.wrap(min, max);
        };

        const getProgressInLoop = () => {
            if (!singleSetWidth) return 0;

            const min = singleSetWidth * loopEndMultiplier;
            const max = loopStart;
            const range = max - min;

            if (!range) return 0;

            let wrapped = x;
            while (wrapped < min) wrapped += range;
            while (wrapped > max) wrapped -= range;

            return (wrapped - min) / range;
        };

        const setProgressInLoop = (progress: number) => {
            if (!singleSetWidth) return;

            const min = singleSetWidth * loopEndMultiplier;
            const max = loopStart;
            const range = max - min;

            x = min + range * progress;
            x = wrapValue(x);
            setX(x);

            if (dragRef.current) {
                (dragRef.current as any).x = x;
            }
        };

        const measure = () => {
            const children = Array.from(track.children);
            const setSize = Math.floor(children.length / repeatCount);
            const firstSetChildren = children.slice(0, setSize);
            const gap = getGap();

            if (!firstSetChildren.length) return;

            const prevProgress = getProgressInLoop();

            const widths = firstSetChildren.reduce(
                (sum, child) => sum + child.getBoundingClientRect().width,
                0
            );

            singleSetWidth = widths + gap * Math.max(0, firstSetChildren.length - 1);

            buildWrap();

            if (!Number.isFinite(prevProgress)) {
                x = wrapValue(initialOffset);
                setX(x);
            } else {
                setProgressInLoop(prevProgress);
            }
        };

        const scheduleMeasure = () => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                measure();
            });
        };

        const update = () => {
            if (!isDragging) {
                if (!reducedMotion && !(pauseOnHover && isPointerOver)) {
                    x -= speed;
                }

                x += throwVelocity;
                throwVelocity *= throwFriction;

                if (Math.abs(throwVelocity) < 0.01) {
                    throwVelocity = 0;
                }
            }

            x = wrapValue(x);
            setX(x);
        };

        measure();

        dragRef.current = Draggable.create(track, {
            type: "x",
            allowContextMenu: true,
            dragClickables: true,

            onPress() {
                isDragging = true;
                throwVelocity = 0;
                this.x = x;
                lastDragX = this.x;
                lastDragTime = performance.now();
            },

            onDrag() {
                const now = performance.now();
                const dx = this.x - lastDragX;
                const dt = now - lastDragTime;

                x = wrapValue(this.x);
                setX(x);
                this.x = x;

                if (dt > 0) {
                    // Reduced motion: dragging itself stays 1:1 (direct,
                    // user-initiated), but no momentum carries past release -
                    // it stops exactly where you let go instead of sliding on.
                    if (reducedMotion) {
                        throwVelocity = 0;
                    } else {
                        const sampledVelocity = (dx / dt) * 36.67;

                        throwVelocity = gsap.utils.clamp(
                            -maxThrowVelocity,
                            maxThrowVelocity,
                            sampledVelocity * throwMultiplier
                        );
                    }
                }

                lastDragX = this.x;
                lastDragTime = now;
            },

            onRelease() {
                isDragging = false;
            },
        })[0];

        const handleMouseEnter = () => {
            isPointerOver = true;
        };

        const handleMouseLeave = () => {
            isPointerOver = false;
        };

        if (pauseOnHover) {
            root.addEventListener("mouseenter", handleMouseEnter);
            root.addEventListener("mouseleave", handleMouseLeave);
        }

        const handleResize = () => {
            scheduleMeasure();
        };

        window.addEventListener("resize", handleResize);

        const children = Array.from(track.children);
        const setSize = Math.floor(children.length / repeatCount);
        const firstSetChildren = children.slice(0, setSize);

        const trackObserver = new ResizeObserver(() => {
            scheduleMeasure();
        });

        trackObserver.observe(track);
        observers.push(trackObserver);

        firstSetChildren.forEach((child) => {
            const ro = new ResizeObserver(() => {
                scheduleMeasure();
            });

            ro.observe(child);
            observers.push(ro);

            const imgs = child.querySelectorAll("img");

            imgs.forEach((img) => {
                if (!img.complete) {
                    img.addEventListener("load", scheduleMeasure);
                }
            });
        });

        gsap.ticker.add(update);

        // Pause only this marquee's ticker callback when the section is
        // offscreen or the tab is hidden - never sleep the global gsap.ticker,
        // which is shared by every other GSAP animation on the page.
        let tickerAttached = true;
        const setTickerAttached = (active: boolean) => {
            if (active === tickerAttached) return;
            tickerAttached = active;
            if (active) gsap.ticker.add(update);
            else gsap.ticker.remove(update);
        };
        const gate = createVisibilityGate({
            root,
            onChange: setTickerAttached,
        });
        setTickerAttached(gate.isActive);

        return () => {
            gate.destroy();

            window.removeEventListener("resize", handleResize);

            if (pauseOnHover) {
                root.removeEventListener("mouseenter", handleMouseEnter);
                root.removeEventListener("mouseleave", handleMouseLeave);
            }

            gsap.ticker.remove(update);

            if (resizeRaf) cancelAnimationFrame(resizeRaf);

            observers.forEach((observer) => observer.disconnect());

            const cleanupChildren = Array.from(track.children);

            cleanupChildren.forEach((child) => {
                const imgs = child.querySelectorAll("img");

                imgs.forEach((img) => {
                    img.removeEventListener("load", scheduleMeasure);
                });
            });

            if (dragRef.current) {
                dragRef.current.kill();
                dragRef.current = null;
            }
        };
    }, [
        items,
        speed,
        repeatCount,
        pauseOnHover,
        throwMultiplier,
        throwFriction,
        maxThrowVelocity,
        initialOffset,
        loopStart,
        loopEndMultiplier,
    ]);

    if (!items.length) return null;

    return (
        <div
            ref={rootRef}
            className={`relative w-full overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
        >
            <div
                ref={trackRef}
                className={`flex w-max items-center ${gapClassName} ${trackClassName}`}
            >
                {duplicatedItems.map((item, index) => (
                    <div
                        key={`${item?.id || item?.src || "item"}-${index}`}
                        className={`shrink-0 ${itemClassName}`}
                    >
                        {renderItem ? (
                            renderItem(item, index % items.length)
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.src}
                                alt={item.alt || "marquee-item"}
                                width={item.width || 400}
                                height={item.height || 500}
                                className={`${item.imageClassName || "h-auto w-auto object-cover"} max-md:w-[320px] max-md:h-105`}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DraggableMarqueeComp;
