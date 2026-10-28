# Assets

Everything the stage draws or plays, in one place. Nothing here is fetched over
the network at build or render time, so a render is offline and byte-identical
across machines.

**What belongs here:** anything reusable across reels and episodes — fonts,
character art, props, sound cues.
**What does not:** anything generated *for one reel* — its `reel.json`, its
voice-over clips, its MP4, its key-frame sheet. Those live next to the reel, in
`series/<series>/reels/<slug>/output/`, because they are results, not inputs.

```
assets/
├── fonts/                  6 woff2 faces, registered by the renderer
├── nao/
│   ├── poses/              the rig: 12 whole figures + its build output
│   ├── reference/          the model sheet, split by section
│   ├── visemes/            12 mouth shapes, cropped (spec, not rendered today)
│   ├── model-sheet.webp    the design authority
│   └── talking-head-sheet-1k.webp
├── sfx/                    10 synthesised sound cues
└── world/                  bitmap props for the worlds (the sneaker)
```

---

## fonts/

Six faces, Latin subset, bundled under the SIL Open Font License 1.1. The
renderer registers them by path in `tools/render-reel.mjs` (`registerFonts()`);
nothing loads from a CDN.

| File | Family | Weight | Use |
| --- | --- | --- | --- |
| `inter-latin-400-normal.woff2` | Inter | 400 | captions at rest, body copy |
| `inter-latin-500-normal.woff2` | Inter | 500 | meta lines |
| `inter-latin-600-normal.woff2` | Inter | 600 | captions, labels, chips |
| `inter-latin-700-normal.woff2` | Inter | 700 | titles, prices, the badge |
| `source-serif-4-latin-400-normal.woff2` | Source Serif 4 | 400 | pull quotes and the spec card |
| `ibm-plex-mono-latin-500-normal.woff2` | IBM Plex Mono | 500 | numbers, RFC references |

Inter has no emoji glyphs: an emoji in a caption renders as a tofu box. Do not
put one in a script.

---

## nao/poses/ — the rig

The character is drawn as **whole figures**, never as a head composited onto a
body. Twelve poses, each with its own face:

| Pose | Face | Called for by lines like |
| --- | --- | --- |
| `neutral` | calm, closed mouth | a plain statement |
| `presenting` | warm, open | offering the thing on screen |
| `openhands` | reassuring, both hands in | "blocking them rarely breaks anything" |
| `explaining` | friendly, one palm up | the default walk-through |
| `pointing` | focused, finger out | "look at this one" |
| `thinking` | puzzled, hand at chin | "how does it know?" |
| `skeptical` | one brow up, half-smile, arms folded | "that is not what you think" |
| `onefinger` | bright, eyebrows up | "one small file" |
| `deadpan` | flat stare | "yes, really" |
| `warm` | eyes crinkled, generous smile | giving the other side its due |
| `nope` | flat mouth, palm out | "incognito does not stop this" |
| `fingerheart` | eyes shut, delighted | the sign-off |

| Path | What |
| --- | --- |
| `src-<pose>.png` | **source art**, generated, white background, arbitrary size |
| `<pose>.png` | **built sprite**, keyed, 900 × 1500, feet and head aligned |
| `poses.json` | canvas size, anchor (`headWidth`), per-pose geometry |

### How the sprites are built

```bash
python3 tools/build-nao-poses.py            # writes <pose>.png + poses.json
python3 tools/build-nao-poses.py --report   # geometry only
```

1. **Key** — flood-fill the background from the border, so white *inside* the
   drawing (the sneakers, the tee) survives.
2. **Scale on the head, not the figure** — every drawing is resized until her
   head is 212 px wide. An arm raised adds 40 px of canvas height; normalising
   by height would make her face breathe in and out between cuts.
3. **Align** — feet on `y = 1460`, head centre on `x = 450`, measured from the
   alpha channel (top 11 %, central run — the raised pointing arm is excluded).

### Provenance

Generated from the design in `nao/model-sheet.webp` with an image model on
2026-10-28, one drawing per pose, described in a single sentence each with the
previous pose as a style reference. Same character, same outfit (pink tee, dark
shorts, sneakers), same proportions across all twelve. To re-draw one, keep the
prompt's outfit and proportions block identical and change only the pose and
face sentence — then rebuild and check `poses.json` still reports `head 212`.

---

## nao/ — the design authority

| Path | What it is |
| --- | --- |
| `model-sheet.webp` | character sheet: turnaround, 15 expressions, 18 hand poses, 9 body poses, 7 outfits, accessories |
| `reference/01…05-*.webp` | the same sheet split by section, for fast lookup |
| `talking-head-sheet-1k.webp` | 12 visemes |
| `visemes/*.webp` | those visemes cropped to 256 × 256 and named |

The sheets define **who she is**: pink bob, black headband, black choker, gold
eyes, pink tee, dark shorts. A new drawing that changes any of those is a new
character, not a new pose.

`visemes/` is currently specification only — the reel rig has no mouth to swap
(see `docs/11-lip-sync.md` for why, and what it does instead).

---

## sfx/ — the sound design

Ten cues, synthesised from maths, 44.1 kHz mono 16-bit WAV:

```bash
python3 tools/make-sfx.py            # rebuild all ten
python3 tools/make-sfx.py --report   # lengths only
```

| Cue | Length | Sounds like | Used for |
| --- | --- | --- | --- |
| `whoosh` | 0.26 s | swept noise, 380 → 2400 Hz | every cut, and harder on the whip |
| `swipe` | 0.18 s | short high sweep | a feed scroll, a card sliding |
| `pop` | 0.13 s | pitched blip with a click | a card or chip arriving |
| `click` | 0.07 s | filtered transient | a toggle, a browser blocking |
| `tick` | 0.03 s | tiny high click | text landing, a number |
| `thud` | 0.34 s | low body + slap | the stamp |
| `paper` | 0.38 s | modulated high noise | a note or a spec card opening |
| `riser` | 0.55 s | rising sine + noise | into the save frame |
| `chime` | 1.10 s | three partials, decaying | the recap, the sign-off |
| `warm` | 1.60 s | soft three-note pad | under the sign-off only |

Where each one fires is **not** in this folder: it is
`tools/audio-cues.mjs`, expressed as a fraction of the shot, so re-timing a
script moves the sound with it.

The random seed is fixed (`RNG = default_rng(20261028)`), so rebuilding produces
the same bytes.

---

## world/ — bitmap props

| Path | What |
| --- | --- |
| `shoe.png` | the sneaker from the hook, keyed, 1292 × 654 |
| `shoe-src.png` | the generated original, white background |

One prop, and one lesson: a shoe built from beziers reads as a bread roll,
because the proportions are anatomy and the anatomy was wrong. Vector suits the
isometric world; a known silhouette wants an illustration.

Loaded by hosts through `setWorldAssets()` (`src/stage/reel/worlds.js`) and drawn
by `drawShoe()`. `oneShoe()` remains as the vector fallback, so the stage still
renders in a test with no assets injected.

---

## Adding an asset

1. Confirm the licence permits commercial use and redistribution.
2. Put it in the right folder, and record it in the table above.
3. Prefer a build script over a hand-edited file (see `build-nao-poses.py`,
   `make-sfx.py`): the input stays reproducible.
4. Load it locally. Never over the network.
5. Re-run `node --test "test/**/*.test.js"` and re-render one still before
   committing.
