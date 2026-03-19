"""Re-scan ALL Daggerheart categories with two-pass verification.

Scans class features, rules, adversaries, and environments from the
Daggerheart Core Book PDF, then compares against the current daggerheart.json
database to find differences.

Usage:
    python rescan_all.py                  # Scan all categories
    python rescan_all.py --category class_features
    python rescan_all.py --category adversaries
    python rescan_all.py --category rules
    python rescan_all.py --resume         # Resume from last completed section
"""

import argparse
import base64
import json
import os
import sys
import time
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
DPI = 200

# -- Section Definitions -----------------------------------------------------
# Each section: (name, start_page, end_page, hint, category_in_db)
# Keep page ranges small (2-4 pages) for accurate extraction.

CLASS_FEATURES_SECTIONS = [
    # Classes
    ("Class: Bard", 29, 30, "Bard class description, subclasses (Troubadour, Wordsmith), hope feature, foundation features, spellcast trait, class features", "class features"),
    ("Class: Druid", 31, 33, "Druid class description, subclasses, beastform rules, hope feature, foundation features, class features", "class features"),
    ("Class: Druid (cont)", 34, 36, "Druid continued — beastform cards, wildtouch forms, subclass features", "class features"),
    ("Class: Guardian", 37, 38, "Guardian class description, subclasses, hope feature, foundation features, class features", "class features"),
    ("Class: Ranger", 39, 40, "Ranger class description, subclasses, hope feature, companion rules, foundation features", "class features"),
    ("Class: Ranger (cont)", 41, 42, "Ranger continued — companion stat blocks, subclass features, class features", "class features"),
    ("Class: Rogue", 43, 44, "Rogue class description, subclasses, hope feature, foundation features, class features", "class features"),
    ("Class: Seraph", 45, 46, "Seraph class description, subclasses, hope feature, foundation features, class features", "class features"),
    ("Class: Sorcerer", 47, 48, "Sorcerer class description, subclasses, hope feature, foundation features, class features", "class features"),
    ("Class: Warrior", 49, 50, "Warrior class description, subclasses, hope feature, foundation features, class features", "class features"),
    ("Class: Wizard", 51, 52, "Wizard class description, subclasses, hope feature, foundation features, class features", "class features"),
    # Ancestry
    ("Ancestry: Clank & Daemon", 54, 57, "Clank and Daemon ancestry descriptions, features, and abilities", "class features"),
    ("Ancestry: Dwarf & Elf", 58, 60, "Dwarf and Elf ancestry descriptions, features, and abilities", "class features"),
    ("Ancestry: Faerie & Faun", 61, 63, "Faerie and Faun ancestry descriptions, features, and abilities", "class features"),
    ("Ancestry: Firbolg & Fungril", 64, 66, "Firbolg and Fungril ancestry descriptions, features, and abilities", "class features"),
    ("Ancestry: Galapa & Giant", 67, 69, "Galapa and Giant ancestry descriptions, features, and abilities", "class features"),
    ("Ancestry: Goblin & Halfling", 70, 71, "Goblin and Halfling ancestry descriptions, features, and abilities", "class features"),
    ("Ancestry: Human & Katari", 72, 73, "Human and Katari ancestry descriptions, features, and abilities", "class features"),
    ("Ancestry: Orc & Ribbet & Simiah", 74, 77, "Orc, Ribbet, and Simiah ancestry descriptions, features, and abilities", "class features"),
    # Community
    ("Community: Highborne & Loreborne", 78, 79, "Highborne and Loreborne community descriptions, features, and abilities", "class features"),
    ("Community: Orderborne & Ridgeborne", 80, 81, "Orderborne and Ridgeborne community descriptions, features, and abilities", "class features"),
    ("Community: Seaborne & Slyborne", 82, 83, "Seaborne and Slyborne community descriptions, features, and abilities", "class features"),
    ("Community: Streetborne & Wanderborne & Wildborne", 84, 87, "Streetborne, Wanderborne, and Wildborne community descriptions, features, and abilities", "class features"),
]

ADVERSARY_SECTIONS = [
    # Adversary rules and types
    ("Adversary Rules", 194, 197, "Using adversaries, adversary breakdown, types, experiences, features — general rules for how adversaries work", "rules"),
    ("Adversary Roles: Bruiser-Minions", 198, 202, "Battle guide, Bruiser, Horde, Leader, Minions — adversary role descriptions with mechanics", "rules"),
    ("Adversary Roles: Ranged-Support", 203, 209, "Ranged, Skulks, Social, Solo, Standard, Support adversary roles — descriptions with mechanics, improvising adversaries, defeated adversaries", "rules"),
    # Tier 1 stat blocks
    ("Adversaries: Tier 1 (Part 1)", 211, 214, "Tier 1 adversary stat blocks — full stat blocks with difficulty, thresholds, HP, stress, attacks, damage dice, and features", "adversary"),
    ("Adversaries: Tier 1 (Part 2)", 215, 218, "Tier 1 adversary stat blocks continued — full stat blocks with all stats, attacks, and features", "adversary"),
    ("Adversaries: Tier 1 (Part 3)", 219, 220, "Tier 1 adversary stat blocks continued — full stat blocks", "adversary"),
    # Tier 2 stat blocks
    ("Adversaries: Tier 2 (Part 1)", 221, 224, "Tier 2 adversary stat blocks — full stat blocks with difficulty, thresholds, HP, stress, attacks, damage dice, and features", "adversary"),
    ("Adversaries: Tier 2 (Part 2)", 225, 228, "Tier 2 adversary stat blocks continued — full stat blocks with all stats, attacks, and features", "adversary"),
    # Tier 3 stat blocks
    ("Adversaries: Tier 3 (Part 1)", 229, 232, "Tier 3 adversary stat blocks — full stat blocks with difficulty, thresholds, HP, stress, attacks, damage dice, and features", "adversary"),
    ("Adversaries: Tier 3 (Part 2)", 233, 234, "Tier 3 adversary stat blocks continued — full stat blocks", "adversary"),
    # Tier 4 stat blocks
    ("Adversaries: Tier 4 (Part 1)", 235, 237, "Tier 4 adversary stat blocks — full stat blocks with difficulty, thresholds, HP, stress, attacks, damage dice, and features", "adversary"),
    ("Adversaries: Tier 4 (Part 2)", 238, 240, "Tier 4 adversary stat blocks continued — full stat blocks with all stats, attacks, and features", "adversary"),
]

RULES_SECTIONS = [
    # Chapter 2: Core Mechanics
    ("Core: Spotlight & Turns", 88, 91, "Flow of the game, the spotlight, on your turn, duality dice — core game mechanics and rules", "rules"),
    ("Core: Evasion, HP, Stress", 92, 93, "Evasion, HP and damage thresholds, stress — core defensive mechanics", "rules"),
    ("Core: Action Rolls", 93, 96, "Action rolls, hope, fear, critical success/failure, example action roll, story is consequence", "rules"),
    ("Core: Special Rolls & Damage", 97, 100, "Special action rolls (group rolls, contests, long-term projects), damage rolls, reaction rolls", "rules"),
    ("Core: Advantage & Combat", 101, 103, "Advantage and disadvantage, battling adversaries, domain cards, conditions", "rules"),
    ("Core: Movement & Maps", 104, 106, "Countdowns, maps range and movement, targets and groups, cover sight and darkness, gold, downtime", "rules"),
    ("Core: Death & Additional", 107, 109, "Death, additional rules, player best practices", "rules"),
    ("Leveling Up", 110, 112, "Leveling up overview, tiers of play, level achievements, choosing advancements, raising damage thresholds, taking domain cards", "rules"),
    # Equipment
    ("Equipment: General & Weapons", 113, 116, "Equipping storing and switching equipment, using weapons, weapon statistics, primary weapon tables", "rules"),
    ("Equipment: Primary Weapons", 117, 120, "Primary weapon tables continued — axes, bows, clubs, daggers, etc. with damage dice and properties", "rules"),
    ("Equipment: Primary Weapons (cont)", 121, 124, "Primary weapon tables continued — more weapons with damage dice and properties", "rules"),
    ("Equipment: Secondary & Armor", 125, 129, "Secondary weapon tables, armor tables — with stats, properties, and mechanics", "rules"),
    ("Loot", 130, 134, "Loot tables and descriptions — magic items, consumables, gold items", "rules"),
    ("Full Example of Play", 135, 140, "Full example of play — demonstration of game mechanics in action", "rules"),
    # Chapter 3: GM Mechanics
    ("GM: Core Guidance", 141, 148, "Introduction to running adventures, core GM guidance — principles and techniques", "rules"),
    ("GM: Mechanics", 149, 154, "Core GM mechanics — making GM rolls, calling for action rolls, making moves", "rules"),
    ("GM: Fear & Difficulty", 155, 160, "Fear mechanics, setting roll difficulty — GM resource management and challenge calibration", "rules"),
    ("GM: Adversary & Class Hope", 161, 165, "Giving advantage/disadvantage, adversary rolls, class hope features, countdowns", "rules"),
    ("GM: Equipment & NPCs", 166, 169, "Gold equipment and loot, running GM NPCs, optional GM mechanics", "rules"),
    ("GM: Session Zero & Safety", 170, 174, "Session zero and safety tools, running a session", "rules"),
    ("GM: Running Sessions", 175, 180, "Running a session continued — scene types, pacing, managing spotlight", "rules"),
    ("GM: Sessions & One-Shots", 181, 185, "Running a session continued, running a one-shot", "rules"),
    ("GM: Campaigns", 186, 193, "Running a campaign — arcs, pacing, long-term play", "rules"),
    # Environments (Chapter 4, second half)
    ("Environments: Rules", 241, 243, "Using environments, environment breakdown, types, features, adapting environments", "rules"),
    ("Environments: Tier 1", 244, 246, "Tier 1 environment stat blocks — with difficulty, features, impulses", "rules"),
    ("Environments: Tier 2", 247, 248, "Tier 2 environment stat blocks — with difficulty, features, impulses", "rules"),
    ("Environments: Tier 3", 249, 250, "Tier 3 environment stat blocks — with difficulty, features, impulses", "rules"),
    ("Environments: Tier 4", 251, 253, "Tier 4 environment stat blocks — with difficulty, features, impulses", "rules"),
]

ALL_CATEGORIES = {
    "class_features": CLASS_FEATURES_SECTIONS,
    "adversaries": ADVERSARY_SECTIONS,
    "rules": RULES_SECTIONS,
}

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
4. DOUBLE-CHECK ALL NUMBERS: damage values, ranges, DCs, costs, levels, HP, stress, thresholds, attack bonuses.
5. For stat blocks: include ALL stats (Difficulty, Thresholds, HP, Stress, ATK, damage, features) exactly as printed.
6. For class/ancestry/community entries: include ALL features, abilities, subclass options, and mechanical text.
7. For rules text: include the full rule description with all mechanical details.
8. Extract EVERY entry visible on the pages. Do not skip any.
9. If an entry spans across pages, combine it into one complete entry.
10. Do NOT include page numbers, chapter headers, or decorative text as entries.
11. For tables (weapons, armor, loot): extract each row as a separate entry with all columns preserved.
12. Return ONLY the JSON array, no other text or markdown fencing."""

VERIFY_SYSTEM = """\
You are a TTRPG data verification agent. You will receive page images AND a JSON extraction produced from those images.
Your ONLY job is to compare the extracted data against the images and find errors.

FOCUS AREAS (highest priority first):
1. DICE EXPRESSIONS: d4, d6, d8, d10, d12, d20 — look at each digit in the image carefully. A "d8" is NOT a "d6".
2. NUMERICAL VALUES: damage numbers, recall costs, levels, ranges, thresholds, HP, stress, attack bonuses, difficulty ratings
3. STAT BLOCK ACCURACY: For adversary/environment entries, verify ALL stats match the image exactly
4. MISSING TEXT: Are any sentences, phrases, or words missing from the descriptions?
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
    doc = fitz.open(PDF_PATH)
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
    """Pass 2: Verify extracted entries against the images."""
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
                    print(f"    [FIXED] {entry['name']}: '{fix['wrong']}' -> '{fix['corrected']}' ({fix.get('reason', 'no reason given')})")
                elif fix["wrong"] in entry.get("name", ""):
                    entry["name"] = entry["name"].replace(fix["wrong"], fix["corrected"])
                    print(f"    [FIXED NAME] '{fix['wrong']}' -> '{fix['corrected']}' ({fix.get('reason', 'no reason given')})")
                else:
                    print(f"    [SKIP] Could not find '{fix['wrong'][:50]}...' in {entry['name']}")
                break
    return entries


# -- Progress Tracking -------------------------------------------------------

PROGRESS_FILE = OUTPUT_DIR / "scan_progress.json"


def load_progress() -> dict:
    """Load scan progress from disk."""
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"completed_sections": [], "entries": []}


def save_progress(progress: dict):
    """Save scan progress to disk."""
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)


# -- Scan Logic --------------------------------------------------------------

def scan_sections(sections: list[tuple], category_label: str, resume: bool = False) -> list[dict]:
    """Scan a list of sections with two-pass verification."""
    progress = load_progress() if resume else {"completed_sections": [], "entries": []}
    all_entries = progress.get("entries", [])
    seen_names = {e["name"].lower().strip() for e in all_entries}
    completed = set(progress.get("completed_sections", []))

    total = len(sections)
    for i, (name, start, end, hint, db_category) in enumerate(sections):
        section_key = f"{category_label}:{name}"

        if resume and section_key in completed:
            print(f"[{i + 1}/{total}] {name} — SKIPPING (already done)")
            continue

        print(f"\n[{i + 1}/{total}] {name} (pp. {start}-{end})")

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

        # Deduplicate and tag category
        new_count = 0
        for entry in entries:
            key = entry["name"].lower().strip()
            if key not in seen_names:
                seen_names.add(key)
                entry["category"] = db_category
                all_entries.append(entry)
                new_count += 1

        print(f"  -> {new_count} new unique entries added (total: {len(all_entries)})")

        # Save progress after each section
        completed.add(section_key)
        progress["completed_sections"] = list(completed)
        progress["entries"] = all_entries
        save_progress(progress)

        # Brief pause between sections to avoid rate limits
        if i < total - 1:
            time.sleep(1)

    return all_entries


# -- Compare -----------------------------------------------------------------

def normalize(text: str) -> str:
    """Normalize whitespace for comparison."""
    return " ".join(text.split())


def compare_with_database(new_entries: list[dict], categories: list[str]) -> dict:
    """Compare re-scanned entries with existing database."""
    with open(DB_PATH, encoding="utf-8") as f:
        db = json.load(f)

    # Get entries from specified categories in current DB
    db_filtered = {
        e["name"].lower().strip(): e
        for e in db
        if e.get("category") in categories
    }

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
        if key in db_filtered:
            db_entry = db_filtered[key]
            old_desc = normalize(db_entry["description"])
            new_desc = normalize(new_entry["description"])
            if old_desc == new_desc:
                report["matched_perfect"].append(new_entry["name"])
            else:
                report["differences"].append({
                    "name": new_entry["name"],
                    "old_description": db_entry["description"],
                    "new_description": new_entry["description"],
                    "category": new_entry.get("category", "unknown"),
                })
        else:
            report["new_only"].append({
                "name": new_entry["name"],
                "description": new_entry["description"],
                "category": new_entry.get("category", "unknown"),
            })

    # Entries in DB but not in new scan
    for key, db_entry in db_filtered.items():
        if key not in new_by_name:
            report["db_only"].append(db_entry["name"])

    return report


# -- Main --------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Re-scan Daggerheart categories")
    parser.add_argument("--category", choices=["class_features", "adversaries", "rules", "all"],
                        default="all", help="Which category to scan")
    parser.add_argument("--resume", action="store_true", help="Resume from last completed section")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: Set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    print("=" * 60)
    print("Daggerheart Full Re-Scan — Two-Pass Verification")
    print(f"Model: {MODEL} | DPI: {DPI} | Verification: ON")
    print(f"Category: {args.category} | Resume: {args.resume}")
    print("=" * 60)

    # Build section list based on category selection
    if args.category == "all":
        sections = []
        for cat_name, cat_sections in ALL_CATEGORIES.items():
            sections.extend(cat_sections)
        category_label = "all"
        db_categories = ["class features", "adversary", "rules"]
    else:
        sections = ALL_CATEGORIES[args.category]
        category_label = args.category
        if args.category == "class_features":
            db_categories = ["class features"]
        elif args.category == "adversaries":
            db_categories = ["adversary", "rules"]  # adversary sections include some rules entries
        else:
            db_categories = ["rules"]

    total_pages = sum(end - start + 1 for _, start, end, _, _ in sections)
    total_api_calls = len(sections) * 2  # 2 passes per section
    print(f"\nSections: {len(sections)} | Pages: {total_pages} | API calls: ~{total_api_calls}")
    print(f"Estimated time: {len(sections) * 30 // 60} - {len(sections) * 45 // 60} minutes")
    print()

    # Scan
    new_entries = scan_sections(sections, category_label, resume=args.resume)
    print(f"\n{'=' * 60}")
    print(f"Total entries extracted: {len(new_entries)}")

    # Save raw re-scan results
    rescan_path = OUTPUT_DIR / f"rescan_{category_label}.json"
    with open(rescan_path, "w", encoding="utf-8") as f:
        json.dump(new_entries, f, indent=2, ensure_ascii=False)
    print(f"Saved re-scan results to: {rescan_path}")

    # Compare
    print(f"\n{'=' * 60}")
    print("Comparing with current database...")
    report = compare_with_database(new_entries, db_categories)

    # Save comparison report
    report_path = OUTPUT_DIR / f"comparison_{category_label}.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

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
        for diff in report["differences"][:20]:  # Show first 20
            print(f"\n  Entry: {diff['name']} [{diff.get('category', '?')}]")
            old_words = diff["old_description"].split()
            new_words = diff["new_description"].split()
            for j, (ow, nw) in enumerate(zip(old_words, new_words)):
                if ow != nw:
                    context_start = max(0, j - 3)
                    context_end = min(len(old_words), j + 4)
                    old_ctx = " ".join(old_words[context_start:context_end])
                    new_ctx = " ".join(new_words[context_start:context_end])
                    print(f"    OLD: ...{old_ctx}...")
                    print(f"    NEW: ...{new_ctx}...")
                    break  # Show first diff only for brevity
        if len(report["differences"]) > 20:
            print(f"\n  ... and {len(report['differences']) - 20} more differences (see full report)")

    if report["new_only"]:
        print(f"\n  Entries in new scan but NOT in current DB: {len(report['new_only'])}")
        for entry in report["new_only"][:10]:
            print(f"    + {entry['name']} [{entry.get('category', '?')}]")
        if len(report["new_only"]) > 10:
            print(f"    ... and {len(report['new_only']) - 10} more")

    if report["db_only"]:
        print(f"\n  Entries in current DB but NOT in new scan: {len(report['db_only'])}")
        for name in report["db_only"][:10]:
            print(f"    - {name}")
        if len(report["db_only"]) > 10:
            print(f"    ... and {len(report['db_only']) - 10} more")

    # Save detailed diff report
    diff_txt_path = OUTPUT_DIR / f"diff_{category_label}.txt"
    with open(diff_txt_path, "w", encoding="utf-8") as f:
        f.write(f"DAGGERHEART {category_label.upper()} — COMPARISON REPORT\n")
        f.write(f"{'=' * 60}\n\n")
        f.write(f"Perfect matches: {len(report['matched_perfect'])}\n")
        f.write(f"Differences: {len(report['differences'])}\n")
        f.write(f"New scan only: {len(report['new_only'])}\n")
        f.write(f"Old DB only: {len(report['db_only'])}\n\n")

        for diff in report["differences"]:
            f.write(f"{'-' * 60}\n")
            f.write(f"ENTRY: {diff['name']} [{diff.get('category', '?')}]\n\n")
            f.write(f"OLD (current DB):\n{diff['old_description']}\n\n")
            f.write(f"NEW (re-scan):\n{diff['new_description']}\n\n")

        if report["new_only"]:
            f.write(f"\n{'=' * 60}\n")
            f.write("NEW ENTRIES (not in current DB):\n\n")
            for entry in report["new_only"]:
                f.write(f"  {entry['name']} [{entry.get('category', '?')}]\n")
                f.write(f"  {entry['description'][:200]}...\n\n")

    print(f"\nFull diff report saved to: {diff_txt_path}")
    print(f"Comparison data saved to: {report_path}")

    # Clean up progress file on successful completion
    if PROGRESS_FILE.exists():
        print(f"\nCleaning up progress file...")
        # Keep it around in case user wants to verify


if __name__ == "__main__":
    main()
