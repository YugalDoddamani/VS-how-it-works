# Reel Rendering

How `script.md` becomes a watchable 45-second video, and exactly how much of that
chain exists today.

```
 script.md            compile-reel.mjs        render.js            render-reel.mjs
 ──────────           ────────────────        ─────────            ───────────────
 23 shot rows   →     reel.json         →     drawFrame()    →     1350 JPEGs → ffmpeg → .mp4
 (authored)           (validated)             (pure function)      (Node, no browser)
```

One authored source, one generated contract, one frame function. The preview you
scrub in a browser and the frames that become the MP4 are the *same* function, so
a review is never a mock-up of the film.

---

## 1. Compile

```bash
node tools/compile-reel.mjs          # every reel
node tools/compile-reel.mjs r03      # one
node tools/compile-reel.mjs --check  # validate, write nothing
```

Reads `series/<series>/reels/<slug>/script.md` and writes `reel.json` beside it
(git-ignored; regenerate it).

What it does, and what it refuses to do:

| It does | It refuses |
| --- | --- |
| Parses the 9-column shot table | Guess a lens if the cell has none |
| Converts seconds to frames at 30 fps | Accept a table that does not add up to the header |
| Reads the `Transitions` row for the one non-hard cut | Allow two whips in a reel |
| Maps `Background` text to a world painter id | Let the stage read markdown |
| Builds the mouth schedule per shot from the VO | Invent words that are not on the page |

`reel.json` per shot: `start`, `frames`, `code`, `lens`, `framing`, `placement`,
`world`, `graphic`, `vo`, `transition`, `caption{text, emphasis}`, and
`mouth{offset, schedule}`.

## 2. Draw

`src/stage/reel/` is the whole stage. It is dependency-free and runs anywhere a
2D canvas exists:

| File | What it owns |
| --- | --- |
| `palette.js` | the colour system from `docs/04`, the three font stacks |
| `iso.js` | projection, iso boxes, shelves, tagged boxes, chips, cards, switches |
| `worlds.js` | one painter per shot background (`shelf_one`, `incognito`, `flat_grid`, …) |
| `nao.js` | the 12 viseme sprites, placement, idle motion, the chest fade |
| `chrome.js` | badge, caption card, progress hairline, review guides |
| `render.js` | `drawFrame(ctx, reel, frame)` — pure in (reel, frame) |

**Purity.** No clock, no random, no audio. `drawFrame(ctx, reel, 700)` twice
produces the same pixels, which is why the tests can assert it and why a re-render
is not a re-design.

### The character

Twelve sprites cut from `assets/nao/talking-head-sheet-1k.webp` by
`tools/build-nao-sprites.py`, background flood-filled to transparency, trimmed and
normalised to 420 px.

The sheet is cropped at the chest, so the sprite is masked with a vertical fade
from just under the choker (`nao.js: maskedSprite`). Without it the crop edge
reads as a hard cut across her collarbones — with it, she dissolves into the
paper and the caption card never has to hide a seam.

Mouth: the compiled schedule is a list of *changes*; `visemeAt(shot, frame)` binary
searches it and blends over two frames. Full 12 visemes in `CU`/`MCU`/`ECU`, reduced
in the wide shots.

### The world

Each shot names a `world` id. A painter draws the full 1080×1920 frame and leaves
the bottom band clear for the caption card. Everything is drawn from the same
projection, so props share one vanishing point and one line weight.

Two house rules the painters follow:

1. **Never behind the caption.** Anything important lives above `y = 1450`.
2. **Never under her corner overlay.** When a shot is `CORNER`, the world's focal
   point moves left of `x ≈ 700`; the overlay is 600 px tall in the bottom-right.

## 3. Encode

```bash
node tools/render-reel.mjs --reel r03 --stills 0,240,700 --out /tmp/stills
node tools/render-reel.mjs --reel r03 --all --mp4 .../output/r03-....mp4
```

Node, no browser: `@napi-rs/canvas` (Skia) drives the same `drawFrame`, and
ffmpeg encodes the frames as they are produced (`libx264`, `veryfast`, CRF 18,
`yuv420p`, `+faststart`).

Measured on this machine: **~16.5 frames/s, 1350 frames in 81 s, 6.2 MB for 45 s**
at 1080×1920/30.

Fonts come from `preview/fonts` (Inter, Source Serif 4, IBM Plex Mono, all
OFL-licensed and vendored so the build is offline and deterministic).

## 4. Review

```bash
node tools/preview-server.mjs      # http://localhost:4173
```

- **Player** (`/`) — scrub, step a frame (`shift + ←/→`), click a shot, toggle
  guides, export the current frame as PNG. The "final cut" bar links the MP4 if it
  has been rendered and says how to make it if it has not.
- **Frame** (`/preview/frame.html?reel=…&frame=700`) — one frame, no chrome. This
  is what a screenshot tool loads.

## Tests

```bash
npm test    # 28 tests
```

The six reel tests run the real renderer against a recording 2D context: every
frame draws without throwing, a frame is deterministic, every shot draws its
caption, the character is inside the frame on every shot that has her, and the
grammar survives compilation (3+ `CORNER`, 4+ `INSERT`, one whip, opens on `POV`).

They prove the reel renders. They cannot prove it looks good — that is what the
preview is for, and it needs a human.

## One dead end, recorded

The first attempt screenshotted frames from a headless browser (`playwright-core` +
`@sparticuz/chromium`). It does not work here: the bundled chromium needs
`libnss3` / `libnspr4`, which this image does not have, so it exits 127 before
loading a page. The Node canvas path replaced it, and is better anyway — it is
faster (16.5 fps vs a page load per frame), needs no browser, and removes the
possibility of the preview and the film diverging. `playwright-core` and
`@sparticuz/chromium` are still in `package.json` for the future `studio render`
verb; nothing uses them today.

## What is still missing

- **Sound.** The scripts specify a bed, two silences and per-cut ticks; none of it
  is synthesised yet. The MP4 is silent on purpose rather than pretending.
- **A CLI verb.** `studio render` still does not exist; the two scripts above are
  the interface for now.
- **Batch.** One reel at a time. `--all` renders every frame of one reel, not every
  reel.
- **Full-body poses.** Only talking heads are cut. A `CORNER` shot with the
  pointing or presenting pose needs sprites from `04-full-body-poses.webp`, which
  is a different crop job.
