# Components and Beat Types

## Required reusable components

Build the smallest set that makes the first episode, then add only what a second
episode genuinely needs. Every component below is a pure function that receives
plain props and returns an HTML string. None of them may read the clock,
`Math.random`, or the network.

### Chrome

| Component | Inputs | Renders |
| --- | --- | --- |
| `Badge` | `series`, `episodeId`, `level` | The `badge` zone, uppercase with tracking |
| `ProgressRail` | `frame`, `totalFrames` | 8 px rail in `footer`; decorative only |
| `Disclosure` | `visible` | "Illustrated explainer · not a real person" |
| `CaptionLayer` | `captions[]`, global frame | The caption band; project-level, not per-beat |

### Board

| Component | Inputs | Renders |
| --- | --- | --- |
| `BoardCard` | `title`, `items[]`, `accent` | The white/soft card that frames a diagram |
| `BoardItem` | `index`, `text`, `state`, `atFrame` | One labelled row inside a card |
| `StepRail` | `steps[]` (2–4), `activeStep`, `atFrame` | Numbered chips, arriving in order |
| `PinLabel` | `anchor`, `text`, `atFrame` | A leader line and a floating label on a prop |
| `Chip` | `text`, `state` | One recap chip with an arrow connector |
| `Divider` | `label` | The vertical split in a `compare` |

### Presenter

| Component | Inputs | Renders |
| --- | --- | --- |
| `Nao` | `pose`, `expression`, `gesture`, `t`, `seed` | The rig, drawn into the presenter zone |
| `Bubble` | `text`, `tail`, `atFrame` | Optional caption-adjacent speech bubble; use sparingly |

### World

| Component | Inputs | Renders |
| --- | --- | --- |
| `IsoStage` | `props[]`, `camera`, `frame`, `seed` | Lattice, depth-sorted props, assembly, camera |
| `IsoProp` | `propId`, `slot`, `state`, `atFrame` | One prop, lit and stroked |
| `Packet` | `path`, `atFrame`, `role` | Token plus comet tail along a bezier |
| `FloorShadow` | `slot`, `footprint`, `opacity` | The contact ellipse |

### Section-level

| Component | Inputs | Renders |
| --- | --- | --- |
| `QuestionCard` | `question`, `chapter` | The hook's opening composition |
| `TitleCard` | `title`, `series`, `episodeId` | Episode title over the first assembled slice |
| `RecapStack` | `chips[]` | Three chips, connected |
| `OutroCard` | `takeaway`, `episodeId` | Takeaway line, badge, follow prompt |
| `MythCard` | `claim`, `verdict` | A crossed-out claim, a strike-through, a verdict |
| `ComparePair` | `left`, `right` | Two vignettes in one frame |

## The geometry of a beat

Every beat type renders into the same five zones. What changes is what the
`board` zone holds and whether the `presenter` zone shrinks.

| Beat type | Board zone | Presenter zone | Props |
| --- | --- | --- | --- |
| `hook` | `QuestionCard` | full, Nao enters | none |
| `title` | `TitleCard` | full | first slice assembles |
| `explain` | `BoardCard` **or** live props | full | 1–3 |
| `analogy` | `BoardCard` naming the mapping | full | 2–4 physical props |
| `diagram` | widened to 940 px | narrowed to 160 px, right edge | 0–2, camera `wide` |
| `zoom-in` | nothing (camera does the work) | full | 1, camera `close` |
| `step-by-step` | `StepRail` (2–4) | full | grows per step |
| `compare` | `ComparePair` | full, off to the side | 2 vignettes |
| `packet-trip` | nothing | full but dimmed 20 % | source + destination + path |
| `myth-check` | `MythCard` | full | the wrong world, then the right one |
| `recap` | `RecapStack` | full, dimmed 35 % | all previous props, camera `wide` |
| `outro` | `OutroCard` | full | all previous props, camera `pull-back` |

## `CaptionLayer`

Captions are a project-level layer, timed in **global** frames. This is the same
design decision the reference studio made, for the same reason: a sentence does
not stop at a cut, and splitting a caption at a beat boundary makes a viewer
re-read.

```json
"captions": [
  {
    "text": "You type an address and press enter.",
    "atFrame": 12,
    "durationFrames": 96,
    "emphasis": ["enter"]
  }
]
```

Rules:

- `atFrame` is global, not beat-local.
- `atFrame: 0` means **already on screen, no fade**. The first frame of a reel is
  what the feed shows before play, so the opening caption cannot animate in.
  The same rule applies to the hook's question card.
- Each card fades over `fadeFrames` (default 5) at each end. Contiguous cards
  hand over on the frame boundary without a gap.
- Words fade in staggered over `min(40, words × 4)` frames and never reflow.
- `emphasis` tokens get `--accent` and a growing underline. At most two per card.
- The band holds two lines at 44 px; `check` measures glyph bounds, so a card
  that wraps to three lines fails the build rather than quietly overlapping the
  footer.

One narration sentence maps to one card, produced by the compiler. A writer
never authors captions directly — they write `narration` and `emphasis`, and the
compiler emits the card. `Publish`/`captions` overrides exist for the rare case
where a card must be split for emphasis, but they are the exception.

## `Nao`

```js
Nao({ pose, expression, gesture, t, seed })
```

- Draws only inside the `presenter` zone. `check` fails a build where her paths
  exceed it.
- Pose and expression are ids from `Vocab`; the component resolves them to joint
  angles and part variants.
- `seed` comes from `beat_id`, so blinks are reproducible.
- Secondary motion (hair, scarf) is derived from the *previous* frame's head
  angle, computed analytically — never from stored state.

## `IsoStage`

```js
IsoStage({ props, camera, frame, seed, dimmed })
```

- Draws the lattice, then props sorted by depth key, then contact ellipses under
  everything above their own depth.
- Computes each prop's assembly progress from its `atFrame` and the beat start.
- Applies the camera as a single `transform` on the group, so a zoom cannot
  desynchronise props from their pins — with one exception: a `PinLabel` is drawn
  *outside* the camera group in screen space, so its text stays at 30 px at any
  zoom.
- `dimmed` is used by `packet-trip` and `recap` to push the world back.

## `Packet`

- Position along a cubic bezier by arc-length approximation, not by `t` — a
  bezier's `t` bunches points at the ends and the packet would visibly slow down
  at the wrong moment.
- Tail = the previous 12 arc-length samples, tapering opacity and width.
- Fill: `--accent` for `request`, `--good` for `response`.
- Draws above all props (it is in the air) and below the caption layer.

## Scene registry

`src/stage/scenes.js` exposes `SCENES`, a map from `beat_type` to
`render(scene, state)`, plus `sceneTypes()` for validation. The registry is the
only place a beat type is named; the compiler validates against it, so a typo in
a sheet cell fails with the list of known types.

```js
const SCENES = {
  hook:        { label: 'Hook',        render: renderHook },
  title:       { label: 'Title',       render: renderTitle },
  explain:     { label: 'Explain',     render: renderExplain },
  analogy:     { label: 'Analogy',     render: renderAnalogy },
  diagram:     { label: 'Diagram',     render: renderDiagram },
  'zoom-in':   { label: 'Zoom in',     render: renderZoomIn },
  'step-by-step': { label: 'Step by step', render: renderSteps },
  compare:     { label: 'Compare',     render: renderCompare },
  'packet-trip': { label: 'Packet trip', render: renderPacketTrip },
  'myth-check':{ label: 'Myth check',  render: renderMythCheck },
  recap:       { label: 'Recap',       render: renderRecap },
  outro:       { label: 'Outro',       render: renderOutro },
};
```

### Adding a beat type

1. Write `renderX(scene, state)` in `src/stage/scenes.js`.
2. Register it in `SCENES` with a human label.
3. Add its styles to `src/stage/style.css`.
4. Add an entry to `src/lib/gallery.js`.
5. Add it to the `Vocab` tab so the sheet validator accepts it.
6. Run `npm run gallery` and look at it.

A beat type that is not in the gallery does not exist for review purposes.

## Component rules

- Use only the shared palette and type scale. A component with its own hex value
  is a bug.
- Important content stays inside its zone; the checks measure real glyph bounds.
- Render predictably at any requested frame, including frames before the
  component's own `atFrame` (return empty, not `undefined`).
- No external images, no vendor logos, no real screenshots. Every visual is
  geometry.
- Reuse before you add. Twelve beat types is the budget; a thirteenth needs two
  episodes that both wanted it.
