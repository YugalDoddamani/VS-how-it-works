# 0102 — How AI automation actually works

> How does AI automation actually work?

| | |
| --- | --- |
| Series | **AI Without the Hype** |
| Level | beginner |
| Length | 78 s · 2340 frames · 12 beats · 32 shots |
| Words spoken | 139 |
| Status | `rendered` — **film delivered** |
| Sheet rows | `content/csv/beats.csv` filtered to `episode_id = '0102'` |

## The film

`output/0102-how-ai-automation-actually-works.mp4` — 1080×1920, 30 fps, 78.00 s,
H.264 + AAC mono, burned-in captions, voice-over and sound effects. It is
committed, not just rendered: a film that only exists on a build machine is a
film the repo cannot answer questions about.

| File | What it is |
| --- | --- |
| `0102-how-ai-automation-actually-works.mp4` | the delivered film |
| `0102-how-ai-automation-actually-works.srt` | the same captions as a sidecar track |
| `key-frames.jpg` | 12 evenly spaced frames, for judging the cut without watching |
| `vo/` | the ten voice-over clips, one per beat |
| `vo.json` | where each clip starts, and the line it speaks |

## Where this is up to

Written, scheduled, compiled, rendered and mixed. What exists:

- `script.md` — narration, claims, and the reading-speed check (generated).
- `storyboard.md` — per-beat visuals, props, camera, and the mouth schedule (generated).
- `publishing.md` — caption, hashtags, cover, sources (generated).
- `README.md` — this file (hand-written).
- `output/` — the film and its sidecars (see above).

Regenerate the three derived files with `node tools/build-projects.mjs`. Rebuild
the film with:

```sh
node tools/compile-episode.mjs 0102
node tools/render-reel.mjs --reel 0102 --all --mp4 series/ai-without-the-hype/episodes/0102-how-ai-automation-actually-works/output/0102-silent.mp4
node tools/mix-audio.mjs --reel 0102 \
  --video series/ai-without-the-hype/episodes/0102-how-ai-automation-actually-works/output/0102-silent.mp4 \
  --out   series/ai-without-the-hype/episodes/0102-how-ai-automation-actually-works/output/0102-how-ai-automation-actually-works.mp4
node tools/export-captions.mjs --reel 0102
node tools/contact-sheet.mjs --reel 0102
```

## The idea

Defuses the fear by making the mechanism visible. The saveable payoff is the
four-step loop — goal, tools, check, repeat — plus the question it gives her to
ask at work: "where is the check?"

**The walkaway:** A goal, some tools, a check, and a loop. The model is one part of it.

## How it is built

The episode is authored in the sheet and compiled, not hand-animated:

| Beat | World | What is on the bench |
| --- | --- | --- |
| 1 — hook | `ep_checklist` | a clipboard of boring steps ticking itself off; a robot with a lasso round it |
| 2 — title | `ep_title` | the four parts of the loop, waiting on the bench |
| 3 | `ep_steps` | four numbered crates, a parcel handed along the row |
| 4 | `ep_rules` | IF card → THEN card, and a belt that stamps what passes |
| 5 | `ep_rules_broken` | the same week later: the parcel is a shape the rule cannot take |
| 6 — analogy | `ep_pile` | a messy pile, a funnel, a model, and two bins: sensible / nonsense |
| 7 — step by step | `ep_loop` | GOAL · TOOLS · CHECK · AGAIN, each shot on its own station |
| 8 | `ep_loop` | the same loop, with the model highlighted as one part |
| 9 — myth check | `ep_gate` | a checkpoint on a rail: the arm lifts, the parcel is waved through |
| 10 | `ep_gate` | the same checkpoint with the arm down, and "no check, no automation" |
| 11 — recap | `ep_loop` | the four stations again, named one at a time |
| 12 — outro | `ep_outro` | a signpost: "ask where the check is" |

She is on screen for 20 of the 32 shots, alternating corners so the bench stays
readable, and she is drawn from the same twelve-figure rig as the reels — plus
two new drawings (`gesture`, `openhands2`) made for this episode's talking
close-ups.

## Reading check

Every caption gets `words / 4 + 0.6` s. Beat 12 originally had 14 words in 3.0 s
and failed the check, so two seconds moved from beat 7 (10 s → 8 s) to beat 12
(3 s → 5 s). The sheet, the script and the film all carry the same timing.
