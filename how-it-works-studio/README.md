# How It Works Studio

Turn a question into a vertical explainer: **Nao**, a pink-haired illustrated
presenter with text-driven lip-sync, an isometric world that builds itself, and
captions that carry the script.

Every frame is drawn with HTML/CSS/SVG in a headless browser, then stitched with
FFmpeg. Rendering is deterministic: the same workbook row always produces the
same pixels.

```
question → workbook row → episode.json → frames → final.mp4
```

---

## Quick start

```bash
cd how-it-works-studio

# These work today (no browser, no FFmpeg needed):
npm test                        # 22 unit tests, including the lip-sync engine
npm run sheet:check             # validate all 5 episodes against the Vocab tab
npm run sheet:build             # regenerate content/how-it-works.xlsx from the CSVs
npm run projects:build          # regenerate each project's script/storyboard/publishing

# These are what the studio is being built for — src/cli.js does not exist yet:
npm run doctor
npm run preview -- 0104-why-your-wifi-dies-at-nine-pm
npm run render  -- 0104-why-your-wifi-dies-at-nine-pm
```

> **No renderer yet.** Five episodes are written, validated and scheduled; none
> has been rendered. `IMPLEMENTATION-PLAN.md` lists what each command needs
> before it runs. Do not report a rendered episode that does not exist.

---

## The three layers

| Layer | Lives in | Written by |
| --- | --- | --- |
| **Content** | the workbook (`Episodes`, `Beats`, `Props`, `Sources`, …) | a human, in a spreadsheet |
| **Compiled episode** | `<series>/episodes/<slug>/episode.json` | `npm run sheet:build` |
| **Pixels** | `<series>/episodes/<slug>/frames/`, `output/final.mp4` | the renderer |

Only the first layer is hand-authored. `episode.json` is generated and should
never be edited by hand — if a number is wrong, fix the sheet and rebuild.

---

## Workbook format

The workbook is one `.xlsx` file with fixed tabs. Sheets in the studio copy are
`content/how-it-works.xlsx`; a CSV mirror lives in `content/csv/` so diffs are
readable in a pull request.

| Tab | One row is | Required |
| --- | --- | --- |
| `Episodes` | an episode | yes |
| `Beats` | one beat of one episode | yes |
| `Props` | one isometric object placed in the world | no |
| `Paths` | one travel path for the "follow the data" shot | no |
| `Character` | one gesture / expression cue at a time | no |
| `Sources` | one factual claim and where it came from | yes, per claim |
| `Publish` | the caption, hashtags, and cover for an episode | yes, before publishing |
| `Vocab` | the controlled vocabulary every other tab is checked against | yes |

Minimum usable episode — one row in `Episodes`, five in `Beats`:

```
Episodes  0001 │ 0001-what-happens-when-you-type-a-url │ What happens when you type a web address? │ … │ 75 │ scripted
Beats     0001 │ 1 │ hook │ 4.0 │ "You type a website address and press enter." │ …
Beats     0001 │ 2 │ title│ 3.0 │ "Four things happen before the page appears." │ …
```

Times are in **seconds**. The compiler converts to frames at 30 fps by rounding
to the nearest frame, and the **last** beat absorbs any rounding remainder, so
the total is always exact.

Full column-by-column reference:
[`docs/08-content-sheet.md`](docs/08-content-sheet.md).

### Validation

`npm run sheet:check` fails loudly, naming the tab and cell, when:

- a beat references an `episode_id` that has no row in `Episodes`;
- `beat_type`, `prop_id`, `gesture`, `expression`, or `status` is not in `Vocab`;
- `duration_s` is missing, zero, negative, or not a single decimal;
- `(episode_id, beat_no)` is duplicated or not contiguous from 1;
- an episode's beats total outside `target_seconds ± 15%`;
- a `narration` beat exceeds 22 words or 2 sentences (one sentence per step is
  allowed for `step-by-step`, and `recap` may be a list of noun fragments);
- `on_screen_text` exceeds 6 words, or is a verbatim copy of the narration;
- a `Prop` has no camera focus and sits outside the framed region;
- a `step-by-step` beat has fewer than 2 or more than 4 steps;
- a factual claim has no row in `Sources`;
- `status` skips a stage (`draft → scripted → built → rendered → published`).

Warnings (don't block a build): a beat longer than 12 s, a caption over 14
words, a `packet-trip` with no `Paths` row, an episode with no `Publish` row.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run doctor` | Environment report: tools, workbook, projects, free disk |
| `npm run list` | Every episode with length, beats, and render status |
| `npm run sheet:check` | Validate every episode against `Vocab` (**works today**) |
| `npm run content:strict` | Same, with warnings treated as errors |
| `npm run sheet:build` | Rebuild `content/how-it-works.xlsx` from `content/csv/` (**works today**) |
| `npm run projects:build` | Regenerate each project's `script.md` / `storyboard.md` / `publishing.md` (**works today**) |
| `npm run sheet:pull` | Download the live Google Sheet into `content/` (needs network) |
| `npm run new -- --title "…"` | Append a scaffolded episode to the workbook |
| `npm run preview -- <slug>` | Sampled frames, layout check, contact sheet |
| `npm run check -- <slug>` | Safe-area / clipping / depth-order checks only |
| `npm run render -- <slug>` | Full pipeline: preview → render → encode → verify |
| `npm run verify -- <slug>` | Re-probe an existing `final.mp4` |
| `npm run determinism -- <slug>` | Prove two renders are byte-identical |
| `npm run gallery` | One frame of every beat type and every prop |
| `npm run clean -- <slug> --frames --yes` | Delete regenerable frames |

`sheet:check`, `sheet:build` and `projects:build` are implemented in `tools/` and
run today; everything else waits on `src/`. The checker is Python because writing
`.xlsx` needs a real library and this is a build-time convenience, not part of the
render path.

Useful flags: `--frames 0,120,300` or `--frames 0-300:30` to pick exact frames,
`--crf 16` for higher quality, `--force` to continue past layout errors,
`--beat 4` to preview a single beat.

---

## How an episode is described

`episode.json` is generated, but it is the contract between the compiler and the
renderer, so it is worth reading. It keeps the reference studio's shapes exactly
— `scenes[]`, `startFrame`, `durationFrames`, `data`, `events`, `transition` —
so `timeline.js`, `motion.js`, `encode.js`, and `tooling.js` can be reused
unchanged.

```json
{
  "title": "What happens when you type a URL?",
  "slug": "0001-what-happens-when-you-type-a-url",
  "episodeId": "0001",
  "series": "Networking",
  "level": "beginner",
  "format": { "width": 1080, "height": 1920, "fps": 30 },
  "audio": { "mode": "silent", "tracks": [] },
  "source": { "workbook": "content/how-it-works.xlsx", "hash": "sha256:…", "builtAt": "2026-10-28" },
  "scenes": [
    {
      "id": "beat-01-hook",
      "type": "hook",
      "startFrame": 0,
      "durationFrames": 120,
      "data": {
        "chapter": "NETWORKING · 01",
        "question": "What actually happens after you press enter?",
        "world": { "props": [], "camera": { "zoom": 1.0, "focus": [0, 0, 0] } }
      },
      "events": [{ "type": "nao-enter", "atFrame": 18, "durationFrames": 14 }]
    }
  ],
  "captions": [
    { "text": "You type an address and press enter.", "atFrame": 12, "durationFrames": 96, "emphasis": ["enter"] }
  ]
}
```

`events[].atFrame` is **beat-local**. `captions[].atFrame` is **global** — one
caption card may straddle a beat change, which is normal in an explainer because
sentences do not stop at cuts.

Scene-level numbers come from the sheet; nothing in the renderer knows what an
"episode" is.

### Beat types

| Type | Renders |
| --- | --- |
| `hook` | Cold open: a question card over an empty stage, Nao walks in |
| `title` | Episode title over the first assembled slice of the world |
| `explain` | Nao talks to camera, board area holds a diagram card or a live prop |
| `analogy` | Physical metaphor: a post office, a warehouse, a queue of people |
| `diagram` | Near-full-frame isometric diagram; Nao stands at the edge, pointing |
| `zoom-in` | Camera pushes into one prop while its label pins on |
| `step-by-step` | Numbered steps appear one at a time, props stacking in order |
| `compare` | Two isometric vignettes split by a divider, before / after |
| `packet-trip` | Signature shot: the camera follows one glowing packet along a path |
| `myth-check` | A crossed-out misconception, then the corrected world rebuilds |
| `recap` | Three chips summarise the answer; the world darkens behind |
| `outro` | One-line takeaway, episode badge, follow prompt |

---

## Layout that never fights the platform

1080 × 1920, and five fixed zones. Nothing important is ever placed outside
them, and the checks in `npm run check` measure real glyph bounds to prove it.

| Zone | Box (x, y, w, h) | Holds |
| --- | --- | --- |
| `badge` | 72, 176, 400, 64 | Series and episode number |
| `board` | 48, 300, 612, 900 | Diagrams, props, step rails |
| `presenter` | 700, 540, 380, 1120 | Nao. Nothing else is drawn here |
| `caption` | 64, 1270, 624, 180 | The script. Max 2 lines, max 14 words |
| `footer` | 64, 1848, 952, 8 | Progress rail, decorative only |

The caption band is an opaque warm paper card, so captions stay readable over a
bright isometric world and never rely on a drop shadow.

---

## The character and the mouth

Nao is generated from two reference sheets in `assets/nao/`: a model sheet (front,
side, back, 15 expressions, 18 hand poses, 9 body poses, 7 outfits) and a
talking-head sheet with **12 visemes**.

Her mouth is driven by the **narration text**, not by audio analysis:

```js
const LipSync = require('./src/stage/rig/lipsync.js');
const schedule = LipSync.buildSchedule('Your photos live in a city with no people.', 240);
// → { mode: 'full-body', fps: 30, frames: [ {f:0,v:'rest',o:0}, {f:8,v:'I',o:0.55}, … ] }
```

- Deterministic and testable without a browser, an audio file or a network.
- A silent render still animates the mouth correctly, and re-recording the voice
  does not invalidate the animation.
- Only *change points* are stored, so a 9-second beat is ~80 entries and stays
  reviewable in `episode.json`.
- Full-body shots reduce to three mouth states; talking-head shots use all 12.

Spec: [`docs/11-lip-sync.md`](docs/11-lip-sync.md). Design:
[`docs/02-character-and-voice.md`](docs/02-character-and-voice.md). The real
schedule for every beat is printed in each project's `storyboard.md`.

## Audio

Silent is the default and a silent render is a valid episode: the captions carry
the script by design. Narration is not required for comprehension, only for
reach.

When narration exists, each beat's `narration` is a separate voice file (see
`docs/09-technical-and-rendering.md`), mixed with music at −26 LUFS under the
voice and encoded as AAC. The pipeline never assumes a TTS or music service is
configured, and `render-report.json` always records whether the film has audio.

---

## Safety and honesty

- Every episode opens with a `badge` naming the series and a footer line reading
  **"Illustrated explainer · not a real person"** on the first and last beat.
- Every factual claim has a `Sources` row with a URL and a checked date. The
  publishing copy lists them.
- No vendor logos, no real product screenshots, no copied diagrams. The world is
  drawn from the prop library; the props are original geometry.
- Nao does not give medical, legal, or financial advice, and does not speculate
  about security vulnerabilities in named products.

See `docs/10-quality-and-publishing.md`.

---

## Repository layout

```
how-it-works-studio/
├── package.json            npm scripts = the CLI
├── src/
│   ├── cli.js              command dispatch
│   ├── lib/                node side: sheet, plan, tooling, server, browser, frames, encode
│   └── stage/              browser side: timeline, motion, iso/, rig/, scenes.js, style.css
├── assets/nao/             model sheet, 12 visemes, expression and pose crops
├── assets/fonts/           Inter, SIL OFL 1.1 (to be added; see assets/README.md)
├── content/                the workbook and its CSV mirror
├── series/                 series → format → item (5 reels, 5 episodes)
├── tools/                  content checker, workbook builder, project generator
├── templates/              script, config, publishing, and sheet-tab starting points
├── docs/                   the design spec, kept in sync with the code
│                           (`14-production-report.md` is the build report for R03)
└── test/                   unit tests
```

The split is deliberate and inherited from the reference studio: `src/stage/` is
plain browser JavaScript with no build step, so any frame can be inspected by
opening the stage in a browser. `src/lib/` owns everything with side effects —
processes, sockets, files, the spreadsheet.

Read `docs/` before changing behaviour. `CLAUDE.md` explains how an agent should
extend the project. `IMPLEMENTATION-PLAN.md` explains what to build first.
