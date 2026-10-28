# Character and Voice

## Who she is

**Nao** (ナオ) — a drawn presenter with pink bobbed hair, a black headband, gold
eyes and a choker. She is an illustrated character, and the video says so.

- She is not a real person, not an avatar of one, and not a likeness of anyone.
- She has no biography: no age given on screen, no school, no family, no love
  interest, no opinions outside the topic. Anything you give her becomes a
  continuity problem across two hundred episodes.
- She is the channel's fixed point. Topics change, props change, the world
  changes — Nao does not.
- Her job: make a technical idea feel like a friend showing you something on her
  phone, not a lecture.

## The reference sheets

Two sheets define her. They live in `assets/nao/` and are the only authority on
her design.

| File | Contains | Used for |
| --- | --- | --- |
| `model-sheet.webp` | Character sheet, turnaround, 15 expressions, 18 hand poses, 9 body poses, 7 outfits, accessories | Full-body and mid-shot frames |
| `talking-head-sheet-1k.webp` | 12 visemes for lip-sync | Talking-head frames |
| `reference/01…05-*.webp` | The model sheet split into its five sections | Fast lookup while drawing |
| `visemes/*.webp` | The 12 visemes, cropped and named | The lip-sync pipeline |

Nao is **generated per beat from the sheets**, not drawn by hand and not a
different image every episode. That is the difference between a character and a
mascot-of-the-week.

## The pose library

Twelve drawings, listed with their faces in `docs/13`. A pose is not a
per-episode decision: the shot cell names the performance ("deadpan, flat
stare") and the compiler picks from the library. Adding a pose means drawing a
whole figure — never a head — and adding it to `tools/build-nao-poses.py`.

## Design

### Silhouette

Readable at 100 px tall, in one colour, from a thumbnail.

- Height in frame: 1120 px at full body (two-thirds of the `presenter` zone).
- Proportions: 6.5 heads at full body. Adult-stylised, not chibi — a chibi reads
  as "for children", and the audience is adults.
- **Hair is the silhouette**: a chin-length bob with a soft inward curl, a heavy
  fringe swept right, one longer strand on her left. Short enough to read as
  practical, distinct enough to recognise at thumbnail size.
- **The headband** is the one accessory that must never be dropped. It is the
  cheapest recognition cue in the design and it reads at 80 px.
- The choker is visible in close-ups only. At full-body scale it is a 4 px line,
  so it is optional there.

### Palette

Sampled from the model sheet. Set as CSS custom properties in
`src/stage/style.css` `:root`, and used **only** for Nao. The world's palette
(`04-visual-style.md`) never tints her.

| Token | Hex | Use |
| --- | --- | --- |
| `--nao-hair` | `#F2A6C0` | Hair mass |
| `--nao-hair-light` | `#FFD3E0` | Fringe highlight band |
| `--nao-hair-shadow` | `#D98AA6` | Under-fringe, nape |
| `--nao-hair-line` | `#B76A87` | Strand lines |
| `--nao-skin` | `#FBE0D2` | Face, hands |
| `--nao-skin-shade` | `#F3C8B4` | Under-chin, neck, inner sleeve |
| `--nao-eye` | `#E3A64E` | Iris |
| `--nao-eye-dark` | `#A9691F` | Iris rim, pupil edge |
| `--nao-line` | `#5A4048` | All line art |
| `--nao-band` | `#3A343C` | Headband, choker |
| `--nao-cloth` | `#F49BB8` | Tee |
| `--nao-cloth-shade` | `#E27FA1` | Tee shadow side, sleeve roll |
| `--nao-shorts` | `#4A4453` | Shorts |
| `--nao-shoe` | `#E9DFDA` | Trainers |
| `--nao-blush` | `#F08FA8` @ 45 % | Expression accent |

Rules:

- Line art is one weight (3 px at full size), one colour. No gradient strokes.
- Shading is flat: two tones per material, shade always under-side and
  viewer-right. One light, upper-left, forever.
- The eyes are the exception to flat shading: iris gradient (gold → dark gold),
  two highlights (large upper-left, small lower-right). This is where the anime
  read lives.
- If the background goes dark, she gets a rim light — never a colour wash.

### Face and eyes

- Eye shape carries most of the expression; the brows move less than a western
  cartoon's would.
- Mouth is a **viseme overlay** from the talking-head sheet (see below), not a
  drawn curve per frame.
- Blush appears only on `blushing`, `flirty`, `happy`, `laughing`.

## Expressions (15)

Taken directly from the model sheet. These are the `expression` values in the
`Vocab` tab.

| id | Reads as | Typical beat |
| --- | --- | --- |
| `neutral` | resting, half-lidded calm | default, transitions |
| `happy` | closed smile, soft brows | a satisfying fact |
| `smiling-eyes-closed` | full smile, eyes shut | the payoff |
| `excited` | open mouth, bright eyes | a reveal |
| `surprised` | wide eyes, small open mouth | the hook's twist |
| `confused` | tilted brows, flat mouth | a genuinely hard step |
| `angry` | low brows, frown | a bad practice |
| `sad` | downcast brows | a consequence |
| `pout` | small mouth, one brow | a joke, a complaint |
| `wink` | one eye shut | playfulness, CTA |
| `flirty` | half-lidded, smirk | sparingly — a tease, never the topic |
| `blushing` | blush + soft mouth | an honest admission |
| `thinking` | eyes up, finger to chin | "so how does it…" |
| `shocked` | wide eyes, open mouth | a number that surprises |
| `laughing` | eyes closed, wide open mouth | an absurd truth |

Use `flirty` at most once per episode, and never while the topic is security,
privacy, money, or health. The channel's promise is "she can explain anything" —
a presenter who flirts with the camera instead of explaining loses that.

## Hand poses (18)

From the model sheet, used as the `hand` part of a rig pose.

`open-palm`, `point-up`, `point-right`, `point-left`, `thumbs-up`, `ok-sign`,
`peace-sign`, `stop-palm`, `fist`, `palm-up-present`, `palm-out-welcome`,
`index-touch`, `finger-heart`, `holding-pen`, `holding-phone`,
`holding-tablet`, `holding-cup`, `arms-crossed`.

Mapping to beat intent:

| Intent | Hand |
| --- | --- |
| Present the board | `palm-up-present` |
| Point at a prop | `point-right` / `point-left` (mirrored to the prop's side) |
| Count a step | `point-up` (1), then two/three fingers via `peace-sign` variants |
| Stop / "don't do this" | `stop-palm` |
| Agreement, encouragement | `thumbs-up` |
| Warmth, sign-off | `finger-heart` (outro only) |
| Holding a device prop | `holding-phone` / `holding-tablet` |
| Thinking | `index-touch` |
| Refusal, correction | `stop-palm` + `arms-crossed` |

## Body poses (9)

`standing-neutral`, `pointing-explaining`, `holding-tablet-working`,
`thinking`, `presenting-palm-up`, `cheerful-jump`, `sitting-cross-legged`,
`lying-down-relaxed`, plus the `hoodie` outfit variant.

**All nine are available — none is restricted.** The default for an explainer
shot is `standing-neutral` → `pointing-explaining` → `presenting-palm-up`,
because those read as a presenter. The seated, lying and jumping poses are used
when the shot calls for them: a cosy night-topic reel, a floor-level `CORNER`
shot, a recap with a jump. Match the pose to the shot, not to a rule.

One practical note: `lying-down-relaxed` and `sitting-cross-legged` work best in
`CORNER` and `POV` shots, where she is part of the viewer's space rather than
presenting a diagram. In a `SPLIT`, they look odd because the split implies she is
standing beside a board.

## Outfits (7)

**All seven are in rotation. Nothing is flagged off.** The wardrobe is a feature
of the channel, not a hazard: a new outfit per reel is one of the cheapest
reasons to re-watch and one of the clearest signals that a new video is new.

| id | Outfit | Best for | Used in |
| --- | --- | --- | --- |
| `casual` | pink tee, charcoal shorts | the default; topics about your own stuff | R05 |
| `hoodie` | black oversized hoodie | cold, cosy, evening, outside | R01 |
| `sporty` | black crop top, black shorts | movement, home, screens in the living room | R04 |
| `casual-dress` | off-shoulder top, pink plaid skirt | bright, weekend, shopping, social | R03 |
| `office-casual` | white shirt, pencil skirt | work, money, messages from "your bank" | R02 |
| `sleepwear` | pink character pyjamas | late-night scrolling, doom-scrolling, 3 a.m. topics | — |
| `summer` | two-piece swimwear | holidays, heat, travel, seasonal | — |

Rules:

1. **One outfit per reel.** Never change mid-reel — it breaks continuity and reads
   as two videos stapled together.
2. **Rotate.** No two consecutive reels in the same outfit. The rotation is
   tracked in `series/README.md`.
3. **Match the setting.** The outfit should be what someone would actually be
   wearing in the shot: a hoodie outside in winter, a towel and a crop top after a
   workout, sleepwear at 3 a.m.
4. **Keep the four fixed things.** Whatever the outfit, the headband, choker,
   pink palette and bob silhouette stay. Those are the character; the clothes are
   not.
5. **No outfit changes the presentation rules.** She explains the same way in
   every look.

## Accessories and marks

- `headband` — always on. Never removed.
- `choker` — close-ups only.
- `heart-icons`, `emotion-marks` (`!`, `?`) — up to two per beat, above the
  shoulder, never over the face.
- Props she can hold: `tablet`, `phone`, `cup`, `pen`, `cat-pillow`.
- The `cat-pillow` is the channel's one running visual joke. It may appear in
  exactly one beat per episode, and it must be doing something useful (a cushion,
  a stand-in for a server, a sleeping "idle process").

## The rig

Nao is assembled from the sheets by parts, so poses and expressions compose.

```
head ─┬─ hair-back
      ├─ face ─┬─ eyes (per expression)
      │        ├─ brows (per expression)
      │        └─ mouth ── VISEME OVERLAY (per phoneme, per frame)
      ├─ hair-front ─┬─ fringe-right
      │              └─ side-strand-left
      └─ band, choker, blush
torso ─┬─ tee ─┬─ sleeve / roll
       └─ lanyard-badge (optional)
arm-left  ── upper ── fore ── hand (per hand pose)
arm-right ── upper ── fore ── hand
legs      ── per body pose
```

Poses are joint angles, not separate drawings, so `standing-neutral →
pointing-explaining` is a 12-frame interpolation for free. Expressions swap eye,
brow and mouth parts. The mouth is then *overridden* every frame by the viseme
layer — which is the whole point of the talking-head sheet.

### Idle life

Deterministic, seeded from `beat_id`:

- **Blink**: one every 90–190 frames, 4-frame close. Suspended while a viseme is
  open (you cannot blink mid-vowel without it looking like a glitch).
- **Breathe**: 4 s sine on torso Y, ±1.5 px; 1 px shoulder lift.
- **Hair lag**: fringe and side strand follow the head with a 4-frame delay and a
  clamped spring.

## Lip-sync

Twelve visemes, one per cell of the talking-head sheet.

| Viseme id | Sheet label | Covers | Mouth read |
| --- | --- | --- | --- |
| `rest` | REST / SILENT | silence, punctuation pauses | closed, slight smile |
| `A` | A / AH | a, ah | wide open, tongue low |
| `E` | E | e, eh | wide, teeth showing |
| `I` | I | i, ee, y | narrow wide, teeth |
| `O` | O | o, oh, aw | round, tall |
| `U` | U / OO | u, oo, w | small round, pursed |
| `W` | W / Q | w, qu | pursed, tiny |
| `MBP` | M / B / P | m, b, p | closed, pressed |
| `FV` | F / V | f, v | lower lip to teeth |
| `L` | L | l | tongue tip up, open |
| `SZTD` | S / Z / T / D | s, z, t, d, th | teeth close, narrow |
| `CGK` | C / G / K / N / CH / J / SH | k, g, c, n, ch, j, sh | mid open, back |

The mapping, the timing model, and the coarticulation rules are specified in
[`11-lip-sync.md`](11-lip-sync.md) and implemented in
`src/stage/rig/visemes.js`.

**Two modes:**

1. **Talking head** (the reference sheet's use case): head-and-shoulders framing,
   viseme overlays the whole lower face, eyes and brows carry the emotion from
   the expression sheet.
2. **Full body** (default for explainers): the viseme still drives the mouth, but
   at 1120 px tall a mouth is ~18 px wide, so it is expressed as **three states**
   — `closed`, `mid`, `open` — plus a jaw offset. Same schedule, reduced
   fidelity. Below 200 px of head height, do not attempt visemes at all.

Never attempt phoneme-accurate lip-sync from audio. The schedule is derived from
the **narration text**, which the sheet already contains, so a re-record does not
break the animation and a silent render still animates the mouth correctly.

## Voice

### Written voice (captions)

The caption band is the script.

- Second person, present tense: "You type an address."
- 8–14 words per sentence, never more than 20.
- No parentheticals, dashes, or semicolons. If you want a dash, you want two
  cards.
- Numbers as digits when they are data ("1.5% of the world's electricity"), as
  words when rhetorical ("one machine").

### Spoken voice (narration)

Same voice, but **not the same words**. A 45 s reel carries about 120 spoken
words at a natural pace; the caption band carries more, because reading is faster
than listening. So the narration is a tighter performance of the script, not a
read of it:

- Cut the connective tissue ("That is…", "It is…", "Now imagine…") before you
  cut a noun. The caption keeps it; the ear does not need it.
- One filler to breathe ("So,", "Okay —") is allowed, and never captioned.
- `emphasis` tokens mark where the read stresses and where the caption tints.
- Never let a sentence straddle a cut. If the line does not fit the shot, the
  line is too long for the shot — not the shot too short for the line.

Narration is stored as `output/vo.json` alongside the clips: one clip per run of
shots, with the words, so the timing is reviewable without listening.

### How she talks to this audience

The audience is a woman who is curious about how things work but is **not**
searching for it — she is scrolling. She is not a developer and does not want to
become one. She wants to understand the thing she already uses.

- Never assume prior knowledge. Never say "as you probably know".
- Never make her feel late. No "it's easy", "simply", "obviously", "just".
- Curiosity over competence: "here's what's actually happening" beats "here's
  how to do it".
- The stakes are personal — her photos, her messages, her money, her time — not
  enterprise architecture.
- One joke per episode, at most, and it is a joke about the situation, not about
  the viewer.

### What she never says

- "As an AI…", "Let me explain…", "In this video…", "Don't forget to…".
- Hype: *revolutionary, game-changing, blazing, seamless, insane*.
- Predictions about products, markets, or "the future of work".
- Anything that sounds like money, health, legal, or security advice.
- Mansplaining openers: "Actually…", "Technically…", "Fun fact:".
- "Simply", "just", "obviously" — the three words that make a confused viewer
  feel stupid.

## Channel chrome

- The `badge` zone shows `series · episode number`, e.g. `THE CLOUD · 01`.
- First and last beat carry: **"Illustrated explainer · not a real person"**.
- One follow prompt maximum, in the caption band, on the outro only. Never
  spoken, never a bell icon, never a comment-bait arrow.
- She waves with `finger-heart` or `peace-sign` on the outro. That is the whole
  sign-off.
