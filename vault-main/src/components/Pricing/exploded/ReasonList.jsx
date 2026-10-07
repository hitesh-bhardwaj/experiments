"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
      <span key={i} className="inline-flex align-[-0.15em]">
        <RollNumber value={p.n} values={p.values} />
      </span>
    )
  );
}

function Row({ item, enter }) {
  const ref = useRef(null);
  useIsoLayoutEffect(() => {
    if (!enter || prefersReducedMotion()) return undefined;
    const tween = gsap.from(ref.current, { height: 0, opacity: 0, y: 10, duration: 0.7, ease: "power3.out" });
    return () => tween.kill();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li ref={ref} data-id={item.id} className="overflow-hidden">
      <div className="flex gap-[0.8vw] pb-[0.8vw] text-[1vw] leading-[1.6] text-foreground/70 max-md:gap-[3vw] max-md:pb-[3vw] max-md:text-[3.8vw]">
        <i className="mt-[0.5vw] size-[0.4vw] shrink-0 bg-primary max-md:mt-[2vw] max-md:size-[1.5vw]" />
        <p><Parts parts={item.parts} /></p>
      </div>
    </li>
  );
}

export default function ReasonList({ items }) {
  const listRef = useRef(null);
  const latest = useRef(new Map());
  const mounted = useRef(false);
  const [rows, setRows] = useState(items);

  useMemo(() => items.forEach((i) => latest.current.set(i.id, i)), [items]);

  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    setRows((prev) => {
      const keep = new Set([...prev.map((r) => r.id), ...ids]);
      return REASON_ORDER.filter((id) => keep.has(id)).map((id) => latest.current.get(id));
    });

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
    <ul ref={listRef} className="flex h-[15vw] flex-col overflow-hidden max-md:h-[85vw]">
      {rows.map((item) => (
        <Row key={item.id} item={latest.current.get(item.id) ?? item} enter={mounted.current} />
      ))}
    </ul>
  );
}
