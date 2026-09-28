#!/usr/bin/env python3
"""
Sync effect release dates from local registry changelogs to Sanity.

Rules:
- `addedAt` comes from the changelog entry that looks like the initial release
  (`version == "1.0.0"` or summary contains "Initial release").
- If no initial-release entry exists, `addedAt` falls back to the earliest
  changelog date.
- `updatedAt` comes from the latest changelog date.

Dry-run is the default. Pass `--apply` to write to Sanity.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ID = os.environ.get("NEXT_PUBLIC_SANITY_PROJECT_ID", "qrtsgg7p")
DATASET = os.environ.get("NEXT_PUBLIC_SANITY_DATASET", "production")
API_VERSION = os.environ.get("SANITY_API_VERSION", "2024-01-01")

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY_ROOT = REPO_ROOT / "registry" / "effects"
LEGACY_UPLOAD_SCRIPT = Path(__file__).resolve().parent / "upload-missing-content.py"

SANITY_TITLE_BY_REGISTRY_SLUG = {
    "char-stagger-button": "Character Stagger Button",
    "char-stagger-primary-button": "Character Stagger Primary Button",
    "parallax-image-animation": "Parallax Image",
    "svg-path": "SVG Path Marquee",
    "text-hover": "Text Hover Expand",
}

QUERY_ENDPOINT = f"https://{PROJECT_ID}.api.sanity.io/v{API_VERSION}/data/query/{DATASET}"
MUTATE_ENDPOINT = f"https://{PROJECT_ID}.api.sanity.io/v{API_VERSION}/data/mutate/{DATASET}"


def read_legacy_token():
    if not LEGACY_UPLOAD_SCRIPT.exists():
        return None

    match = re.search(
        r'^TOKEN\s*=\s*["\']([^"\']+)["\']',
        LEGACY_UPLOAD_SCRIPT.read_text(encoding="utf-8"),
        re.MULTILINE,
    )
    return match.group(1) if match else None


TOKEN = os.environ.get("SANITY_API_TOKEN") or read_legacy_token()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Upload addedAt/updatedAt dates from registry changelogs to Sanity."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes to Sanity. Without this flag, only prints a dry run.",
    )
    parser.add_argument(
        "--missing-only",
        action="store_true",
        help="Only fill fields that are currently missing in Sanity.",
    )
    parser.add_argument(
        "--slug",
        action="append",
        default=[],
        help="Limit to one effect slug. Can be passed more than once.",
    )
    return parser.parse_args()


def parse_changelog_date(value):
    if not value:
        return None

    text = str(value).strip()

    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None


def sanity_datetime(value):
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT00:00:00.000Z")


def is_initial_release(entry):
    version = str(entry.get("version", "")).strip()
    summary = str(entry.get("summary", "")).strip().lower()
    return version == "1.0.0" or "initial release" in summary


def get_changelog_dates(changelog):
    dated_entries = []

    for entry in changelog or []:
        date = parse_changelog_date(entry.get("date"))
        if date:
            dated_entries.append((date, entry))

    if not dated_entries:
        return None, None, None

    initial_entries = [item for item in dated_entries if is_initial_release(item[1])]
    added_at_source = "initial-release" if initial_entries else "earliest-changelog"
    added_at = min(initial_entries or dated_entries, key=lambda item: item[0])[0]
    updated_at = max(dated_entries, key=lambda item: item[0])[0]

    return sanity_datetime(added_at), sanity_datetime(updated_at), added_at_source


def load_registry_dates(limit_slugs):
    effects = []
    limit = set(limit_slugs or [])

    for path in sorted(REGISTRY_ROOT.glob("**/registry.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            print(f"  ! Invalid JSON: {path} ({error})")
            continue

        slug = data.get("name") or path.parent.name
        if limit and slug not in limit:
            continue

        added_at, updated_at, added_at_source = get_changelog_dates(data.get("changelog"))
        if not added_at or not updated_at:
            effects.append({
                "slug": slug,
                "path": path,
                "skipReason": "no changelog dates",
            })
            continue

        effects.append({
            "slug": slug,
            "path": path,
            "addedAt": added_at,
            "addedAtSource": added_at_source,
            "updatedAt": updated_at,
        })

    return effects


def sanity_request(url, *, method="GET", payload=None):
    headers = {"Content-Type": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        raise RuntimeError(f"Sanity HTTP {error.code}: {body[:800]}") from error


def fetch_sanity_docs():
    query = (
        '*[_type == "effectContent" && defined(effectSlug)]{'
        "_id,effectSlug,categorySlug,title,addedAt,updatedAt,lastUpdated"
        "}"
    )
    url = f"{QUERY_ENDPOINT}?{urllib.parse.urlencode({'query': query})}"
    data = sanity_request(url)
    docs = data.get("result") or []
    by_slug = {doc.get("effectSlug"): doc for doc in docs if doc.get("effectSlug")}
    by_title = {doc.get("title"): doc for doc in docs if doc.get("title")}
    return by_slug, by_title


def find_sanity_doc(effect, sanity_by_slug, sanity_by_title):
    slug = effect["slug"]
    if slug in sanity_by_slug:
        return sanity_by_slug[slug]

    title = SANITY_TITLE_BY_REGISTRY_SLUG.get(slug)
    if title:
        return sanity_by_title.get(title)

    return None


def build_patch(effect, sanity_doc, missing_only=False):
    if effect.get("skipReason"):
        return None

    set_values = {}

    can_set_added_at = (
        not sanity_doc.get("addedAt")
        or effect.get("addedAtSource") == "initial-release"
    )

    if (not missing_only or not sanity_doc.get("addedAt")) and can_set_added_at:
        set_values["addedAt"] = effect["addedAt"]

    if not missing_only or not sanity_doc.get("updatedAt"):
        set_values["updatedAt"] = effect["updatedAt"]

    if not set_values:
        return None

    return {
        "patch": {
            "id": sanity_doc["_id"],
            "set": set_values,
        }
    }


def main():
    args = parse_args()

    if args.apply and not TOKEN:
        print("SANITY_API_TOKEN is required when using --apply.", file=sys.stderr)
        return 1

    print("Reading registry changelogs...")
    effects = load_registry_dates(args.slug)
    print(f"  Found {len(effects)} registry effects")

    print("Fetching Sanity effectContent documents...")
    sanity_by_slug, sanity_by_title = fetch_sanity_docs()
    print(f"  Found {len(sanity_by_slug)} Sanity effectContent documents")

    mutations = []
    skipped = 0
    missing_docs = 0

    print("\nPlanned changes:")
    for effect in effects:
        slug = effect["slug"]
        sanity_doc = find_sanity_doc(effect, sanity_by_slug, sanity_by_title)

        if effect.get("skipReason"):
            skipped += 1
            print(f"  - {slug}: skipped ({effect['skipReason']})")
            continue

        if not sanity_doc:
            missing_docs += 1
            print(f"  - {slug}: skipped (no Sanity document found)")
            continue

        mutation = build_patch(effect, sanity_doc, args.missing_only)
        if not mutation:
            skipped += 1
            print(f"  - {slug}: no change")
            continue

        set_values = mutation["patch"]["set"]
        mutations.append(mutation)
        print(
            f"  - {slug}: "
            f"addedAt {sanity_doc.get('addedAt') or '-'} -> {set_values.get('addedAt', sanity_doc.get('addedAt'))}; "
            f"updatedAt {sanity_doc.get('updatedAt') or '-'} -> {set_values.get('updatedAt', sanity_doc.get('updatedAt'))}"
        )

    print("\nSummary:")
    print(f"  mutations: {len(mutations)}")
    print(f"  skipped: {skipped}")
    print(f"  missing Sanity docs: {missing_docs}")

    if not args.apply:
        print("\nDry run only. Re-run with --apply to write these dates to Sanity.")
        return 0

    if not mutations:
        print("\nNothing to upload.")
        return 0

    print("\nUploading to Sanity...")
    payload = {"mutations": mutations}
    result = sanity_request(MUTATE_ENDPOINT, method="POST", payload=payload)
    uploaded = len(result.get("results") or [])
    print(f"Done. {uploaded}/{len(mutations)} mutations accepted.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
