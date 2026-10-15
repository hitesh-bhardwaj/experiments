"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

// Inside .docs-sheet, --foreground is remapped to ink, so white text here is text-light.
// "Find the Right Effect": ranks the effect records already on the page against a
// use case and hides the rest. It reads the server-rendered <article>s, so the
// catalogue is never sent twice and crawlers always see every record.

const USE_CASES = [
  "Hero section",
  "Portfolio",
  "Product launch",
  "Scroll storytelling",
  "Gallery",
  "Page transition",
  "Navigation menu",
  "Call to action",
  "Cursor",
  "Loading screen",
];

const TIERS = [
  ["all", "All"],
  ["free", "Free"],
  ["pro", "Pro"],
];

const STOP = new Set(["a", "an", "and", "for", "the", "to", "of", "on", "in", "with", "my", "i", "need", "want", "page", "effect", "effects", "section"]);
// "loading" should find "Loader", "galleries" should find "gallery": match on a rough stem
const stem = (word) => (word.length > 5 ? word.replace(/(ing|ies|ers|er|es|ed|s)$/, "") : word);
const terms = (text) => text.toLowerCase().split(/[^a-z0-9+#.]+/).filter((term) => term.length > 1 && !STOP.has(term)).map(stem);

const recordsIn = (scope) => scope.querySelectorAll("article[data-effect]");

// Title matches count most, then "Best Used For" and tags, then the rest of the
// record. An effect matches when a word is in its title, Best Used For or tags,
// or when every word appears somewhere in its record; a passing mention of
// "hero" in a long write-up isn't a match. A word in its "Not For" counts
// against it: the guide says it's the wrong tool for that job.
function score(record, words) {
  let total = 0;
  let strong = false;
  let everywhere = true;
  for (const word of words) {
    if (record.title.includes(word)) { total += 6; strong = true; }
    if (record.fit.includes(word)) { total += 3; strong = true; }
    if (record.text.includes(word)) total += 1;
    else everywhere = false;
    if (record.notFor.includes(word)) total -= 5;
  }
  return (strong || everywhere) && total > 0 ? total : 0;
}

const CHIP = "type-label cursor-pointer border px-3 py-1.5 transition-colors duration-300";

export default function EffectFinder({ total }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [records, setRecords] = useState([]);
  const rootRef = useRef(null);

  // Index the records once they're on the page
  useEffect(() => {
    const scope = rootRef.current?.closest(".blog-content") || document;
    setRecords(
      [...recordsIn(scope)].map((node) => ({
        slug: node.dataset.effect,
        tier: node.dataset.tier,
        name: node.querySelector('[data-role="title"]')?.textContent || node.dataset.effect,
        title: (node.querySelector('[data-role="title"]')?.textContent || "").toLowerCase(),
        fit: `${node.querySelector('[data-role="best-for"]')?.textContent || ""} ${node.querySelector('[data-role="keywords"]')?.textContent || ""}`.toLowerCase(),
        notFor: (node.querySelector('[data-role="not-for"]')?.textContent || "").toLowerCase(),
        text: node.textContent.toLowerCase(),
      }))
    );
  }, []);

  const words = useMemo(() => terms(query), [query]);

  const ranked = useMemo(
    () =>
      records
        .filter((record) => tier === "all" || record.tier === tier)
        .map((record) => ({ record, score: words.length ? score(record, words) : 1 }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score),
    [records, tier, words]
  );

  // Show only the matches below, and hide categories left empty
  useEffect(() => {
    if (!records.length) return;
    const visible = new Set(ranked.map((entry) => entry.record.slug));
    const scope = rootRef.current?.closest(".blog-content") || document;
    for (const node of recordsIn(scope)) node.hidden = !visible.has(node.dataset.effect);
    for (const section of scope.querySelectorAll("[data-category-section]")) {
      section.hidden = !section.querySelector("article[data-effect]:not([hidden])");
    }
  }, [records, ranked]);

  const filtering = words.length > 0 || tier !== "all";
  const top = words.length ? ranked.slice(0, 6) : [];

  return (
    <div ref={rootRef} className="not-prose flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="type-small text-black/60">Describe what you&apos;re building, or pick a use case</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. hero for a photography portfolio"
          className="type-body w-full border border-black/20 bg-transparent px-4 py-3 text-ink outline-none transition-colors duration-300 placeholder:text-black/40 focus:border-primary"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {USE_CASES.map((useCase) => {
          const active = query.toLowerCase() === useCase.toLowerCase();
          return (
            <button
              key={useCase}
              type="button"
              onClick={() => setQuery(active ? "" : useCase)}
              className={`${CHIP} ${active ? "border-primary bg-primary text-background" : "border-black/10 text-ink hover:border-primary hover:text-primary"}`}
            >
              {useCase}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TIERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTier(value)}
            aria-pressed={tier === value}
            className={`${CHIP} ${tier === value ? "border-ink bg-ink text-light" : "border-black/10 text-ink hover:border-ink"}`}
          >
            {label}
          </button>
        ))}
        <span className="type-small ml-auto text-black/60" aria-live="polite">
          {filtering ? `${ranked.length} of ${total} effects match` : `All ${total} effects`}
        </span>
      </div>

      {top.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-black/10 pt-4">
          <span className="type-small text-black/60">Best matches</span>
          <ol className="m-0! flex flex-col gap-1 pl-5!">
            {top.map(({ record }) => (
              <li key={record.slug} className="type-body">
                <a href={`#${record.slug}`}>{record.name}</a>
                <span className="type-small text-black/60"> · {record.tier === "pro" ? "Pro" : "Free"}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {filtering && ranked.length === 0 && (
        <p className="type-body text-black/60">No effect matches that yet. Try a broader use case, or <Link href="/effects">browse every effect</Link>.</p>
      )}
    </div>
  );
}
