#!/usr/bin/env python3
"""
build-nao-poses.py - turn the drawn pose art into whole-figure sprites.

Why this exists
---------------
The previous rig pasted an expression *head* onto a *body* drawing. Two
different drawings, cut from two different canvases, can never line up: the
shoulders doubled, the neck seam showed, and every mouth change made the eyes
jump four pixels. It read as a collage, because it was one.

So the rig is now a set of complete figures, drawn as whole characters in the
same style, the same outfit and the same proportions. Nothing is composited on
top of anything. A pose is swapped only on a cut, never inside a shot, so the
audience never sees two drawings meet.

Inputs  assets/nao/poses/src-<pose>.png    whole figure, flat white background
Outputs assets/nao/poses/<pose>.png        keyed, scaled, aligned to one canvas
        assets/nao/poses/poses.json        the geometry the renderer needs

Alignment: every figure is scaled to the same height, its feet are put on the
same baseline and its head centre on the same column. That is what stops her
from changing size or drifting sideways when a cut changes her pose.

Usage:
    python3 tools/build-nao-poses.py            # build the sprites
    python3 tools/build-nao-poses.py --report   # print the geometry only
"""

from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
POSES = ROOT / "assets" / "nao" / "poses"

# Reading order matters only for the report; the renderer asks by name.
POSE_NAMES = ["neutral", "presenting", "pointing", "thinking", "explaining", "openhands"]

WHITE = 246           # a channel at or above this is background
FIGURE_H = 1280       # every figure is scaled to this height, in px
CANVAS = (900, 1500)  # one canvas for all poses
FEET_Y = 1460         # baseline, in canvas px
HEAD_CX = 450         # head centre column, in canvas px
HEAD_BAND = 0.11      # the head is measured in the top 11 % of the figure (hair only)


# ---------------------------------------------------------------------------
# image helpers
# ---------------------------------------------------------------------------

def key_white(im: Image.Image, tol: int = 6) -> Image.Image:
    """Flood-fill the background from every edge and set alpha 0."""
    im = im.convert("RGBA")
    w, h = im.size
    a = np.asarray(im).copy()
    bg = (a[:, :, 0] >= WHITE - tol) & (a[:, :, 1] >= WHITE - tol) & (a[:, :, 2] >= WHITE - tol)

    # flood fill from the border, so white *inside* the drawing (highlights) stays
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
    alpha = Image.fromarray(a[:, :, 3]).filter(ImageFilter.GaussianBlur(0.7))
    a[:, :, 3] = np.asarray(alpha)
    return Image.fromarray(a)


def trim(im: Image.Image, pad: int = 2) -> Image.Image:
    box = im.getbbox()
    if not box:
        return im
    l, t, r, b = box
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def head_metrics(im: Image.Image) -> dict:
    """Head width and centre column, measured on the alpha channel.

    The width is the *central run* of the head band, not its bounding box: a
    raised pointing arm sits in the same rows as her hair and would otherwise
    be measured as part of her head, which changes how big she is drawn.
    """
    a = np.asarray(im)[:, :, 3] > 24
    ys, _ = np.where(a)
    top, bottom = int(ys.min()), int(ys.max())
    band = a[top:top + int((bottom - top) * HEAD_BAND)]
    widths = band.sum(axis=0)
    total = widths.sum() or 1
    cx = float((np.arange(len(widths)) * widths).sum() / total)

    occupied = band[:, max(0, int(cx) - 1):int(cx) + 2].any(axis=1)
    rows = occupied if occupied.any() else band.any(axis=1)
    central = band[rows]
    covered = np.where(central.any(axis=0))[0]
    # walk out from the centre while the columns stay filled
    col = int(cx)
    left = col
    while left - 1 >= 0 and covered.min() <= left - 1 and central[:, left - 1].any():
        left -= 1
    right = col
    while right + 1 < band.shape[1] and right + 1 <= covered.max() and central[:, right + 1].any():
        right += 1
    return {
        "headWidth": int(right - left + 1),
        "headCx": cx,
        "headTop": top,
        "feetY": bottom,
    }


# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------

def build(report_only: bool = False) -> dict:
    poses = []
    for name in POSE_NAMES:
        src = POSES / f"src-{name}.png"
        if not src.exists():
            raise SystemExit(f"missing source art: {src}")
        figure = trim(key_white(Image.open(src)))
        scale = FIGURE_H / figure.height
        figure = figure.resize(
            (max(1, round(figure.width * scale)), FIGURE_H), Image.LANCZOS
        )
        m = head_metrics(figure)

        canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        x = round(HEAD_CX - m["headCx"])
        y = FEET_Y - figure.height
        canvas.alpha_composite(figure, (x, y))

        entry = {
            "name": name,
            "file": f"{name}.png",
            "width": CANVAS[0],
            "height": CANVAS[1],
            "headWidth": m["headWidth"],
            "headTop": y,
            "feetY": FEET_Y,
            "offsetX": x,
        }
        poses.append(entry)
        if not report_only:
            canvas.save(POSES / f"{name}.png", optimize=True)

    head_width = int(round(float(np.median([p["headWidth"] for p in poses]))))
    manifest = {
        "builtBy": "tools/build-nao-poses.py",
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "figureHeight": FIGURE_H,
        "feetY": FEET_Y,
        "headCx": HEAD_CX,
        "anchor": {"headWidth": head_width},
        "poses": poses,
    }
    return manifest


def main() -> int:
    report_only = "--report" in sys.argv
    manifest = build(report_only)
    print(f"canvas {manifest['canvas']['width']}x{manifest['canvas']['height']}  "
          f"figure {manifest['figureHeight']}  anchor headWidth {manifest['anchor']['headWidth']}")
    for p in manifest["poses"]:
        print(f"  {p['name']:<12} head {p['headWidth']:>3} px  offsetX {p['offsetX']:>4}")
    if report_only:
        print("report only — nothing written")
        return 0
    (POSES / "poses.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {len(manifest['poses'])} poses + poses.json to assets/nao/poses/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
