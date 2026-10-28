# Lip-Sync

How Nao's mouth moves in time with her words — deterministically, from text, with
no audio analysis at render time.

## Why text-driven

Three options were available:

| Approach | Needs | Breaks when |
| --- | --- | --- |
| Analyse the audio track | an audio file, a forced aligner, network or a heavy model | the voice is re-recorded, or the render is silent |
| Hand-key every mouth shape | an animator, per beat | the script changes |
| **Derive from the narration text** (chosen) | nothing but the string the sheet already has | never — text and schedule are the same object |

The narration text is already the single source of truth for the caption, the
voice-over script, and the word-level emphasis. Deriving visemes from it means:

- A silent episode still animates correctly.
- Re-recording the voice does not invalidate the animation.
- The mouth can never drift from the words, because they are computed together.
- `npm test` can verify it without a browser or an audio file.

The cost: lip-sync is *plausible*, not phonetically measured. For a stylised
character at 380 px wide that is indistinguishable from measured. Do not pretend
otherwise in a report.

## The twelve visemes

Cropped from the talking-head sheet into `assets/nao/visemes/`:

`rest`, `A`, `E`, `I`, `O`, `U`, `W`, `MBP`, `FV`, `L`, `SZTD`, `CGK`.

Nine are vowel-ish or neutral, three are consonant clusters. Twelve is the
standard count for 2D animation and the most the sheet offers — which is why the
sheet is the authority on the set.

## Grapheme → viseme

English spelling is not phonetic, so this is a **grapheme** matcher with an
ordered rule list, not a pronunciation model. Longer patterns win; the first
matching rule consumes its span.

| Order | Pattern | Viseme | Example |
| --- | --- | --- | --- |
| 1 | `tion`, `sion` | `CGK` | ac**tion** |
| 2 | `ch`, `sh`, `tch` | `CGK` | **ch**ange, **sh**are |
| 3 | `th` | `SZTD` | **th**ing |
| 4 | `ph` | `FV` | **ph**oto |
| 5 | `qu` | `W` | **qu**ick |
| 6 | `oo`, `ou`, `ew` | `U` | c**oo**l |
| 7 | `ee`, `ea`, `ie`, `y` (final) | `I` | s**ee** |
| 8 | `ai`, `ay`, `ei` | `E` | w**ai**t |
| 9 | `oa`, `ow` (not final), `au`, `aw` | `O` | l**ow** |
| 10 | `ng` | `CGK` | thi**ng** |
| 11 | `ck`, `k`, `c` (before a/o/u), `g` (hard), `q` | `CGK` | **c**at, **k**ey |
| 12 | `s`, `z`, `t`, `d`, `x`, `c` (before e/i) | `SZTD` | **s**ay |
| 13 | `m`, `b`, `p` | `MBP` | **m**e |
| 14 | `f`, `v` | `FV` | **f**ast |
| 15 | `l`, `r` | `L` | **l**ook |
| 16 | `a` | `A` | c**a**t |
| 17 | `e` | `E` | b**e**d |
| 18 | `i` | `I` | s**i**t |
| 19 | `o` | `O` | g**o** |
| 20 | `u` | `U` | c**u**p |
| 21 | `w` | `W` | **w**e |
| 22 | `h`, `j`, `y` (initial) | `CGK` | **h**ow |
| 23 | anything else | `rest` | — |

Silent `e` at the end of a word is dropped (`make` → `MBP A CGK`). A doubled
consonant is collapsed (`tt` → `SZTD` once).

This is a heuristic and it is wrong in known ways (`one`, `of`, `the`, `though`).
A small exception dictionary in `visemes.js` handles the ~30 most common English
words; everything else falls through the rule list. Precision beyond that does
not pay for itself on a stylised mouth.

## Timing

Per word, from the caption's word schedule:

```
slot = durationFrames / characters        # time per character, per word
for each grapheme at index i in word:
    start = wordStart + i * slot
    hold  = slot
```

Then two corrections:

1. **Minimum hold.** A viseme holds at least 2 frames. At 30 fps, mouth shapes
   shorter than 66 ms read as flicker. If a word is faster than
   `graphemes × 2` frames, merge adjacent visemes (the same cluster first) until
   it fits.
2. **Word gap.** Insert `rest` for `clamp(round(slot × 0.6), 1, 4)` frames between
   words, and `rest` for 8–12 frames at sentence-final punctuation.

`openness` (0–1) is derived per viseme — `rest` 0.0, `MBP` 0.05, `SZTD` 0.2,
`FV` 0.25, `W` 0.3, `U` 0.4, `CGK` 0.5, `I` 0.55, `E` 0.65, `L` 0.6, `O` 0.75,
`A` 1.0 — and used in full-body mode to interpolate a jaw offset instead of
swapping the mouth image.

## Coarticulation

Real mouths do not snap between shapes; they blend. Two rules, both cheap:

- **Blend in, hold, blend out.** Each viseme's first 2 and last 2 frames crossfade
  with its neighbour (weight ramp), so `A → MBP` passes through a half-closed
  shape rather than cutting.
- **Anticipate a bilabial.** If the next viseme is `MBP` or `W`, the current
  viseme's last 2 frames pull toward `U`. The mouth closes *before* the `m`, which
  is what makes it look like speech rather than a slideshow.

## Where the mouth sits

| Shot | Head height | Rendering |
| --- | --- | --- |
| Talking head | 600–900 px | Full viseme image, per `docs/02` |
| Mid shot | 200–600 px | Viseme image, mouth region only, 4-frame blend |
| Full body | < 200 px | **Three states** (`closed` / `mid` / `open`) + jaw offset, from `openness` |

## What the current rig actually does with it

The shipped rig (`docs/13`) draws whole figures and has no mouth to swap. The
schedule is not wasted: `nao.js` reads `openness` per frame and spends it on her
**body** — a nod of a few pixels and a hair of extra lean on a stressed vowel.
That is enough for a 360 px head at 30 fps, and it keeps the one property that
mattered: the movement is derived from the words, so it can never drift from the
caption.

The viseme tables above stay as the specification for an articulated rig. When
one exists, it plugs in at `opennessAt()` — the schedule, the timing rules and
the coarticulation model do not change.

Below 200 px of head height, per-viseme detail is sub-pixel. Use the three-state
reduction; it reads as speech and it is cheaper to render.

## Micro-rules that sell it

- **Never blink while `openness > 0.3`.** Queue the blink until the next `rest`.
- **Close on punctuation.** Sentence-final `rest` for at least 8 frames; a comma
  gets 4.
- **Do not animate the mouth while the caption is off screen.** If a beat's
  caption has not started, the mouth is at `rest`.
- **Emphasis words open 15 % wider** (`openness × 1.15`, clamped at 1.0). It is a
  small lie that matches how people actually stress a word.
- **Head moves on stressed syllables**, not on every viseme: a 1 px bob on the
  emphasis token only.

## Determinism

`visemesForText(text)` and `mouthStateAt(schedule, frame)` are pure functions of
`(text, frame)`. No `Date.now()`, no randomness, no audio. The schedule is built
once per beat at compile time and serialised into `episode.json`:

```json
"lipSync": {
  "mode": "full-body",
  "fps": 30,
  "frames": [
    { "f": 0,   "v": "rest", "o": 0.0 },
    { "f": 6,   "v": "I",    "o": 0.55 },
    { "f": 9,   "v": "U",    "o": 0.4 },
    { "f": 11,  "v": "MBP",  "o": 0.05 }
  ]
}
```

Only *changes* are stored, not every frame — a 9-second beat is ~80 entries, not
270. `mouthStateAt` binary-searches the list and applies the blend. This keeps
`episode.json` reviewable by a human, which is the point of compiling it.

## Verification

`npm test` covers, without a browser:

- grapheme mapping for the 30 exception words and each rule's example;
- minimum-hold merging never produces a viseme shorter than 2 frames;
- total schedule length equals the beat's `durationFrames`;
- the schedule starts and ends on `rest`;
- `mouthStateAt` at frame 0 of a caption equals `rest`, and at the last frame
  equals `rest`;
- the same text always yields the same schedule (byte-identical JSON).

`npm run preview -- <slug> --beat N` renders a filmstrip of the beat's mouth
region at 4-frame intervals. Look at it: a mouth that never closes looks like
singing, and no unit test catches that.

## Limitations to state in a report

- Derived from spelling, not pronunciation. Homographs (`read`) get one shape.
- No tongue or teeth variation beyond what the 12 visemes carry.
- Not aligned to audio; a voice actor's pauses will not match exactly. If a
  narration file is supplied, the schedule can be stretched to its duration but
  still not aligned phoneme-by-phoneme. Say so rather than claiming a match.
