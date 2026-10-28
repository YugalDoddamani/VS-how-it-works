# Baseline — episode 0102, before content-driven composition (P0)

This folder is a fixed reference point. It holds the cut as it existed when the
composition system was still rule-by-beat-type, so later changes can be judged
against something concrete instead of a memory of a video.

Nothing in here is regenerated. If the film is rebuilt, this stays as it is.

| File | What it is |
| --- | --- |
| `key-frames-before.jpg` | the 12-frame contact sheet of the delivered film (pre-change) |
| `shots-before.csv` | every compiled shot: number, beat, code, placement, world, frames, start, caption |
| `the-film.mp4` | a copy of the film as delivered — *add it here if the baseline ever needs to be watched, but note it is 14 MB; the committed film in `../..` is byte-identical at this commit* |

## Measured

From `shots-before.csv` (32 shots over 78 s):

| Measure | Value | Reading |
| --- | --- | --- |
| shots | 32 | fine |
| shots with no character | 21 (66 %) | she vanishes for two thirds of the film |
| shots at `placement: off` | 20 | the camera never lands on her face at the moment of the joke |
| distinct `code` values | 4 (`INSERT` 20, `MCU` 9, `CU` 2, `TITLE` 1) | the shot grammar is mostly one code |
| `ep_loop` shots | 9 | one world carries 28 % of the film |
| consecutive pairs with the same world **and** the same placement | 9 of 31 | a third of the cuts change nothing but the caption |

## The failures this baseline records

These are the reasons the composition system was rebuilt, written down before
the rebuild so they can be checked afterwards.

1. **The plan is keyed on beat type, not on meaning.** `BEAT_PLAN.explain` always
   produces `MCU, INSERT, INSERT` — so "automation is steps a machine follows"
   and "the check is where it fails" are cut identically, even though one is a
   definition and the other is a warning.

2. **The camera does not make decisions.** A shot's only "camera" was
   `1 + 0.028 * (n % 3 - 1) + 0.02 * t`: a scale offset derived from the shot
   number. It varies the pixels and communicates nothing. There is no
   object-detail shot, no comparison shot, no overhead process shot.

3. **Objects have no role.** The checklist painter draws a checklist *and* a
   robot *and* a scan line because it is the `ep_checklist` painter, not because
   the beat needs all three. In the "one week later" beat the two leftover
   "filed work" crates are decoration with no claim to make.

4. **Chrome outranks content.** Every frame carries the series badge, the episode
   number and duration, and a progress hairline — including the hook and the
   final line, where the only thing that should compete for attention is the
   sentence. The caption is one treatment (46 px card) whether the line is a
   definition, a punchline or a four-item recap.

5. **The layout is chosen before the caption exists.** Painters place objects at
   hard-coded y values and the caption is measured afterwards, so the only thing
   keeping them apart is that somebody once moved a number. Nothing checks it.

6. **No beat answers "what changes on screen".** Nine of the 31 cuts change
   neither the world nor where she stands. If a cut does not change the state of
   the picture, it is a caption change, and a caption change is not an edit.

## What "fixed" has to look like

- every shot declares a visual intent, a composition preset, a focal subject and
  an action, and the compiler rejects a shot whose fields disagree;
- the composition presets are named camera decisions with crops and safe regions,
  not scale offsets;
- every object drawn has a role in the beat, and an object without a role does
  not get drawn;
- the layout engine reserves the caption and the character *first*, then places
  the focal subject in what is left;
- captions have four treatments, and the metadata gets out of the way;
- the cut is checked: no two consecutive shots may be the same picture unless
  the plan says so on purpose.
