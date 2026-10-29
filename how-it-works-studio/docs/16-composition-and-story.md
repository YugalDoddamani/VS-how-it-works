# 16 · Composition and Story

Document 15 describes how an episode gets *made*. This one describes what makes a
shot **composition** rather than a drawing with the caption somewhere near it.

It exists because of a concrete complaint: the film was finished, delivered, and
still wrong — objects floated, half the shots had no character in them, four
camera codes covered thirty-two shots, and a third of the cuts changed nothing
but the caption. The fix was not more careful painting. It was to make every
decision that had been living in a painter's remembered numbers into data, and
then to write down the rules that data has to obey.

Two rules govern everything below:

> **Arena chooses meaning. Code chooses geometry.**
> Picking the focal object for a beat is a creative act. Knowing that a 620 px
> card plus a 212 px caption plus her footprint will not fit is arithmetic, and
> arithmetic belongs in a module, not in somebody's eye.

> **The layout must know the caption and the character before it places anything.**
> This is the single change that fixed the floating props. Every other rule here
> follows from it.

---

## 1 · The shot contract

A shot is not "a world plus a caption". It is eight decisions, and the compiler
refuses to emit a shot that has not made all of them.

| Field | Answers | Example |
| --- | --- | --- |
| `visualIntent` | what this shot is *doing* | `reframe` |
| `composition` | which camera | `comparison` |
| `focalSubject` | the one thing the sentence is about | `rule-cards` |
| `supportingSubjects` | what has to be in frame for the focal subject to mean something | `garble` |
| `characterRole` | her job, if she is in frame | `react` |
| `action` | the state change on screen | `rule-meets-a-case-it-cannot-take` |
| `captionTreatment` | how the words are set | `standard` |
| `transitionReason` | why the frame moves, or why it cuts | `new-information-cuts-away` |

Plus a `purpose` block, one line per question:

1. `viewerKnows` — what they already understand walking in
2. `newInformation` — what is new in this shot
3. `screenChange` — what changes on screen
4. `whyThisVisual` — why this is the best picture for this sentence
5. `nextBeatBuildsOn` — what the next beat leans on

"Same scene with a different label" is not a style choice, it is a bug, and
`test/composition.test.js` fails the build on it.

## 2 · The five cameras

A camera is a named decision, not a zoom level. The presets live in
`src/stage/reel/composition.js` and each one declares its crop, push, focal
point, how much of the free region its subject may take, where supporting
subjects go, and whether the shot is *about her*.

| Camera | Use it when | Crop | Subject limit | Supports | She is |
| --- | --- | --- | --- | --- | --- |
| `wide-establish` | the arrangement has to be understood before any part of it is | 1.00 | 98 % × 92 % | row above | corner |
| `object-detail` | one object is the sentence | 1.13 | 84 % × 100 % | beside | corner |
| `character-reaction` | her face is the new information | 1.16 | — | none | lead |
| `overhead-process` | a sequence, read left to right | 1.05 | 100 % × 90 % | row above | corner |
| `comparison` | two things held at once, because the point is the difference | 1.04 | 72 % × 100 % | beside | corner |

`describeComposition(id)` prints the reason, so the storyboard shows *why* a
camera was chosen rather than its name alone.

The camera transform is applied to **the set only**. Applying it to the whole
frame shrinks the boxes the layout just measured, which is exactly how the
"tiny subject" bug happened and was fixed.

## 3 · The layout, in order

`layoutShot(shot, { captionTop, framing, groundY })` returns
`{ preset, usable, focal, support[], figure, ground, warnings[] }`:

1. **Reserve the chrome.** Header strip to 352, caption card bottom at 1780,
   platform UI top 120 / bottom 260, 72 px side margins. `captionTop` is measured,
   not assumed.
2. **Reserve her.** `figureFootprint` derives a 900 × 1500 box from the head
   width alone; the free region ends above her head.
3. **Reserve the supporting band.** A row of props above the focal subject costs
   height; a column beside it costs width. Both are subtracted from the focal
   subject's box *before* it is placed. Without this step props land on top of
   the hero object.
4. **Place the focal subject** on the bench, clamped into the free region.
5. **Place the supporting subjects** in the space that was reserved, at bench
   height, never overlapping the focal box.
6. **Warn.** Anything that had to be nudged, overlapped, or squeezed is returned
   in `warnings` and printed by `--report`.

Constants: `SAFE = { marginX 72, headerBottom 352, captionBottom 1780,
platformTop 120, platformBottom 260, gutter 24 }`. The bench is derived per shot —
`902` when she is in frame, `min(1180, captionTop - 150)` when she is not — because
a fixed bench wasted the bottom third on inserts.

### The card ends her, not the crop

A corner insert has no bottom edge of its own: the shot continues to the caption,
so **the caption card is what ends the figure**. That makes the card the thing the
framing numbers have to clear, and it is why `FRAMING` in `nao.js` starts her head
at 760–900 px rather than at 1065 px. With the old numbers the card landed across
her chest, which reads as a head on a shelf — the floating-head problem with a
caption in front of it. Head, shoulders and waist now sit above the card at every
size, and her hands stay in frame because the hands are the animation.

### Her performance changes on the cut

A pose is a whole drawing, so it can only change on a cut — and a beat is two to
four shots long. One pose per beat meant three cuts landed on the same drawing and
the only thing moving was the camera. `PERFORMANCE` in `compile-episode.mjs` now
maps each expression to a short sequence: one pose per insert shot, and one for
the close-up, which is the shot where her face is the new information. An episode
can overrule a single beat (`PERFORMANCE_BY_BEAT`) when the expression and the
performance disagree - 0106's permission gate is a flat "stop" palm, not the
`focused` pose its row asks for. The orders are per-shot, never random, so a render
stays frame-for-frame reproducible.

Two names are easy to confuse and worth writing down: `openhands` is the
clasped-hands pose (low energy, reads as listening) and `openhands2` is the wide
one. The wide one is the pose that reads as an open question.

## 4 · Subjects have roles

Every prop in `worlds-episode.js` declares a role: `demonstrate`, `compare`,
`transform`, `label`, `react`. A subject that has no role in a beat is not drawn.
The scene a world declares is a *default*, not a guest list: if the plan does not
ask for the parcel, the parcel does not appear.

Twenty-two subjects currently exist across five topics — the automation checklist
and loop, the cloud's racks and copies, the four price tags a "free" tool charges,
the three wifi channels and the crowd that fills them. Each draws itself into the
box the layout gives it, scaling from `box.w` / `box.h` and standing its base on
`opts.ground`.

## 5 · Captions

Four treatments, chosen per beat, all inside the same measured safe region
(`captionTop` is computed from the measured text, and `captionRegion` is exported
so tests can check it):

| Treatment | Shape | Where it is allowed |
| --- | --- | --- |
| `standard` | two lines of narration | anywhere |
| `punchline` | short, no more than 14 words | hook, myth-check |
| `steps` | numbered rows, one per sentence | step-by-step, recap |
| `takeaway` | serif, `REMEMBER` kicker | the resolution only |

Metadata (series badge, episode number and duration, progress hairline) is off by
default and switched on per shot. In 0102 the badge appears on the hook, the title
card and the last shot — where it orients or signs off — and nowhere else.

A caption has to be *readable*: ≤ 26 words, ≤ 120 characters, and `words / 4 + 0.6`
seconds no longer than the run of shots that show it.

## 5b · What the picture is pointing at

Two numbers are compiled onto every shot and every painter may use them:

- `cues` — the beat's sentence as frames (see docs/06). The painter draws the
  state the narration has reached, so the demonstration advances on the word.
- the `focus(x,y,r)` callback — the painter says where the current element sits;
  the frame rings it, letters a note above it, and carries a short reach from
  her hand toward it.

An insert without a focus point is a still life; a focus point with the wrong
camera is a ring around something the viewer cannot see. The pair is what makes
a shot an explanation.

## 6 · The story spine

Every episode walks the same four stages. `title` is a chapter card: allowed, and
never a substitute for a stage.

```
problem → mechanism → complication → resolution
```

- **Problem** — a specific situation. If the hook can carry it, there is no title card.
- **Mechanism** — input → operation → result. Every shot adds information.
- **Complication** — a real twist, not a restatement.
- **Resolution** — earned, and it leaves a usable mental model or a question.

The compiler checks the order and the presence of all four, and reports the spine
in `--report`. A resolution that starts before 60 % of the film is a warning: an
ending that arrives early has not been earned.

## 7 · The staged pipeline

Each stage has its own schema, its own validation and its own prompt. Repair a
stage; do not regenerate the chain.

| # | Stage | Lives in | Validated by |
| --- | --- | --- | --- |
| 01 | topic brief | `content/csv/episodes.csv` | `check_content.py` |
| 02 | story outline | `content/csv/beats.csv` | `check_content.py`, `episode.test.js` |
| 03 | narration | `beats.csv` `narration` | reading rule (real time, 4 words/s) |
| 04 | visual plan | `content/csv/visual.csv` | `compile-episode.mjs` |
| 05 | compilation | `episode.json` (build artefact) | `compile-episode.mjs --check` |
| 06 | render and review | `output/*.mp4`, `output/key-frames.jpg` | `composition.test.js`, the contact sheet |

Stage 04 is where meaning is chosen and geometry is not — the columns are
`stage, intent, focal, supporting, character_role, action, caption_treatment,
compositions, transition_reason, kicker, rationale, hold`.

## 8 · Quality checks, in priority order

Measurable failures are automated. Engagement is judged by watching the contact
sheet, which every delivery must include.

| # | Check | Where it is enforced |
| --- | --- | --- |
| 1 | frame occupancy | `layoutShot` warnings; `composition.test.js` (≥ 8–11 % of the frame per camera) |
| 2 | overlap (caption / character / props / UI) | `layoutShot` — supporting boxes never intersect the focal box, the figure or the caption |
| 3 | safe areas | `SAFE`, asserted per composition, with and without her |
| 4 | shot differentiation | compiler rejects two identical cameras in a row unless the beat is a declared `hold`; the test rejects identical signatures |
| 5 | purpose | all five questions non-empty and not slugs |
| 6 | story progression | spine order; and a beat may not reuse the previous beat's objects *and* action |
| 7 | caption readability | word/character limits and the reading-time window |
| 8 | continuity | every subject id resolves to a painter with a role; nothing appears twice in one frame |
| 9 | contact-sheet review | `node tools/contact-sheet.mjs --reel <id>` → `output/key-frames.jpg` |

## 9 · The delivered folder

Every finished film is copied to `final-reels/` at the repository root, with its
subtitles, its key-frame sheet, and an index that says what each file is:

```bash
cd how-it-works-studio
npm run reels:collect      # copy every film, rewrite final-reels/README.md
npm run reels:check        # fail if a delivered film has not been collected
```

The project's `output/` folder stays the source of truth; the root folder is the
one place a reviewer looks.

## 10 · Before and after, measured

The baseline is frozen in `docs/baseline/0102-p0/`. Same script, same narration,
two renderers:

| Measure | Before (P0) | After |
| --- | --- | --- |
| shots | 32 | 32 |
| shots with nobody in frame | 21 (66 %) | 11 (34 %) |
| her share of the film | 34 % | 63 % |
| distinct camera codes | 4, dominated by `INSERT` (20) | 3 codes over 5 cameras: object-detail 9, character-reaction 9, comparison 7, overhead-process 5, wide-establish 2 |
| distinct focal subjects | 4 | 8 |
| consecutive cuts that change nothing but the caption | 9 of 31 | 0 of 31 |

The "after" numbers are not the goal in themselves — a film that is 100 % her face
would be worse. They are the evidence that the picture is now following the
sentence.

## 11 · Validating it on three more topics (P3)

Same system, three unrelated subjects, no new layout code — only new subjects and
new plans:

| Episode | Topic | Subjects added | Camera mix |
| --- | --- | --- | --- |
| 0101 | where your photos actually live | `photo`, `racks`, `copies`, `heat` | wide, detail, overhead, comparison |
| 0103 | is it actually free | `tags`, `scale` | detail, comparison, overhead |
| 0104 | why your wifi dies at nine pm | `router`, `channels`, `crowd` | wide, detail, comparison, overhead |

The identity holds (same character, same bench, same palette, same caption
treatments) and the metaphors do not repeat: a photo and racks for the cloud, four
hanging price tags for "free", three radio lanes for wifi. Episodes that have not
been planned yet fall back to a mechanical split of their beats and are marked
`source.authored: false`, so the strict gates only close on films that have been
composed by hand.
