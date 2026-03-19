"""Extract all entries from the Daggerheart SRD PDF with two-pass verification.

Creates a clean daggerheart_srd.json containing only SRD-licensed content,
suitable for the commercial version of the app.
"""

import base64
import json
import os
import sys
import time
from pathlib import Path

import anthropic
import fitz  # PyMuPDF

# -- Config ------------------------------------------------------------------

SRD_PDF = r"C:\Users\daely\OneDrive\Desktop\claude_workspace\dnd_voice_tracker\Daggerheart-SRD-9-09-25.pdf"
OUTPUT_DIR = Path(r"C:\Users\daely\OneDrive\Desktop\claude_workspace\dnd_voice_tracker\rescan_output")
OUTPUT_DIR.mkdir(exist_ok=True)

from dotenv import load_dotenv
load_dotenv(r"C:\Users\daely\OneDrive\Desktop\claude_workspace\pdf_to_json\.env")
API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 16384
DPI = 200

# SRD sections based on TOC (68 pages total)
SECTIONS = [
    # Character Creation & Domains
    ("Character Creation", 3, 3, "Character creation rules — steps, traits (Agility, Strength, Finesse, Instinct, Presence, Knowledge)", "rules"),
    ("Domains Overview", 4, 4, "Domain overview descriptions for all 9 Daggerheart domains", "domain"),
    # Classes
    ("Classes: Bard & Druid", 5, 7, "Bard and Druid class descriptions with subclasses, hope features, foundation features, spellcast traits", "class features"),
    ("Classes: Druid (cont) & Guardian", 8, 9, "Druid beastform tables, Guardian class with subclasses and features", "class features"),
    ("Classes: Ranger & Rogue", 10, 11, "Ranger and Rogue classes with subclasses, companions, hope features", "class features"),
    ("Classes: Seraph & Sorcerer", 12, 13, "Seraph and Sorcerer classes with subclasses and features", "class features"),
    ("Classes: Warrior & Wizard", 13, 14, "Warrior and Wizard classes with subclasses and features", "class features"),
    # Ancestries & Communities
    ("Ancestries Part 1", 14, 15, "Ancestry descriptions and features — Clank, Drakona, Dwarf, Elf, Faerie, Faun, Firbolg, Fungril", "class features"),
    ("Ancestries Part 2", 16, 17, "Ancestry descriptions and features — Galapa, Giant, Goblin, Halfling, Human, Infernis, Katari, Orc, Ribbet, Simiah, Mixed Ancestry", "class features"),
    ("Communities", 17, 18, "Community descriptions and features — Highborne, Loreborne, Orderborne, Ridgeborne, Seaborne, Slyborne, Underborne, Wanderborne, Wildborne", "class features"),
    # Core Mechanics
    ("Core: Flow & Spotlight", 18, 19, "Flow of the game, core gameplay loop, spotlight, turn order, action economy", "rules"),
    ("Core: Moves & Combat", 19, 21, "Making moves, taking action, combat, stress, attacking, maps range movement", "rules"),
    ("Core: Conditions & Death", 21, 22, "Conditions, downtime, death, additional rules, leveling up, multiclassing", "rules"),
    # Equipment
    ("Equipment: Weapons Part 1", 23, 25, "Equipment rules, weapon statistics, primary weapon tables with damage dice, traits, ranges, features", "rules"),
    ("Equipment: Weapons Part 2", 26, 28, "More primary weapon tables, secondary weapons, combat wheelchair", "rules"),
    ("Equipment: Armor & Loot", 29, 31, "Armor tables, loot tables, consumables", "rules"),
    # GM Content
    ("GM: Introduction & Guidance", 32, 33, "Running an adventure, GM guidance, core GM mechanics", "rules"),
    ("GM: Mechanics", 34, 36, "GM mechanics continued — fear, difficulty, adversary rules", "rules"),
    # Adversaries
    ("Adversaries: Tier 1 Part 1", 37, 40, "Tier 1 adversary stat blocks — full stat blocks with difficulty, thresholds, HP, stress, attacks, damage dice, features", "adversary"),
    ("Adversaries: Tier 1 Part 2", 41, 44, "Tier 1 adversary stat blocks continued", "adversary"),
    ("Adversaries: Tier 2 Part 1", 45, 47, "Tier 2 adversary stat blocks", "adversary"),
    ("Adversaries: Tier 2 Part 2", 48, 50, "Tier 2 adversary stat blocks continued", "adversary"),
    ("Adversaries: Tier 3", 51, 53, "Tier 3 adversary stat blocks", "adversary"),
    ("Adversaries: Tier 4 Part 1", 54, 55, "Tier 4 adversary stat blocks", "adversary"),
    ("Adversaries: Tier 4 Part 2", 56, 57, "Tier 4 adversary stat blocks continued, environments intro", "adversary"),
    # Campaign Frame
    ("Witherwild Campaign", 57, 59, "The Witherwild campaign frame — overview, communities, NPCs, campaign mechanics", "rules"),
    ("Witherwild (cont)", 60, 60, "Witherwild continued — NPCs and local gods", "rules"),
    # Appendix — Domain Cards
    ("Domain Cards: Arcana", 61, 61, "Arcana domain cards — spells and abilities with level, recall cost, dice values", "domain"),
    ("Domain Cards: Blade", 62, 62, "Blade domain cards — abilities with level, recall cost, dice values", "domain"),
    ("Domain Cards: Bone & Codex", 63, 63, "Bone and Codex domain cards", "domain"),
    ("Domain Cards: Codex (cont)", 64, 64, "Codex domain cards continued — grimoires and spells", "domain"),
    ("Domain Cards: Grace", 65, 65, "Grace domain cards — spells and abilities", "domain"),
    ("Domain Cards: Midnight", 65, 66, "Midnight domain cards — spells and abilities", "domain"),
    ("Domain Cards: Sage", 66, 67, "Sage domain cards — spells and abilities", "domain"),
    ("Domain Cards: Splendor & Valor", 67, 68, "Splendor and Valor domain cards", "domain"),
]

# -- Prompts -----------------------------------------------------------------

EXTRACT_SYSTEM = """\
You are an expert at extracting structured data from tabletop RPG rulebooks.
You will be shown screenshots of pages from the Daggerheart System Reference Document (SRD).
Your job is to extract every distinct entry visible on these pages.

Return a JSON array of objects, each with:
- "name": the entry's title/name exactly as printed
- "description": the COMPLETE text of the entry, preserving all game mechanics, stats, and flavor text EXACTLY as written

CRITICAL RULES:
1. VERBATIM TRANSCRIPTION ONLY. Copy text character for character from the image. Do NOT paraphrase, rephrase, or summarize.
2. NEVER GUESS OR FILL IN FROM MEMORY. Read ONLY what is in the image. Your training data may have different values.
3. DOUBLE-CHECK ALL DICE VALUES: d4, d6, d8, d10, d12, d20 — read each digit carefully from the image.
4. DOUBLE-CHECK ALL NUMBERS: damage values, recall costs, levels, ranges, thresholds, HP, stress, attack bonuses, difficulty.
5. For domain cards: include the level, type (spell/ability/grimoire), recall cost, and full card text.
6. For stat blocks: include ALL stats (Difficulty, Thresholds, HP, Stress, ATK, damage, features) exactly as printed.
7. For class/ancestry/community entries: include ALL features, abilities, subclass options.
8. For weapon/armor/loot tables: extract each item as a separate entry with all columns.
9. Extract EVERY entry visible on the pages. Do not skip any.
10. If an entry spans across pages, combine it into one complete entry.
11. Do NOT include page numbers, headers/footers, or decorative text as entries.
12. Return ONLY the JSON array, no other text or markdown fencing."""

VERIFY_SYSTEM = """\
You are a TTRPG data verification agent. You will receive page images AND a JSON extraction produced from those images.
Your ONLY job is to compare the extracted data against the images and find errors.

FOCUS AREAS (highest priority first):
1. DICE EXPRESSIONS: d4, d6, d8, d10, d12, d20 — look at each digit in the image carefully.
2. NUMERICAL VALUES: damage numbers, recall costs, levels, ranges, thresholds, HP, stress, attack bonuses, difficulty
3. STAT BLOCK ACCURACY: verify ALL stats match the image exactly
4. MISSING TEXT: Are any sentences, phrases, or words missing?
5. EXTRA TEXT: Was anything hallucinated that isn't on the page?
6. NAMES: Are entry names spelled exactly as printed?

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
    doc = fitz.open(SRD_PDF)
    images = []
    for page_num in range(page_start - 1, min(page_end, doc.page_count)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=DPI)
        img_bytes = pix.tobytes("png")
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
    if not corrections:
        return entries
    for fix in corrections:
        for entry in entries:
            if entry["name"].lower().strip() == fix["entryName"].lower().strip():
                if fix["wrong"] in entry["description"]:
                    entry["description"] = entry["description"].replace(fix["wrong"], fix["corrected"])
                    print(f"    [FIXED] {entry['name']}: '{fix['wrong']}' -> '{fix['corrected']}' ({fix.get('reason', 'no reason given')})")
                elif fix["wrong"] in entry.get("name", ""):
                    entry["name"] = entry["name"].replace(fix["wrong"], fix["corrected"])
                    print(f"    [FIXED NAME] '{fix['wrong']}' -> '{fix['corrected']}' ({fix.get('reason', 'no reason given')})")
                else:
                    print(f"    [SKIP] Could not find '{fix['wrong'][:50]}...' in {entry['name']}")
                break
    return entries


# -- Progress ----------------------------------------------------------------

PROGRESS_FILE = OUTPUT_DIR / "srd_progress.json"


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"completed_sections": [], "entries": []}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)


# -- Main --------------------------------------------------------------------

def main():
    resume = "--resume" in sys.argv

    if not API_KEY:
        print("ERROR: Set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    print("=" * 60)
    print("Daggerheart SRD — Full Extraction with Two-Pass Verification")
    print(f"Model: {MODEL} | DPI: {DPI} | Pages: 68")
    print(f"Resume: {resume}")
    print("=" * 60)

    total_pages = sum(end - start + 1 for _, start, end, _, _ in SECTIONS)
    print(f"\nSections: {len(SECTIONS)} | Pages: {total_pages} | API calls: ~{len(SECTIONS) * 2}")
    print(f"Estimated time: {len(SECTIONS) * 30 // 60} - {len(SECTIONS) * 45 // 60} minutes\n")

    progress = load_progress() if resume else {"completed_sections": [], "entries": []}
    all_entries = progress.get("entries", [])
    seen_names = {e["name"].lower().strip() for e in all_entries}
    completed = set(progress.get("completed_sections", []))

    for i, (name, start, end, hint, category) in enumerate(SECTIONS):
        section_key = name

        if resume and section_key in completed:
            print(f"[{i + 1}/{len(SECTIONS)}] {name} — SKIPPING (already done)")
            continue

        print(f"\n[{i + 1}/{len(SECTIONS)}] {name} (pp. {start}-{end})")

        images = render_pages(start, end)

        print(f"  Pass 1: Extracting...")
        entries = extract_pass(images, hint)
        print(f"  -> {len(entries)} entries extracted")

        if entries:
            print(f"  Pass 2: Verifying...")
            corrections = verify_pass(images, entries)
            if corrections:
                print(f"  -> {len(corrections)} corrections found")
                entries = apply_corrections(entries, corrections)
            else:
                print(f"  -> All values verified correct")

        new_count = 0
        for entry in entries:
            key = entry["name"].lower().strip()
            if key not in seen_names:
                seen_names.add(key)
                entry["category"] = category
                all_entries.append(entry)
                new_count += 1

        print(f"  -> {new_count} new unique entries (total: {len(all_entries)})")

        completed.add(section_key)
        progress["completed_sections"] = list(completed)
        progress["entries"] = all_entries
        save_progress(progress)

        if i < len(SECTIONS) - 1:
            time.sleep(1)

    # Generate final output
    print(f"\n{'=' * 60}")
    print(f"EXTRACTION COMPLETE: {len(all_entries)} total entries")

    # Generate IDs and save as daggerheart_srd.json
    def slugify(name: str) -> str:
        import re
        slug = name.lower().strip()
        slug = re.sub(r"[^a-z0-9]+", "-", slug)
        slug = slug.strip("-")
        return f"srd-{slug}"

    seen_ids = set()
    for entry in all_entries:
        base_id = slugify(entry["name"])
        entry_id = base_id
        counter = 2
        while entry_id in seen_ids:
            entry_id = f"{base_id}-{counter}"
            counter += 1
        seen_ids.add(entry_id)
        entry["id"] = entry_id

    srd_path = OUTPUT_DIR / "daggerheart_srd.json"
    with open(srd_path, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, indent=2, ensure_ascii=False)
    print(f"Saved SRD data to: {srd_path}")

    # Category breakdown
    from collections import Counter
    cats = Counter(e["category"] for e in all_entries)
    print(f"\nCategory breakdown:")
    for cat, count in cats.most_common():
        print(f"  {cat}: {count}")

    # Clean up progress
    print(f"\nDone! SRD extraction complete.")


if __name__ == "__main__":
    main()
