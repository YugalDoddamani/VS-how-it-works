# 15 — Episode Rendering

Document [13](13-reel-rendering.md) covers the 45–60 second reel: a shot table in
markdown, compiled to `reel.json`, drawn with the same frame function the preview
uses. This document covers the other format — the long-form episode — which starts
from the content sheet instead of a shot table, and lands in the same renderer.

The point of writing it down is that both formats now share everything after the
compiler. There is one stage, one figure rig, one caption card, one mixer, one
encoder. What differs is how the beats become shots.

## The chain

```
content/csv/episodes.csv  ─┐
content/csv/beats.csv     ─┴─→ tools/compile-episode.mjs ─→ episode.json
                                                              │
                                     tools/render-reel.mjs ───┤  frames → silent.mp4
                                     tools/mix-audio.mjs ─────┤  voice + effects → film.mp4
                                     tools/export-captions.mjs┤  sidecar .srt
                                     tools/contact-sheet.mjs ─┘  key-frames.jpg
```

`tools/lookup.mjs` is the only thing that knows the difference: give it `0102` or
`r03` and it finds `episode.json` or `reel.json`, in `episodes/` or `reels/`, and
every tool downstream takes that one answer. A tool that walks the folder tree
itself is a tool that will not find the other format.

## What the compiler decides, and why it is not in the sheet

A beat is 3–10 seconds. That is right for the sheet — it is one thought, one line,
one world — and wrong for the cut: a ten-second beat drawn as one shot is four
seconds of a still image. `compile-episode.mjs` therefore splits each beat into
shots and divides the beat's frames between them exactly.

**How** it splits them is the part that changed. The first version keyed the split
on beat type alone: every `explain` became `MCU, INSERT, INSERT` regardless of
what the sentence was doing, which is why two unrelated ideas were cut
identically. That is now the job of `content/csv/visual.csv` — one authored row
per beat giving the stage, intent, focal subject, supporting subjects, her role,
the action, the caption treatment, the cameras and the reason for the transition.
[Document 16](16-composition-and-story.md) is the whole contract; the short
version is:

- a beat chooses **five cameras** by name — `wide-establish`, `object-detail`,
  `character-reaction`, `overhead-process`, `comparison` — instead of a scale
  offset by shot number;
- the **layout reserves the caption and her footprint first**, then places the
  focal subject on the bench and the supporting subjects in the band it reserved
  for them;
- every prop has a **role** and props with no role in the beat are not drawn;
- a beat with no authored row still compiles — it falls back to a mechanical
  split — but it is marked `source.authored: false` and the strict quality gates
  do not close on it.

Three rules still hold from the first version, and they are now enforced rather
than remembered:

1. **She is never centred in an episode.** The bench needs the frame; she stands in
   a corner. The exception is a `character-reaction` shot, where her face *is* the
   information — and those shots exist because the plan asked for them, not
   because a beat type happens to produce one.
2. **A caption is one line per beat, not per shot.** Splitting a sentence across
   the cuts of a beat reads as a typo. The line stays whole and holds for the beat,
   which is also exactly the window the reading check measures.
3. **Two shots of the same beat must not look identical.** The compiler rejects two
   consecutive shots on the same camera unless the beat is marked as a deliberate
   `hold`, and the signature test (camera + focal + supports + her role) rejects
   the rest.

## The workshop worlds

`src/stage/reel/worlds-episode.js` holds the nine painters for this series. They
sit on the same paper, palette and isometric kit as the reels, so a viewer knows
which series they are watching before she speaks, but they compose differently:
the reels are a shelf system, the episodes are a workbench.

Everything is built in three horizontal bands — a kicker at y 300, the stage from
380 to 1000, the bench slab from 1010 down — and object bases are placed with
`benchBox()`, which solves the isometric coordinates that put a box's base centre
on a chosen pixel. Hand-written iso coordinates are how a bench ends up with
crates floating over it.

Two rules that came out of watching the first renders:

- **The first frame of a shot is already composed.** Things move and settle, but
  nothing important fades up from an empty frame. A shot that starts blank reads
  as a loading screen, and the renderer cannot tell the difference.
- **The figure stops where the caption card starts.** Her drawing runs to her
  feet, her feet are off the bottom of the frame, and the card sits on top of
  her. Without clipping her at `captionTop()` her legs reappear underneath the
  card and she looks like she is standing behind a floating plank.

## The soundtrack

Three layers on one timeline, all built by `tools/mix-audio.mjs`:

- **Voice**, from `output/vo.json` — one clip per beat, placed at the beat's first
  frame. A clip that overruns its window is sped up, but only up to 15 %; a clip
  that already fits is left alone. Stretching every line by 5 % to look tidy makes
  the whole read sound sedated.
- **Effects**, from `tools/audio-cues.mjs` — every cue is tied to an event in a
  world (the stamp lands, the parcel passes the checkpoint), expressed as a
  fraction of its shot, so re-timing the script moves the sound with it.
- **No bed.** Silence between lines is the point.

The effects are synthesised by `tools/make-sfx.py` — ten cues from sine sweeps and
filtered noise, normalised to −3 dBFS — so the repo needs no sample pack and the
soundtrack rebuilds byte for byte.

## Delivering it

`series/<series>/episodes/<slug>/output/` holds the film, the sidecar `.srt`, the
contact sheet, the voice clips and `vo.json`. The intermediate silent render is
git-ignored; the delivered film is explicitly un-ignored in `.gitignore`, because
a gitignored render does not survive a fresh checkout and "where is the video" is
not a question the repo should be able to lose the answer to.

Every delivered film is also copied to `final-reels/` at the repository root, with
its subtitles and key-frame sheet, and indexed in that folder's README:

```bash
npm run reels:collect     # copy every finished film, rewrite the index
npm run reels:check       # fail when a delivered film has not been collected
```

The project's `output/` folder stays the source of truth — the root folder is the
one place a reviewer looks, and `test/composition.test.js` fails if it is stale.

`0102` is the worked example: 78 s, 32 shots from 12 beats, 145 effects, 10 voice
clips, peak −1.0 dBFS, mean −20.1 dBFS.
