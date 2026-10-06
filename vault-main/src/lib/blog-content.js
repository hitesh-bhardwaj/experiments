// Shared helpers for deriving TOC anchors and reading time from a blogPost's
// portable-text `body`. Both BlogBodyRenderer (which emits the heading ids)
// and the TOC component (which links to them) import slugifyHeading from
// here so the two never drift out of sync.

export function slugifyHeading(text = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function blockPlainText(block) {
  return (block.children || []).map((child) => child.text || "").join("");
}

// Table of contents entries - one per H2, deduped against repeat headings by
// suffixing a counter (portable text has no uniqueness guarantee on text).
export function getBlogHeadings(body = []) {
  const seen = new Map();

  return body
    .filter((block) => block?._type === "block" && block.style === "h2")
    .map((block) => {
      const text = blockPlainText(block);
      const base = slugifyHeading(text) || "section";
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);

      return {
        text,
        id: count === 0 ? base : `${base}-${count}`,
      };
    })
    .filter((heading) => heading.text);
}

const WORDS_PER_MINUTE = 280;

export function getReadingTime(body = []) {
  let wordCount = 0;

  for (const block of body) {
    if (block._type === "block") {
      wordCount += blockPlainText(block).trim().split(/\s+/).filter(Boolean).length;
    } else if (block._type === "effectCodeBlock") {
      // Code reads slower than prose - weight it at roughly half the words/minute.
      wordCount += Math.ceil((block.code || "").trim().split(/\s+/).filter(Boolean).length / 2);
    } else if (block._type === "effectCalloutBlock") {
      wordCount += getReadingTime(block.content || []).words;
    } else if (block._type === "effectFaqAccordion") {
      for (const item of block.items || []) {
        wordCount += (item.question || "").trim().split(/\s+/).filter(Boolean).length;
        wordCount += (item.answer || "").trim().split(/\s+/).filter(Boolean).length;
      }
    }
  }

  return {
    words: wordCount,
    minutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
  };
}
