# Technical and Rendering Specification

## Output

- Resolution: 1080 × 1920.
- Aspect ratio: 9:16.
- Frame rate: 30 fps.
- Container: MP4.
- Video codec: H.264, `yuv420p`, `faststart`.
- Audio codec: AAC when audio is present.
- Default CRF 18; `--crf 16` for a keeper.

These are project defaults. Confirm current platform requirements before
publishing — they change more often than this document does.

## Implemented stack

- Node.js 18+, no build step, no bundler.
- `playwright-core` driving a Chromium build.
- HTML/CSS/SVG for every visual. No image or video assets are needed to render an
  episode; the only binary inputs are fonts and optional audio.
- FFmpeg for encoding and audio mixing; ffprobe for verification.
- Sheet parsing in Node (`src/lib/sheet.js`) at build time only.

Tool discovery is layered so the pipeline works on a laptop and in a bare
container with no configuration:

| Tool | Order |
| --- | --- |
| Chromium | `CHROMIUM_PATH` → Playwright's browser → system Chrome/Chromium → `@sparticuz/chromium` |
| FFmpeg | `FFMPEG_PATH` → `PATH` → `@ffmpeg-installer/ffmpeg` |
| ffprobe | `FFPROBE_PATH` → `PATH` → `@ffprobe-installer/ffprobe` |

`src/lib/tooling.js` owns this and `npm run doctor` prints the resolution for
each tool, including which one was chosen and why.

## The pipeline, end to end

```
content/how-it-works.xlsx
  │  sheet.js   read tabs, normalise headers
  │  plan.js    validate against Vocab (+ arithmetic check)
  │  compile.js seconds→frames, resolve props, emit captions
  ▼
<series>/episodes/<slug>/episode.json  +  script.md
  │  render.js  start server + browser, drive frames
  ▼
<series>/episodes/<slug>/frames/frame_000000.png …
  │  encode.js  ffmpeg -framerate 30 -i frame_%06d.png
  ▼
<series>/episodes/<slug>/output/final.mp4
  │  encode.js  ffprobe verification
  ▼
<series>/episodes/<slug>/render-report.json
```

Only `sheet.js` and the file-writing half of `sheet-cli.js` touch the
spreadsheet. The browser never sees an `.xlsx`.

## Frame model

Identical to the reference studio, deliberately, so its tested `timeline.js` and
`motion.js` carry over unchanged.

A video is an ordered list of scenes (beats). Each scene has an id, a type, a
start frame, a duration in frames, component data, timed events, and an optional
transition.

- Intervals are **start-inclusive, end-exclusive**: a 1800-frame episode uses
  frames `0..1799` and lasts exactly 60.0 s.
- Scene-local frame: `localFrame = globalFrame − sceneStartFrame`.
- Captions are the exception: they are timed in **global** frames, because a
  sentence outlives a cut.

Frames are integers everywhere. Authoring is in seconds; conversion happens once,
at compile time, and the last beat absorbs the rounding remainder so totals are
exact.

## Rendering

1. Load and validate `episode.json` (re-warn if its workbook hash is stale).
2. Start a short-lived HTTP server on an ephemeral port bound to `127.0.0.1`,
   serving `src/stage/`, the bundled fonts, and this project's `episode.json`.
3. Launch Chromium at 1080 × 1920, device scale factor 1.
4. Navigate; await `window.__studio.ready` (fonts loaded, first frame composed).
5. For each requested frame: `window.__studio.renderFrame(n)`, then screenshot to
   `frames/frame_%06d.png`.
6. Encode the sequence at 30 fps; mix audio if configured.
7. Verify with ffprobe and write `render-report.json`.
8. Tear down browser and server.

Frame naming is zero-padded to six digits and must match the FFmpeg input
pattern. A mismatch produces a video that plays but is the wrong length, which
`verify` catches by comparing ffprobe's frame count against `totalFrames`.

### Per-beat rendering

A full 60 s episode is 1800 PNGs at roughly 250 KB each — about 450 MB, and a few
minutes of wall clock. During authoring, render less:

```bash
npm run render -- <slug> --beat 4          # frames for beat 4 only
npm run render -- <slug> --frames 0-600:60 # every 60th frame in a range
npm run preview -- <slug>                  # ~14 sampled frames + contact sheet
```

Per-beat renders are also how a revision works: rebuild the sheet, render only the
beats whose rows changed, and compare those frames against the previous cut.

## Layout verification

Quality is measured, not guessed. After each sampled frame the stage reports, per
text node and per rig path:

- the element's real **glyph bounds** (not its block box — centred text spans the
  full width and would be falsely flagged);
- whether it leaves its zone;
- whether it overflows its container;
- whether it is clipped by an ancestor;
- for Nao, whether any path exceeds the `presenter` zone;
- for the isometric world, whether any prop's screen bounds leave the `board`
  zone at the current camera.

`npm run check` samples scene starts, the first frame of every caption, every
`zoom-in` end, and the final frame of every beat, then fails the render on errors
before encoding starts. Warnings (a caption 2 words longer than the level
suggests, a prop near a zone edge) print but do not block.

## Preview workflow

Before a final render:

- `npm run preview` writes ~14 frames plus a contact sheet. **Look at it.**
  Checks catch clipping; they cannot catch an ugly frame.
- Confirm the caption is legible at phone size — view the contact sheet at 25 %.
- Confirm each beat's `board` and `presenter` zones actually contain something.
- Confirm the world accumulates: the props at the last beat minus the first
  should equal roughly the number of beats that introduced props.

## Determinism

- No `Date.now()`, `performance.now()`, `Math.random()` in `src/stage/`.
- No CSS `@keyframes`, no `transition`, no `requestAnimationFrame` state.
- Randomness only via `Motion.mulberry32(Motion.hashString(seed))`.
- Fonts and any audio are local; nothing is fetched from the network at render
  time.
- `document.fonts.ready` resolves before the first capture.
- `npm run determinism -- <slug>` renders twice and compares the SHA-256 of both
  sequences. Any nondeterminism in the stage shows up as a differing frame.

Fonts matter here more than people expect: rendering with a fallback font and
then with Inter changes every line break. `doctor` warns when the bundled fonts
are missing.

## Audio

Silent is the default, and a silent episode is a finished episode — captions carry
the script. `episode.json` records `audio.mode` and `verify` asserts that a
silent project really has no audio stream.

When narration exists:

```json
"audio": {
  "mode": "local",
  "tracks": [
    { "file": "audio/vo/vo-01.mp3", "startFrame": 12 },
    { "file": "audio/vo/vo-02.mp3", "startFrame": 138 },
    { "file": "audio/music.mp3", "role": "bed", "gainDb": -26 }
  ]
}
```

- One file per beat, named by `beat_no` (`vo-01.mp3` …). The compiler emits the
  `startFrame` from the beat's start, so a narration file can never be misaligned
  by hand.
- Missing files are validated at compile time. A build never silently drops a
  voice track: either every beat with a `vo-*.mp3` present is mixed, or the
  project renders silent and the report says so.
- Music is ducked to −26 LUFS under the voice. Measure, do not trust a gain
  preset.
- Only local files. The pipeline never calls a TTS service, and no generated
  audio is committed without a note in `assets/README.md` saying how it was made.

### The narration workflow

1. Write the beats in the sheet; `sheet:build` emits `script.md`.
2. Read `script.md` aloud. Fix anything you stumble on **in the sheet**.
3. Record or generate one file per beat, into `<series>/episodes/<slug>/audio/vo/`.
4. `npm run render` picks them up automatically.

Because the file name is the beat number, re-ordering beats in the sheet means
re-recording — which is a feature. It makes the writer notice that a rewrite
happened.

## Storage

| Artefact | Size | Committed |
| --- | --- | --- |
| `episode.json`, `script.md`, `publishing.md` | KB | yes |
| `preview/contact-sheet.png` | ~1 MB | yes |
| `preview/frames/` | ~4 MB | yes |
| `frames/` | 300–600 MB | **no** — `.gitignore`d |
| `output/final.mp4` | 8–25 MB | yes, one per shipped episode |

`npm run clean -- <slug> --frames --yes` deletes `frames/` only after
`output/final.mp4` exists and `verify` passes. Frames are regenerable; the
episode is not.

`doctor` reports free disk and refuses a full render with less than 4 GB free,
because a render that dies at frame 1500 has wasted the whole render.

## Failures

- **Missing tool**: `doctor` names it, says how to install it, and the render
  refuses to start. Never claim a render happened.
- **Invalid sheet**: the build fails with tab, row, and column, and writes
  nothing. `episode.json` is only written on success, so a half-compiled episode
  cannot exist.
- **Layout error**: the render stops before encoding and points at the frame and
  the element.
- **Encode failure**: frames are kept, the error is reported verbatim, and the
  episode `status` is not advanced.
- **Stale compile**: `check` warns; the build is still allowed but the report
  records the mismatch, so a review can see it.

## What the report contains

`render-report.json` is the honest record: toolchain versions and paths, workbook
hash, episode hash, frame count, duration, codec, audio mode and stream details,
every layout warning and error, the contact sheet path, and the wall-clock
timings for compile, render, and encode. A reviewer who was not present can read
it and know exactly what happened.
