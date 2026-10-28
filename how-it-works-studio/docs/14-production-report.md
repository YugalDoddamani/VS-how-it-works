# Production Report — R03, *Why the ad follows you around.*

> **What this is.** A build report for the first finished reel: every system that
> had to exist to get a 45-second film out of a markdown script, why each one is
> shaped the way it is, and where to reach when you want to change something.
> It is written to be **edited**, not admired. Sections 11 and 12 are the ones to
> read before improvising; section 13 is the list of things this reel does not do.
>
> **Status.** R03 is finished and merged. The rest of the series is written and
> compiled, but not rendered with this pipeline yet.

| | |
| --- | --- |
| Reel | R03 · Why the ad follows you around. |
| Series | Your Data, Explained |
| Runtime | **45.00 s** · 1350 frames · 30 fps |
| Frame | 1080 × 1920 (9:16) |
| Video | h264 High, yuv420p, ~1.1 Mbps |
| Audio | AAC-LC, 44.1 kHz mono, 8 voice clips + 62 effect cues, peak −1.0 dBFS |
| Shots | 23 · average 1.96 s |
| Rendered | `tools/render-reel.mjs` (Skia, no browser) + `tools/mix-audio.mjs` (ffmpeg mux) |
| Render time | ~60 s for 1350 frames (~22 fps) on one sandbox core |

---

## 1. The deliverable

```
series/your-data-explained/reels/r03-why-the-ad-follows-you/
├── script.md                                   the source of truth
├── reel.json                                   compiled (gitignored, regenerable)
└── output/
    ├── r03-why-the-ad-follows-you.mp4          45.00 s, video + audio
    ├── key-frames.jpg                          10-frame contact sheet
    ├── r03-why-the-ad-follows-you.srt          23 caption cues
    ├── vo.json                                 the narration, with words and frames
    └── vo/g1…g8.mp3                            8 narration clips
```

The `.mp4` is committed on purpose. A gitignored render does not survive a fresh
checkout, and "where is the video" should never be a question the repo cannot
answer.

---

## 2. The pipeline, end to end

```
script.md  ──compile-reel──▶  reel.json  ──render-reel──▶  frames ──ffmpeg──▶  silent.mp4
                                  │                                              │
                                  ├──build-nao-poses──▶ assets/nao/poses/*       │
                                  ├──make-sfx────────▶ assets/sfx/*.wav          │
                                  └──audio-cues──────▶ cue list ─┐               │
                                                                 ▼               │
   vo/*.mp3 ────────────────────────────────▶ mix-audio ──▶ mux ──────────────────┘
                                                  └──▶ final.mp4
   reel.json ──export-captions──▶ .srt
```

| Stage | Command | Output |
| --- | --- | --- |
| 0. rig | `python3 tools/build-nao-poses.py` | `assets/nao/poses/{12 poses}.png`, `poses.json` |
| 0. sound | `python3 tools/make-sfx.py` | `assets/sfx/*.wav` |
| 1. compile | `node tools/compile-reel.mjs r03` | `reel.json` (throws on any inconsistency) |
| 2. draw | `node tools/render-reel.mjs --reel r03 --stills 20,700` | JPEG stills |
| 3. encode | `node tools/render-reel.mjs --reel r03 --all --mp4 out.mp4` | silent MP4 |
| 4. mix | `node tools/mix-audio.mjs --reel r03 --video in.mp4 --out final.mp4` | MP4 + AAC |
| 5. captions | `node tools/export-captions.mjs --reel r03` | `.srt` |
| check | `node tools/compile-reel.mjs --check`, `python3 tools/check_content.py`, `node --test "test/**/*.test.js"` | 5/5, 0 errors, 31 pass |

### Why compile instead of parse-at-render

`script.md` is markdown written by a human: the shot table has to add up to the
declared length, the codes have to be real, the transitions have to be legal, the
voice-over has to exist. `compile-reel.mjs` does that once and fails loudly, so
the renderer only ever sees a consistent object. It is also where the text
becomes *timing*: the word-level lip-sync schedule, the caption cues, the
performance note → pose.

---

## 3. How one frame is composed

`drawFrame(ctx, reel, frame)` — pure in `(reel, frame)`. No clock, no random, no
audio: frame 700 is always the same pixels, which is what makes the preview
scrubbable and the stills honest.

| Pass | Module | Draws |
| --- | --- | --- |
| 1 | `worlds.js` | paper backdrop, dot grid, light, the shot's world |
| 2 | `nao.js` | Nao: one whole-figure `drawImage`, posed and moving |
| 3 | `chrome.js` | series badge, reel id, caption card, progress hairline |
| 4 | `render.js` | the whip transition, if the shot has one |
| 5 | `chrome.js` | review guides (dashed bands, thirds) — only with `--guides` |

The composition rule that governs every painter: **nothing important below
y = 1450** (the caption card) and **nothing important under the corner overlay**
when she is placed `corner-br` or `corner-bl`.

---

## 4. The character system

### 4.1 Whole figures, not parts

Two earlier rigs failed the same way — they cut her up. The first was a floating
head. The second pasted an expression head onto a body drawing; two drawings,
two canvases, two sets of proportions, so the shoulders doubled, the neck seam
showed, and every mouth change moved her eyes four pixels.

The rig is now **twelve complete drawings** (`assets/nao/poses/`), built by
`tools/build-nao-poses.py`, in which each figure is:

- keyed with a border flood-fill (interior whites survive),
- **scaled on head width (212 px)** — not on figure height, because a raised arm
  adds 40 px of canvas and normalising by height makes the face breathe,
- placed with feet on one baseline and head centre on one column.

### 4.2 The pose comes from the script

Every shot cell ends with a performance note:

```
| 11 | … | **CU** · 85mm — Deadpan, flat stare, unimpressed | CENTER | …
```

`compile-reel.mjs → poseFor()` turns that note into `shot.pose`. So her posture
and **face** change when the line changes, not when the diagram does. A shot with
no note falls back to `POSE_BY_WORLD` in `nao.js`, so a script that never fills
the note still renders.

Current assignment in R03 (8 authored, 5 by fallback):

| Shot | Note | Pose |
| --- | --- | --- |
| 3 | half-smile, one brow up | `skeptical` |
| 4 | holds up one finger | `onefinger` |
| 7 | nodding, fair-minded | `warm` |
| 11 | deadpan, flat stare | `deadpan` |
| 13 | shaking her head | `nope` |
| 14 | flat stare, one slow nod | `deadpan` |
| 19 | palm out, reassuring | `openhands` |
| 23 | finger heart, warm smile | `fingerheart` |

### 4.3 Motion, per frame

| Motion | Amount | Cycle | Pivot |
| --- | --- | --- | --- |
| Breathing | ±0.7 % vertical | 3.6 s | her feet |
| Weight shift | ±0.55° | 8.3 s | her feet |
| Drift | ±0.22° | 13.7 s | her feet |
| Speak nod | −0.6 % of head height | per word (`openness`) | her feet |
| Push-in | +1.2 % over the shot | per shot | canvas centre |
| Horizon shadow | ellipse, radial fade | — | her feet |

The **speak nod is the lip-sync schedule**, spent on the body because there is no
mouth to draw: `openness²` (squared, so only real vowels move her) drives a few
pixels of dip and a hair of extra lean. Movement derived from the words can never
drift from the caption.

Every other shot the figure is **mirrored** (`shot.n % 2 === 1`, except
`pointing`, whose direction matters) — a free second performance of the same
drawing.

### 4.4 Framing

`FRAMING[placement][sizeClass] = [headPx, topPx, centreX]`; scale = `headPx / 212`.

| Placement | close (CU/ECU) | medium (MCU/SPLIT/CORNER) | wide |
| --- | --- | --- | --- |
| `center` | 360, 300, 540 | 300, 520, 540 | 258, 250, 540 |
| `left` | 345, 320, 452 | 290, 530, 430 | 258, 250, 380 |
| `split-right` | 345, 320, 800 | 290, 530, 800 | 258, 250, 790 |
| `corner-br` | 268, 940, 812 | 225, 1010, 818 | 196, 1065, 822 |
| `corner-bl` | 268, 940, 268 | 225, 1010, 262 | 196, 1065, 258 |

A close-up stops at the hip, not the collarbone: a figure cut at the chest is the
floating-head problem with extra steps, and her hands have to stay in frame
because the hands are the animation.

---

## 5. The world system

`worlds.js` holds one painter per world id. Sixteen are registered; `bokeh` is
the default for anything unknown.

| World | Shot | What it draws |
| --- | --- | --- |
| `pov_phone` | 1 | a straight phone, product page, illustrated sneaker, thumb |
| `feed_ad` | 2 | a scrolling feed, the same shoe as a sponsored card |
| `shelf_one` / `shelf_two` | 5, 8 | one tagged box on one shelf; then two sites |
| `note_open` | 6 | the box open, note text |
| `stamp` | 9 | a shared stamp landing |
| `link` | 10 | two sites joined by a dotted line |
| `note_number` | 12 | the note flat, a long number |
| `incognito` | 13 | a dimmed private window |
| `spec_card` | 15 | an RFC-style paper card |
| `browsers` | 16 | three browser blocks flipping a tracker off |
| `app_icon` | 17 | an icon with a note tucked inside |
| `settings` | 18 | a settings panel assembling |
| `toggle` | 20 | a fingertip on the switch |
| `flat_grid` | 21 | the whole world flat, one line of text |
| `recap` | 22 | three chips: note · shared · blocked |
| `bokeh` | 3, 4, 7, 11, 14, 19, 23 | soft light and dots behind her |

Shared helpers in `iso.js`: `projector()` (one vanishing point for every prop),
`isoBox()`, `isoGround()`, `shelf()`, `taggedBox()`, `chip()`, `paperCard()`,
`roundRect()`, `poly()`, `dottedArc()`, `toggleAnimated()`.

**Bitmap props.** Vector suits the isometric world; a silhouette the audience
already knows wants an illustration. The sneaker (`assets/world/shoe.png`) is
loaded through `setWorldAssets()`; `oneShoe()` stays as a fallback so tests run
with no bitmaps.

---

## 6. Chrome

| Element | Spec |
| --- | --- |
| Badge | 26 px accent square + tracked series name, y 96–120 |
| Reel id | `R03 · 45s`, right aligned, 45 % ink |
| Caption card | x 60, w 960, bottom 1780, radius 30, only drop shadow in frame |
| Caption type | Inter 600, 46 px (40 px if it wraps past two lines), line height 1.32 |
| Emphasis | accent tint + a 5 px underline that grows over 6 frames |
| Progress | 6 px hairline at the bottom, accent |

The caption is the most important object on screen, which is why it is the only
thing with a shadow and nothing is ever drawn behind it.

---

## 7. Sound

### 7.1 Voice-over

The narration is **not a read of the captions**. 45 s of natural speech holds
about 120 words; the caption band holds more, because reading is faster than
listening. The narration is a tighter performance of the same script, stored with
its words in `output/vo.json`.

Eight clips cover runs of shots. Each is placed at the start of its window and,
if it runs long, sped up with `atempo` — clamped to **0.95–1.15**, because past
that she stops sounding like a person. Two lines were rewritten rather than
sped up when they came in at 1.4×.

| Clip | Shots | Words |
| --- | --- | --- |
| g1 | 1–2 | "You looked at shoes. Now they're everywhere." |
| g2 | 3–5 | "Not mind-reading. One small file: a cookie. A note a site leaves in your browser." |
| g3 | 6–7 | "Same person as before. That's how logins work." |
| g4 | 8–10 | "Same note, second site. Same company. Two visits, one identity. That's the trick." |
| g5 | 11–13 | "That's a third-party cookie. A number, not your name. Incognito forgets on your device, not theirs." |
| g6 | 14–16 | "Not the exact pair. The standard calls it worrisome. Safari, Firefox and Brave block these." |
| g7 | 17–19 | "Apps have their own switch, in your settings. Blocking rarely breaks anything." |
| g8 | 20–23 | "You don't need to understand it all. One note, every site, one switch. The shoes can't follow if the note can't travel." |

### 7.2 Effects

Ten cues synthesised from maths (`tools/make-sfx.py`), placed by
`tools/audio-cues.mjs` as **fractions of a shot**, so re-timing the script moves
the sound with it rather than stranding it. 62 cues in total: a quiet whoosh on
every cut, a hard one on the whip, and world events — the stamp on `thud`, three
blocked browsers on three `click`s, the recap chips on `pop`s.

### 7.3 The mix

Summed in Node from 16-bit PCM, not with ffmpeg's `amix` — the bundled ffmpeg is
from 2018 and normalises by input count, so a 62-cue mix comes out near-silent
and ducks itself as cues end. Then a single peak normalisation to 0.89
(−1.0 dBFS) and one AAC encode.

Result, measured: no silent second, per-second RMS between −14 and −27 dBFS.

---

## 8. Captions

Burned in **and** exported. The burn-in is the design (type, emphasis, timing);
the `.srt` is for the platform's caption track and for search. One cue per shot,
because in this format a shot *is* a line; emphasis words are upper-cased because
SRT has no colour.

---

## 9. Assets

Full inventory, provenance and rebuild commands: **[`assets/README.md`](../assets/README.md)**.

| Folder | Contents | Rebuild |
| --- | --- | --- |
| `assets/fonts/` | 6 woff2 faces | — (OFL, committed) |
| `assets/nao/poses/` | 12 built figures + 12 sources + `poses.json` | `python3 tools/build-nao-poses.py` |
| `assets/nao/` | model sheet, section crops, 12 visemes | — (design authority) |
| `assets/sfx/` | 10 cues | `python3 tools/make-sfx.py` |
| `assets/world/` | the sneaker + its source | — (illustrated once) |

---

## 10. Tooling reference

| Tool | Flags | Notes |
| --- | --- | --- |
| `compile-reel.mjs` | `[id]` · `--check` · no args = all | markdown → `reel.json`; fails on arithmetic, codes, transitions |
| `render-reel.mjs` | `--reel r03` `--stills 1,2,3` / `--all` `--mp4 path` `--out dir` | Skia + ffmpeg; ~22 fps |
| `mix-audio.mjs` | `--reel` `--video in` `--out out` · `--wav out` · `--no-vo` · `--vo-gain` | sums PCM, normalises, muxes AAC |
| `export-captions.mjs` | `--reel` · `--stdout` | shot-accurate `.srt` |
| `build-nao-poses.py` | `--report` | key, head-normalise, align |
| `make-sfx.py` | `--report` | deterministic synth |
| `check_content.py` | — | story/sheet validation, 0 errors required |
| `preview-server.mjs` | — | 0.0.0.0:4173, canvas player + `/preview/frame.html` |
| `build-projects.mjs` | — | regenerates episode documents |

---

## 11. Improvising: recipes

| You want | Do this | Then |
| --- | --- | --- |
| **Change a line** | edit the Voice-over cell in `script.md` | compile → re-voice that clip → `mix-audio` |
| **Change her face on a beat** | edit the note after the em dash in the shot cell (`— Deadpan, flat stare`) | compile → render |
| **Add a new expression or gesture** | draw one **whole figure**, drop `assets/nao/poses/src-<name>.png`, add the name to `POSE_NAMES`, extend `poseFor()` in `compile-reel.mjs` | `build-nao-poses.py` → compile → render |
| **Re-time the reel** | edit `Dur` cells (frames are recomputed; the total must match `Length`) | compile → re-render → re-voice if words no longer fit |
| **Make it faster/slower overall** | change `Length` in the header, then rebalance `Dur` | compile; it will refuse until the arithmetic adds up |
| **Change pacing without new words** | lengthen a shot, shorten its neighbour | compile → re-mix (cues follow fractions) |
| **New world** | write `function myWorld(ctx, shot, frame, t)` in `worlds.js`, register it in `PAINTERS`, name it in the Background cell | compile → stills |
| **New sound effect** | add a generator to `make-sfx.py`, a cue to `audio-cues.mjs` | `make-sfx.py` → `mix-audio` |
| **Change the voice** | re-generate `output/vo/*.mp3`, update `vo.json` words | `mix-audio` |
| **New reel** | copy a `script.md`, keep the table shape, add the folder under `series/<series>/reels/` | `compile-reel --check` |
| **Change her outfit** | new source art for all twelve poses (the outfit is in the drawing) | `build-nao-poses.py` → render |
| **Portrait/other aspect** | `W`, `H` and `FRAMING` are the only places that assume 9:16 | render → inspect every placement |

Two rules that keep this from breaking: **never composite a head onto a body**,
and **never let a pose change inside a shot** (a pose is a whole drawing; two of
them meeting mid-shot look like a mistake, because they are one).

---

## 12. Known limits

| Limit | Why | What it would take |
| --- | --- | --- |
| No facial animation **within** a shot | the rig is twelve still drawings | a part-rigged character (head, brows, mouth as separate layers with bones) — a different project |
| No blinking | same reason: no eye layer | same |
| One body per pose | the outfit and silhouette are baked into the drawing | a layered cut or a 3D model |
| Narration is ~1.1× written pace on two lines | 45 s of speech holds ~120 words | shorter script, or a longer reel |
| Effects are synthesised, not recorded | no licensed library in the repo | a licensed SFX pack, recorded in `assets/README.md` |
| No music bed except the sign-off pad | an explainer with a bed sounds like an advert | a deliberate decision, not a gap |
| R01, R02, R04, R05 not rendered with this rig | they predate it | run the pipeline per reel |
| Preview player draws at 1080 × 1920 | no downscale path in the canvas player | CSS scale is applied; canvas size is fixed |

---

## 13. Decisions log

| Decision | Alternative rejected | Why |
| --- | --- | --- |
| Whole figures, one drawing per pose | head sprite composited onto a body | two drawings never agree; the seam shows and the eyes jump |
| Scale on head width | scale on figure height | raised arms change canvas height and make the face breathe |
| Pose chosen by the script's performance note | pose chosen by world id | the face should follow the line, not the diagram |
| Lip-sync schedule drives a nod | swap mouth shapes | there is no mouth layer; the schedule still drives timing |
| Bitmap sneaker | bezier sneaker | a known silhouette is anatomy; beziers read as a bread roll |
| Sound cues as fractions of a shot | absolute timestamps | re-timing must not strand the sound |
| PCM summed in Node | ffmpeg `amix` | the bundled ffmpeg normalises by input count |
| Burned-in captions **and** `.srt` | `.srt` only | the design is the type and the emphasis; platforms override both |
| Committed MP4 | gitignored render | "where is the video" must never be a question |

---

## 14. Where to look next

- `docs/13-reel-rendering.md` — the drawing pipeline in detail
- `docs/12-reels-format.md` — the shot grammar (codes, lenses, cut rhythm)
- `docs/11-lip-sync.md` — the schedule, and what the rig does with it
- `docs/02-character-and-voice.md` — who she is, and how she speaks
- `assets/README.md` — every file, its provenance, its build command
- `IMPLEMENTATION-PLAN.md` — what is built, what is next
