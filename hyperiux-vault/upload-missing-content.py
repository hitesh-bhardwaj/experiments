#!/usr/bin/env python3
"""
Upload missing effectContent documents to Sanity.
Parses the Hyperiux Component content.md and uploads all effects
that do not have ✅ or ❎ markers (i.e., not yet in Sanity).
"""

import json
import re
import urllib.request
import urllib.error
import sys
import time
from pathlib import Path

# ── Sanity config ──────────────────────────────────────────────
PROJECT_ID = "qrtsgg7p"
DATASET = "production"
API_VERSION = "2024-01-01"
TOKEN = "skvYpu7LId3WJNJ2YlDCjj8NK5dWoMmM43OvWSxrP6fJNS4Wni3ltdaQ2NROBLSXGXxCRlrRIMRCy19q2"
SANITY_ENDPOINT = f"https://{PROJECT_ID}.api.sanity.io/v{API_VERSION}/data/mutate/{DATASET}"

MD_PATH = Path(__file__).parent.parent / "Hyperiux Component content.md"

# ── Key generator ──────────────────────────────────────────────
_key_counter = 0


def new_key(prefix="k"):
    global _key_counter
    _key_counter += 1
    return f"{prefix}{_key_counter}"


def reset_keys():
    global _key_counter
    _key_counter = 0


# ── Portable text helpers ──────────────────────────────────────

def h2_block(text):
    return {
        "_type": "block",
        "_key": new_key("h2"),
        "style": "h2",
        "children": [{"_type": "span", "_key": new_key("s"), "text": text, "marks": []}],
        "markDefs": [],
    }


def h3_block(text):
    return {
        "_type": "block",
        "_key": new_key("h3"),
        "style": "h3",
        "children": [{"_type": "span", "_key": new_key("s"), "text": text, "marks": []}],
        "markDefs": [],
    }


def normal_block(text):
    text = text.strip()
    if not text:
        return None
    return {
        "_type": "block",
        "_key": new_key("p"),
        "style": "normal",
        "children": [{"_type": "span", "_key": new_key("s"), "text": text, "marks": []}],
        "markDefs": [],
    }


def bullet_block(text):
    text = text.strip()
    if not text:
        return None
    return {
        "_type": "block",
        "_key": new_key("b"),
        "style": "normal",
        "listItem": "bullet",
        "level": 1,
        "children": [{"_type": "span", "_key": new_key("s"), "text": text, "marks": []}],
        "markDefs": [],
    }


def faq_accordion(items):
    """items: list of (question, answer) tuples"""
    return {
        "_type": "effectFaqAccordion",
        "_key": new_key("faq"),
        "title": "Frequently Asked Questions",
        "items": [
            {
                "_type": "effectFaqAccordionItem",
                "_key": new_key("fi"),
                "question": q.strip(),
                "answer": a.strip(),
            }
            for q, a in items
            if q.strip() and a.strip()
        ],
    }


# ── Markdown parsers ───────────────────────────────────────────

def parse_table_row(line):
    """Extract | Key | Value | from a table row."""
    parts = [p.strip() for p in line.strip().strip("|").split("|")]
    if len(parts) >= 2:
        return parts[0], parts[1]
    return None, None


def clean_bullet(line):
    """Remove bullet char (•, -, *) and leading whitespace."""
    line = line.strip()
    line = re.sub(r"^[•\-\*]\s*", "", line)
    return line.strip()


def is_bullet(line):
    return bool(re.match(r"^\s*[•\-\*]\s+", line))


def extract_section_text(text, header_pattern, next_headers=None):
    """Extract text between `header_pattern` and the next header."""
    if next_headers is None:
        next_headers = [r"^#{2,5} "]
    pattern = re.compile(header_pattern, re.IGNORECASE | re.MULTILINE)
    m = pattern.search(text)
    if not m:
        return ""

    start = m.end()
    end = len(text)

    for nh in next_headers:
        nm = re.search(nh, text[start:], re.MULTILINE)
        if nm:
            end = min(end, start + nm.start())

    return text[start:end].strip()


def parse_faq_from_text(text):
    """Parse bold-question + plain-answer pairs from a FAQ section."""
    items = []
    # Match **Question?** followed by answer paragraphs
    pattern = re.compile(r"\*\*(.+?)\*\*\s*\n+((?:(?!\*\*).+\n?)+)", re.MULTILINE)
    for m in pattern.finditer(text):
        q = m.group(1).strip()
        a = m.group(2).strip()
        # Collapse whitespace in answer
        a = re.sub(r"\s+", " ", a).strip()
        if q and a:
            items.append((q, a))
    return items


def parse_bullets_from_text(text):
    """Extract bullet points from a text block."""
    bullets = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if is_bullet(line) or line.startswith("•"):
            cleaned = re.sub(r"^[•\-\*]\s*", "", line).strip()
            if cleaned:
                bullets.append(cleaned)
    return bullets


def parse_paragraphs(text):
    """Split text into non-empty paragraphs."""
    paras = []
    for para in re.split(r"\n{2,}", text):
        cleaned = para.strip()
        # Remove markdown bold/headers if they appear
        cleaned = re.sub(r"^\*\*(.+)\*\*$", r"\1", cleaned)
        if cleaned and not cleaned.startswith("|") and not cleaned.startswith("#"):
            paras.append(cleaned)
    return paras


def parse_related_effects(cta_text):
    """Extract effect names from 'Related: Name1, Name2, ...' """
    m = re.search(r"Related:\s*(.+?)(?:\.|$)", cta_text, re.IGNORECASE)
    if not m:
        return []
    names_str = m.group(1)
    # Split by comma, or "and", clean up
    names = re.split(r",\s*|\s+and\s+", names_str)
    # Remove any path-like segments
    result = []
    for name in names:
        name = name.strip().strip(".")
        if name and "/" not in name and not name.startswith("http"):
            result.append(name)
    return result


def parse_cta_info(cta_text, default_category=""):
    """Extract CTA heading, subtext, button text."""
    heading_m = re.search(r"Header:\s*(.+)", cta_text)
    subtext_m = re.search(r"Subtext:\s*(.+)", cta_text)
    btn_m = re.search(r"CTA Text:\s*(.+)", cta_text)

    heading = heading_m.group(1).strip() if heading_m else "Request a Custom Animation"
    subtext = subtext_m.group(1).strip() if subtext_m else "Need a custom effect? Tell us what to create."
    btn_text = btn_m.group(1).strip() if btn_m else "Request Custom Animation"

    return heading, subtext, btn_text


# ── Short descriptions from Tab 17 ────────────────────────────

def parse_short_descriptions(markdown_text):
    """Build {component_name: short_description} from Tab 17 tables."""
    descriptions = {}
    table_pattern = re.compile(
        r"\| Component \| H1 \| Short Description \|(.*?)(?=\n#|\Z)",
        re.DOTALL
    )
    for table_m in table_pattern.finditer(markdown_text):
        table_content = table_m.group(1)
        for line in table_content.split("\n"):
            if not line.strip() or line.strip().startswith("|---") or line.strip().startswith("| -"):
                continue
            parts = [p.strip() for p in line.strip().strip("|").split("|")]
            if len(parts) >= 3:
                name = parts[0].strip()
                desc = parts[2].strip()
                if name and desc and name != "Component":
                    descriptions[name] = desc
    return descriptions


# ── Main section parser ────────────────────────────────────────

def build_body_blocks(section_text, title):
    """Convert a section's markdown text into Sanity portable text blocks."""
    blocks = []
    reset_keys()

    # ── Overview ────────────────────────────────
    overview_text = extract_section_text(
        section_text,
        r"^#{2,3}\s+\*?\*?Overview\*?\*?",
        [r"^#{2,5}\s+"]
    )
    if overview_text:
        blocks.append(h2_block("Overview"))
        # Split by double newline for paragraphs, skip pure bullet lines in overview
        paras = []
        for line in overview_text.split("\n"):
            stripped = line.strip()
            if not stripped:
                if paras and paras[-1]:
                    paras.append("")
            else:
                paras.append(stripped)

        # Build from paragraph-separated chunks
        current = []
        for line in paras:
            if line == "":
                if current:
                    text = " ".join(current).strip()
                    text = re.sub(r"\s+", " ", text)
                    if text:
                        b = normal_block(text)
                        if b:
                            blocks.append(b)
                    current = []
            else:
                current.append(line)
        if current:
            text = " ".join(current).strip()
            text = re.sub(r"\s+", " ", text)
            if text:
                b = normal_block(text)
                if b:
                    blocks.append(b)

    # ── Usage example (if present) ──────────────
    usage_text = extract_section_text(
        section_text,
        r"^#{3,5}\s+\*?\*?Usage example\*?\*?",
        [r"^#{2,5}\s+"]
    )
    if usage_text:
        # Skip code-heavy usage examples; just note them
        pass  # We'll skip usage examples for brevity

    # ── Best Used For ────────────────────────────
    best_for_text = extract_section_text(
        section_text,
        r"^#{2,5}\s+\*?\*?Best used for\*?\*?",
        [r"^#{2,5}\s+"]
    )
    if best_for_text:
        bullets = parse_bullets_from_text(best_for_text)
        if bullets:
            blocks.append(h2_block("Best Used For"))
            for b in bullets:
                block = bullet_block(b)
                if block:
                    blocks.append(block)

    # ── Not For ──────────────────────────────────
    not_for_text = extract_section_text(
        section_text,
        r"^#{2,5}\s+\*?\*?Not for\*?\*?",
        [r"^#{2,5}\s+"]
    )
    if not_for_text:
        blocks.append(h2_block("Not For"))
        # Could be paragraphs or bullets
        bullets = parse_bullets_from_text(not_for_text)
        if bullets:
            for b in bullets:
                block = bullet_block(b)
                if block:
                    blocks.append(block)
        else:
            for para in parse_paragraphs(not_for_text):
                b = normal_block(para)
                if b:
                    blocks.append(b)

    # ── Performance budget ────────────────────────
    perf_text = extract_section_text(
        section_text,
        r"^#{2,5}\s+\*?\*?Performance budget\*?\*?",
        [r"^#{2,5}\s+"]
    )
    if perf_text:
        blocks.append(h2_block("Performance Budget"))
        for para in parse_paragraphs(perf_text):
            b = normal_block(para)
            if b:
                blocks.append(b)

    # ── Accessibility and mobile ──────────────────
    a11y_text = extract_section_text(
        section_text,
        r"^#{2,5}\s+\*?\*?Accessibility and mobile\*?\*?",
        [r"^#{2,5}\s+"]
    )
    if a11y_text:
        blocks.append(h2_block("Accessibility and Mobile"))
        for para in parse_paragraphs(a11y_text):
            b = normal_block(para)
            if b:
                blocks.append(b)

    # ── Common mistakes ───────────────────────────
    mistakes_text = extract_section_text(
        section_text,
        r"^#{2,5}\s+\*?\*?Common mistakes\*?\*?",
        [r"^#{2,5}\s+"]
    )
    if mistakes_text:
        bullets = parse_bullets_from_text(mistakes_text)
        if bullets:
            blocks.append(h2_block("Common Mistakes"))
            for b in bullets:
                block = bullet_block(b)
                if block:
                    blocks.append(block)

    # ── FAQ ───────────────────────────────────────
    faq_text = extract_section_text(
        section_text,
        r"^#{2,5}\s+\*?\*?FAQ\*?\*?",
        [r"^#{2,5}\s+"]
    )
    if faq_text:
        faq_items = parse_faq_from_text(faq_text)
        if faq_items:
            blocks.append(faq_accordion(faq_items))

    return blocks


def parse_section(section_text, short_descriptions):
    """Parse a single effect section into a Sanity document dict."""
    lines = section_text.split("\n")
    title_line = lines[0].strip()

    # Get display title (strip leading "# ")
    title = title_line.lstrip("# ").strip()

    # Parse metadata table
    meta = {}
    for line in lines:
        if "|" not in line:
            continue
        k, v = parse_table_row(line)
        if k and v and k.lower() not in ("page type", "component", "h1", "short description", "---"):
            meta[k.lower()] = v

    # Extract canonical URL → effectSlug, categorySlug
    canonical_str = meta.get("indexability and canonical", "")
    canonical_m = re.search(r"Canonical:\s*(/[^\.\s]+)", canonical_str)
    if not canonical_m:
        print(f"  ⚠ No canonical URL found for: {title}")
        return None

    canonical = canonical_m.group(1).rstrip("/")
    parts = canonical.split("/")
    if len(parts) < 4:
        print(f"  ⚠ Unexpected canonical URL format: {canonical}")
        return None

    effect_slug = parts[-1]
    category_slug = parts[-2]

    # Page title (H2 line, cleaned)
    h2_m = re.search(r"^#{1,2}\s+\*?\*?(.+?)\*?\*?\s*$", section_text, re.MULTILINE)
    page_title = h2_m.group(1).strip() if h2_m else title

    # Short description (summary)
    summary = ""
    for key in [title, page_title]:
        if key in short_descriptions:
            summary = short_descriptions[key]
            break
    if not summary:
        # Try fuzzy match (first word match)
        title_lower = title.lower().split()[0] if title.split() else ""
        for k, v in short_descriptions.items():
            if title_lower and k.lower().startswith(title_lower):
                summary = v
                break

    # SEO fields
    seo_title = meta.get("seo title", f"{title} for React & Next.js | Hyperiux Vault")
    seo_description = meta.get("meta description", "")
    primary_keyword = meta.get("primary keyword", "")
    secondary_keywords_raw = meta.get("secondary keywords", "")
    secondary_keywords = [
        kw.strip()
        for kw in re.split(r",", secondary_keywords_raw)
        if kw.strip()
    ]

    # Build body blocks
    body = build_body_blocks(section_text, title)

    # Related effects and CTA
    cta_text = extract_section_text(
        section_text,
        r"^#{2,5}\s+\*?\*?Internal links and CTAs\*?\*?",
        []
    )
    related = parse_related_effects(cta_text)
    cta_heading, cta_subtext, cta_btn_text = parse_cta_info(cta_text)

    # Determine button link based on category
    cta_button_link = "/pricing"

    doc = {
        "_type": "effectContent",
        "_id": f"effect-content-{effect_slug}",
        "categorySlug": category_slug,
        "effectSlug": effect_slug,
        "title": page_title,
        "summary": summary,
        "body": body,
        "seo": {
            "_type": "effectSeo",
            "title": seo_title,
            "description": seo_description,
            "primaryKeyword": primary_keyword,
            "secondaryKeywords": secondary_keywords,
        },
        "relatedEffectNames": related,
        "ctaBanner": {
            "_type": "effectCtaBanner",
            "heading": cta_heading,
            "description": cta_subtext,
            "buttonText": cta_btn_text,
            "buttonLink": cta_button_link,
        },
    }

    return doc


# ── Sanity API upload ──────────────────────────────────────────

def upload_mutation(mutations):
    """POST mutations to Sanity API."""
    payload = json.dumps({"mutations": mutations}).encode("utf-8")
    req = urllib.request.Request(
        SANITY_ENDPOINT,
        data=payload,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  ✖ HTTP {e.code}: {body[:500]}")
        return None


# ── Main ───────────────────────────────────────────────────────

def main():
    print("Reading markdown file...")
    markdown_text = MD_PATH.read_text(encoding="utf-8")

    print("Parsing short descriptions from Tab 17 table...")
    short_descriptions = parse_short_descriptions(markdown_text)
    print(f"  Found {len(short_descriptions)} short descriptions")

    print("\nSplitting into sections...")
    # Split by "\n# " but also handle the very first section
    raw_sections = re.split(r"\n(?=# )", markdown_text)

    missing_sections = []
    for section in raw_sections:
        first_line = section.split("\n")[0].strip()
        if not first_line.startswith("# "):
            continue
        # Skip category/overview sections (they have ✅ or ❎ or "Tab")
        if first_line.startswith("# ✅") or first_line.startswith("# ❎"):
            continue
        if "Tab 17" in first_line:
            continue
        # Must have a canonical URL to be an effect page
        if "Canonical:" not in section:
            continue
        missing_sections.append(section)

    print(f"  Found {len(missing_sections)} missing effects to upload\n")

    documents = []
    for section in missing_sections:
        title = section.split("\n")[0].lstrip("# ").strip()
        print(f"  Parsing: {title}")
        doc = parse_section(section, short_descriptions)
        if doc:
            documents.append(doc)
            print(f"    → {doc['categorySlug']} / {doc['effectSlug']} ({len(doc['body'])} body blocks)")
        else:
            print(f"    ✖ Skipped")

    print(f"\n✅ Parsed {len(documents)} documents")
    print("\nUploading to Sanity in batches of 5...")

    batch_size = 5
    success_count = 0
    fail_count = 0

    for i in range(0, len(documents), batch_size):
        batch = documents[i : i + batch_size]
        mutations = [{"createOrReplace": doc} for doc in batch]
        names = [doc["effectSlug"] for doc in batch]
        print(f"\n  Batch {i // batch_size + 1}: {', '.join(names)}")

        result = upload_mutation(mutations)
        if result:
            results_list = result.get("results", [])
            ok = sum(1 for r in results_list if r.get("id"))
            print(f"    ✅ {ok}/{len(batch)} created/replaced")
            success_count += ok
            fail_count += len(batch) - ok
        else:
            print(f"    ✖ Batch failed")
            fail_count += len(batch)

        # Small delay to be polite to the API
        if i + batch_size < len(documents):
            time.sleep(0.5)

    print(f"\n{'='*50}")
    print(f"Done! {success_count} uploaded, {fail_count} failed")


if __name__ == "__main__":
    main()
