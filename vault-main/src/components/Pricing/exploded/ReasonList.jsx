"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import RollNumber from "./RollNumber";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Each reason keeps its slot while its numbers change (they roll in place).
// A reason that appears grows in and fades up, one that goes fades and
// collapses, and the ones below slide to follow.
export const REASON_ORDER = ["sections", "copies", "templates", "saving"];

function Parts({ parts }) {
  return parts.map((p, i) =>
    typeof p === "string" ? (
      <span key={i}>{p}</span>
    ) : (
      <span key={i} className="inline-flex align-[-0.2em]">
        <RollNumber value={p.n} values={p.values} />
      </span>
    )
  );
}

function Row({ item, mountedRef }) {
  const ref = useRef(null);
  useIsoLayoutEffect(() => {
    // Rows present on first mount appear as-is; later ones grow in
    if (!mountedRef.current || prefersReducedMotion()) return undefined;
    const tween = gsap.from(ref.current, { height: 0, opacity: 0, y: 10, duration: 0.7, ease: "power3.out" });
    return () => tween.kill();
  }, []);  

  return (
    <li ref={ref} data-id={item.id} className="overflow-hidden">
      <div className="flex gap-[0.8vw] pb-[0.8vw] text20 leading-[1.6] text-foreground/70 max-md:gap-[3vw] max-md:pb-[3vw]">
        <i className="relative top-[0.5vw] size-[0.4vw] shrink-0 bg-primary max-md:top-[2vw] max-md:size-[1.5vw]" />
        <p><Parts parts={item.parts} /></p>
      </div>
    </li>
  );
}

export default function ReasonList({ items }) {
  const listRef = useRef(null);
  const mounted = useRef(false);
  const [rows, setRows] = useState(items);

  // New items join the rows straight away; leaving rows stay until their exit tween ends
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setRows((prev) => {
      const byId = new Map(prev.map((r) => [r.id, r]));
      items.forEach((i) => byId.set(i.id, i));
      return REASON_ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id));
    });
  }

  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));

    [...listRef.current.children].forEach((row) => {
      const id = row.dataset.id;
      if (!ids.has(id)) {
        if (row.dataset.leaving) return;
        row.dataset.leaving = "1";
        const done = () => setRows((prev) => prev.filter((r) => r.id !== id));
        if (prefersReducedMotion()) return done();
        gsap.to(row, { height: 0, opacity: 0, duration: 0.55, ease: "power3.inOut", overwrite: true, onComplete: done });
      } else if (row.dataset.leaving) {
        delete row.dataset.leaving;
        gsap.to(row, { height: "auto", opacity: 1, y: 0, duration: 0.55, ease: "power3.out", overwrite: true });
      }
    });
    mounted.current = true;
  }, [items]);

  return (
    <ul ref={listRef} className="flex h-[15vw] flex-col overflow-hidden max-md:h-[60vw]">
      {rows.map((item) => (
        <Row key={item.id} item={item} mountedRef={mounted} />
      ))}
    </ul>
  );
}
