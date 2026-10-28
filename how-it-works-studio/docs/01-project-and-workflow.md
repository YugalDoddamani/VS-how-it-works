# Project and Workflow

## Purpose

Explain how technology works, clearly, in under ninety seconds — with a
character who makes it watchable and an isometric world that makes it visible.

The project turns a question into a publishable draft with minimal manual work,
while keeping a human in the loop for the two things that still need a person:
the accuracy of the answer and the quality of the pacing.

## Audience and platform

- Primary platforms: Instagram Reels, YouTube Shorts, TikTok.
- Primary viewing device: a phone, held vertically, often muted.
- Primary format: vertical 1080 × 1920.
- Audience: a curious adult with no technical background. Not a developer, not
  a child. They have heard the word "server" and are not sure what it is.
- Episodes must work with sound off. Captions carry the script.
- Episode length: 45–75 seconds. Long enough to actually explain, short enough
  to finish.

## What makes this channel distinct

1. **A character, not a narrator.** Nao's face reacts to the idea, so the viewer
   knows what to pay attention to without being told.
2. **A world, not a slide.** The isometric props assemble as she talks. Each
   prop is a piece of the concept, so the explanation has a physical shape.
3. **A script, not a snippet.** The caption band is the script, written to be
   read in two lines. It is the same text as the narration, so muted viewers get
   the whole thing.
4. **Sources on screen.** Every claim has a row in `Sources`, and the publishing
   copy lists them. An explainer channel's only real asset is being right.

## Standard workflow

1. Receive a question from the user, or take the first unchecked entry in
   `topics.md`.
2. Write the answer as one paragraph in plain language. If it cannot be done in
   one paragraph, the question is too large — split it.
3. Add an `Episodes` row. Add `Sources` rows for every claim.
4. Fill `Beats` — 8 to 14 rows, one idea each.
5. Fill `Props` and `Paths` for whatever the world has to show.
6. `npm run sheet:check` until it is clean.
7. `npm run sheet:build -- <slug>` and read the generated `script.md` aloud.
8. `npm run preview -- <slug>` and look at the contact sheet.
9. `npm run render -- <slug>`.
10. Run the checks in `10-quality-and-publishing.md`.
11. Fill the `Publish` tab, move `status` to `published`.

## Commands that implement the workflow

| Workflow step | Command |
| --- | --- |
| Check the environment and the workbook | `npm run doctor` |
| Pull the live Google Sheet into the repo | `npm run sheet:pull` |
| 2–5, author the episode | edit the workbook |
| 6, validate | `npm run sheet:check` |
| 7, compile and read back | `npm run sheet:build -- <slug>` |
| 8, preview | `npm run preview -- <slug>` |
| 9, final render | `npm run render -- <slug>` |
| 10, checks | automatic; re-runnable with `npm run verify -- <slug>` |
| 11, publishing copy | `npm run publish -- <slug>` |

Steps 7–9 are the ones that need human judgement. The tooling measures clipping,
safe areas, duration, codec, and caption length. Whether the explanation is
actually clear is not measurable, and does not become measurable by adding more
tooling.

## Human review

A built episode is a draft until the user reviews it.

The user should review:

- **Is it true?** Every claim traceable to a source that says it.
- **Is it clear?** Could someone who knows nothing follow it once, muted?
- **Is the analogy honest?** Where the metaphor breaks, does the episode say so?
- **Does it hold attention?** Watch it on a phone, with the sound off, once.
- **Is Nao on-model?** Same proportions, same palette, no drift.

## Where the slate stands

Five episodes are written, validated and scheduled — 0101 to 0105, one per series,
about 76 seconds each. None is rendered. The workflow below is what turns each of
them into a film.

## Standard project folder

```
projects/<slug>/
├── episode.json       compiled from the workbook; never edited by hand
├── script.md          narration in order, with claims and sources
├── publishing.md      copied from the Publish tab, plus the source list
├── render-report.json toolchain, timings, every check that ran
├── preview/
│   ├── contact-sheet.png
│   └── frames/
├── frames/            generated, git-ignored
└── output/final.mp4
```

A slug is `NNNN-short-title`: a four-digit episode number, then a hyphenated
title. It is unique, lowercase, and never reused. A revision of a shipped
episode gets `-v2` appended and its own folder, so the old cut stays available
for comparison.

## Success criteria

A successful run produces:

- A correct answer to one question, stated in the first 10 seconds.
- A vertical MP4 that reads cleanly muted on a phone.
- Correct duration, frame rate, codec, and caption timing.
- No clipped text, no props out of frame, no blank frames.
- A publishing document that lists the sources.
- An honest report of what was checked and what was not.

## What this project deliberately does not do

- It does not pick topics by trend. A topic backlog is maintained by hand.
- It does not generate narration text. A person writes every sentence.
- It does not publish. The operator reviews and posts.
- It does not chase a new visual style per episode. Consistency is the product.
