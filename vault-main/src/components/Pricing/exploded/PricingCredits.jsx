"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import Button from "@/homepage/components/Button";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import CardFluid from "@/homepage/components/CardFluid";
import CreditTiles from "./CreditTiles";
import RollNumber from "./RollNumber";
import RollText from "./RollText";

const FLY_DURATION = 0.9;
const FLY_FADE_DELAY = 0.75;

// Demo wallet: spend template credits on example templates and watch each
// credit fly into the card it unlocks. Display only: credits aren't sold or
// tracked by the backend yet. Credit counts match the plan cards above.
const PLAN_OPTIONS = [
  { id: "pro", label: "Pro · Yearly", name: "Pro yearly", credits: 3, note: "selected catalogue", full: false },
  { id: "plus", label: "Pro+ · Yearly", name: "Pro+ yearly", credits: 5, note: "full catalogue · worth ~$200", full: true },
];

// `full` templates are only in the full catalogue (Pro+)
const TEMPLATES = [
  { name: "Studio portfolio", full: false },
  { name: "SaaS launch", full: true },
  { name: "Agency showcase", full: false },
  { name: "Product story", full: true },
  { name: "Event microsite", full: false },
  { name: "Personal site", full: true },
];

const LABEL = "type-label";

const PLUS = [{ x1: 5, y1: 12, x2: 19, y2: 12 }, { x1: 12, y1: 5, x2: 12, y2: 19 }];
const CHECK = [{ x1: 5, y1: 12.5, x2: 9.2, y2: 16.5 }, { x1: 9.2, y1: 16.5, x2: 19, y2: 7 }];
// The site's colour tokens (globals.css), read for gsap, which can't tween CSS variables
const token = (name, alpha = 1) => {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
};
const redeemColors = (done) => (done
  ? { backgroundColor: token("--primary"), borderColor: token("--primary") }
  : { backgroundColor: token("--primary", 0), borderColor: token("--background", 0.15) });

// Redeem button: on click the fill sweeps to orange, the plus morphs into a
// check (its two strokes become the two legs of the tick), and the label rolls.
function RedeemButton({ done, label, disabled, onClick }) {
  const btnRef = useRef(null);
  const lineRefs = useRef([]);
  const first = useRef(true);

  useEffect(() => {
    const quick = first.current || prefersReducedMotion();
    first.current = false;
    const ends = done ? CHECK : PLUS;
    const motion = { duration: 0.9, ease: "expo.inOut" };
    if (quick) {
      gsap.set(btnRef.current, redeemColors(done));
      lineRefs.current.forEach((l, i) => gsap.set(l, { attr: { ...ends[i] } }));
      return;
    }
    gsap.to(btnRef.current, { ...redeemColors(done), ...motion });
    lineRefs.current.forEach((l, i) => gsap.to(l, { attr: { ...ends[i] }, ...motion }));
  }, [done]);

  return (
    <button
      ref={btnRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center justify-center gap-[0.6vw] rounded-none border py-[0.8vw] max-md:px-4 text-background transition-opacity duration-700 disabled:cursor-default max-md:gap-[1vw] max-md:py-[3vw] ${done ? "border-primary bg-primary" : "border-background/15 disabled:opacity-40"} ${LABEL}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" aria-hidden="true" className="size-[1vw] max-md:size-[4vw]">
        {(done ? CHECK : PLUS).map((p, i) => (
          <line key={i} ref={(el) => { lineRefs.current[i] = el; }} {...p} />
        ))}
      </svg>
      {/* One fixed box for every label, so a wider label doesn't squeeze the one rolling out */}
      <RollText fixed text={label} className="h-[1.4em] w-[8em] text-center leading-[1.4]" />
    </button>
  );
}

export default function PricingCredits() {
  const rootRef = useRef(null);
  const coinRefs = useRef([]);
  const artRefs = useRef([]);
  const fliesRef = useRef(new Set());
  const toggleRef = useRef(null);
  const clipRef = useRef(null);
  const pillPlaced = useRef(false);
  const { sound } = useInteraction() ?? {};
  const [planId, setPlanId] = useState("plus");
  const [wallet, setWallet] = useState({ owned: [], pending: [] });
  const plan = PLAN_OPTIONS.find((p) => p.id === planId);
  const { owned, pending } = wallet;
  const left = plan.credits - owned.length - pending.length;

  useFadeUp(rootRef);

  // The plan pill glides under the chosen option. It is a light copy of the
  // labels clipped to the chosen option, so the fill and the dark text move
  // as one and stay in step.
  useLayoutEffect(() => {
    const root = toggleRef.current;
    const place = (animate) => {
      const on = root.querySelector('[aria-checked="true"]');
      if (!on || !clipRef.current) return;
      const { offsetLeft: l, offsetTop: t, offsetWidth: w, offsetHeight: h } = on;
      const clipPath = `inset(${t}px ${root.clientWidth - l - w}px ${root.clientHeight - t - h}px ${l}px)`;
      if (animate && pillPlaced.current && !prefersReducedMotion()) gsap.to(clipRef.current, { clipPath, duration: 0.8, ease: "expo.out", overwrite: true });
      else gsap.set(clipRef.current, { clipPath });
      pillPlaced.current = true;
    };
    place(true);
    // Only real resizes re-place it: the observer's first callback would snap an animation to its end
    let ready = false;
    const ro = new ResizeObserver(() => { if (ready) place(false); ready = true; });
    ro.observe(root);
    return () => ro.disconnect();
  }, [planId]);


  // Kill any credit still in flight on unmount
  useEffect(() => {
    const flies = fliesRef.current;
    return () => {
      flies.forEach(({ el, tweens }) => { tweens.forEach((t) => t.kill()); el.remove(); });
      flies.clear();
    };
  }, []);

  const refill = () => setWallet({ owned: [], pending: [] });
  const choose = (id) => {
    if (id === planId) return;
    setPlanId(id);
    refill();
    sound?.note?.(id === "plus" ? 3 : 1);
  };

  // A credit that lands after a refill no longer counts: it left the old wallet
  const own = (i) =>
    setWallet((w) => (w.pending.includes(i)
      ? { pending: w.pending.filter((x) => x !== i), owned: [...w.owned, i] }
      : w));

  const redeem = (i) => {
    if (owned.includes(i) || pending.includes(i) || left <= 0) return;
    sound?.note?.(i);
    const coin = coinRefs.current[left - 1];
    const art = artRefs.current[i];
    setWallet((w) => ({ ...w, pending: [...w.pending, i] }));
    if (prefersReducedMotion() || !coin || !art) {
      own(i);
      return;
    }
    const from = coin.getBoundingClientRect();
    const to = art.getBoundingClientRect();
    const el = document.createElement("i");
    el.textContent = left;
    Object.assign(el.style, {
      position: "fixed", zIndex: "90", pointerEvents: "none", display: "flex",
      alignItems: "center", justifyContent: "center", fontStyle: "normal", color: token("--background"),
      background: token("--primary"), width: `${from.width}px`, height: `${from.height}px`,
      marginLeft: `${-from.width / 2}px`, marginTop: `${-from.height / 2}px`,
    });
    document.body.appendChild(el);
    const fly = { el, tweens: [] };
    fliesRef.current.add(fly);
    // The credit starts pinned to the page (where the coin was) and homes in on the card's
    // live position every frame, so scrolling mid-flight doesn't leave it behind
    const start = { x: from.left + from.width / 2 + window.scrollX, y: from.top + from.height / 2 + window.scrollY };
    const progress = { p: 0 };
    const place = () => {
      const target = art.getBoundingClientRect();
      const sx = start.x - window.scrollX;
      const sy = start.y - window.scrollY;
      const tx = target.left + target.width / 2;
      const ty = target.top + target.height / 2;
      gsap.set(el, { left: sx + (tx - sx) * progress.p, top: sy + (ty - sy) * progress.p, scale: 1 + 0.6 * progress.p });
    };
    place();
    fly.tweens.push(
      gsap.to(progress, {
        p: 1,
        duration: FLY_DURATION,
        ease: "power3.inOut",
        onUpdate: place,
        onComplete: () => {
          el.remove();
          fliesRef.current.delete(fly);
          own(i);
          gsap.fromTo(art, { scale: 0.96 }, { scale: 1, duration: 0.9, ease: "elastic.out(1,.5)" });
        },
      }),
      gsap.to(el, { opacity: 0, duration: 0.3, delay: FLY_FADE_DELAY }),
    );
  };

  // The count rolls as its own number; only the words after it roll as text
  const note = left
    ? `credit${left > 1 ? "s" : ""} left · ${plan.note}`
    : "Wallet empty. That’s a year of templates, owned forever.";
  // Spending a credit rolls the note up, refilling rolls it down
  const [prevLeft, setPrevLeft] = useState(left);
  const [dir, setDir] = useState(1);
  if (left !== prevLeft) {
    setPrevLeft(left);
    setDir(Math.sign(prevLeft - left) || 1);
  }

  return (
    <section ref={rootRef} id="credits" data-sound-flow="off" className="relative bg-foreground px-[4.5vw] py-[7%] font-avenir text-background max-md:px-[6vw] max-md:py-[12%]">
      <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-[3vw] max-md:gap-[10vw]">
        <div className="flex flex-col gap-[1.8vw] max-md:gap-[10vw]">
          <LineReveal as="h2" className="type-h1">
            One Credit.<br />
            <span className="gradient-text-animate">One Whole Site.</span>
          </LineReveal>
          <p className="fadeup type-body-lg w-[40%] text-background/60 max-md:w-full">
            A credit unlocks one complete template: every page, section and interaction, as source code you own. Try it: spend your credits below.
          </p>
        </div>

        <div className="fadeup flex items-stretch gap-[1vw] max-md:flex-col max-md:gap-[3vw]">
          <div className="relative isolate flex w-[30%] flex-col gap-[1.4vw] overflow-hidden bg-background p-[2vw] text-foreground max-md:w-full max-md:gap-[5vw] max-md:p-[6vw]">
            {/* Dotted grid + orange mouse fluid; no swish (the section sets data-sound-flow="off") */}
            <CardFluid />
            <p className={`relative text-foreground/50 ${LABEL}`}>Your Wallet</p>

            <div ref={toggleRef} role="radiogroup" aria-label="Plan for this demo" className="relative isolate flex w-fit border border-foreground/10 bg-foreground/5 p-[0.3vw] max-md:p-[1vw]">
              {PLAN_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={p.id === planId}
                  onClick={() => choose(p.id)}
                  className={`cursor-pointer rounded-none px-[1.2vw] py-[0.7vw] text-foreground/60 max-md:px-[4vw] max-md:py-[2.4vw] ${LABEL}`}
                >
                  {p.label}
                </button>
              ))}
              <div ref={clipRef} aria-hidden="true" className="pointer-events-none absolute inset-0 flex bg-foreground p-[0.3vw] max-md:p-[1vw]">
                {PLAN_OPTIONS.map((p) => (
                  <span key={p.id} className={`px-[1.2vw] py-[0.7vw] text-background max-md:px-[4vw] max-md:py-[2.4vw] ${LABEL}`}>{p.label}</span>
                ))}
              </div>
            </div>

            <div className="relative min-h-[3vw] max-md:min-h-[12vw]">
              <CreditTiles
                count={plan.credits}
                used={left}
                sizeClass="size-[2.6vw] text-[0.8vw] max-md:size-[10vw] max-md:text-[3.2vw]"
                onTile={(i, el) => { coinRefs.current[i] = el; }}
              />
            </div>

            <div className="relative flex h-[4vw] gap-[0.3vw] type-body text-foreground/60 max-md:h-[16vw] max-md:gap-[1vw]">
              <span className={`flex h-[1.6em] items-center ${left ? "" : "hidden"}`}>
                <RollNumber value={left} values={[1, 5]} />
              </span>
              <RollText fixed text={note} dir={dir} className="h-full min-w-0 flex-1" />
            </div>
            <div className="relative mt-auto">
              <Button text="Reset Wallet" variant="outline" preventDefault onClick={refill} className="w-fit" />
            </div>
          </div>

          <ul className="flex w-[70%] flex-wrap content-start gap-[1vw] max-md:w-full max-md:gap-[3vw] max-md:gap-y-[10vw]">
            {TEMPLATES.map((t, i) => {
              const isOwned = owned.includes(i);
              const locked = t.full && !plan.full;
              const unavailable = !isOwned && (locked || (!left && !pending.includes(i)));
              return (
                <li key={t.name} className={`flex w-[32%] flex-col gap-[0.8vw] bg-foreground p-[0.8vw] max-md:px-3 transition-shadow duration-700 max-md:w-[48%] max-md:gap-[5vw] max-md:p-[2.4vw] ${isOwned ? "shadow-[inset_0_0_0_0.1vw_var(--primary)]" : "shadow-[inset_0_0_0_0.1vw_color-mix(in_srgb,var(--background)_10%,transparent)]"}`}>
                  <div
                    ref={(el) => { artRefs.current[i] = el; }}
                    aria-hidden="true"
                    className={`relative aspect-16/10 w-full overflow-hidden ${isOwned ? "bg-linear-to-br from-primary/20 to-dark-card" : "bg-background/10"}`}
                  >
                    <i className={`absolute top-[14%] left-[8%] h-[14%] w-[52%] transition-colors duration-1000 ${isOwned ? "bg-primary" : "bg-background/15"}`} />
                    <i className={`absolute top-[36%] left-[8%] h-[8%] w-[34%] transition-colors duration-1000 ${isOwned ? "bg-primary-hover" : "bg-background/15"}`} />
                    <i className={`absolute top-[56%] left-[8%] h-[30%] w-[84%] transition-colors duration-1000 ${isOwned ? "bg-grey" : "bg-background/15"}`} />
                  </div>
                  <div className="flex flex-col gap-[0.3vw] max-md:flex-1 max-md:gap-[1vw]">
                    <p className="type-body tracking-tight">{t.name}</p>
                    <p className={`flex items-center gap-[0.4vw] max-md:gap-[1.4vw] ${LABEL} ${t.full ? "text-background/60" : "text-primary"}`}>
                      {t.full ? "Full Catalogue" : "Selected Catalogue"}
                    </p>
                  </div>
                  <RedeemButton
                    done={isOwned || pending.includes(i)}
                    label={isOwned || pending.includes(i) ? "Yours" : locked ? "Pro+ only" : "Redeem"}
                    disabled={isOwned || unavailable || pending.includes(i)}
                    onClick={() => redeem(i)}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <p className={`text-light-grey ${LABEL}`}>Template names are examples. This wallet is a demo and isn’t linked to your account.</p>
      </div>
    </section>
  );
}
