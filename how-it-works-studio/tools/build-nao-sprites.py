#!/usr/bin/env python3
"""
build-nao-sprites.py - cut Nao's 12 talking-head visemes out of the model sheet.

The talking-head sheet (assets/nao/talking-head-sheet-1k.webp) is a 4x3 grid of
head shots on a white background, one per viseme. The renderer needs them as
transparent PNGs so they can be keyed over the isometric world without a white
box behind her.

This script:
  1. finds the 12 cell boxes by projecting the sheet's pink borders,
  2. crops the interior of each cell,
  3. flood-fills the white background from the edges and makes it transparent,
  4. trims each sprite to its content box and writes a square-ish PNG.

Output: assets/nao/heads/<viseme>.png  (12 files, ~300 px wide)

Deterministic: same sheet in, byte-identical PNGs out. No network, no models.

Usage:
    python3 tools/build-nao-sprites.py            # write the sprites
    python3 tools/build-nao-sprites.py --report   # just print the geometry
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "assets" / "nao" / "talking-head-sheet-1k.webp"
OUT = ROOT / "assets" / "nao" / "heads"

# Reading order of the sheet: row 1 left-to-right, then row 2, then row 3.
VISEMES = ["rest", "A", "E", "I", "O", "U", "W", "MBP", "FV", "L", "SZTD", "CGK"]

WHITE_FLOOR = 244      # a channel at or above this is "near white"
GUTTER_THRESHOLD = 0.985  # a column/row that is this fraction white is a gutter


def runs(flags, min_len=3):
    """Turn a boolean list into [start, end) runs."""
    out, start = [], None
    for i, f in enumerate(flags):
        if f and start is None:
            start = i
        elif not f and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    if start is not None and len(flags) - start >= min_len:
        out.append((start, len(flags)))
    return out


def find_cells(im: Image.Image):
    """Return 12 (left, top, right, bottom) boxes, in sheet reading order.

    The grid is found from its *gutters*, not its borders: a gutter is a column
    or row that is almost entirely white across the grid, while any column that
    crosses a cell is not — her hair alone makes sure of that.
    """
    w, h = im.size
    px = im.load()

    def white(p):
        return p[0] >= 246 and p[1] >= 246 and p[2] >= 246

    y0, y1 = int(h * 0.09), int(h * 0.94)
    x0, x1 = int(w * 0.02), int(w * 0.98)

    cols = [sum(1 for y in range(y0, y1) if white(px[x, y])) / (y1 - y0) for x in range(w)]
    rows = [sum(1 for x in range(x0, x1) if white(px[x, y])) / (x1 - x0) for y in range(h)]

    def gutters(vals, min_len=4):
        return [r for r in runs([v >= GUTTER_THRESHOLD for v in vals], min_len)]

    col_g = gutters(cols)
    row_g = gutters(rows)

    if len(col_g) < 5 or len(row_g) < 5:
        raise SystemExit(
            f"could not find the 4x3 grid: {len(col_g)} column gutters, {len(row_g)} row gutters"
        )

    # Five vertical gutters bracket four cells; the middle three are interior
    # gutters, the outer two are the page margins.
    x_bands = [(col_g[i][1], col_g[i + 1][0]) for i in range(4)]

    # Rows: margin, header gap, then (cell, label-gap) x 3, then bottom margin.
    # Take the three tallest remaining bands as the cell rows.
    y_bands = [(row_g[i][1], row_g[i + 1][0]) for i in range(len(row_g) - 1)]
    tall = sorted(sorted(y_bands, key=lambda b: b[1] - b[0])[-3:])

    cells = []
    for top, bottom in tall:
        for left, right in x_bands:
            cells.append((left, top, right, bottom))
    return cells


def strip_white(im: Image.Image, tol: int = 16) -> Image.Image:
    """Flood-fill near-white from every edge and set alpha 0."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()

    def is_white(x, y):
        r, g, b, a = px[x, y]
        return a > 0 and r >= WHITE_FLOOR - tol and g >= WHITE_FLOOR - tol and b >= WHITE_FLOOR - tol

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_white(x, y) and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_white(x, y) and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_white(nx, ny):
                seen[ny * w + nx] = 1
                q.append((nx, ny))
    return im


def trim(im: Image.Image, pad: int = 6) -> Image.Image:
    box = im.getbbox()
    if not box:
        return im
    left, top, right, bottom = box
    return im.crop(
        (
            max(0, left - pad),
            max(0, top - pad),
            min(im.width, right + pad),
            min(im.height, bottom + pad),
        )
    )


def main() -> int:
    if not SHEET.exists():
        raise SystemExit(f"missing sheet: {SHEET}")

    report_only = "--report" in sys.argv
    sheet = Image.open(SHEET)
    cells = find_cells(sheet)

    if report_only:
        print(f"sheet: {sheet.size[0]}x{sheet.size[1]}")
        for name, box in zip(VISEMES, cells):
            print(f"  {name:5s} {box}")
        return 0

    OUT.mkdir(parents=True, exist_ok=True)
    for name, box in zip(VISEMES, cells):
        cell = sheet.crop(box)
        # The cell has a rounded light border; inset well inside it so the
        # flood fill starts on genuine background, not on the border.
        cell = cell.crop((8, 8, cell.width - 8, cell.height - 8))
        sprite = trim(strip_white(cell))
        # Normalise height so the renderer can scale by height only.
        target_h = 420
        if sprite.height != target_h:
            scale = target_h / sprite.height
            sprite = sprite.resize(
                (max(1, round(sprite.width * scale)), target_h), Image.LANCZOS
            )
        sprite.save(OUT / f"{name}.png", optimize=True)
        print(f"  {name:5s} -> heads/{name}.png  {sprite.width}x{sprite.height}")

    total = sum(p.stat().st_size for p in OUT.glob("*.png"))
    print(f"\n12 sprites, {total / 1024:.0f} KB total, in {OUT.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
