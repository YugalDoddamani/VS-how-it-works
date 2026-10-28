# The Isometric World

## Why isometric

An explainer needs to show *structure* — where things sit relative to each other,
what is inside what, what arrives before what. Isometric projection shows three
faces of an object at once, which means a box reads as a box with no perspective
tricks, at any position on screen, at any size.

It also has a property that matters for a renderer: **the projection is a linear
function**. The same prop, drawn at the same scale, is identical wherever it sits.
That makes the prop library composable, testable, and cheap.

## The projection

True isometric, 30° axes, no perspective divide.

```
screenX = (worldX − worldY) * COS30 * unit
screenY = (worldX + worldY) * SIN30 * unit − worldZ * unit
```

with `COS30 ≈ 0.8660`, `SIN30 = 0.5`, and `unit = 24 px` per world unit at zoom 1.

Consequences worth knowing before you draw anything:

- A unit cube's silhouette is 48 px wide and 48 px tall, and its top face is a
  rhombus 48 × 24.
- Moving +1 on `worldX` goes right-and-down; +1 on `worldY` goes left-and-down;
  +1 on `worldZ` goes straight up. There is no "forward".
- Two points are at the same screen depth when `worldX + worldY + worldZ` is
  equal — that sum, quantised to 1/16, is the **depth key**.

`src/stage/iso/project.js` owns this and nothing else does. It is unit-tested
against hand-computed values, because a wrong projection is invisible until
everything on screen is subtly wrong.

## The slot grid

The world is a 6 × 6 floor of slots, from `(0,0)` to `(5,5)`. A prop occupies one
slot by default; a large prop declares a footprint and reserves its slots.

- Floor dots are drawn at every slot centre, at 25 % `--line`, fading out with
  distance from the board centre.
- An empty floor still looks intentional — that is what makes the assembly
  animation possible, and it is why the grid is drawn before any prop.
- Slots are named `A1`–`F6` in the sheet (`prop_id@A3`), so a writer can place a
  prop without knowing coordinates.

Grid origin sits at screen `(360, 980)` at zoom 1, which puts the board centre in
the `board` zone and leaves the `presenter` zone clear.

## Camera

A beat names a camera preset; it never carries numbers.

| Preset | zoom | focus | Used for |
| --- | --- | --- | --- |
| `wide` | 0.80 | grid centre | `title`, `recap` |
| `board` | 1.00 | board centre | default for `explain` |
| `close` | 1.30 | named prop | `zoom-in` |
| `macro` | 1.60 | named prop, offset up | `packet-trip` at a node |
| `tilt-up` | 1.00 | centre, +120 px Y | tall props, `diagram` |
| `split` | 0.90 | two vignettes | `compare` |
| `pull-back` | 0.80 → 1.00 animated | board centre | `outro` |

Zoom is animated between presets over 14 frames with `easeInOutCubic`, and the
focus point is interpolated in *world* space, not screen space — interpolating on
screen makes props slide sideways relative to each other.

Panning is allowed only during `packet-trip`. Everywhere else the camera either
holds or zooms. A camera that drifts makes the caption feel unstable.

## Lighting

One light, upper-left, always. This is what makes a prop library look like one
hand drew it.

| Face | Fill | Derivation |
| --- | --- | --- |
| top | family base + 30 % white | `--iso-top` mix |
| left | family base | `--iso-left` mix |
| right | family base − 12 % | `--iso-right` mix |
| edges | `--iso-edge`, 3 px, round joins | shared |

- No cast shadows on the floor. Use a 20 % ellipse of `--line` directly under a
  prop, radius = footprint, which is enough contact information without implying
  a sun position that the lighting contradicts.
- No gradients on faces. Two flat tones per family is the whole shading model,
  except for `--accent`-lit props in a `packet-trip`.
- A prop that is being talked about gets a **1 px accent outline**, not a glow.
  Glow is expensive and unmeasurable; a stroke is neither.

## Props

A prop is data plus a draw function:

```js
{
  id: 'server',
  family: 'compute',
  footprint: 1,           // slots occupied, 1..2
  height: 2.2,            // world units
  label: 'server',        // default pin label
  build: (ctx) => [ /* faces, in draw order */ ],
  pins: ['front', 'top'], // valid label anchor points
  states: ['idle', 'busy', 'off', 'error'],
}
```

`build` returns faces (polygons + fill token), so the renderer can depth-sort and
stroke them uniformly. A prop never writes raw SVG — it describes geometry, and
the stage draws it. That keeps lighting and line weight consistent for free.

### The library

Twenty-four props, added in the order episodes need them. This list is the build
queue for Phase 4, not a wish list.

| # | id | family | Reads as |
| --- | --- | --- | --- |
| 1 | `desktop` | compute | a monitor on a plinth with a keyboard |
| 2 | `phone` | compute | a slab at an angle, screen face up |
| 3 | `laptop` | compute | open clamshell |
| 4 | `server` | compute | a tall rack with three slots |
| 5 | `router` | network | a flat box with two antennae |
| 6 | `switch` | network | wide flat box, many port notches |
| 7 | `cable` | network | a curved tube between two slots |
| 8 | `tower` | network | a lattice mast with a dish |
| 9 | `cloud` | abstract | three overlapping puffs on a transparent plinth |
| 10 | `disk` | storage | a stack of three platters |
| 11 | `database` | storage | a cylinder with banding |
| 12 | `warehouse` | storage | a long shed with a roller door |
| 13 | `shelf` | storage | open frame with four rows of boxes |
| 14 | `envelope` | people | a paper slip with a fold, floats |
| 15 | `parcel` | people | a taped box |
| 16 | `hand` | people | a stylised flat hand, points direction |
| 17 | `figure` | people | a 2-unit blocky person, no face |
| 18 | `queue` | people | four `figure`s on a rail |
| 19 | `lock` | abstract | padlock, shackle open or shut |
| 20 | `key` | abstract | a key, floats and rotates |
| 21 | `clock` | abstract | a dial with one hand, ticks |
| 22 | `token` | abstract | a faceted capsule, the "packet" |
| 23 | `signpost` | abstract | a post with one or two arrow signs |
| 24 | `board` | abstract | a leaning diagram panel for formulas |

Missing something? Add the prop to the library and to the gallery, then reference
it from the sheet. A one-off drawing for a single episode is how a consistent
world dies.

### States

A prop in a non-idle state changes fill, not geometry, so the depth sort and the
silhouette are unaffected:

| State | Change | Meaning |
| --- | --- | --- |
| `idle` | base family tones | present, doing nothing |
| `busy` | top face gets `--accent` at 25 % | currently working |
| `off` | all faces 55 % desaturated | not participating |
| `error` | right face `--stop` at 30 % | failed / blocked |
| `focus` | 1 px `--accent` outline | being explained right now |

## Assembly motion

The channel's signature. Every prop arrives the same way.

`drop-and-settle`, 12 frames:

| Frame | Behaviour |
| --- | --- |
| 0–3 | prop is 40 px above its slot, scaled 96 %, opacity 0 → 1 |
| 4–8 | falls with `easeInCubic` to 6 px *below* the slot |
| 9–11 | springs back to 0 with `easeOutBack` |
| 12 | idle; a 6-frame contact ellipse fades in |

- Props in one beat arrive in slot order, staggered 4 frames apart.
- A prop leaving the world does the reverse in 8 frames, but **only** on a
  `compare` or `myth-check` beat. Nothing else removes props. The world
  accumulates through the episode — that accumulation *is* the explanation.
- The contact ellipse is what makes a drop read as weight. Without it, props look
  like they are floating into place.

## The prop trip

`packet-trip` is the signature shot and the most expensive one. One per episode.

1. The camera moves to `macro` on the source prop.
2. A `token` prop spawns and a cubic bezier path carries it to the destination,
   with 3 control points lifted 1.5 units above the grid so the arc is visible.
3. The token leaves a comet tail: the last 12 positions, tapering opacity
   1.0 → 0.05, tapering width 10 → 2 px.
4. When it arrives, the destination prop flips to `busy` for 10 frames, then back.
5. Optionally a second token returns along a separate path, offset by 8 frames,
   in `--good` instead of `--accent`.

Paths come from the `Paths` tab: `from_slot`, `to_slot`, `arc_height`, `role`
(`request` / `response` / `sync`). A `packet-trip` beat with no `Paths` row is
a validation warning — it will render with a straight line, which is worse.

## Depth sorting

- Sort props by depth key `(x + y + z)`, ascending, painter's algorithm.
- Tiebreak on `prop_id` alphabetically, so equal depth never flickers between
  frames.
- A prop whose *centre* is behind another is drawn behind it, even if its top
  pokes over — that is correct for the angles used here.
- Cable props connect two slots and are drawn at the average depth of their
  endpoints. This is the one place a sort can look wrong; the fix is to author
  the cable at a shallower depth, not to special-case the renderer.

## Authoring rules for the sheet

- Never place a prop in the `presenter` zone's slots. The zones do not overlap in
  screen space, but the camera zoom can bring a back prop into it.
- At most 7 props per beat. Beyond that, the board zone cannot show them at a
  readable size at zoom 1.
- A prop that is named in the narration must be visible in that beat, and a prop
  that is visible should be named within a beat of appearing. Otherwise the world
  is scenery, and scenery is the thing this channel is not.
- Tall props (`tower`, `server`) belong in the back rows (`A`, `B`) so they do
  not occlude the middle.

## Gallery

`npm run gallery` renders:

- one frame per prop, at `board` zoom, on the lattice, with its pin label;
- one frame per prop state;
- one frame of an empty grid, to check the lattice;
- one frame of a full 7-prop cluster, to check the depth sort under load.

A prop is not "done" until it appears in the gallery.
