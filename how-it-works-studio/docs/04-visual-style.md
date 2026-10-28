# Visual Style Guide

## Creative direction

Name: **Warm Isometric**

A soft, bright, drawn world — warm paper, pastel geometry, confident line work,
and a character who belongs to the same hand as the props.

The reference studio's palette is cold and cinematic, because it tells suspense
stories. This channel is the opposite: it should feel like a well-printed
children's science book that an adult is not embarrassed to watch. Legibility is
the style.

Two rules sit above all others:

1. **The caption is the most important object on screen.** Nothing competes with
   it: no saturated colour, no motion, no bright prop behind it.
2. **Nao is never tinted by the world.** She is drawn in her own palette so she
   stays the constant while the topic changes.

## Color palette

Set as CSS custom properties in `src/stage/style.css` `:root`.

```css
--bg:            #FBF7F0;   /* warm paper */
--bg-deep:       #F2EADD;   /* vignette edge, footer band */
--surface:       #FFFFFF;   /* caption card, diagram cards */
--surface-soft:  #F6F0E6;   /* board card fill */
--ink:           #241F2B;   /* primary text, line art */
--ink-soft:      #5C5566;   /* secondary text, labels */
--line:          #D9CDBB;   /* hairline rules, card borders */

--accent:        #E8743B;   /* the one hot colour: emphasis, packets */
--accent-soft:   #F7D9C8;   /* emphasis background, highlight wash */
--good:          #4C9A6A;   /* confirmed, correct, "this works" */
--stop:          #C4505A;   /* misconception, crossed out */
--link:          #4A7FB5;   /* informational, neutral diagram accent */

--iso-top:       #FFF3E2;   /* prop face: top (lightest) */
--iso-left:      #F2DFC6;   /* prop face: left */
--iso-right:     #E0C8AA;   /* prop face: right (darkest) */
--iso-edge:      #B9A184;   /* prop edge stroke */
```

### Prop colour families

Each prop picks one family so the world stays organised without being
monochrome. A prop's family is chosen by what it *is*, not by taste.

| Family | Base | Used for |
| --- | --- | --- |
| `compute` | `#7BA7C9` | servers, laptops, phones, chips |
| `network` | `#8FBF9F` | routers, switches, cables, antennas |
| `storage` | `#C9A87B` | disks, databases, warehouses, filing |
| `people` | `#E0A2A2` | hands, envelopes, queues, little figures |
| `abstract` | `#A99BC4` | clouds, locks, tokens, time, concepts |

Each family renders as three tones: the base mixed 70 % with white for the top
face, 100 % for the left, and 88 % with black for the right. Never invent a fourth
tone for a single prop.

### Usage rules

- The background is warm paper, and it never goes dark. A "dark" beat is
  `--bg-deep`, not black.
- `--accent` is reserved for the thing being talked about *right now*: the
  highlighted token, the travelling packet, the active step. At most one accent
  object per beat.
- `--good` and `--stop` only appear in `compare` and `myth-check`.
- No more than three prop families in one beat. Four reads as clutter.

## Typography

Bundled, local, no network. Inter (SIL OFL 1.1) in four weights is already in
`assets/fonts/`. A second family is not needed and would cost load time and
consistency.

```css
--font: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
```

At 1080 × 1920:

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Caption line | 44 px | 600 | 1.28 | −0.01em |
| Hook question | 76 px | 700 | 1.12 | −0.02em |
| Episode title | 68 px | 700 | 1.14 | −0.02em |
| Board title | 54 px | 600 | 1.2 | −0.01em |
| Board item label | 36 px | 500 | 1.3 | 0 |
| Pin label on a prop | 30 px | 600 | 1.1 | 0.01em |
| Zone badge (series · no.) | 26 px | 700 | 1 | 0.14em, uppercase |
| Recap chip | 34 px | 600 | 1.2 | 0 |
| Footer disclaimer | 24 px | 500 | 1.2 | 0.02em |
| Step number | 40 px | 700 | 1 | 0 |

Rules:

- **Never below 24 px.** At 1080 wide, 24 px is the floor for anything a viewer
  must read — that is the footer disclaimer's size, and it is the smallest
  thing in the frame.
- **Uppercase only for badges and chip labels**, always with 0.14em tracking.
  Uppercase body text is unreadable at phone size.
- **Two weights per beat.** 600 for the statement, 400/500 for supporting.
  Three weights in one frame is visual noise.
- Numerals are tabular in step rails and counters, so a changing digit does not
  shift the layout.
- No text shadow. Caption contrast comes from the opaque card, not from a
  shadow, because a shadow is unmeasurable and a background is a fact.

## Layout

1080 × 1920, five fixed zones. These are the layout contract; `src/stage/style.css`
declares them as custom properties and `npm run check` measures against them.

| Zone | x, y, w, h | Contents |
| --- | --- | --- |
| `badge` | 72, 176, 400, 64 | series and episode number |
| `board` | 48, 300, 612, 900 | diagram cards, prop cluster, step rail |
| `presenter` | 700, 540, 380, 1120 | Nao, and nothing else |
| `caption` | 64, 1270, 624, 180 | the script, max 2 lines |
| `footer` | 64, 1848, 952, 8 | progress rail, decorative |

Notes on the numbers:

- The top 176 px and the bottom 72 px are **platform-risk** area (Reels overlays
  the right-hand third with buttons and the bottom with a caption line). Nothing
  readable lives there.
- The `presenter` zone extends to y = 1660, below the caption band, which is why
  Nao is 1120 tall and not 1400: her feet sit beside the caption, not behind it.
- The `board` zone is left-of-centre on purpose. Vertical video is watched with
  a thumb over the lower right, and the eye scans top-left first.
- `diagram` beats widen the board to `48, 300, 940, 900` and narrow the
  presenter to `880, 640, 160, 900` (Nao half out of frame, pointing in).
  This is the only sanctioned zone override, and it is named in `Vocab`.

### Spacing scale

`4, 8, 12, 16, 24, 32, 48, 64, 96`. Nothing off-scale. A card's inner padding is
24 px; the gap between stacked cards is 16 px; the gap between a card and its
label is 8 px.

### Cards

- Radius 20 px, 1 px `--line` border, no shadow.
- Fill `--surface` (white) on `--bg` (paper) — one step of lift, not two.
- A card holding a diagram is `--surface-soft` so the diagram's own white shapes
  read against it.
- Never nest a card in a card. Use a hairline rule instead.

## Interface details

- **Line work** is 3 px at full size, round caps, `--ink`. All props share it.
- **The isometric grid** is a dot lattice at 25 % `--line`, not full lines — it
  reads as paper, not as graph paper.
- **Depth cueing**: props further back get 12 % `--bg` mixed in, so a cluster has
  atmosphere without blur. No real blur: blur is expensive and hides bugs.
- **Icons** are drawn paths, always stroke-only, 3 px, matching the props.
  No emoji anywhere — Inter has no emoji glyphs and a missing glyph renders as a
  tofu box.
- **The progress rail** in `footer` is `--line` with an `--accent` fill. It is
  decorative: never encode plot-critical information in it.

## Motion and emphasis

- One accent object moves per beat. If two things move, the viewer chooses
  neither.
- Emphasis is colour plus a 1 px underline that grows over 8 frames — not a
  scale pop. Scale pops move the line height and break the reading position.
- Nothing behind the caption band moves while a caption is on screen. The band
  is opaque, and the world behind it is held.

## Accessibility and readability

- Body text contrast against its own background is at least 7:1; caption text is
  `--ink` on `--surface`, which is ~13:1.
- Never encode meaning in colour alone: a `--stop` crossed-out concept also gets
  a strike-through; a `--good` confirmed concept also gets a check.
- No flashing above 3 Hz. The `packet-trip` comet is a travelling highlight, not
  a strobe.
- No text animation while it is being read: words fade in, they do not slide.
- Captions are capped at 14 words so the two-line band is never exceeded, and
  the check measures real glyph bounds rather than trusting the cap.

## What this style is not

- Not neon-on-black tech. No dark mode, no glow, no circuit-board texture.
- Not skeuomorphic. No fake screenshots, no vendor logos, no UI chrome imitating
  a real product.
- Not "corporate Memphis" random blobs. Every shape is a prop with a job.
- Not flat-design-flat. The props are lit, three-faced solids; the depth is the
  point.
