# Character and Voice

## Who she is

**Nao** (ナオ) — a drawn presenter. Nothing more than that, on purpose.

- She is an illustrated character, and the video says so out loud on the first
  and last beat.
- She has no age, no school, no family, no love interest, and no opinions
  outside the topic. Anything you give her becomes a continuity problem across
  two hundred episodes; anything you withhold becomes freedom.
- She is not a mascot for a product, and she does not have a sponsor
  personality.
- Her job: make a technical idea feel like something a person is showing you,
  not something being recited at you.

She is the fixed point in the channel. Props change, topics change, palettes
shift by series — Nao does not.

## Visual design

### Silhouette

Readable at 100 px tall, from the thumbnail, in one colour. If the silhouette
stops working, the design has drifted.

- Height in frame: 1120 px, drawn at two-thirds of the `presenter` zone.
- Proportions: 6.5 heads. Anime-stylised but not chibi, because a chibi reads as
  "for children" and the audience is adults.
- Hair: mid-length, asymmetric, one long forelock on her left. The asymmetry is
  what makes the silhouette recognisable and what gives secondary motion
  something to do.
- Costume: a plain hooded top with a high collar, a short overshirt, and a
  lanyard with a blank badge. The lanyard is the one "explainer" signal, and the
  blank badge is where a series icon can be swapped in later.

### Palette

Nao's own colours are separate from the world's, so she never blends into it.

| Token | Hex | Use |
| --- | --- | --- |
| `--nao-skin` | `#FBE3D6` | Face, hands |
| `--nao-skin-shade` | `#F0C7B4` | Under-chin, neck, inner sleeve |
| `--nao-hair` | `#2E2A3B` | Hair mass |
| `--nao-hair-light` | `#4C4663` | Hair highlight band |
| `--nao-hair-line` | `#191725` | Hair outlines and strand lines |
| `--nao-cloth` | `#5B7FA8` | Hooded top |
| `--nao-cloth-dark` | `#3F5D80` | Overshirt, shadow side |
| `--nao-accent` | `#F2A65A` | Lanyard, cuffs, eye highlight |
| `--nao-eye` | `#3E8FA8` | Iris |
| `--nao-line` | `#221F2E` | All line art |
| `--nao-blush` | `#F19C9C` @ 40% | Expression accent |

Rules:
- Line art is one weight (3 px at full size) and one colour. No gradients on
  lines.
- Shading is flat, two tones per material, with the shade always on the
  viewer-right and under-side. One light, upper-left, forever.
- Never tint her with the world's palette. If the world goes dark, she gets a
  rim light, not a colour wash.

### Face

- Eyes: large but not enormous — the iris is about 1/5 of head height. Two
  highlights, one large upper-left, one small lower-right.
- The eye shape carries most of the expression, so the brows move less than a
  western cartoon's would.
- Mouth: three shapes only (`closed`, `mid`, `open`) plus a curve override for
  smiles and frowns. She is not lip-synced to phonemes.
- Blush appears only for `delighted`, `embarrassed`, `thinking-hard`.

## The rig

Nao is drawn once, as a rig, and posed by data. There are no per-episode drawings.

```
head ─┬─ hair-back
      ├─ face ─┬─ eyes (open|half|shut|wide|squint)
      │        ├─ brows (neutral|raised|furrowed|one-up)
      │        └─ mouth (closed|mid|open) + curve
      ├─ hair-front ─┬─ forelock-left
      │              └─ side-strands
      └─ ear, blush
neck
torso ─┬─ hood
       ├─ overshirt
       └─ lanyard+badge
arm-left  ── upper ── fore ── hand (open|point|grip|flat)
arm-right ── upper ── fore ── hand
```

### Poses (from `Vocab`)

Poses are joint angles, not drawings: shoulders, elbows, wrists, torso tilt,
head tilt. Blending two poses is interpolation of those numbers, which is why
`neutral-open → point-board` is a smooth 12-frame move for free.

| Pose id | Reads as | Typical beat |
| --- | --- | --- |
| `neutral-open` | hands at rest, slight open | `explain`, `recap` |
| `present-open` | both palms up, presenting the board | `explain`, `analogy` |
| `point-board` | one arm to the board, head turned | `zoom-in`, `step-by-step` |
| `point-camera` | one hand toward the viewer | `hook`, `myth-check` |
| `think-chin` | hand at chin, head tilted | `explain` (a beat of pause) |
| `shrug-open` | shoulders up, palms up | `myth-check` |
| `thumbs-up` | one hand up, confident | `outro` |
| `hands-on-hips` | squared up, emphatic | `compare` |
| `count-two` | fingers counting a step | `step-by-step` |
| `lean-in` | torso forward, conspiratorial | `hook`, `packet-trip` |
| `present-wide` | both arms wide, framing the whole world | `title`, `diagram` |
| `tired-drop` | shoulders down, a comic beat | `explain` (rare, sparing) |

Twelve poses cover every beat type. Adding a thirteenth needs two episodes that
both needed it.

### Expressions (from `Vocab`)

| Expression | Eyes | Brows | Mouth | Used for |
| --- | --- | --- | --- | --- |
| `neutral` | open | neutral | closed | default |
| `curious` | open, one brow up | one-up | mid | a question |
| `delighted` | squint, blush | raised | smile | a satisfying fact |
| `surprised` | wide | raised | open | a reveal |
| `focused` | half | furrowed | closed | a mechanism |
| `skeptical` | half, one brow up | one-up | flat | a myth |
| `confused` | squint, brows tilt | furrowed | mid | a genuinely hard step |
| `confident` | open | neutral | smile | a conclusion |
| `sheepish` | looking away, blush | raised | flat | an honest caveat |
| `emphatic` | open, leaning | furrowed | open | the key sentence |
| `relieved` | half, soft | neutral | smile | after a metaphor lands |
| `blank` | open, no brows | neutral | closed | a deadpan beat |

### Gestures

A gesture is a short additive curve on top of a pose, with a start, a duration,
and an optional loop. They exist so a single `explain` beat does not look like a
statue.

| Gesture | What it does | Default length |
| --- | --- | --- |
| `talk-hands` | small circular hand movement, 2 loops | whole beat |
| `point-board` | arm extends toward the board, holds 20 f | 24 f |
| `tap-step` | a downward tap on the current step chip | 12 f |
| `sweep-wide` | one arm sweeps across the whole board | 18 f |
| `count-one` / `count-two` / `count-three` | raises the matching number of fingers | 15 f |
| `shrug` | shoulders and palms up, then down | 20 f |
| `nod` | head nod, 2 cycles | 18 f |
| `shake-no` | head shake, 2 cycles | 18 f |
| `lean-back` | torso leans away from a bad idea | 16 f |
| `settle` | returning to neutral after a gesture | 10 f |

### Idle life

Without these, Nao reads as a sticker. All three are deterministic.

- **Blink**: a seeded schedule, one blink every 90–190 frames, 4-frame close.
  Seeded from the `beat_id`, so a re-render blinks at the same moment.
- **Breathe**: a 4 s sine on torso Y, ±1.5 px, and a 1 px shoulder lift.
- **Hair lag**: the forelock and side strands follow the head with a 4-frame
  delay and a clamped spring, so a fast turn flicks the hair.

## Voice

### Written voice (captions)

The caption band is the script. It is written to be read, which is stricter
than being written to be heard.

- Second person. "You type an address."
- Present tense. "The server sends back a copy."
- Sentences of 8–14 words. Never more than 20.
- No parentheticals, no dashes, no semicolons. Those are reading speed, not
  clarity.
- Numbers as digits when they are data ("3 round trips"), as words when they
  are rhetorical ("one machine").
- One em-dash-free sentence per caption card. If you want a dash, you want two
  cards.

### Spoken voice (narration)

Same text as the caption, with these differences allowed:

- A spoken sentence may add one filler word to breathe ("So, …", "Right —").
  These are dropped from the caption, because they cost reading time.
- Spoken emphasis is marked in the sheet's `emphasis` column, which tints the
  token in the caption *and* tells the voice direction where to stress.

If a line reads badly aloud, it is badly written. Fix the line, not the
performance.

### What she never says

- "As an AI…", "Let me explain…", "In this video…", "Don't forget to…" (in the
  narration; the outro may carry a follow prompt, in the caption only).
- Hype words: *revolutionary, game-changing, blazing, seamless, cutting-edge,
  literally insane*.
- Unhedged predictions about products or markets.
- Anything that sounds like advice on money, health, or law.
- "Simply", "just", "obviously" — the three words that make a confused viewer
  feel stupid.

## Channel chrome

- The `badge` zone shows `series · episode number`, e.g. `NETWORKING · 04`.
- The first and last beat carry a footer line:
  **"Illustrated explainer · not a real person"**.
- The outro may carry one follow prompt, in the caption band, never spoken.
- No subscribe animations, no bell icons, no comment-bait arrows. The reference
  studio used an arrow for that; this channel does not, because it trades
  attention for trust.

## Model sheet

A single reference image of Nao belongs at `assets/nao/model-sheet.png` once the
rig exists: front, three-quarter, and side, with the expression grid beneath.
It is the artefact a person checks new poses against, and the thing that keeps
her on-model across a collaborator change. It is not used at render time.

Until then, `docs/` is the model sheet.
