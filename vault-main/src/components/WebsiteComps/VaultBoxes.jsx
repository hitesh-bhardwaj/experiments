import Link from "next/link";
import { useRouter } from "next/navigation";
import LazyVideo from "./LazyVideo";

export default function VaultBox({ id, styles, img, number, label, containerLink = '#', labelLink = '#', textColor = 'text-foreground', title = "WebGL Slider", paragraph = "For immersive product, portfolio, or campaign visuals." }) {
    const router = useRouter();

    return (
        <div
            id={id}
            onClick={() => router.push(containerLink)}
            className={`cursor-pointer group flex p-[1vw] z-999 overflow-hidden max-[1025px]:min-h-[65vw] justify-between relative h-full max-[1025px]:rounded-md max-md:rounded-sm rounded-md  ${styles} ${id=="block-bottom-layer-3"?"bg-[#3059FF]":""}`}
        >
            <div className={`absolute inset-0 bg-black/50 ${id=="block-bottom-layer-3"?"top-[12%]":""}`}>
                <LazyVideo
                    src={img}
                    className="object-cover h-full w-full"
                />
            </div>

            <div className='absolute inset-0 bg-linear-to-t from-black/90 via-black/30 max-[1025px]:min-h-[32vh] to-transparent z-1 pointer-events-none! max-[1025px]:rounded-sm opacity-0 max-[1025px]:opacity-100 group-hover:opacity-100 transition-all duration-500'></div>

            <div className='relative z-2 flex flex-col justify-between h-full w-full'>
                <Link prefetch={false} href={labelLink} onClick={(e) => e.stopPropagation()} className='text18 w-fit relative z-100 px-[1vw] py-[.5vw] max-[1025px]:px-3 max-[1025px]:py-2 max-md:px-5 max-md:py-2.5 rounded-full bg-grey h-fit hover:bg-foreground hover:text-background transition-all duration-500 font-heading'>
                    <p>{label}</p>
                </Link>
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-500  max-[1025px]:opacity-100 max-md:space-y-[4vw] max-[1025px]:space-y-[1.2vw]">
                    <p className="text34 max-md:text-[5.5vw]! font-heading">{title}</p>
                    <p className="text-sm max-[1025px]:text-[2.2vw] max-md:text-[3.7vw] max-[1025px]:leading-[1.2]">{paragraph}</p>
                </div>
            </div>
        </div>
    )
}