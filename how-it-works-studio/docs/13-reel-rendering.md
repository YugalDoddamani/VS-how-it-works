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

The first rig was cut from the 1024 px talking-head sheet: a floating head, no
body, and a face that read as mush once it was scaled to a 1080 px canvas. It was
rebuilt at working resolution (`assets/nao/rig/`, built by
`tools/build-nao-rig.py`):

| Asset | What it is |
| --- | --- |
| `nao_body_neutral.png` | source drawing: full body, arms down, front, ~1300 px |
| `nao_expr_sheet.png` | source drawing: 3×3 of expression heads, same character |
| `rig/body.png` | the body with the head removed, background keyed out |
| `rig/heads/*.png` | nine heads, **pre-aligned** onto the body's neck |
| `rig/manifest.json` | anchors, and which head is which mouth/eye state |

Alignment is a one-off geometry problem, so it happens in Python once and every
frame is cheap: the head is scaled until its hair width matches the body's, then
translated so its hair-top and centre land on the body's anchor. The heads carry
their own neck, choker and collar, so they are simply placed — the first version
faded the neck, which erased the collar and left a visible gap.

**Framing is upper body, not face.** `framingFor(placement, code)` picks from
three sizes per placement: `CU`/`ECU` draw the head at 620 px (head to upper
thigh), `MCU` at 470 px (head to mid-calf), wide shots at 380 px (the whole
figure). Legs running off the bottom of the canvas is the point.

**What moves, per frame:**

| Motion | How |
| --- | --- |
| Breathing | vertical scale ±0.8 % on a 3.6 s cycle |
| Weight shift | ±0.5° body rotation on an 8.3 s cycle |
| Head | ±1.1° rotation and a small offset, **lagged 5 frames** behind the body |
| Hair | the head sprite is drawn in 7 horizontal bands, sheared increasingly towards the chin — the bob swings, the skull does not |
| Mouth | one of five drawn shapes, chosen from the lip-sync schedule's openness |
| Blink | 5-frame cycle every 3.2–4.1 s, seeded per shot so cuts never sync |
| Smile | only on the sign-off, and only in bursts — a two-second closed-eye smile reads as a mannequin |

Everything is a pure function of `(reel, frame)`: no clock, no random, so frame N
is always the same pixels.

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
- **Poses.** The rig has one body: standing, arms down. A `CORNER` shot that
  should be pointing or presenting needs a second body drawing. The nine heads
  swap freely because they all share one neck anchor; bodies will not, so each
  new pose needs its own keyed drawing and its own anchor check.
- **Hands.** No hand sprites are cut. "Hand in frame" shots are still drawn as
  props only.
