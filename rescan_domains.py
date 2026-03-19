"""Re-scan Daggerheart domain card pages with two-pass verification.

Scans pages 25-27 (domain overviews) and 329-343 (domain cards),
then compares against the current daggerheart.json database to find differences.
"""

import base64
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import anthropic
import fitz  # PyMuPDF

# -- Config ------------------------------------------------------------------

PDF_PATH = r"C:\Users\daely\OneDrive\Desktop\claude_workspace\dnd_voice_tracker\Daggerheart_Core_Book_-_Full_Art_Cards_-_9-09-25.pdf"
DB_PATH = r"C:\Users\daely\OneDrive\Desktop\claude_workspace\dnd_voice_tracker\dnd-combat-companion\src\renderer\data\daggerheart.json"
OUTPUT_DIR = Path(r"C:\Users\daely\OneDrive\Desktop\claude_workspace\dnd_voice_tracker\rescan_output")
OUTPUT_DIR.mkdir(exist_ok=True)

from dotenv import load_dotenv
load_dotenv(r"C:\Users\daely\OneDrive\Desktop\claude_workspace\pdf_to_json\.env")
API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 16384
DPI = 200  # Higher DPI for better text clarity

# Domain card page ranges
SECTIONS = [
    ("Domains Overview", 25, 27, "Domain overview descriptions for all 9 Daggerheart domains"),
    ("Domain Cards: Arcana", 329, 329, "Arcana domain cards — spells and abilities with level, recall cost, dice values, and full text"),
    ("Domain Cards: Blade", 330, 331, "Blade domain cards — abilities with level, recall cost, dice values, and full text"),
    ("Domain Cards: Bone", 332, 332, "Bone domain cards — abilities with level, recall cost, dice values, and full text"),
    ("Domain Cards: Codex", 333, 334, "Codex domain cards — spells, grimoires, and abilities with level, recall cost, dice values, and full text"),
    ("Domain Cards: Grace", 335, 336, "Grace domain cards — spells and abilities with level, recall cost, dice values, and full text"),
    ("Domain Cards: Midnight", 337, 338, "Midnight domain cards — spells and abilities with level, recall cost, dice values, and full text"),
    ("Domain Cards: Sage", 339, 340, "Sage domain cards — spells and abilities with level, recall cost, dice values, and full text"),
    ("Domain Cards: Splendor", 341, 341, "Splendor domain cards — spells and abilities with level, recall cost, dice values, and full text"),
    ("Domain Cards: Valor", 342, 343, "Valor domain cards — abilities with level, recall cost, dice values, and full text"),
]

# -- Prompts -----------------------------------------------------------------

EXTRACT_SYSTEM = """\
You are an expert at extracting structured data from tabletop RPG rulebooks.
You will be shown screenshots of pages from the Daggerheart Core Rulebook.
Your job is to extract every distinct entry visible on these pages.

Return a JSON array of objects, each with:
- "name": the entry's title/name exactly as printed
- "description": the COMPLETE text of the entry, preserving all game mechanics, stats, and flavor text EXACTLY as written

CRITICAL RULES:
1. VERBATIM TRANSCRIPTION ONLY. Copy text character for character from the image. Do NOT paraphrase, rephrase, or summarize.
2. NEVER GUESS OR FILL IN FROM MEMORY. Read ONLY what is in the image. Your training data may have different values.
3. DOUBLE-CHECK ALL DICE VALUES: d4, d6, d8, d10, d12, d20 — read each digit carefully from the image. These are the most common errors.
4. DOUBLE-CHECK ALL NUMBERS: damage values, ranges, DCs, costs, levels.
5. For domain cards: include the level, type (spell/ability/grimoire), recall cost, and full card text in description.
6. Extract EVERY entry visible on the pages. Do not skip any.
7. If an entry spans across pages, combine it into one complete entry.
8. Do NOT include page numbers, chapter headers, or decorative text as entries.
9. Return ONLY the JSON array, no other text or markdown fencing."""

VERIFY_SYSTEM = """\
You are a TTRPG data verification agent. You will receive page images AND a JSON extraction produced from those images.
Your ONLY job is to compare the extracted data against the images and find errors.

FOCUS AREAS (highest priority first):
1. DICE EXPRESSIONS: d4, d6, d8, d10, d12, d20 — look at each digit in the image carefully. A "d8" is NOT a "d6".
2. NUMERICAL VALUES: damage numbers, recall costs, levels, ranges, thresholds
3. MISSING TEXT: Are any sentences, phrases, or words missing from the descriptions?
4. EXTRA TEXT: Was anything hallucinated that isn't on the page?
5. NAMES: Are entry names spelled exactly as printed?

Read the numbers from the IMAGE, not from memory.

Return ONLY valid JSON (no markdown fencing):
{
  "corrections": [
    {
      "entryName": "name of the entry with the error",
      "wrong": "the incorrect text from the extraction",
      "corrected": "the correct text from the image",
      "reason": "brief explanation"
    }
  ]
}

If the extraction is perfect, return: { "corrections": [] }"""


# -- Rendering ---------------------------------------------------------------

def render_pages(page_start: int, page_end: int) -> list[bytes]:
    """Render PDF pages as high-quality PNG images."""
    doc = fitz.open(PDF_PATH)
    images = []
    for page_num in range(page_start - 1, min(page_end, doc.page_count)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=DPI)
        img_bytes = pix.tobytes("png")
        # Downscale if over API limit (base64 is ~33% larger than raw bytes)
        # Keep well under 5MB to be safe
        current_dpi = DPI
        while len(img_bytes) > 3_500_000 and current_dpi > 100:
            current_dpi = int(current_dpi * 0.8)
            pix = page.get_pixmap(dpi=current_dpi)
            img_bytes = pix.tobytes("png")
        images.append(img_bytes)
        print(f"    Rendered page {page_num + 1} at {current_dpi} DPI ({len(img_bytes) // 1024}KB)")
    doc.close()
    return images


def images_to_content(images: list[bytes]) -> list[dict]:
    """Convert image bytes to Claude API content blocks."""
    content = []
    for img_bytes in images:
        b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": b64},
        })
    return content


# -- API Calls ---------------------------------------------------------------

client = anthropic.Anthropic(api_key=API_KEY)


def extract_pass(images: list[bytes], hint: str) -> list[dict]:
    """Pass 1: Extract entries from page images."""
    content = images_to_content(images)
    content.append({"type": "text", "text": f"These pages contain: {hint}. Extract all entries as described."})

    for attempt in range(3):
        try:
            response = client.messages.create(
                model=MODEL, max_tokens=MAX_TOKENS, system=EXTRACT_SYSTEM,
                messages=[{"role": "user", "content": content}],
            )
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
            entries = json.loads(text)
            return entries if isinstance(entries, list) else [entries]
        except (json.JSONDecodeError, KeyError, IndexError) as exc:
            if attempt < 2:
                print(f"    [RETRY] Parse error: {exc}")
                time.sleep(1)
            else:
                print(f"    [ERROR] Failed: {exc}")
                return []
        except anthropic.APIError as exc:
            wait = 15 if "429" in str(exc) else 5
            if attempt < 2:
                print(f"    [RETRY] API error, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    [ERROR] API error: {exc}")
                return []
    return []


def verify_pass(images: list[bytes], entries: list[dict]) -> list[dict]:
    """Pass 2: Verify extracted entries against the images. Returns corrections."""
    content = images_to_content(images)
    content.append({
        "type": "text",
        "text": (
            "Here is the JSON extracted from these pages. Compare every dice value, "
            "number, and piece of text against the image. Report any discrepancies.\n\n"
            f"EXTRACTED DATA:\n{json.dumps(entries, indent=2)}"
        ),
    })

    for attempt in range(3):
        try:
            response = client.messages.create(
                model=MODEL, max_tokens=MAX_TOKENS, system=VERIFY_SYSTEM,
                messages=[{"role": "user", "content": content}],
            )
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
            result = json.loads(text)
            return result.get("corrections", [])
        except Exception as exc:
            if attempt < 2:
                print(f"    [RETRY] Verify parse error: {exc}")
                time.sleep(2)
            else:
                print(f"    [ERROR] Verify failed: {exc}")
                return []
    return []


def apply_corrections(entries: list[dict], corrections: list[dict]) -> list[dict]:
    """Apply verification corrections to entries."""
    if not corrections:
        return entries

    for fix in corrections:
        for entry in entries:
            if entry["name"].lower().strip() == fix["entryName"].lower().strip():
                if fix["wrong"] in entry["description"]:
                    entry["description"] = entry["description"].replace(fix["wrong"], fix["corrected"])
                    print(f"    [FIXED] {entry['name']}: '{fix['wrong']}' -> '{fix['corrected']}' ({fix['reason']})")
                break
    return entries


# -- Scan All Sections -------------------------------------------------------

def scan_all_domains() -> list[dict]:
    """Scan all domain sections with two-pass verification."""
    all_entries = []
    seen_names = set()

    for i, (name, start, end, hint) in enumerate(SECTIONS):
        print(f"\n[{i + 1}/{len(SECTIONS)}] {name} (pp. {start}-{end})")

        # Render
        images = render_pages(start, end)

        # Pass 1: Extract
        print(f"  Pass 1: Extracting...")
        entries = extract_pass(images, hint)
        print(f"  -> {len(entries)} entries extracted")

        # Pass 2: Verify
        if entries:
            print(f"  Pass 2: Verifying dice values and numbers...")
            corrections = verify_pass(images, entries)
            if corrections:
                print(f"  -> {len(corrections)} corrections found")
                entries = apply_corrections(entries, corrections)
            else:
                print(f"  -> All values verified correct")

        # Deduplicate
        for entry in entries:
            key = entry["name"].lower().strip()
            if key not in seen_names:
                seen_names.add(key)
                entry["category"] = "domain"
                all_entries.append(entry)

    return all_entries


# -- Compare -----------------------------------------------------------------

def normalize(text: str) -> str:
    """Normalize whitespace for comparison."""
    return " ".join(text.split())


def compare_with_database(new_entries: list[dict]) -> dict:
    """Compare re-scanned entries with existing database."""
    with open(DB_PATH) as f:
        db = json.load(f)

    # Get only domain entries from current DB
    db_domains = {e["name"].lower().strip(): e for e in db if e.get("category") == "domain"}

    report = {
        "matched_perfect": [],
        "differences": [],
        "new_only": [],
        "db_only": [],
    }

    new_by_name = {}
    for entry in new_entries:
        key = entry["name"].lower().strip()
        new_by_name[key] = entry

    # Find differences and matches
    for key, new_entry in new_by_name.items():
        if key in db_domains:
            db_entry = db_domains[key]
            old_desc = normalize(db_entry["description"])
            new_desc = normalize(new_entry["description"])
            if old_desc == new_desc:
                report["matched_perfect"].append(new_entry["name"])
            else:
                report["differences"].append({
                    "name": new_entry["name"],
                    "old_description": db_entry["description"],
                    "new_description": new_entry["description"],
                })
        else:
            report["new_only"].append(new_entry["name"])

    # Entries in DB but not in new scan
    for key, db_entry in db_domains.items():
        if key not in new_by_name:
            report["db_only"].append(db_entry["name"])

    return report


# -- Main --------------------------------------------------------------------

def main():
    if not API_KEY:
        print("ERROR: Set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    print("=" * 60)
    print("Daggerheart Domain Cards — Two-Pass Re-Scan")
    print(f"Model: {MODEL} | DPI: {DPI} | Verification: ON")
    print("=" * 60)

    # Scan
    new_entries = scan_all_domains()
    print(f"\n{'=' * 60}")
    print(f"Total entries extracted: {len(new_entries)}")

    # Save raw re-scan results
    rescan_path = OUTPUT_DIR / "rescan_domains.json"
    with open(rescan_path, "w") as f:
        json.dump(new_entries, f, indent=2)
    print(f"Saved re-scan results to: {rescan_path}")

    # Compare
    print(f"\n{'=' * 60}")
    print("Comparing with current database...")
    report = compare_with_database(new_entries)

    # Save comparison report
    report_path = OUTPUT_DIR / "comparison_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    # Print summary
    print(f"\n{'=' * 60}")
    print("COMPARISON RESULTS")
    print(f"{'=' * 60}")
    print(f"  Perfect matches:    {len(report['matched_perfect'])}")
    print(f"  Differences found:  {len(report['differences'])}")
    print(f"  New scan only:      {len(report['new_only'])}")
    print(f"  Old DB only:        {len(report['db_only'])}")

    if report["differences"]:
        print(f"\n{'-' * 60}")
        print("DIFFERENCES (review these carefully):")
        print(f"{'-' * 60}")
        for diff in report["differences"]:
            print(f"\n  Entry: {diff['name']}")
            # Find specific text differences
            old_words = diff["old_description"].split()
            new_words = diff["new_description"].split()
            # Simple word-level diff to highlight changes
            for j, (ow, nw) in enumerate(zip(old_words, new_words)):
                if ow != nw:
                    context_start = max(0, j - 3)
                    context_end = min(len(old_words), j + 4)
                    old_ctx = " ".join(old_words[context_start:context_end])
                    new_ctx = " ".join(new_words[context_start:context_end])
                    print(f"    OLD: ...{old_ctx}...")
                    print(f"    NEW: ...{new_ctx}...")
                    print()

    if report["new_only"]:
        print(f"\nEntries in new scan but NOT in current DB:")
        for name in report["new_only"]:
            print(f"  + {name}")

    if report["db_only"]:
        print(f"\nEntries in current DB but NOT in new scan:")
        for name in report["db_only"]:
            print(f"  - {name}")

    # Save detailed diff report as readable text
    diff_txt_path = OUTPUT_DIR / "diff_report.txt"
    with open(diff_txt_path, "w", encoding="utf-8") as f:
        f.write("DAGGERHEART DOMAIN CARDS — COMPARISON REPORT\n")
        f.write(f"{'=' * 60}\n\n")
        f.write(f"Perfect matches: {len(report['matched_perfect'])}\n")
        f.write(f"Differences: {len(report['differences'])}\n")
        f.write(f"New scan only: {len(report['new_only'])}\n")
        f.write(f"Old DB only: {len(report['db_only'])}\n\n")

        for diff in report["differences"]:
            f.write(f"{'-' * 60}\n")
            f.write(f"ENTRY: {diff['name']}\n\n")
            f.write(f"OLD (current DB):\n{diff['old_description']}\n\n")
            f.write(f"NEW (re-scan):\n{diff['new_description']}\n\n")

    print(f"\nFull diff report saved to: {diff_txt_path}")
    print(f"Comparison data saved to: {report_path}")


if __name__ == "__main__":
    main()
