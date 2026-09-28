// Built using Hyperiux Vault: https://vault.hyperiux.com


import DraggableMarqueeComp from "./DraggableMarqueeComp";


const DraggableMarquee = ({
  speed = 7.2,
  pauseOnHover = false,
  throwMultiplier = 2.8,
  throwFriction = 0.975,
}) => {
  return (
        <section className="w-screen h-screen bg-black text-white flex flex-col justify-center items-center">
				<DraggableMarqueeComp
					items={marqueeImages}
					speed={speed}
					pauseOnHover={pauseOnHover}
					throwMultiplier={throwMultiplier}
					throwFriction={throwFriction}
					gapClassName="gap-[2vw] max-[1025px]:gap-[4vw]"
					className="py-10"
					itemClassName="select-none"
				/>
				<div className="absolute bottom-[3vw] max-[1025px]:bottom-[8vw] left-1/2 -translate-x-1/2 z-40 bg-white/8 backdrop-blur-sm px-4 py-2 rounded-full text-white text-[1.1vw] max-[1025px]:text-[2.5vw] max-md:text-[3.5vw] text-center max-[1025px]:rounded-[2vw] shadow-lg">
					Drag the strip left or right to reveal the scenes.
				</div>
			</section>
    );
};

const marqueeImages = [
	{
		id: 1,
		src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg",
		alt: "Image 1",
		title: "image 1",
		width: 420,
		height: 520,
		imageClassName: "w-[24vw] h-[30vw] rounded-2xl max-[1025px]:w-[40vw] max-[1025px]:h-[60vw]    object-cover",
	},
	{
		id: 2,
		src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg",
		alt: "Image 2",
		title: "image 2",
		width: 420,
		height: 520,
		imageClassName: "w-[24vw] h-[30vw] rounded-2xl max-[1025px]:w-[40vw] max-[1025px]:h-[60vw]    object-cover",
	},
	{
		id: 3,
		src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-03.jpg",
		alt: "Image 3",
		title: "image 3",
		width: 420,
		height: 520,
		imageClassName: "w-[24vw] h-[30vw] rounded-2xl max-[1025px]:w-[40vw] max-[1025px]:h-[60vw]    object-cover",
	},
	{
		id: 4,
		src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg",
		alt: "Image 4",
		title: "image 4",
		width: 420,
		height: 520,
		imageClassName: "w-[24vw] h-[30vw] rounded-2xl max-[1025px]:w-[40vw] max-[1025px]:h-[60vw]    object-cover",
	},
]
export default DraggableMarquee;
