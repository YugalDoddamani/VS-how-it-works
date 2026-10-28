# Reel Format — Shot Grammar

The short format: **45–60 seconds, 22–27 shots, one idea**.

This is the format the channel actually posts. The longer 76-second explainers in
`projects/` stay as the "deep cut" archive; a reel is what goes in the feed.

Everything here is a rule the script obeys and the renderer will enforce. If a
reel breaks one of these, it should say why in its own `script.md`.

---

## The numbers

| | |
| --- | --- |
| Canvas | 1080 × 1920, 9:16 |
| Frame rate | 30 fps |
| Length | 45–60 s (1350–1800 frames) |
| Shots | 22–27 |
| Average shot | 1.8–2.2 s |
| Fastest shot | 1.2 s — only in the hook |
| Typical shot | 2.0 s |
| Longest shot | 2.5 s — only for a reveal or a held number |
| Cuts | 95 % hard cuts. A transition is a decision, not a default. |
| Words | 90–140 spoken, ≤ 14 per caption card |

**The sign-off is 2.0 s.** If a cut feels long at the end, the reel is short of
content — add a real beat, do not stretch the last shot. A 15-second sign-off is
the single most common way this format goes wrong, and viewers read it instantly as
padding.

**Why 45–60 and not 30.** A 30-second reel can only deliver a hook and a fact. At
45–60 there is room for the mechanism *and* the caveat, which is the difference
between a channel people watch and a channel people trust. Below 45 the caveat
gets cut, and the caveat is the product.

---

## Shot codes

Eleven codes. Every shot in every reel is one of them.

| Code | What it is | Lens (35 mm equiv) | Head height in frame | Typical length |
| --- | --- | --- | --- | --- |
| `ISO-WIDE` | Full isometric world, Nao absent or tiny | 14 mm | — | 2.0–2.5 s |
| `TOP-DOWN` | Looking straight down at the iso grid | 24 mm | — | 1.6–2.0 s |
| `MCU` | Medium close-up, chest up | 50 mm | ~620 px | 1.6–2.2 s |
| `CU` | Close-up, head and shoulders | 85 mm | ~980 px | 1.2–2.0 s |
| `ECU` | Extreme close-up, one detail — an eye, a number | 100 mm | — | 1.0–1.6 s |
| `INSERT` | Prop or screen detail only, Nao out of frame | 100 mm macro | — | 1.2–2.4 s |
| `CORNER` | **Nao keyed into a corner over a full-frame world** | 24 mm | ~650 px | 1.8–2.4 s |
| `SPLIT` | Hard vertical split: world left, Nao right | 35 mm | ~700 px | 2.0–2.4 s |
| `OTS` | Over her shoulder toward the board | 35 mm | shoulder only | 1.6–2.0 s |
| `POV` | The viewer's own point of view, hands visible | 35 mm | — | 1.2–1.6 s |
| `RECAP` | Chips over a dimmed world | 35 mm | — | 1.2–1.8 s |

### Rules per code

- **`POV` is the strongest hook shot and the worst body shot.** It puts the viewer
  inside the problem, which is exactly right for the first 1.5 seconds and wrong
  for explaining anything. Never use it twice in a row.
- **`INSERT` carries the explanation.** If a reel has no inserts, it is a talking
  head with decoration. Aim for 5–7 per reel.
- **`ECU` is a punch, not a shot type.** One or two per reel: the padlock, the
  number, the icon that changes. Three is noise.
- **`CORNER` is the channel's signature.** It is how a character and a diagram
  coexist without a split screen. Use 3–5 per reel.
- **`SPLIT` is for comparison only.** Left is the thing, right is her talking about
  the thing. Never split for decoration.

---

## The corner overlay

The most-used composition in the channel, so it gets exact numbers.

```
┌──────────────────────────────┐  y=0
│  badge                       │
│                              │
│                              │
│      ISOMETRIC WORLD         │
│      (full frame, 14–24mm)   │
│                              │
│                    ┌───────┐ │
│                    │  NAO  │ │  height 650 px (34 %)
│                    │       │ │  right margin 40 px
│                    └───────┘ │
│  caption band (untouched)    │
│  footer                      │
└──────────────────────────────┘  y=1920
```

- **Height:** 650 px, anchored so her feet sit at `y = 1560` — above the caption
  band, never overlapping it.
- **Right margin:** 40 px. Mirrored to `CORNER-BL` when the world's action is on
  the right.
- **Never** move the overlay mid-shot. It arrives on a cut and leaves on a cut.
- **Never** let the world's focal point sit behind her. If it does, mirror the
  overlay or move the prop, not her.
- She may break the frame edge (her shoulder cropped by the canvas edge), which is
  what stops it looking like a picture-in-picture widget.
- A 1 px ink outline or a soft contact shadow is the only separation allowed. No
  drop shadow blur, no rounded card behind her.

### The split

- Hard edge at **62 % / 38 %**. No gradient, no feather.
- A 2 px ink rule sits on the seam.
- The world side is composed for the left 62 %: its focal point is at x ≈ 330.
- She never crosses the seam. Hand gestures that would cross it get pulled back.

---

## Cut rhythm

Pacing is a shape, not an average. The same 50 seconds feels fast or slow
depending on where the short shots are.

| Section | Seconds | Shots | Shot length | What the cuts do |
| --- | --- | --- | --- | --- |
| Hook | 0–5 | 4 | **1.2–1.6 s** | cut on a syllable; never let the first shot exceed 1.6 s |
| Turn | 5–12 | 3–4 | 1.6–2.2 s | one `CORNER` appears; the world arrives |
| Mechanism | 12–30 | 7–9 | 2.0–2.4 s | alternate `INSERT` and `MCU`/`CU`; never two of the same code in a row |
| Caveat | 30–40 | 3–4 | 2.0–2.4 s | the honest part: what it does *not* do, or what it costs |
| Payoff | 40–48 | 3–4 | 2.0–2.4 s | the fixes, the saveable frame, the thing they can do |
| Recap | 48–52 | 1 | 1.8 s | fastest cuts of the back half |
| Sign-off | end | 1 | **2.0 s, never longer** | one shot, no cuts, she looks down the lens |

### The three cuts that matter

1. **The hook cut (0–5 s).** This is 80 % of the outcome. Shot 1 must be a thing
   the viewer has already experienced, held just long enough to read.
2. **The turn (5–12 s).** The world appears, and the reel stops being a talking
   head. If this arrives after 12 seconds, you lose the middle.
3. **The save frame (34–44 s).** One frame, nothing else on screen, held 2–2.5 s.
   This is what gets screenshotted, so it must be legible as a still image with
   the sound off and no context.

### Transitions

| Kind | Length | Use |
| --- | --- | --- |
| Hard cut | 0 | the default — 95 % of cuts |
| Whip | 8–12 f | once per reel, at the hook→turn handoff |
| Match cut | 0 | when two shots share a shape (same phone, same card) |
| Snap zoom | 6–10 f | when she says "watch this" |
| Dip to paper | 10 f | only between the mechanism and the recap |

No cross-fades except into `RECAP`. No spins, no glitch, no zoom-blur.

### Camera moves

One move per shot, or none. If a shot has a move it is:

- `push` — 3 % over the shot, for emphasis
- `pull` — 4 % over the shot, for reveals
- `parallax` — 20 px lateral slide, for depth in a `CORNER` shot
- `static` — everything else, and most of the reel

Two moving shots in a row reads as a drone.

---

## Talking to the viewer

The brief was "always interactive with the user". That means these six devices,
used deliberately rather than constantly.

| Device | Rule | Where |
| --- | --- | --- |
| **Eye contact** | She looks down the lens on every "you". 8–11 shots per reel. | throughout |
| **Hand in frame** | Her hand enters to hold, point at, or take the object | `INSERT`, `POV`, `ECU` |
| **Point at the lens** | Finger toward the viewer, 12 frames, at the promise | once per reel |
| **Agree, then replace** | Grant the viewer's theory before correcting it | the turn |
| **Count on fingers** | List items counted physically, never just as text | lists of 3 |
| **Hand it to the camera** | Object pushed toward the lens | the save frame |

### What is banned

- **No fake comments.** Do not render invented viewer comments, DMs or
  testimonials. They are fiction presented as evidence, and this channel's whole
  proposition is that it does not do that.
- **No fake notifications** from real people or real apps.
- **No engagement bait visuals** — no arrows at the UI, no "wait for it", no bell.
- **No talking down.** No "basically", "simply", "for the girls" framing.

The comment prompt belongs in the *caption*, not the video, and it should invite a
story rather than a like: "which pocket are you?", "what is the ad that found you?"

---

## Captions and voice

- One VO sentence = one caption card. ≤ 14 words, ≤ 2 lines at 44 px.
- The caption is on screen **before** the line is spoken, and holds 6 frames after.
- Emphasis tokens tint `--accent` and get a growing underline — max two per card.
- The mouth is driven by the VO text through the lip-sync engine
  ([`11-lip-sync.md`](11-lip-sync.md)). At these shot lengths the mouth is often
  on screen for less than a second, so full-body three-state reduction is used
  everywhere except `CU`, which gets all 12 visemes.
- Silence is allowed and is a tool: two silences per reel, one before the save
  frame and one before the recap.

---

## Sound

- One bed, entered after the hook (never at 0:00 — the hook needs a dry click, not
  a tune).
- The bed's tempo is *slower* than the cut rate on purpose. Fast edits + calm music
  reads as confident; fast edits + fast music reads as anxious.
- Every prop action gets one sound. No sound for a prop that did not move.
- The save frame gets near-silence. That is what makes a held image feel heavy.
- Never a riser into the recap. The channel does not do build-ups.

---

## From script to sheet

Each reel's `script.md` is the authored document: a fixed-column shot table plus
the notes. The columns are deliberately stable so a later compiler can lift them
straight into a `Shots` tab of the workbook.

When the renderer exists, a shot becomes a row:

| Column in `script.md` | Becomes |
| --- | --- |
| `#` | `shot_no` |
| `In`, `Dur` | `startFrame`, `durationFrames` |
| `Shot · lens` | `shot_code`, `lens` |
| `Nao` | `nao_position`, plus pose/expression from the notes |
| `Background` | `world` (camera preset + props) |
| `Graphic` | `graphic` |
| `Voice-over` | `narration`, which also generates the lip-sync schedule |

Until then, do not duplicate the table into a CSV: one authored source, no drift.

---

## Checklist for every reel

- [ ] 45–60 s, 22–27 shots, average 1.8–2.2 s.
- [ ] Hook is a thing the viewer has already done, in ≤ 1.6 s.
- [ ] The world appears before 12 s.
- [ ] At least three `CORNER` shots and four `INSERT` shots.
- [ ] One save frame, held 2 s, legible as a still.
- [ ] She looks at the lens on every "you".
- [ ] The caveat is present, and it costs her something to say.
- [ ] The sign-off is 2.0 s, and no shot is carrying padding.
- [ ] Outfit differs from the previous reel.
- [ ] Every factual claim has a source row, and a human opened the link.
- [ ] Two silences, one before the save frame, one before the recap.
