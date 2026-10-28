#!/usr/bin/env python3
"""
build-nao-rig.py - build Nao's drawn rig: one body + nine expression heads.

Why this exists
---------------
The first rig was cut from the 1024 px talking-head sheet, which meant a 500 px
head on a 1080 px canvas and no body at all. At that size the face reads as
mush, and there is nothing for the hands, hair or posture to do.

So the art was re-made at working resolution (assets/nao/rig/*.png):
  nao_body_neutral.png   full body, arms down, front, ~1200 px tall
  nao_expr_sheet.png     3x3 expression heads, same character

This script turns those two drawings into a rig the stage can pose:

  assets/nao/rig/body.png            the body, head removed
  assets/nao/rig/heads/<name>.png    nine heads, pre-aligned to the body
  assets/nao/rig/manifest.json       anchors, sizes, and which head is which

The heads are pre-aligned here rather than in the renderer on purpose: alignment
is a one-off geometry problem, and doing it once means every frame is cheap.

Usage:
    python3 tools/build-nao-rig.py            # build the rig
    python3 tools/build-nao-rig.py --report   # print the geometry only
"""

from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RIG = ROOT / "assets" / "nao" / "rig"
BODY_SRC = RIG / "nao_body_neutral.png"
EXPR_SRC = RIG / "nao_expr_sheet.png"

# The nine cells of the expression sheet, in reading order.
# `name` is what the renderer asks for; `eyes` and `mouth` say what it is, so
# the renderer can pick a head from (state) without knowing the sheet's layout.
EXPRESSIONS = [
    {"name": "rest", "eyes": "open", "mouth": "closed", "note": "default, lips together"},
    {"name": "small", "eyes": "open", "mouth": "small", "note": "parted, 'eh'"},
    {"name": "open", "eyes": "open", "mouth": "open", "note": "wide, 'ah' — the loud vowel"},
    {"name": "closed", "eyes": "open", "mouth": "closed", "note": "pressed, 'mmm'"},
    {"name": "mid", "eyes": "open", "mouth": "mid", "note": "mid-word, brows up"},
    {"name": "smile", "eyes": "closed-smile", "mouth": "mid", "note": "happy, eyes closed"},
    {"name": "blink", "eyes": "closed", "mouth": "closed", "note": "blink + neutral"},
    {"name": "half", "eyes": "half", "mouth": "closed", "note": "mid-blink, lids down"},
    {"name": "oh", "eyes": "wide", "mouth": "oh", "note": "surprised, round 'oh'"},
]

WHITE = 246           # a channel at or above this is background
HAIR_BAND = 0.42      # the head is measured in the top 42 % of a crop


# ---------------------------------------------------------------------------
# image helpers
# ---------------------------------------------------------------------------


def key_white(im: Image.Image, tol: int = 6) -> Image.Image:
    """Flood-fill background from every edge and set alpha 0."""
    im = im.convert("RGBA")
    w, h = im.size
    a = np.asarray(im).copy()
    bg = (a[:, :, 0] >= WHITE - tol) & (a[:, :, 1] >= WHITE - tol) & (a[:, :, 2] >= WHITE - tol)

    # flood fill from the border so white *inside* the drawing (highlights) stays
    seen = np.zeros_like(bg)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and bg[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))

    a[seen, 3] = 0
    # soften the cut edge by a pixel so a scaled sprite never shows jaggies
    alpha = Image.fromarray(a[:, :, 3])
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))
    a[:, :, 3] = np.asarray(alpha)
    return Image.fromarray(a)


def trim(im: Image.Image, pad: int = 4) -> Image.Image:
    box = im.getbbox()
    if not box:
        return im
    l, t, r, b = box
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def hair_metrics(im: Image.Image) -> dict:
    """Hair-top, hair-centre-x and hair-width, measured on the alpha channel."""
    a = np.asarray(im)
    alpha = a[:, :, 3] > 24
    ys, xs = np.where(alpha)
    top = int(ys.min())
    band_bottom = top + int((ys.max() - top) * HAIR_BAND)
    band = alpha[top:band_bottom]
    cols = np.where(band.any(axis=0))[0]
    left, right = int(cols.min()), int(cols.max())
    return {
        "hairTop": top,
        "hairLeft": left,
        "hairRight": right,
        "hairWidth": right - left,
        "hairCenter": (left + right) / 2,
        "bottom": int(ys.max()),
    }


def gutters(im: Image.Image, axis: int, threshold: float = 0.985) -> list[tuple[int, int]]:
    """White runs along an axis; used to find the grid of an expression sheet."""
    a = np.asarray(im.convert("RGB"))
    white = (a[:, :, 0] >= 246) & (a[:, :, 1] >= 246) & (a[:, :, 2] >= 246)
    frac = white.mean(axis=1 if axis == 0 else 0)  # 0 -> rows, 1 -> cols
    runs, start = [], None
    for i, v in enumerate(frac):
        if v >= threshold and start is None:
            start = i
        elif v < threshold and start is not None:
            if i - start >= 4:
                runs.append((start, i))
            start = None
    if start is not None and len(frac) - start >= 4:
        runs.append((start, len(frac)))
    return runs


def find_cells(im: Image.Image) -> list[tuple[int, int, int, int]]:
    """Return nine cell boxes, reading order, from the sheet's white gutters."""
    row_g = gutters(im, 0)
    col_g = gutters(im, 1)
    if len(col_g) < 4 or len(row_g) < 4:
        raise SystemExit(f"grid not found: {len(col_g)} column gutters, {len(row_g)} row gutters")

    def bands(g, want):
        b = [(g[i][1], g[i + 1][0]) for i in range(len(g) - 1)]
        b = [x for x in b if x[1] - x[0] > 40]
        return sorted(sorted(b, key=lambda x: x[1] - x[0])[-want:])

    rows = bands(row_g, 3)
    cols = bands(col_g, 3)
    cells = []
    for top, bottom in rows:
        for left, right in cols:
            cells.append((left, top, right, bottom))
    if len(cells) != 9:
        raise SystemExit(f"expected 9 cells, found {len(cells)}")
    return cells


# ---------------------------------------------------------------------------
# body
# ---------------------------------------------------------------------------


def body_head_box(body: Image.Image) -> tuple[int, int, int, int]:
    """The body's own head, as a box: everything above the collar in the top third."""
    m = hair_metrics(body)
    # The head is the widest thing in the upper third; the arms start below it.
    top = m["hairTop"]
    third = top + int((m["bottom"] - top) * 0.30)
    a = np.asarray(body)
    alpha = a[:, :, 3] > 24
    band = alpha[top:third]
    cols = np.where(band.any(axis=0))[0]
    rows = np.where(band.any(axis=1))[0]
    return (
        int(cols.min()),
        top + int(rows.min()),
        int(cols.max()) + 1,
        top + int(rows.max()) + 1,
    )


def remove_head(body: Image.Image, head_box: tuple[int, int, int, int]) -> Image.Image:
    """Erase the body's whole head.

    The head sprite is aligned to this same canvas and covers the neck, so the
    body only needs to keep everything from the collar down. Leaving any of the
    original hair behind shows up as pink ghosts behind the shoulders.
    """
    l, t, r, b = head_box
    a = np.asarray(body).copy()
    # erase everything above the collar; the head sprite covers this region
    a[max(0, t - 4):b + 2, :, 3] = 0
    return Image.fromarray(a)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------


def main() -> int:
    report_only = "--report" in sys.argv
    if not BODY_SRC.exists() or not EXPR_SRC.exists():
        raise SystemExit(f"missing source art in {RIG.relative_to(ROOT)}/")

    body_raw = Image.open(BODY_SRC)
    body = trim(key_white(body_raw), pad=2)

    hb = body_head_box(body)
    print(f"body      {body.width}x{body.height}   head box {hb}")
    print(f"          head height {hb[3] - hb[1]} px, {(hb[3] - hb[1]) / body.height:.0%} of the figure")

    sheet = Image.open(EXPR_SRC)
    cells = find_cells(sheet)
    heads = []
    for meta, box in zip(EXPRESSIONS, cells):
        cell = sheet.crop(box)
        head = trim(key_white(cell), pad=2)
        m = hair_metrics(head)
        heads.append((meta, head, m))
        print(f"  {meta['name']:6s} cell {box}  head {head.width}x{head.height}  hair {m['hairWidth']}px")

    if report_only:
        return 0

    # --- align: scale every head so its hair width matches the body's head ---
    target_w = hb[2] - hb[0]
    target_cx = (hb[0] + hb[2]) / 2
    target_top = hb[1]

    out_heads = RIG / "heads"
    out_heads.mkdir(exist_ok=True)
    placed = []
    for meta, head, m in heads:
        scale = target_w / m["hairWidth"]
        w = max(1, round(head.width * scale))
        h = max(1, round(head.height * scale))
        scaled = head.resize((w, h), Image.LANCZOS)
        sm = hair_metrics(scaled)

        # where this head's hair-top/centre lands once drawn at (0, 0)
        dx = target_cx - sm["hairCenter"]
        dy = target_top - sm["hairTop"]

        canvas = Image.new("RGBA", (body.width, body.height), (0, 0, 0, 0))
        # The head sprite carries its own neck, choker and collar, drawn on the
        # same canvas as the body, so it is simply placed - no fade. Fading here
        # (the first version did) erased the collar and left a visible gap.
        canvas.alpha_composite(scaled, (round(dx), round(dy)))

        name = f"{meta['name']}.png"
        canvas.save(out_heads / name, optimize=True)
        placed.append({
            "name": meta["name"],
            "file": f"heads/{name}",
            "eyes": meta["eyes"],
            "mouth": meta["mouth"],
            "note": meta["note"],
            "scale": round(scale, 4),
            "draw": [round(dx), round(dy)],
        })

    body_out = remove_head(body, hb)
    body_out.save(RIG / "body.png", optimize=True)

    manifest = {
        "generatedBy": "tools/build-nao-rig.py",
        "body": {"file": "body.png", "width": body.width, "height": body.height},
        "anchor": {"x": round(target_cx, 1), "y": target_top, "headWidth": target_w},
        "heads": placed,
        "byEyes": {},
        "byMouth": {},
    }
    for p in placed:
        manifest["byEyes"].setdefault(p["eyes"], p["name"])
        manifest["byMouth"].setdefault(p["mouth"], p["name"])
    (RIG / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    total = sum(p.stat().st_size for p in out_heads.glob("*.png"))
    print(f"\nbody.png + 9 heads ({total / 1024:.0f} KB), manifest.json")
    print(f"anchor: x={target_cx:.0f} y={target_top} headWidth={target_w}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
