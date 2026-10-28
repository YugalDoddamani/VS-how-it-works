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

Two rigs were tried before this one, and both failed the same way: they cut the
character up. The first was a floating head. The second pasted an expression
head onto a body drawing — two drawings, two canvases, two sets of proportions,
so the shoulders doubled, the neck seam showed, and every mouth change moved her
eyes four pixels.

**The rig is now whole figures and nothing else.** Twelve complete drawings, one
style, one outfit, one set of proportions (`assets/nao/poses/`, built by
`tools/build-nao-poses.py`):

| Pose | Face | Used when the line is |
| --- | --- | --- |
| `neutral` | calm, closed mouth | a plain statement |
| `presenting` | warm, open | offering the thing on screen |
| `openhands` | reassuring | "this is fine, mostly" |
| `explaining` | friendly, engaged | the default walk-through |
| `pointing` | focused | "look at this one" |
| `thinking` | puzzled, hand at chin | "how does it know?" |
| `skeptical` | one brow up, half-smile, arms folded | "that is not what you think" |
| `onefinger` | bright, eyebrows up | "one thing. Just one" |
| `deadpan` | flat stare | "yes, really" |
| `warm` | eyes crinkled, generous smile | giving the other side its due |
| `nope` | flat mouth, palm out | "no, that does not help" |
| `fingerheart` | eyes shut, delighted | the sign-off |

**The pose comes from the script, not from the world.** Each shot cell ends with
a performance note —

> `**CU** · 85mm — Deadpan, flat stare, unimpressed`

— and `compile-reel.mjs` turns that note into `shot.pose` (`poseFor()` in
`compile-reel.mjs`). The world changes when the diagram changes; her face
changes when the line does. A shot with no note falls back to the world table in
`nao.js`, so a reel that never fills the column still renders.

Each figure is keyed, **scaled so her head is the same width in every drawing**
(212 px), and placed so her feet are on one baseline and the centre of her head
is on one column. Scaling on the head and not on the figure is the whole trick:
an arm raised adds 40 px of canvas, and normalising by height would make her
face breathe in and out from cut to cut.

**A pose changes only on a cut.** Within a shot she is one object, animated as a
whole: breathing (±0.7 % vertical on a 3.6 s cycle), a weight shift (±0.55° on
8.3 s, pivoting at her feet), a slow drift, a push-in, and a small nod driven by
the lip-sync schedule's openness — she moves when she speaks. Every other shot
the drawing is mirrored, which is a free second performance of the same pose.

**Framing** is `[head px, top px, centre x]` per placement and size class. A
close-up puts her head at 360 px (head to hip — the caption card covers the rest),
a medium shot at 300, and a wide shot at 258, which is the whole figure with her
feet on the canvas. The close values stop at the hip and not at the collarbone on
purpose: a figure cut at the chest is the floating-head problem with extra steps,
and her hands have to stay in frame, because the hands are the animation.

There is no *within-shot* expression swap. That was a deliberate trade: a rig
that swaps a face mid-shot needs two drawings to agree, and ours never did. The
face now changes the way a shot changes — on the cut — which at one cut every two
seconds is as alive as a flat drawing gets. The lipsync compiler still emits a
schedule per shot (`docs/11`); the rig spends it on the body instead of the face.

### Bitmap props

Vector shapes are right for the isometric world and wrong for anything with a
silhouette an audience already knows. The sneaker in the hook is the example: a
shoe built from beziers reads as a bread roll no matter how many details are
piled on it, because the proportions are anatomy and the anatomy was wrong.
`assets/world/shoe.png` is one illustrated prop, keyed and loaded through
`setWorldAssets()`; `oneShoe()` stays as the vector fallback so the stage still
renders with no assets injected (the tests run that way).

### Sound

The film carries its own soundtrack, built by `tools/mix-audio.mjs`:

| Layer | Source |
| --- | --- |
| Voice-over | one clip per run of shots, placed on the shot it belongs to and nudged to fit its window (`atempo`, capped at ±15 %) |
| Effects | `tools/make-sfx.py` synthesises ten cues from maths; `tools/audio-cues.mjs` says where each one lands |

Every cue is tied to an event in a world — the stamp lands on `thud`, the three
blocked browsers on three `click`s, the recap chips on `pop`s — and is written as
a fraction of its shot, so re-timing the script moves the sound with it. Every
cut gets a quiet whoosh. The sign-off is the only place with a pad under it.

The summing happens in Node, not in ffmpeg: the bundled ffmpeg is from 2018 and
its `amix` divides by the input count, so a sixty-cue mix would come out nearly
silent and duck itself as cues ended.

### Captions

The caption card is burned into the picture. `tools/export-captions.mjs` writes
the same lines as a sidecar `.srt`, one cue per shot, with emphasis words
upper-cased.

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
