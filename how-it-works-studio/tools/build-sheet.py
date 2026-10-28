#!/usr/bin/env python3
"""
build-sheet.py - assemble content/how-it-works.xlsx from content/csv/.

The CSV mirror is canonical: it is what a pull request shows, and it is what
`tools/check_content.py` validates. The workbook is generated from it so the two
can never disagree, and so the workbook is always safe to import into Google
Sheets.

Why Python: writing .xlsx needs a real library (openpyxl). Node has no stdlib
writer, and adding a spreadsheet dependency to the render pipeline for a
build-time convenience is not worth it. This script never runs during a render.

Usage:
    pip install openpyxl
    python3 tools/build-sheet.py
"""

import csv
import sys
from pathlib import Path

try:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
except ImportError:
    sys.exit("openpyxl is required: pip install openpyxl")

ROOT = Path(__file__).resolve().parent.parent
CSV_DIR = ROOT / "content" / "csv"
OUT = ROOT / "content" / "how-it-works.xlsx"

TABS = [
    ("Episodes", "episodes"),
    ("Beats", "beats"),
    ("Props", "props"),
    ("Paths", "paths"),
    ("Character", "character"),
    ("Sources", "sources"),
    ("Publish", "publish"),
    ("Vocab", "vocab"),
]

WIDTHS = {
    "Episodes": [10, 40, 34, 44, 20, 11, 15, 52, 9, 11, 10, 12],
    "Beats": [10, 8, 13, 11, 62, 30, 34, 34, 9, 15, 13, 18, 11, 10, 52],
    "Props": [10, 12, 6, 14, 12, 9, 10, 40],
    "Paths": [10, 8, 10, 10, 11, 10, 9, 10],
    "Character": [10, 8, 7, 20, 15, 14, 9],
    "Sources": [10, 12, 8, 52, 46, 50, 12, 12, 60],
    "Publish": [10, 74, 42, 11, 20, 20, 40, 18],
    "Vocab": [14, 22, 22, 78, 11],
}

README_LINES = [
    ("How It Works Studio - content workbook", 14, True),
    ("", 10, False),
    ("This workbook is the only place an episode is written. Code renders it; the sheet is the truth.", 10, False),
    ("It is generated from content/csv/ by tools/build-sheet.py. Edit the CSVs, or import", 10, False),
    ("this file into Google Sheets, edit there, and pull it back into the CSVs.", 10, False),
    ("", 10, False),
    ("TABS", 12, True),
    ("Episodes    one row per episode. episode_id is TEXT: keep the leading zeros.", 10, False),
    ("Beats       one row per beat, in order. This is the episode. Write seconds, not frames.", 10, False),
    ("Props       optional. Label, colour family, slot and state for a prop.", 10, False),
    ("Paths       optional. Only packet-trip beats need a row.", 10, False),
    ("Character   optional. Mid-beat pose and expression cues for Nao.", 10, False),
    ("Sources     required per claim. A claim without a row does not go on screen.", 10, False),
    ("Publish     caption, hashtags, cover, disclosure and the YouTube title.", 10, False),
    ("Vocab       the controlled vocabulary. Every enum cell is checked against this tab.", 10, False),
    ("", 10, False),
    ("RULES", 12, True),
    ("1. episode_id is text. Format the column as plain text or the leading zeros vanish.", 10, False),
    ("2. duration_s is one decimal with a dot. 4.5, never 4,5.", 10, False),
    ("3. narration is one paragraph, no line breaks. Max 22 words (step-by-step may use 3 sentences).", 10, False),
    ("4. Lists use a semicolon:  Name goes in;Number comes out", 10, False),
    ("5. No merged cells, no formulas in data cells, no line breaks inside cells.", 10, False),
    ("6. python3 tools/check_content.py before every commit. It names the tab, row and column.", 10, False),
    ("7. Never edit projects/<slug>/episode.json. It is generated; fix the sheet.", 10, False),
    ("", 10, False),
    ("CURRENT CONTENTS", 12, True),
    ("5 episodes, 0101 to 0105, each 12 beats and about 76 seconds, status scripted.", 10, False),
    ("No episode has been rendered yet. Nothing in this repository is a finished film.", 10, False),
    ("", 10, False),
    ("Full reference: docs/08-content-sheet.md", 10, True),
]


def main():
    workbook = Workbook()
    workbook.remove(workbook.active)

    readme = workbook.create_sheet("Read me")
    for row_index, (text, size, bold) in enumerate(README_LINES, start=1):
        cell = readme.cell(row=row_index, column=1, value=text)
        cell.font = Font(name="Inter", size=size, bold=bold)
    readme.column_dimensions["A"].width = 108

    header_font = Font(name="Inter", bold=True, size=11, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="5B7FA8")
    body_font = Font(name="Inter", size=10)
    thin = Side(style="thin", color="D9CDBB")
    border = Border(bottom=thin)

    counts = {}
    for tab_name, base in TABS:
        sheet = workbook.create_sheet(tab_name)
        with (CSV_DIR / f"{base}.csv").open(newline="", encoding="utf-8") as handle:
            rows = list(csv.reader(handle))
        widths = {len(r) for r in rows}
        if len(widths) != 1:
            sys.exit(f"{base}.csv has ragged rows: widths {sorted(widths)}")
        for r_index, row in enumerate(rows, start=1):
            for c_index, value in enumerate(row, start=1):
                cell = sheet.cell(row=r_index, column=c_index, value=value)
                if r_index == 1:
                    cell.font = header_font
                    cell.fill = header_fill
                    cell.alignment = Alignment(vertical="center", horizontal="left")
                else:
                    cell.font = body_font
                    cell.border = border
                    cell.alignment = Alignment(vertical="top")
        sheet.freeze_panes = "B2"
        sheet.auto_filter.ref = f"A1:{get_column_letter(len(rows[0]))}{max(len(rows), 2)}"
        for i, width in enumerate(WIDTHS.get(tab_name, [16] * len(rows[0])), start=1):
            sheet.column_dimensions[get_column_letter(i)].width = width
        sheet.row_dimensions[1].height = 22
        counts[tab_name] = len(rows) - 1

    workbook.save(OUT)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)")
    for name, count in counts.items():
        print(f"  {name:<10} {count:>4} data rows")


if __name__ == "__main__":
    main()
