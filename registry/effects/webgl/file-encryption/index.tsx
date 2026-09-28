// Built using Hyperiux Vault: https://vault.hyperiux.com

import React from 'react'
import { FileEncryptionComp } from './FileEncryptionComp';

function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 91.713 + salt * 37.529) * 10000;
  return value - Math.floor(value);
}

const STARS = Array.from({ length: 120 }, (_, i) => ({
  id: i,
  size: seededUnit(i, 1) < 0.3 ? 3 : 2,
  top: `${seededUnit(i, 2) * 100}%`,
  left: `${seededUnit(i, 3) * 100}%`,
  opacity: seededUnit(i, 4) * 0.6 + 0.1,
  duration: `${2 + seededUnit(i, 5) * 4}s`,
  delay: `${seededUnit(i, 6) * 5}s`,
}));

function StarField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {STARS.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            width: s.size,
            height: s.size,
            top: s.top,
            left: s.left,
            opacity: s.opacity,
            animation: `twinkle ${s.duration} ease-in-out infinite`,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}


const FileEncryption = ({
  speed = 1,
  accentColor = "#ff5f00",
  backgroundColor = "#07060f",
  cardSize = 1,
}) => {
  return (
   <>
    <main
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: backgroundColor }}
    >
      <StarField />

      {/* Radial orange ambient */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 60%, ${accentColor}33 0%, transparent 70%)`,
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center gap-3 max-md:gap-3 max-[1025px]:gap-10 text-center px-4">
        <div className="flex items-center mt-5 gap-2 px-3 py-1 rounded-full border border-white/30 bg-black/20">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse motion-reduce:animate-none"
            style={{ background: accentColor }}
          />
          <span className="font-mono text-xs max-md:text-sm max-[1025px]:text-base tracking-widest uppercase text-primary opacity-80">
            256-bit AES Encryption Active
          </span>
        </div>
        <h1
          className="font-mono font-black max-[1025px]:text-6xl max-md:text-5xl text-6xl tracking-tight"
          style={{ color: accentColor }}
        >
          CARD VAULT
        </h1>
        <p
          className="font-mono text-sm max-md:text-sm max-[1025px]:text-base max-w-sm opacity-60 leading-[1.2]"
          style={{ color: accentColor }}
        >
          Every card is encrypted in real-time as it passes through the beam.
          Zero plaintext. Zero exposure.
        </p>
      </div>

      {/* Marquee */}
      <div className="relative w-full z-10">
        <FileEncryptionComp
          cards={CARDS}
          speed={speed}
          accentColor={accentColor}
          backgroundColor={backgroundColor}
          cardSize={cardSize}
        />
      </div>

      {/* Bottom label */}
      <div className="relative z-10 mt-12 flex max-md:flex-col items-center gap-6 max-[1025px]:gap-8 max-md:gap-2 font-mono text-xs max-[1025px]:text-base max-md:text-sm text-white/20 tracking-widest uppercase">
        <span>AES-256-GCM</span>
        <span className="w-1 h-1 rounded-full bg-white/20" />
        <span>RSA-4096</span>
        <span className="w-1 h-1 rounded-full bg-white/20" />
        <span>ChaCha20-Poly1305</span>
      </div>

      <div className="absolute bottom-[2vw] left-1/2 -translate-x-1/2 z-40 bg-white/8 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm max-[1025px]:hidden shadow-lg">
       Slide a card to either edge - watch it snap into place and spill its secret.
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </main>
   </>
  )
}

export default FileEncryption


const CARDS = [
  {
    id: "card-01",
    number: "4111 1111 4555 1142",
    holder: "Emma Johnson",
    expiry: "09/27",
    gradient:
      "linear-gradient(135deg, #4ade80 0%, #22c55e 40%, #86efac 70%, #bbf7d0 100%)",
    glowColor: "#4ade80",
    networkColor1: "#f97316",
    networkColor2: "#ef4444",
  },
  {
    id: "card-02",
    number: "5577 0000 5577 0004",
    holder: "Chris Smith",
    expiry: "04/28",
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
    glowColor: "#818cf8",
    networkColor1: "#f59e0b",
    networkColor2: "#fbbf24",
  },
  {
    id: "card-03",
    number: "3782 8224 6310 005",
    holder: "Aria Chen",
    expiry: "11/26",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)",
    glowColor: "#c084fc",
    networkColor1: "#06b6d4",
    networkColor2: "#0ea5e9",
  },
  {
    id: "card-04",
    number: "6011 1111 1111 1117",
    holder: "Marcus Reed",
    expiry: "07/29",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    glowColor: "#38bdf8",
    networkColor1: "#f43f5e",
    networkColor2: "#fb7185",
  },
  {
    id: "card-05",
    number: "4000 0566 5566 5556",
    holder: "Sofia Laurent",
    expiry: "02/27",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #e11d48 40%, #fda4af 100%)",
    glowColor: "#f43f5e",
    networkColor1: "#fbbf24",
    networkColor2: "#f59e0b",
  },
  {
    id: "card-06",
    number: "3714 4963 5398 431",
    holder: "Liam Okafor",
    expiry: "12/28",
    gradient: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)",
    glowColor: "#34d399",
    networkColor1: "#6366f1",
    networkColor2: "#818cf8",
  },
];
