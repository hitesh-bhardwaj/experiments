"use client";

import gsap from "gsap";
import React, { useEffect, useId, useRef } from "react";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import SplitText from "gsap/dist/SplitText";
gsap.registerPlugin(ScrollTrigger, SplitText);

const IMAGE_POOL = [
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-08.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-09.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-11.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-12.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-13.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-14.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-15.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-03.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-06.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-07.jpg",
	"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-08.jpg",
];

const PROJECT_NAMES = [
	"Nebula Drift",
	"Velvet Orbit",
	"Prism Bloom",
	"Midnight Aurora",
	"Chromatic Tide",
	"Ion Garden",
	"Lunar Gradient",
	"Violet Haze",
	"Echo Spectrum",
	"Noir Fluence",
	"Solar Jelly",
	"Plasma Atelier",
	"Hyperwave Studio",
	"Glassline",
	"Starlit Systems",
	"Pulse & Grain",
	"Arclight",
	"Soft Collision",
];

type RibbonProjectCard = HTMLElement & {
	_onEnter?: () => void;
	_onLeave?: () => void;
};

/**
 * @typedef {Object} RibbonDriftCard
 * @property {string} src
 * @property {string} title
 * @property {string} href
 */

/**
 * @param {number} count
 * @param {number} [startIndex]
 * @param {string[]} [imagesArr]
 * @param {string[]} [namesArr]
 * @returns {RibbonDriftCard[]}
 */
function buildCards(
	count: number,
	startIndex = 0,
	imagesArr: string[] = IMAGE_POOL,
	namesArr: string[] = PROJECT_NAMES,
) {
	return Array.from({ length: count }, (_, i) => {
		const idx = (startIndex + i) % imagesArr.length;
		const name = namesArr[(startIndex + i) % namesArr.length];
		return { src: imagesArr[idx], title: name, href: "#" };
	});
}

const sectionBreakText = `Design is a feeling before it’s a layout. This concept explores
motion-first composition, gradient-led art direction, and small details
that make a brand experience unforgettable.`;

/**
 * @typedef {Object} RibbonDriftCompProps
 * @property {number} [driftSpeed]
 * @property {string} [ribbonColor]
 * @property {number} [imageSize]
 * @property {boolean} [showNames]
 */

/** @param {RibbonDriftCompProps} props */
const RibbonDriftComp = ({
	driftSpeed = 1,
	ribbonColor = "#000000",
	imageSize = 1,
	showNames = true,
}: any) => {
	const uid = useId().replace(/:/g, "");
	const sectionId = `ribbon-drift-${uid}`;
	const headingRef = useRef<any>(null);
	const paragraphRef = useRef<any>(null);
	const sectionBreakFillRef = useRef<any>(null);
	const titleRefs = useRef<any[]>([]);
	const hoverSplitsRef = useRef<any[]>([]);

	useEffect(() => {
		const speedScale = 1 / Math.max(0.05, driftSpeed);

		const ctx = gsap.context(() => {
			const mm = gsap.matchMedia();

			mm.add("(min-width: 1025px)", () => {
					const headingSplit = new SplitText(headingRef.current, {
						type: "chars,lines",
						linesClass: "split-line",
						mask: "lines",
					});

					const paragraphSplit = new SplitText(paragraphRef.current, {
						type: "lines",
						linesClass: "split-line",
						mask: "lines",
					});

					const sectionBreakSplit = new SplitText(sectionBreakFillRef.current, {
						type: "lines",
						linesClass: "section-break-line",
					});

					gsap.set(headingSplit.lines, { yPercent: 0 });
					gsap.set(paragraphSplit.lines, { yPercent: 0 });

					gsap.set(sectionBreakSplit.lines, {
						color: "transparent",
						backgroundImage: `linear-gradient(to right, ${ribbonColor} 0%, ${ribbonColor} 100%)`,
						backgroundRepeat: "no-repeat",
						backgroundSize: "0% 100%",
						backgroundPosition: "left center",
						WebkitBackgroundClip: "text",
						backgroundClip: "text",
					});

					gsap.set(".section-break-content, .section-break-wrapper > p", { opacity: 1 });

					const allTitles = titleRefs.current.filter(Boolean);
					const cards = gsap.utils.toArray<RibbonProjectCard>(".project-card");

					const introTl = gsap.timeline({
						scrollTrigger: {
							trigger: `#${sectionId}`,
							start: "top top",
							end: "10% top",
							scrub: true,
						},
					});

					introTl.to(
						headingSplit.chars,
						{
							yPercent: -100,
							duration: 1.2 * speedScale,
							stagger: 0.02,
							ease: "power3.inOut",
						},
						0,
					);

					introTl.to(
						paragraphSplit.lines,
						{
							yPercent: -100,
							duration: 1.2 * speedScale,
							stagger: 0.06,
							ease: "power3.inOut",
						},
						0.1,
					);

					hoverSplitsRef.current = allTitles.map((el) => {
						const split = new SplitText(el, {
							type: "chars",
							charsClass: "project-char",
						});

						gsap.set(allTitles, { opacity: 1 });
						gsap.set(split.chars, {
							yPercent: 120,
							opacity: 0,
							force3D: true,
						});

						return split;
					});

					gsap.set(".mid-strip", { yPercent: -80, scale: 0.5 });
					gsap.set(".left-strip", { yPercent: 3, scale: 0.5 });
					gsap.set(".right-strip", { yPercent: 3, scale: 0.5 });

					cards.forEach((card, index) => {
						const image = card.querySelector(".project-image");
						if (!image) return;

						gsap.set(image, {
							force3D: true,
							scale: imageSize,
							opacity: 1,
						});

						const split = hoverSplitsRef.current[index];
						if (!split) return;

						const onEnter = () => {
							gsap.killTweensOf(image);
							gsap.killTweensOf(split.chars);
							gsap.to(split.chars, {
								yPercent: 0,
								opacity: 1,
								stagger: 0.02,
								duration: 0.45 * speedScale,
								ease: "power3.out",
								overwrite: true,
							});
						};

						const onLeave = () => {
							gsap.killTweensOf(image);
							gsap.killTweensOf(split.chars);
							gsap.to(split.chars, {
								yPercent: 120,
								opacity: 0,
								stagger: 0.015,
								duration: 0.35 * speedScale,
								ease: "power3.in",
								overwrite: true,
							});
						};

						card.addEventListener("mouseenter", onEnter);
						card.addEventListener("mouseleave", onLeave);

						card._onEnter = onEnter;
						card._onLeave = onLeave;
					});

					const tl = gsap.timeline({
						scrollTrigger: {
							trigger: `#${sectionId}`,
							start: "3% top",
							end: "bottom bottom",
							scrub: true,
						},
					});

					tl.to(".left-strip", { yPercent: -77, scale: 1 }, 0);
					tl.to(".mid-strip", { yPercent: -4.5, scale: 1 }, 0);
					tl.to(".right-strip", { yPercent: -77, scale: 1 }, 0);
					tl.to(".card-1", {
						yPercent: -100,
						duration: 0.3 * speedScale,
						ease: "power3.inOut",
					});
					tl.to(
						".card-2",
						{
							yPercent: 100,
							duration: 0.3 * speedScale,
							ease: "power3.inOut",
						},
						"<",
					);
					tl.to(".left-strip", { xPercent: -170, duration: 0.3 * speedScale, ease: "power3.inOut" }, "<");
					tl.to(".right-strip", { xPercent: 170, duration: 0.3 * speedScale, ease: "power3.inOut" }, "<");

					const sectionBreakTl = gsap.timeline({
						scrollTrigger: {
							trigger: `#${sectionId}`,
							start: "65% top",
							end: "bottom bottom",
							scrub: true,
						},
					});

					sectionBreakTl.from(".section-break-wrapper", {
						scale: 0.7,
						opacity: 0,
						duration: 3 * speedScale,
						ease: "power3.inOut",
					});

					sectionBreakTl.to(sectionBreakSplit.lines, {
						backgroundSize: "100% 100%",
						stagger: 0.45,
						ease: "none",
						delay: -1,
					});

					return () => {
						cards.forEach((card) => {
							if (card._onEnter) {
								card.removeEventListener("mouseenter", card._onEnter);
							}
							if (card._onLeave) {
								card.removeEventListener("mouseleave", card._onLeave);
							}
						});

						hoverSplitsRef.current.forEach((split) => split?.revert());
						headingSplit.revert();
						paragraphSplit.revert();
						sectionBreakSplit.revert();
					};
			});

			return () => {
				mm.revert();
			};
		});

		return () => ctx.revert();
	}, [sectionId, driftSpeed, ribbonColor, imageSize, showNames]);

	let titleIndex = 0;

	const allCards = buildCards(22, 0, IMAGE_POOL, PROJECT_NAMES);
	const leftCards = allCards.slice(0, 8);
	const midCards = allCards.slice(8, 14);
	const rightCards = allCards.slice(14, 22);
	const compactCards = allCards.slice(0, 6);

	return (
		<>
			<div
				className="w-screen h-[1000vh] bg-white text-[#1a1a1a] max-[1025px]:hidden"
				id={sectionId}
			>
				<div className="w-screen h-screen sticky top-0 flex items-center px-[10vw]">
					<div className="w-full flex justify-between">
						<h2
							ref={headingRef}
							className="text-[4vw] font-medium w-fit leading-none"
						>
							Gradient Ribbon Drift
						</h2>

						<p
							ref={paragraphRef}
							className="text-[1.5vw] w-[40%] font-medium"
						>
							A scroll-led showcase where every project tile is a living gradient.
							Hover to reveal names, then let the strips glide past each other for a
							gallery that feels more like motion design than a grid.
						</p>
					</div>
				</div>

				<div className="w-screen h-screen sticky top-0 flex justify-between px-[7vw] mt-[-100vh] portfolio-card-container z-2">
					<div className="w-[23vw] h-fit flex flex-col gap-[4vw] items-center left-strip">
						{leftCards.map((item, index) => {
							const currentIndex = titleIndex++;

							return (
								<a
									href={item.href}
									key={`left-${index}`}
									className="project-card w-[90%] h-[27vw] portfolio-card overflow-hidden drop-shadow-md relative"
								>
									<img
										src={item.src}
										alt={item.title}
										width={400}
										height={600}
										className="project-image opacity-0 w-full h-full object-cover hover:brightness-75 transition duration-500 cursor-pointer hover:scale-[1.2] ease-in-out"
									/>

									{showNames && (
										<div className="absolute bottom-[5%] left-[5%] overflow-hidden pointer-events-none">
											<p
												ref={(el) => {
													titleRefs.current[currentIndex] = el;
												}}
												className="text-white text-[2vw] project-name font-medium leading-none opacity-0"
											>
												{item.title}
											</p>
										</div>
									)}
								</a>
							);
						})}
					</div>

					<div className="w-[28%] h-fit flex flex-col gap-[7vw] items-center mid-strip">
						{midCards.map((item, index) => {
							const currentIndex = titleIndex++;

							return (
								<a
									href={item.href}
									key={`mid-${index}`}
									className={`project-card w-[90%] h-[34vw] portfolio-card overflow-hidden drop-shadow-md relative ${index === 0 ? "card-1" : ""
										} ${index === 1 ? "card-2" : ""}`}
								>
									<img
										src={item.src}
										alt={item.title}
										width={500}
										height={700}
										className="project-image opacity-0 w-full h-full object-cover hover:brightness-75 transition duration-500 cursor-pointer hover:scale-[1.2] ease-in-out"
									/>

									{showNames && (
										<div className="absolute bottom-[5%] left-[5%] overflow-hidden pointer-events-none">
											<p
												ref={(el) => {
													titleRefs.current[currentIndex] = el;
												}}
												className="text-white text-[2.2vw] project-name font-medium leading-none opacity-0"
											>
												{item.title}
											</p>
										</div>
									)}
								</a>
							);
						})}
					</div>

					<div className="w-[23vw] h-fit flex flex-col gap-[4vw] items-center right-strip">
						{rightCards.map((item, index) => {
							const currentIndex = titleIndex++;

							return (
								<a
									href={item.href}
									key={`right-${index}`}
									className="project-card w-[90%] h-[27vw] portfolio-card overflow-hidden drop-shadow-md relative"
								>
									<img
										src={item.src}
										alt={item.title}
										width={400}
										height={600}
										className="project-image opacity-0 w-full h-full object-cover hover:brightness-75 transition duration-500 cursor-pointer hover:scale-[1.2] ease-in-out"
									/>

									{showNames && (
										<div className="absolute bottom-[5%] left-[5%] overflow-hidden pointer-events-none">
											<p
												ref={(el) => {
													titleRefs.current[currentIndex] = el;
												}}
												className="text-white text-[2vw] project-name font-medium leading-none opacity-0"
											>
												{item.title}
											</p>
										</div>
									)}
								</a>
							);
						})}
					</div>
				</div>

				<div className="w-screen h-screen sticky top-0 section-break text-[3.5vw] leading-[1.2] flex justify-center items-center">
					<div className="w-[75%] text-center relative section-break-wrapper">
						<p className="font-medium text-black/20 opacity-0">{sectionBreakText}</p>

						<p
							ref={sectionBreakFillRef}
							className="section-break-content font-medium absolute inset-0 pointer-events-none opacity-0"
							aria-hidden="true"
						>
							{sectionBreakText}
						</p>
					</div>
				</div>
			</div>

			<div className="hidden w-screen bg-white text-[#1a1a1a] max-[1025px]:block max-[1025px]:px-8 max-[1025px]:py-24 max-md:px-5 max-[1025px]:pt-35 max-md:pt-24 max-md:py-10">
				<div className="mx-auto flex w-full max-w-4xl flex-col gap-10 max-md:gap-10">
					<div className="flex flex-col gap-8 max-md:gap-6">
						<p className="text-[6vw] text-center font-medium leading-none max-md:text-[10vw]">
							Gradient Ribbon Drift
						</p>
						<p className="max-w-2xl mx-auto text-center text-[2.8vw] font-medium leading-[1.45] text-black/70 max-md:text-[4.5vw]">
							A scroll-led showcase where every project tile is a living gradient.
							Hover to reveal names, then let the strips glide past each other for a
							gallery that feels more like motion design than a grid.
						</p>
					</div>

					<div className="grid grid-cols-2 gap-y-10 gap-x-4 max-md:grid-cols-1 max-md:gap-5">
						{compactCards.map((item, index) => (
							<a
								href={item.href}
								key={`compact-${index}`}
								className="overflow-hidden rounded-sm max-md:mx-auto  w-full max-md:w-[80%]"
							>
								<div className="relative max-[1025px]:aspect-4/5 max-md:aspect-auto max-md:h-[35vh]  ">
									<img
										src={item.src}
										alt={item.title}
										className="object-cover absolute inset-0 w-full h-full"
									/>
								</div>
								<div className="px-4 py-4 max-md:px-2 max-md:py-5">
									{showNames && (
										<p className="text-[2.8vw] font-medium leading-none max-md:text-[4.8vw]">
											{item.title}
										</p>
									)}
								</div>
							</a>
						))}
					</div>

					<div className="rounded-sm   px-6 py-8 text-center max-[1025px]:px-8 max-md:px-5 max-md:py-6">
						<p className="text-[4vw] font-medium leading-[1.2] max-md:text-[5vw]">
							{sectionBreakText}
						</p>
					</div>
				</div>
			</div>
		</>
	);
};

export { RibbonDriftComp };
