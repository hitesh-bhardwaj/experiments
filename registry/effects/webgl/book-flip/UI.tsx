'use client'
import { useEffect } from "react";
import { usePage } from "./PageContext";

interface UIProps {
 images?: string[]
}

export const UI = ({ images = [] }: UIProps) => {
 const { page, setPage } = usePage();
  // Generate page count from images array
 const pageCount = Math.ceil((images.length || 0) / 2);

 useEffect(() => {
 try {
 const audio = new Audio("/assets/audio/page-flip-01a.mp3");
 audio.play().catch(() => {
 // Audio file not found or playback failed, silently continue
 });
 } catch {
 // Silently handle audio errors
 }
 }, [page]);

 return (
 <>
 <main className=" pointer-events-none select-none z-10 fixed top-12 w-full left-1/2 translate-x-[-50%] flex justify-between flex-col">
  <div className="w-full overflow-auto pointer-events-auto flex justify-center">
 <div className="overflow-auto flex items-center gap-4 max-w-full p-10">
 {Array.from({ length: pageCount + 1 }).map((_, index) => (
 <button
 key={index}
 className={`border-transparent cursor-pointer transition-all duration-300 px-4 py-3 rounded-full text-lg uppercase shrink-0 border ${
 index === page
 ?"bg-white/90 text-black"
 :"bg-black/30 text-white"
 }`}
 onClick={() => setPage(index)}
 >
 {index === 0 ?"Cover" : index === pageCount ?"Back Cover" : `Page ${index}`}
 </button>
 ))}
 </div>
 </div>
 
 </main>

 <div className="relative z-20 h-screen pointer-events-none">
    <div className="absolute top-1/2 left-0 flex w-full -translate-y-1/2 justify-between px-10 max-[1025px]:justify-center max-[1025px]:gap-8 max-md:gap-4 max-[1025px]:top-[85%] max-md:top-[80%]">
    <p className="text-[8vw] max-md:text-[10vw] leading-[1.2] text-white">
        BOOK 
       
       
    </p>
   <p className="text-[8vw] max-md:text-[10vw] leading-[1.2] text-white">
         FLIP
    </p>
 </div>
 
 </div>

 {/* <div className="fixed inset-0 bg-black flex items-start justify-center pt-20 select-none">
 </div> */}
 </>
 );
};
