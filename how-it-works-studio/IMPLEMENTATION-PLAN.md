# Implementation Plan

How to build this studio from the current state (documents only) to a rendered
episode, in an order where every phase ends in something you can look at.

Read this alongside `docs/01-project-and-workflow.md` (the workflow) and
`docs/08-content-sheet.md` (the workbook contract). The other documents are the
detail each phase needs.

---

## The one architectural decision

Everything else follows from this:

> **The spreadsheet is the only authoring surface. The renderer knows nothing
> about episodes, sheets, or editors.**

That gives a three-layer pipeline with a single hand-authored input and a single
generated contract in the middle:

```
  THE SHEET                    THE COMPILER                 THE RENDERER
  content/how-it-works.xlsx    src/lib/compile.js           src/stage/*
  ─────────────────────        ──────────────────           ──────────────
  Episodes, Beats, Props,  →   validate → normalise   →  episode.json → frames
  Paths, Character,            → seconds to frames         pure function of
  Sources, Publish, Vocab      → resolve prop ids          (episode, frame)
```

Two rules protect the decision:

1. **No narration text in `src/stage/`.** If a string is spoken or captioned, it
   came from a beat row. A hardcoded sentence is a bug.
2. **`episode.json` is never edited by hand.** It is generated, it records a
   workbook hash, and `npm run check` warns when the hash no longer matches
   `content/how-it-works.xlsx`.

### Why compile instead of reading the sheet at render time

| Read the sheet in the browser | Compile to JSON first (**chosen**) |
| --- | --- |
| Needs the sheet exported and served to the page | One small JSON file |
| A typo is discovered at frame 700 | A typo fails before any render |
| Frames depend on sheet parsing | Frames depend on a committed, diffable file |
| No review artefact | `script.md` is generated for editorial review |

Compiling also gives a second, cheap output: `script.md`, the narration and
claim list in reading order, which is what a human should actually approve
before pixels are spent.

---

## Sheet → `episode.json` field mapping

This table is the whole contract. If it changes, `docs/08-content-sheet.md`
changes with it.

### `Episodes` → top level

| Column | `episode.json` | Used by |
| --- | --- | --- |
| `episode_id` | `episodeId` | slug prefix, gallery, index |
| `slug` | `slug`, project folder name | everything |
| `title` | `title` | `title` beat, publishing |
| `question` | `question` | `hook` beat, publishing |
| `series` | `series` (→ `badge` zone) | chrome |
| `level` | `level` | pacing preset + badge |
| `target_seconds` | `targetSeconds` | validator only |
| `answer_oneliner` | `answer` | `recap` / `outro` |
| `music` | `audio.music` | encode |
| `status` | `status` | CLI guards (see below) |

### `Beats` → `scenes[]`

One row becomes one scene. Start frames are not authored — they are accumulated.

| Column | `episode.json` field | Notes |
| --- | --- | --- |
| `beat_no` | `scenes[i].id` = `beat-NN-<type>` | must be contiguous from 1 |
| `beat_type` | `scenes[i].type` | must exist in `SCENES` |
| `duration_s` | `scenes[i].durationFrames` | `round(s × fps)`, last beat absorbs remainder |
| `narration` | `scenes[i].data.narration` **and** a `captions[]` entry | one sentence, one card |
| `on_screen_text` | `scenes[i].data.board.title` | max 6 words, not a copy of narration |
| `board_items` | `scenes[i].data.board.items` | parsed `;`-separated list |
| `props` | `scenes[i].data.world.props` | `prop_id` or `prop_id@slot` |
| `camera` | `scenes[i].data.world.camera` | preset name from `Vocab` |
| `gesture` | `scenes[i].data.nao.gesture` | `Vocab` |
| `expression` | `scenes[i].data.nao.expression` | `Vocab` |
| `emphasis` | `captions[].emphasis` | `;`-separated substrings to tint |
| `transition` | `scenes[i].transition` | `fade` / `wipe` / `none` |
| `sfx` | `scenes[i].data.sfx` | local file, validated at compile |
| `note` | dropped | editorial only, kept in `script.md` |

### `Props` → prop instances

`Props` rows are keyed by `(episode_id, prop_id)`. The compiler joins a beat's
`props` cell against them, carrying `label`, `color`, `state`, and `slot`. A beat
may reference a prop the `Props` tab does not describe, provided the prop exists
in the code library with a default — that is the common case and keeps the sheet
small.

### Timing: seconds in, frames out

```
for each beat in order:
    f[i] = round(duration_s[i] * 30)
    if i is the last beat:
        f[i] = target_frames - sum(f[0..i-1])     # absorb rounding
    start[i] = sum(f[0..i-1])
total = sum(f)                                    # exactly target_frames
```

`duration_s` is validated to one decimal place, so `4.0` and `4` mean the same
thing and `4.03` is a typo worth catching. Never author frames directly: the
sheet is written by humans, and humans think in seconds.

---

## Already delivered (was not in the original plan)

Three things exist ahead of schedule because they were needed to write the
episodes honestly:

| Delivered | Path | Why now |
| --- | --- | --- |
| Content validator | `tools/check_content.py` | The five episodes had to be held to the rules the docs promise. It also defines what `src/lib/plan.js` must agree with. |
| Workbook builder | `tools/build-sheet.py` | The CSV mirror is canonical; the `.xlsx` is generated so the two cannot disagree. |
| Project generator + **lip-sync engine** | `tools/build-projects.mjs`, `src/stage/rig/{visemes,lipsync}.js`, `test/lipsync.test.js` | Lip-sync is text-driven and pure, so it could be built and tested before the renderer. 22 tests pass without a browser. |
| **Five reel scripts** | `reels/r01…r05/script.md`, `reels/index.csv` | The 45–60 s format is what actually gets posted, so it was authored before the long-form renderer. `docs/12-reels-format.md` is the grammar; `tools/check_content.py` already validates the shot tables (length, shot count, lens, shot codes, cut continuity, captions, outfit rotation). |

Phase 1 below therefore starts from a working validator, and Phase 2 gains a
mouth that already works.

## Where reels fit in the build

Reels are the posting format and the long-form episode is the archive, but they
share one character, one world and one compiler. They are not a second pipeline —
they are a **second second-length of the same pipeline**.

What a reel needs that the plan above already delivers:

| Reel requirement | Comes from |
| --- | --- |
| Shot codes and lenses (`CU`, `CORNER`, `SPLIT`, `INSERT`, …) | Phase 5 scene types + Phase 2 camera presets |
| The corner overlay (650 px, 34 % height, 40 px margin) | Phase 3 Nao compositing — it is a layout preset, not new art |
| Frame-exact timecodes, 22–27 shots | Phase 1 compiler, unchanged; a reel is a short `episode.json` |
| Fast cut rhythm, whip, silent beats | Phase 5 transitions |
| Captions under 14 words | Phase 5 captions |
| Lip-sync on every shot, full 12 visemes in `CU` | Already built |

What it adds, and is **not** built yet:

1. **A `Shots` tab in the workbook.** Today the reel tables live in `script.md`,
   which is the authored source. Phase 1 should gain a `Reels` + `Shots` pair of
   tabs so reels compile like episodes do. Until then, `script.md` is the source
   and `index.csv` the index — do not duplicate the table into a CSV by hand.
2. **`src/lib/compile.js` support for shot rows** — mapping `script.md` columns to
   `episode.json` as described in `docs/12-reels-format.md` ("From script to
   sheet"). One row per shot, no beats indirection.
3. **A `reel` pacing preset** — 1.2 s hook floor, 1.8–2.2 s average, hard cuts,
   one whip, and a 2.0 s sign-off that the compiler refuses to stretch.

**Suggested order once Phase 2 lands:** build reels *first*. They are shorter, so
one render cycle is 48 seconds instead of 76, they exercise the same scene types,
and the corner overlay is the cheapest possible proof that Nao and the world can
share a frame. A reel is a better first vertical slice than an episode.

## Phase 0 — Foundation (half a day)

Port the parts of the reference studio that are already correct. They contain no
suspense-specific logic and should not be rewritten.

| Copy from `digital-suspense-studio/src/` | Becomes | Change |
| --- | --- | --- |
| `lib/tooling.js` | `src/lib/tooling.js` | none |
| `lib/frames.js` | `src/lib/frames.js` | none |
| `lib/encode.js` | `src/lib/encode.js` | none |
| `lib/browser.js` | `src/lib/browser.js` | none |
| `lib/server.js` | `src/lib/server.js` | serve `src/stage/` and the project's `episode.json` |
| `lib/report.js` | `src/lib/report.js` | none |
| `lib/paths.js` | `src/lib/paths.js` | `scenes.json` → `episode.json` |
| `lib/json.js` | `src/lib/json.js` | none |
| `stage/timeline.js` | `src/stage/timeline.js` | none |
| `stage/motion.js` | `src/stage/motion.js` | none |

Also:
- `package.json` with the script table from `README.md`, `playwright-core`, and
  the three optional tool dependencies.
- `assets/fonts/` — copy Inter 400/500/600/700 plus `OFL.txt` and `assets/README.md`.
- `.gitignore` — `projects/*/frames/`, `node_modules/`, `content/*.xlsx#` lock files.
- `test/` with the reference's `timeline` and `config` tests adapted.

**Exit criteria:** `npm run doctor` reports Node, FFmpeg, and Chromium.
`npm test` passes. No stage code yet.

---

## Phase 1 — The content layer (2–3 days)

The highest-value phase, and the one to build before anything visual, because it
is the piece that can fail quietly for months if it is wrong.

### Files

| File | Responsibility |
| --- | --- |
| `src/lib/sheet.js` | Read `.xlsx` (via `xlsx` or `exceljs`) and `content/csv/` into one `Workbook` object. Header-name based, so column order never matters. Normalises headers to snake_case. |
| `src/lib/plan.js` | Validate a `Workbook` against `Vocab`. Returns `{ issues, plan }`. Pure, no I/O — this is what the tests hammer. |
| `src/lib/compile.js` | `plan → episode.json` (subtitle: the sheet→JSON mapping above). Pure. |
| `src/lib/script.js` | `plan → script.md` for editorial review. Pure. |
| `src/lib/sheet-cli.js` | `sheet:check`, `sheet:build`, `sheet:pull`, `new`. Owns the file I/O. |

### Build order inside the phase

1. **`sheet.js` with only `Episodes` and `Beats`.** Read, normalise headers,
   drop fully empty rows. Write a `test/sheet.test.js` against a 3-row fixture.
2. **`plan.js`: structural rules only** — id references, contiguity, known
   types, positive durations. All issues collected, never thrown on the first.
3. **`compile.js`: timing and scene assembly.** This is where `episode.json`
   starts existing. Snapshot-test one compiled fixture.
4. **`plan.js`: editorial rules** — narration and caption length, `on_screen_text`
   not a copy of narration, step counts, `Sources` coverage. These are warnings
   vs errors exactly as listed in `README.md`.
5. **`script.js`** so a human can review before rendering.
6. `sheet:pull` last — it needs network and is a convenience, not the pipeline.

### Quality bar for this phase

- Every validation message names the tab, the row, and the column:
  `Beats!F12: duration_s "4,5" is not a number. Use a decimal point.`
- The validator never stops at the first problem; a writer fixing a sheet wants
  the whole list.
- A beat row that fails validation is quoted back with its `beat_no`, not its
  array index, because index means nothing to the person holding the sheet.

**Exit criteria:** `npm run sheet:check` prints a clean bill of health across all
five episodes (it does today, via `tools/check_content.py`). Breaking one cell
produces the right message. `npm run sheet:build -- <slug>` writes a valid
`episode.json` whose scene durations sum to the target. **No pixels yet — that is
correct.**

---

## Phase 2 — Vertical slice to a real MP4 (2 days)

Deliberately ugly. The goal is to prove the whole pipeline end to end with
placeholder art, so that every later phase improves the picture and never
touches the plumbing.

### Files

| File | Responsibility |
| --- | --- |
| `src/stage/index.html` | Stage page: `#stage` root, loads scripts and CSS |
| `src/stage/app.js` | `window.__studio = { load(episode), renderFrame(n) }` |
| `src/stage/style.css` | Palette, type scale, the five zones as `:root` values, `#stage` at 1080 × 1920 |
| `src/stage/scenes.js` | Registry of beat types; for now all 12 map to one placeholder renderer |
| `src/stage/components.js` | `Badge`, `CaptionLayer`, `ZoneDebug`, `Placeholder` |
| `src/lib/render.js` | `StudioSession`: load page, drive frames, screenshot, report |
| `src/lib/gallery.js` | One frame per zone / beat type |
| `src/cli.js` | `doctor`, `list`, `preview`, `check`, `render`, `verify`, `determinism`, `gallery`, `clean` |

### What the placeholder frame draws

1. Warm paper background (`--bg`).
2. The `badge` zone with `series` and `episodeId`.
3. The `board` zone with `on_screen_text` as plain left-aligned text, and one
   grey rounded rectangle per `board_items` entry.
4. The `presenter` zone with a neutral grey capsule where Nao will stand — sized
   to her real bounding box, so layout never shifts when the rig arrives.
5. The `caption` band with the beat's caption, word-wrapped, max 2 lines.
6. A thin optional `ZoneDebug` outline, off unless `--zones`.

### Why this order

The five zones are the layout contract. If the caption band and the presenter
box are fixed on day one, then Nao and the isometric world are *drawn into a hole
that already fits*, and no later phase can push text off a phone screen.

**Exit criteria:** `npm run render -- 0001-…` produces a 60 s, 1080 × 1920,
30 fps H.264 MP4 that says the right words at the right times over grey boxes.
`npm run determinism` proves two renders are byte-identical. `npm run verify`
passes. This is the checkpoint to show the user before investing in art.

---

## Phase 3 — Nao (4–5 days)

See `docs/02-character-and-voice.md` for the design; this is the build order.

### Files

| File | Responsibility |
| --- | --- |
| `src/stage/rig/nao.js` | Part tree, pose blending, and `drawNao({ pose, expression, gesture, t })` returning SVG |
| `src/stage/rig/poses.js` | Pose library keyed by id (from `Vocab`) |
| `src/stage/rig/expressions.js` | Eye/brow/mouth part swaps, 12 expressions |
| `src/stage/rig/gestures.js` | Timed arm/hand curves, additive on top of a pose |
| `src/stage/rig/lipsync.js` | Deterministic mouth-open envelope from narration text + word schedule |

### Build order

0. **Load the reference set.** `assets/nao/` already holds the model sheet, the
   talking-head sheet, 12 cropped visemes and 5 section crops. The rig must match
   those sheets, not a new design: pink bob, black headband, gold eyes, choker,
   pink tee, charcoal shorts.
1. **Static neutral pose, front-facing.** Head, torso, arms, hands as layered
   SVG paths. Get the silhouette right at 380 × 1120 before anything moves.
2. **Three poses**: `neutral-open`, `point-board`, `present-open`. Poses are
   *data* (joint angles), not separate drawings, so blending is possible.
3. **Pose blending** with `Motion.tween` between two pose ids over N frames.
4. **Expressions** as overlay layers (eyes, brows, mouth, blush, sweat). Twelve
   is plenty; more becomes a management problem.
5. **Gestures** as additive curves over a pose — a point is an arc on the
   shoulder and a small rotation on the wrist, not a new pose.
6. **Blink and breathe.** Blink is a seeded schedule per beat
   (`Motion.mulberry32(hashString(beatId))`), so it is alive but reproducible.
   Breathing is a 4 s sine on the torso, ±1.5 px.
7. **Secondary motion.** Hair strands and the scarf lag the head by 4 frames with
   a clamped spring. This sells "anime" more than line quality does.
8. **Mouth** — already solved: `src/stage/rig/lipsync.js` emits a per-frame
   schedule from the narration text (12 visemes, or 3 states in full body). The
   remaining work is drawing the 12 viseme overlays from
   `assets/nao/visemes/*.webp` into the face, and swapping to 3-state below 200 px
   of head height. Do not attempt phonemes, and do not add audio analysis.

### Constraints

- 60 fps of expression is not needed at 30 fps; keep every animation on frame
  boundaries and integer-friendly values so the look is stable.
- The rig draws into the `presenter` zone and must never exceed it: the checks
  measure real glyph and path bounds.
- No eye candy that needs the viewer to look away from the caption.

**Exit criteria:** `npm run gallery -- --rig` writes a contact sheet of all poses
× all expressions. A beat can hold a pose, blend to another, and blink — all
reproducible under `npm run determinism`.

---

## Phase 4 — The isometric world (5–6 days)

See `docs/05-isometric-world.md`. This is the phase with the most authored
content and the least code: a prop library is mostly geometry.

### Files

| File | Responsibility |
| --- | --- |
| `src/stage/iso/project.js` | World → screen projection, depth key, camera |
| `src/stage/iso/props.js` | Prop definitions: id → `{ footprint, height, draw(...) }` |
| `src/stage/iso/stage.js` | Slot grid, assembly animation, depth-sorted painter |
| `src/stage/iso/paths.js` | Bezier travel paths for `packet-trip` |
| `src/stage/iso/palette.js` | The five prop colour families from the style guide |

### Build order

1. **`project.js`**: true isometric with `screenX = (x − y) * cos30 * s`,
   `screenY = (x + y) * sin30 * s − z * s`. Unit-test the maths first — a bad
   projection is invisible until everything is drawn wrong.
2. **The grid**: a 6 × 6 slot floor, drawn as a fading dot lattice so a
   half-built world still looks intentional.
3. **Three props** (`server`, `router`, `desktop`) drawn as three-face prisms
   with edge strokes. Validate the light direction: top lightest, left mid,
   right darkest.
4. **Depth sort**: painter's algorithm on `(x + y + z)`, with a stable tiebreak
   on `prop_id` so equal distances never flicker.
5. **Assembly**: each prop arrives with a 12-frame `drop-and-settle` — from
   40 px above, overshoot 6 px, settle. Staggered 4 frames per prop in slot
   order. This is the channel's signature motion; tune it here.
6. **The library to 24 props**, in the order episodes need them — see
   `docs/05-isometric-world.md` for the list. Every prop gets a gallery entry.
7. **Camera**: `zoom` (0.7–1.4) and `focus` (world point → screen centre).
   Presets live in `Vocab`; a beat names a preset, never numbers.
8. **`paths.js`**: a glowing packet travels a cubic bezier with 3 control
   points, leaving a 12-frame comet tail. Used by `packet-trip`.

**Exit criteria:** `npm run gallery` renders every prop, lit consistently, in
correct depth order, on the lattice. A `zoom-in` beat pushes to a named prop and
its label pins on.

---

## Phase 5 — Scenes (4 days)

With Phases 3 and 4 done, a beat type is only a composition of things that
already exist.

| Beat type | Composition | Notes |
| --- | --- | --- |
| `hook` | `Badge` + `QuestionCard` + Nao entering from frame 18 | First frame is already composed: a feed shows it before play |
| `title` | `TitleCard` + first props assembling | Title lands on the beat's *second* word |
| `explain` | Nao + `board` card or live props | The workhorse; must never be boring, so props assemble as she talks |
| `analogy` | Physical props (post office, warehouse) | `board_items` name the mapping |
| `diagram` | Near-full-frame iso diagram, Nao at the edge | Board zone widens to 940 px; Nao moves right |
| `zoom-in` | Camera push + pinned label | Uses `camera` preset |
| `step-by-step` | `StepRail` with 2–4 numbered steps, one at a time | Props stack in step order |
| `compare` | Two vignettes + divider | Left is the misconception, right is reality |
| `packet-trip` | Path travel + comet tail | The most expensive shot; cap at one per episode |
| `myth-check` | Crossed-out card, then rebuild | Reuses `compare` internals |
| `recap` | Three chips + slowed world | Chips arrive 8 frames apart |
| `outro` | Takeaway line + episode badge + follow prompt | Footer disclaimer visible |

Cross-cutting work in this phase:
- **`CaptionLayer`**: project-level, global frames, max 2 lines, emphasis
  tokens tinted `--accent`. `atFrame: 0` means already on screen, no fade.
- **Transitions**: `fade` and `wipe` (a vertical card wipe that matches the
  isometric grid). Anything fancier needs a reason.
- **Chrome**: badge, progress rail (`footer`, decorative only), and the
  "Illustrated explainer" disclaimer on first and last beat.

**Exit criteria:** the example episode renders with every beat type it uses, and
`npm run gallery` renders one frame per type. No beat type ships without a
gallery entry.

---

## Phase 6 — Sound and polish (2–3 days)

- **Narration**: one file per beat, `projects/<slug>/audio/vo-NN.mp3`, named by
  `beat_no`. If files exist, `encode.js` offsets each to its beat's start frame
  and mixes. If they do not, the render is silent and `render-report.json`
  records `audio.mode: "silent"` — never a half-mixed film.
- **Music**: one bed, ducked to −26 LUFS under the voice with a sidechain or a
  static offset. `music` comes from the `Episodes` row.
- **SFX**: `sfx` cells point at local files; each prop's assemble gets the same
  soft click, so the world has a consistent texture.
- **Timing pass**: re-measure every caption's hold against its word count. Read
  the whole script aloud; anything you stumble over gets shortened in the sheet.
- **Discordant detail**: the last thing to fix is usually the first 2 seconds.

---

## Phase 7 — Publishing (1 day)

- `npm run publish -- <slug>` copies the `Publish` tab into
  `projects/<slug>/publishing.md` and appends the `Sources` list.
- `status` guards: `render` refuses a `draft`, `publish` refuses an unrendered
  episode. The sheet is the state machine, so a status can never lie about
  whether a file exists — the CLI checks both.
- Batch mode for a series: `npm run render -- --series networking`.
- Nothing in this repo posts to a platform. Review, then post by hand.

---

## Testing strategy

| Layer | How | Cost |
| --- | --- | --- |
| Projection and timing maths | unit tests, exact numbers | free |
| Plan validation | table-driven: one row per rule, both pass and fail | free, highest value |
| Compile | snapshot one hand-checked `episode.json` | free |
| Frame purity | render the same frame twice in one session, compare strings | needs browser |
| Layout | real glyph bounds per sampled frame, run by `check` | needs browser |
| Determinism | two full renders, compare hashes | slow, run before shipping |
| Vision | contact sheet, looked at by a human | unavoidable |

The reference studio's 62 unit tests run without a browser. Keep that property:
anything that can be pure must be pure, because a test you can run in 200 ms is
a test you actually run.

---

## Risks, and what to do about them

| Risk | Signal | Mitigation |
| --- | --- | --- |
| **The sheet becomes the bottleneck** | Writers ask for per-beat control the columns don't have | That is the point — a constrained format keeps episodes consistent. Add a column only when two episodes need it. |
| **Nao looks off-model** | Her face reads differently per episode | The rig is the only way she is ever drawn. No per-episode art, ever. |
| **Isometric depth bugs** | Props pop through each other at certain angles | Stable depth key, unit-tested; keep the camera on fixed azimuths |
| **Captions outgrow the band** | A 2-line card becomes 3 at 14 words | Validator caps words; the band is measured, so `check` fails the render |
| **Render time** | 60 s episode ≈ 1800 PNGs | Preview samples; render the frame range around a changed beat only (`--beat N`) |
| **Explainers get boring** | Flat retention after beat 3 | `beat_type` variety is enforced softly: warn when 4 consecutive beats share a type |
| **Wrong facts on screen** | A confident claim with no source | `Sources` required per claim; publishing copy lists them; corrections ship as a re-cut `-v2` |
| **Scope creep into a CMS** | Requests for a web editor | The spreadsheet already is the editor. Say no. |

---

## Non-goals

Written down so they are not re-argued in month two:

- No per-episode custom art, fonts, or colour schemes.
- No 3D, no physics engine, no WebGL. Isometric is drawn 2D geometry.
- No real-time preview UI beyond the contact sheet.
- No auto-posting, no auto-generated scripts from an LLM in the pipeline. The
  pipeline renders what a person wrote.
- No horizontal output. The format is vertical; a 16:9 version would need a
  different layout spec, not a flag.
- No speech synthesis inside the render. Audio files are inputs.

---

## Order of work, at a glance

| Phase | Deliverable | Days | Blocking |
| --- | --- | --- | --- |
| 0 | Tooling ported, `doctor` and tests green | 0.5 | — |
| 1 | Sheet validates and compiles to `episode.json` | 2–3 | 0 |
| 2 | **An ugly but real 60 s MP4** (render R04 first — a real reel) | 2 | 1 |
| 3 | Nao rig with poses, expressions, gestures | 4–5 | 2 |
| 4 | Isometric world, 24 props, camera | 5–6 | 2 |
| 5 | All 12 beat types, captions, transitions | 4 | 3, 4 |
| 6 | Narration, music, timing pass | 2–3 | 5 |
| 7 | Publishing, status guards, batch | 1 | 5 |

Roughly four to five weeks of focused work for one person, with Phase 2 reached
in week one. That ordering is deliberate: the user can watch a real video early,
and the expensive art phases are spent inside a pipeline that already works.
