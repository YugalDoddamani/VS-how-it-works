#!/usr/bin/env python3
"""
check_content.py - validate the content workbook's CSV source.

This is the Python twin of the `sheet:check` command described in
docs/08-content-sheet.md. It exists now, before the renderer, so the five
written episodes can be held to the rules the documents promise. When
`src/lib/plan.js` lands it must agree with this file, and `npm test` should
assert both agree on every fixture.

Why Python: writing .xlsx needs a dependency (openpyxl) and Node has no
stdlib writer. The sheet is an input to the pipeline, not part of it, so the
only Python in this repository lives in tools/ and never runs during a render.

Usage:
    python3 tools/check_content.py            # check, print issues
    python3 tools/check_content.py --strict   # treat warnings as errors
"""

import argparse
import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_DIR = ROOT / "content" / "csv"
SERIES_DIR = ROOT / "series"

# Shot grammar, mirrored from docs/12-reels-format.md.
SHOT_CODES = {"ISO-WIDE", "TOP-DOWN", "MCU", "CU", "ECU", "INSERT", "CORNER",
              "SPLIT", "OTS", "POV", "RECAP"}
LENSES = {"14mm", "24mm", "35mm", "50mm", "85mm", "100mm"}
REEL_MIN_FRAMES, REEL_MAX_FRAMES = 1350, 1800   # 45 s .. 60 s at 30 fps
REEL_MIN_SHOTS, REEL_MAX_SHOTS = 22, 27
MAX_VO_WORDS = 14
FPS = 30

# Beats that state a fact and therefore need a Sources row (docs/08).
FACTUAL_TYPES = {"explain", "diagram", "step-by-step", "compare", "myth-check", "analogy"}

TABS = [
    "episodes",
    "beats",
    "props",
    "paths",
    "character",
    "sources",
    "publish",
    "vocab",
]


def read(name):
    path = CSV_DIR / f"{name}.csv"
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def normalise(text):
    return re.sub(r"[^a-z0-9' ]+", " ", str(text or "").lower()).strip()


class Report:
    def __init__(self):
        self.items = []

    def error(self, where, message, hint=""):
        self.items.append(("error", where, message, hint))

    def warn(self, where, message, hint=""):
        self.items.append(("warn", where, message, hint))

    def counts(self):
        errors = sum(1 for i in self.items if i[0] == "error")
        return errors, len(self.items) - errors

    def print(self):
        errors, warns = self.counts()
        for severity, where, message, hint in self.items:
            tag = "ERROR" if severity == "error" else "warn "
            print(f"  {tag} {where}: {message}")
            if hint:
                print(f"          {hint}")
        return errors, warns


def check(report):
    eps = read("episodes")
    beats = read("beats")
    props = read("props")
    paths = read("paths")
    character = read("character")
    sources = read("sources")
    publish = read("publish")
    vocab = read("vocab")

    # ---------------------------------------------------------------- vocab
    allowed = defaultdict(set)
    for row in vocab:
        if str(row.get("deprecated", "")).upper() == "TRUE":
            continue
        allowed[row["kind"]].add(row["value"])

    def vocab_check(kind, value, where, required=True):
        if not value:
            if required:
                report.error(where, f"{kind} is empty")
            return
        if value not in allowed[kind]:
            close = [v for v in allowed[kind] if v.startswith(value[:4])]
            hint = f"Did you mean: {', '.join(close[:4])}?" if close else ""
            report.error(where, f'{kind} "{value}" is not in Vocab', hint)

    if not eps:
        report.error("Episodes", "no episodes found")
        return

    # ------------------------------------------------------------- episodes
    ids = set()
    for i, ep in enumerate(eps, start=2):
        where = f"Episodes!row{i}"
        eid = ep["episode_id"].lstrip("'")
        if eid in ids:
            report.error(where, f'duplicate episode_id "{eid}"')
        ids.add(eid)
        if not re.fullmatch(r"\d{4}", eid):
            report.error(where, f'episode_id "{ep["episode_id"]}" must be 4 digits and text-formatted')
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", ep["slug"]):
            report.error(where, f'slug "{ep["slug"]}" must be lowercase-hyphenated')
        if not ep["slug"].startswith(eid):
            report.warn(where, "slug should start with the episode_id")
        if len(ep["slug"]) > 60:
            report.error(where, "slug is longer than 60 characters")
        if not ep["question"].strip().endswith("?"):
            report.error(where, "question must end with a question mark")
        if len(ep["question"]) > 90:
            report.warn(where, "question is longer than 90 characters")
        if len(ep["answer_oneliner"]) > 90:
            report.warn(where, "answer_oneliner is longer than 90 characters")
        target = int(ep["target_seconds"])
        if not 45 <= target <= 90:
            report.error(where, f"target_seconds {target} is outside 45-90")
        vocab_check("series", ep["series"], f"{where}.series")
        vocab_check("level", ep["level"], f"{where}.level")
        vocab_check("status", ep["status"], f"{where}.status")

    # ---------------------------------------------------------------- beats
    by_episode = defaultdict(list)
    for i, b in enumerate(beats, start=2):
        where = f"Beats!row{i}"
        eid = b["episode_id"].lstrip("'")
        if eid not in ids:
            report.error(where, f'episode_id "{eid}" has no row in Episodes')
            continue
        by_episode[eid].append((i, b))
        vocab_check("beat_type", b["beat_type"], f"{where}.beat_type")
        vocab_check("camera", b["camera"], f"{where}.camera", required=False)
        vocab_check("gesture", b["gesture"], f"{where}.gesture", required=False)
        vocab_check("expression", b["expression"], f"{where}.expression", required=False)
        vocab_check("transition", b["transition"], f"{where}.transition", required=False)

        raw = b["duration_s"]
        if not re.fullmatch(r"\d+(\.\d)?", str(raw)):
            report.error(f"{where}.duration_s", f'"{raw}" is not a number with at most one decimal')
            continue
        duration = float(raw)
        if not 3.0 <= duration <= 12.0:
            report.error(f"{where}.duration_s", f"{duration}s is outside the 3-12s beat range")

        narration = b["narration"].strip()
        words = len(narration.split())
        if not narration:
            report.error(f"{where}.narration", "is empty")
        if words > 22:
            report.error(f"{where}.narration", f"{words} words, limit is 22")
        sentences = len(re.findall(r"[.!?]", narration))
        limit = 4 if b["beat_type"] == "step-by-step" else 2
        if b["beat_type"] != "recap" and sentences > limit:
            report.error(
                f"{where}.narration",
                f"{sentences} sentences, limit is {limit} for {b['beat_type']}",
            )

        on_screen = b["on_screen_text"].strip()
        if on_screen and len(on_screen.split()) > 6:
            report.error(f"{where}.on_screen_text", f"{len(on_screen.split())} words, limit is 6")
        if on_screen and normalise(on_screen) == normalise(narration):
            report.warn(f"{where}.on_screen_text", "duplicates the narration; the board is a label")

        items = [x.strip() for x in str(b["board_items"]).split(";") if x.strip()]
        for item in items:
            if len(item.split()) > 4:
                report.error(f"{where}.board_items", f'"{item}" is longer than 4 words')
        if b["beat_type"] == "step-by-step" and not 2 <= len(items) <= 4:
            report.error(f"{where}.board_items", "a step-by-step beat needs 2 to 4 steps")
        if b["beat_type"] == "analogy" and len(items) < 2:
            report.error(f"{where}.board_items", "an analogy needs at least 2 items naming the mapping")

        props_used = [x.strip() for x in str(b["props"]).split(";") if x.strip()]
        if len(props_used) > 5:
            report.error(f"{where}.props", f"{len(props_used)} props, limit is 5")
        for inst in props_used:
            prop_id = inst.split("@")[0]
            vocab_check("prop_id", prop_id, f"{where}.props")
            if "@" in inst:
                slot = inst.split("@")[1]
                if not re.fullmatch(r"[A-F][1-6]", slot):
                    report.error(f"{where}.props", f'slot "{slot}" must be A1 to F6')
        if b["beat_type"] == "analogy" and len(props_used) < 2:
            report.error(f"{where}.props", "an analogy needs at least 2 props on stage")
        if b["beat_type"] == "packet-trip":
            if len(props_used) < 2:
                report.error(f"{where}.props", "a packet-trip needs a source and a destination prop")
            if not any(str(p["episode_id"]).lstrip("'") == eid and str(p["beat_no"]) == str(b["beat_no"]) for p in paths):
                report.warn(f"{where}.props", "packet-trip has no Paths row; it will draw a straight line")

        emphasis = [x.strip() for x in str(b["emphasis"]).split(";") if x.strip()]
        if len(emphasis) > 2:
            report.error(f"{where}.emphasis", f"{len(emphasis)} tokens, limit is 2")
        for token in emphasis:
            if token.lower() not in narration.lower():
                report.error(f"{where}.emphasis", f'"{token}" does not appear in the narration')

    # ----------------------------------------------- per-episode arithmetic
    for ep in eps:
        eid = ep["episode_id"].lstrip("'")
        rows = sorted(by_episode[eid], key=lambda pair: int(pair[1]["beat_no"]))
        if not rows:
            report.error(f"Episodes!{eid}", "has no beats")
            continue
        numbers = [int(b["beat_no"]) for _, b in rows]
        expected = list(range(1, len(numbers) + 1))
        if numbers != expected:
            report.error(f"Beats[{eid}]", f"beat_no must be contiguous from 1, got {numbers}")
        total = sum(float(b["duration_s"]) for _, b in rows)
        target = int(ep["target_seconds"])
        drift = abs(total - target) / target * 100
        if drift > 15:
            report.error(
                f"Episodes!{eid}.target_seconds",
                f"beats total {total:.1f}s vs target {target}s ({drift:.0f}% drift, limit 15%)",
            )
        elif drift > 5:
            report.warn(f"Episodes!{eid}.target_seconds", f"beats total {total:.1f}s vs target {target}s")

        types = [b["beat_type"] for _, b in rows]
        if "hook" not in types:
            report.error(f"Beats[{eid}]", "no hook beat")
        if "recap" not in types and "outro" not in types:
            report.error(f"Beats[{eid}]", "no recap or outro beat")
        run = 1
        for i in range(1, len(types)):
            run = run + 1 if types[i] == types[i - 1] else 1
            if run == 4:
                report.warn(f"Beats[{eid}]", f"4 beats in a row are {types[i]}; vary the type")
        first = rows[0][1]
        if first["beat_type"] != "hook":
            report.warn(f"Beats[{eid}]", "the episode does not open on a hook")

    # -------------------------------------------------------------- sources
    sourced = defaultdict(int)
    for i, s in enumerate(sources, start=2):
        where = f"Sources!row{i}"
        eid = s["episode_id"].lstrip("'")
        if eid not in ids:
            report.error(where, f'episode_id "{eid}" has no row in Episodes')
        sourced[(eid, str(s["beat_no"]))] += 1
        vocab_check("source_kind", s["kind"], f"{where}.kind")
        if not re.match(r"^https://", s["source_url"]):
            report.error(f"{where}.source_url", "must be an https URL")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s["checked"]):
            report.error(f"{where}.checked", "must be a YYYY-MM-DD date")
        if s["kind"] == "secondary" and not s["quote"].strip():
            report.error(f"{where}.quote", "a secondary source needs a supporting quote")

    for eid, rows in by_episode.items():
        for _, b in rows:
            if b["beat_type"] in FACTUAL_TYPES and not sourced[(eid, str(b["beat_no"]))]:
                report.warn(
                    f"Beats[{eid}:{b['beat_no']}]",
                    f"{b['beat_type']} beat has no Sources row",
                )

    # ------------------------------------------------------- props / paths
    seen_instances = set()
    for i, p in enumerate(props, start=2):
        where = f"Props!row{i}"
        eid = p["episode_id"].lstrip("'")
        key = (eid, p["prop_id"], p["slot"])
        if key in seen_instances:
            report.error(where, f"duplicate prop instance {p['prop_id']}@{p['slot']} for {eid}")
        seen_instances.add(key)
        vocab_check("prop_id", p["prop_id"], f"{where}.prop_id")
        vocab_check("prop_family", p["family"], f"{where}.family", required=False)
        if not re.fullmatch(r"[A-F][1-6]", p["slot"]):
            report.error(f"{where}.slot", f'slot "{p["slot"]}" must be A1 to F6')

    for i, path in enumerate(paths, start=2):
        where = f"Paths!row{i}"
        vocab_check("prop_id", "cable", f"{where}.from_slot", required=False)  # no-op guard
        for field in ("from_slot", "to_slot"):
            if not re.fullmatch(r"[A-F][1-6]", path[field]):
                report.error(f"{where}.{field}", f'must be a slot like C3, got "{path[field]}"')
        if path["role"] not in ("request", "response", "sync"):
            report.error(f"{where}.role", f'unknown role "{path["role"]}"')

    # ------------------------------------------------------------ character
    for i, c in enumerate(character, start=2):
        where = f"Character!row{i}"
        vocab_check("pose", c["pose"], f"{where}.pose", required=False)
        vocab_check("gesture", c["gesture"], f"{where}.gesture", required=False)
        vocab_check("expression", c["expression"], f"{where}.expression", required=False)
        if not re.fullmatch(r"\d+(\.\d)?", str(c["at_s"])):
            report.error(f"{where}.at_s", f'"{c["at_s"]}" is not a number')

    # -------------------------------------------------------------- publish
    if not publish:
        report.warn("Publish", "no publishing rows")
    for i, p in enumerate(publish, start=2):
        where = f"Publish!row{i}"
        eid = p["episode_id"].lstrip("'")
        if eid not in ids:
            report.error(where, f'episode_id "{eid}" has no row in Episodes')
        if len(p["caption"]) > 220:
            report.error(f"{where}.caption", f"{len(p['caption'])} characters, limit is 220")
        tags = [t for t in p["hashtags"].split(";") if t.strip()]
        if not 3 <= len(tags) <= 5:
            report.error(f"{where}.hashtags", f"{len(tags)} hashtags, need 3 to 5")
        for tag in tags:
            if tag.strip().startswith("#"):
                report.error(f"{where}.hashtags", "do not include the # character in the cell")
        if not p["disclosure"].strip():
            report.error(f"{where}.disclosure", "disclosure is required")

    for ep in eps:
        eid = ep["episode_id"].lstrip("'")
        if not any(str(p["episode_id"]).lstrip("'") == eid for p in publish):
            report.warn(f"Publish[{eid}]", "episode has no publishing row")


# ---------------------------------------------------------------------------
# reels
# ---------------------------------------------------------------------------

SHOT_CODE_RE = re.compile(r"^\*\*(.+?)\*\*\s*·\s*(.+?)\s*—\s*(.*)$")
DUR_RE = re.compile(r"^([\d.]+)s$")


def check_reels(report):
    if not SERIES_DIR.exists():
        report.error("series", "no series/ folder")
        return
    seen_outfits = []
    for series_dir in sorted(p for p in SERIES_DIR.iterdir() if p.is_dir()):
        if not (series_dir / "series.md").exists():
            report.warn(f"series/{series_dir.name}", "no series.md")
        if not (series_dir / "reels").exists() and not (series_dir / "episodes").exists():
            report.error(f"series/{series_dir.name}", "has neither reels/ nor episodes/")
    for folder in sorted(SERIES_DIR.glob("*/reels/r[0-9]*")):
        script = folder / "script.md"
        series_slug = folder.parent.parent.name
        if not script.exists():
            report.error(f"series/{series_slug}/reels/{folder.name}", "missing script.md")
            continue
        text = script.read_text(encoding="utf-8")
        where = f"series/{series_slug}/reels/{folder.name}"

        length = re.search(r"\| Length \| \*\*([\d.]+) s\*\* · (\d+) frames", text)
        if not length:
            report.error(where, "cannot read the Length row")
            continue
        seconds, frames = float(length.group(1)), int(length.group(2))
        if not REEL_MIN_FRAMES <= frames <= REEL_MAX_FRAMES:
            report.error(where, f"{seconds}s is outside the 45-60s reel range")
        if abs(frames / FPS - seconds) > 0.05:
            report.error(where, f"stated {seconds}s does not match {frames} frames at 30 fps")

        outfit = re.search(r"\| Outfit \| `([a-z-]+)`", text)
        if not outfit:
            report.error(where, "no Outfit row")
        else:
            seen_outfits.append((folder.name, outfit.group(1)))
        if not (folder.parent.parent / "series.md").exists():
            report.error(where, f"parent series {series_slug} has no series.md")

        rows = []
        for line in text.splitlines():
            line = line.strip()
            if not line.startswith("|"):
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) != 9 or not cells[0].isdigit():
                continue
            num, tin, tout, dur_cell, shot_cell, nao, bg, graphic, vo = cells
            m = SHOT_CODE_RE.match(shot_cell)
            if not m:
                report.error(f"{where} shot {num}", "shot cell is not `**CODE** · lens — framing`")
                continue
            rows.append((num, tin, tout, dur_cell, m.group(1), m.group(2).strip(),
                         m.group(3), nao, bg, graphic, vo))

        if not rows:
            report.error(where, "no shot rows matched the fixed column format")
            continue
        if not REEL_MIN_SHOTS <= len(rows) <= REEL_MAX_SHOTS:
            report.error(where, f"{len(rows)} shots, need {REEL_MIN_SHOTS}-{REEL_MAX_SHOTS}")

        numbers = [int(r[0]) for r in rows]
        if numbers != list(range(1, len(rows) + 1)):
            report.error(where, f"shot numbers are not contiguous: {numbers[:8]}...")

        total = 0.0
        prev_out = 0.0
        for r in rows:
            n, tin, tout, dur, code, lens, framing, nao, _bg, graphic, vo = r
            code = code.strip()
            dm = DUR_RE.match(dur)
            if not dm:
                report.error(f"{where} shot {n}", f'bad duration "{dur}"')
                continue
            if code not in SHOT_CODES:
                report.error(f"{where} shot {n}", f'unknown shot code "{code}"')
            lens = lens.strip().split()[0]  # "100mm macro" -> "100mm"
            if lens not in LENSES:
                report.error(f"{where} shot {n}", f'unknown lens "{lens}"')
            d = float(dm.group(1))
            total += d
            start = int(tin.split(":")[0]) * 60 + float(tin.split(":")[1])
            end = int(tout.split(":")[0]) * 60 + float(tout.split(":")[1])
            if abs(end - start - d) > 0.05:
                report.error(f"{where} shot {n}", f"{tin}→{tout} is not {d}s")
            if abs(start - prev_out) > 0.05:
                report.error(f"{where} shot {n}", f"starts at {tin}, previous shot ended at {prev_out:.1f}s")
            prev_out = end
            if d < 0.9:
                report.error(f"{where} shot {n}", f"{d}s is shorter than the 1.0s floor")
            if d > 3.0:
                report.error(f"{where} shot {n}", f"{d}s is longer than the 3.0s ceiling")
            words = len(vo.split())
            if words > MAX_VO_WORDS:
                report.error(f"{where} shot {n}", f"voice-over is {words} words, limit {MAX_VO_WORDS}")
            if not vo.strip():
                report.error(f"{where} shot {n}", "no voice-over line")
            if len(re.findall(r"[A-Za-z]+", framing)) < 2:
                report.error(f"{where} shot {n}", "framing is not described (needs real direction)")

        if abs(total - seconds) > 0.15:
            report.error(where, f"shot durations total {total:.1f}s but the header says {seconds}s")

        # grammar coverage
        codes = [r[4].strip() for r in rows]
        corners = codes.count("CORNER")
        inserts = codes.count("INSERT")
        if corners < 3:
            report.warn(where, f"only {corners} CORNER shots; the format asks for 3-5")
        if inserts < 4:
            report.warn(where, f"only {inserts} INSERT shots; the mechanism needs 4-7")
        if codes[0] != "POV" and codes[0] != "INSERT":
            report.warn(where, f"reel opens on {codes[0]}; opening on POV or INSERT is the strongest hook")

        # rotation
        if "confirm link" in text:
            count = text.count("confirm link") - 1  # minus the explanatory paragraph
            report.warn(where, f"{count} source link(s) still marked confirm link")

    for i in range(1, len(seen_outfits)):
        if seen_outfits[i][1] == seen_outfits[i - 1][1]:
            report.warn(
                "series",
                f"{seen_outfits[i][0]} repeats the outfit from {seen_outfits[i-1][0]} "
                f"({seen_outfits[i][1]}); the rotation asks for a different look each reel",
            )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="treat warnings as errors")
    args = parser.parse_args()

    report = Report()
    check(report)
    check_reels(report)
    errors, warns = report.print()

    total_beats = len(read("beats"))
    total_eps = len(read("episodes"))
    print()
    print(f"{total_eps} episodes, {total_beats} beats, {len(read('sources'))} sources, "
          f"{len(read('vocab'))} vocab values")
    print(f"{errors} error(s), {warns} warning(s)")
    if errors or (args.strict and warns):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
