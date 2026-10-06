"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { type FieldConfig } from "./effects/animated-form/ContactForm";

// The provider wraps the whole page, so the modal and its form would otherwise
// sit in the critical bundle. Both load on first open.
const AnimatedModalContent = dynamic(
  () => import("./effects/animated-modal/AnimatedModalContent"),
);
const ContactForm = dynamic(() => import("./effects/animated-form/ContactForm"));

const FIELDS: FieldConfig[] = [
  { type: "text", name: "name", label: "Your Name*", required: true },
  { type: "email", name: "email", label: "Email Address*", required: true },
  { type: "text", name: "subject", label: "Subject*", required: true },
  { type: "text", name: "message", label: "Your Message*", required: true },
  { type: "phone", name: "phone", label: "Phone Number*", required: true, defaultCountry: "AE" },
];

async function submitHandler(data: Record<string, any>) {
  console.log("Get in touch form submitted:", data);
}

type GetInTouchModalContextValue = {
  openModal: () => void;
};

const GetInTouchModalContext = createContext<GetInTouchModalContextValue | null>(null);

export function useGetInTouchModal() {
  const ctx = useContext(GetInTouchModalContext);
  if (!ctx) {
    throw new Error("useGetInTouchModal must be used within GetInTouchModalProvider");
  }
  return ctx;
}

// Same circle + twin-bar + always-on gradient treatment as the FAQ
// accordion's open/close trigger (see Faq.tsx) - the bars are just fixed
// at +/-45deg here to read as a static cross instead of a +/- toggle, and
// the gradient never fades out the way it does on hover/open there.
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="relative shrink-0 size-14 rounded-full overflow-hidden flex items-center justify-center  cursor-pointer max-[1025px]:size-11 max-md:size-9 group"
    >
      <div className="absolute inset-0 w-full h-full bg-linear-to-r from-[#F16B0D] to-[#E61416]" />
      <span className="absolute h-0.5 z-2 w-4 rounded-full bg-white rotate-45 max-md:w-3 group-hover:rotate-225 duration-500 ease-in-out" />
      <span className="absolute h-0.5 z-2 w-4 rounded-full bg-white -rotate-45 max-md:w-3 group-hover:rotate-135 duration-500 ease-in-out" />
    </button>
  );
}

export function GetInTouchModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // The modal plays its own close tween, so unmounting on `isOpen === false`
  // would cut the exit animation off. Flips true on first open, never back.
  const [used, setUsed] = useState(false);

  const openModal = useCallback(() => {
    setUsed(true);
    setIsOpen(true);
  }, []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ openModal }), [openModal]);

  return (
    <GetInTouchModalContext.Provider value={value}>
      {children}
      {used && (
      <AnimatedModalContent
        isOpen={isOpen}
        onClose={closeModal}
        showCloseButton={false}
        overlayOpacity={1}
        ariaLabelledby="get-in-touch-modal-title"
        contentClassName="justify-center px-[4vw] max-md:px-4"
      >
        <div className="relative w-full max-w-[75vw] h-[75vh] overflow-y-auto rounded-[2vw] bg-white/5 backdrop-blur-lg border border-white/10 text-white p-[3vw] max-[1025px]:max-w-[85vw] max-[1025px]:p-8 max-md:max-w-full max-md:p-6 max-md:rounded-3xl">
          <div className="absolute top-[2vw] right-[2vw] max-[1025px]:top-6 max-[1025px]:right-6 max-md:top-4 max-md:right-4">
            <CloseButton onClick={closeModal} />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-[3vw] items-start max-[1025px]:grid-cols-1 max-[1025px]:gap-8 pt-[4vw]">
            <div>
              <h2 id="get-in-touch-modal-title" className="text-[4.8vw] leading-[1.1]! max-[1025px]:text-[5vw] max-md:text-[8vw]">
                Get in Touch
              </h2>
              <p className="mt-[1vw] text-[1.1vw] text-white max-[1025px]:text-[2.4vw] max-md:text-[4vw]">
                Drop me a message
              </p>
            </div>

            <div className="get-in-touch-form">
              <ContactForm
                fields={FIELDS}
                onSubmit={submitHandler}
                submitLabel="Send"
                accentColor="#F16B0D"
                textColor="#ffffff"
                inputBackgroundColor="rgba(255,255,255,0.15)"
                fieldBorderColor="rgba(255,255,255,0.15)"
                inputRoundedness={999}
              />
            </div>
          </div>
        </div>
      </AnimatedModalContent>
      )}
    </GetInTouchModalContext.Provider>
  );
}
