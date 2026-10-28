# 0104 — Why your wifi dies at nine pm

> Why does the wifi get bad at the same time every night?

| | |
| --- | --- |
| Series | **Small Tech Mysteries** |
| Level | beginner |
| Length | 76 s · 2280 frames · 12 beats |
| Words spoken | 142 |
| Status | `scripted` — **not rendered** |
| Sheet rows | `content/csv/beats.csv` filtered to `episode_id = '0104'` |

## Where this is up to

Written, validated, and scheduled into beats. There is no `final.mp4` for this
episode, and this folder does not claim one. What exists:

- `script.md` — narration, claims, and the reading-speed check (generated).
- `storyboard.md` — per-beat visuals, props, camera, and the real mouth schedule (generated).
- `publishing.md` — caption, hashtags, cover, sources (generated).
- `README.md` — this file (hand-written).

Regenerate the three derived files with `node tools/build-projects.mjs`.

## The idea

The most shareable episode in the slate. Everyone has this problem and nobody has had it explained without being told to restart the router. It ends with three fixes that work.

**The walkaway:** Shared air, a shared pipe, and everyone streaming at once. It is a queue, not a curse.

## Audience

Anyone who has ever shouted at a router. The broadest audience of the five.

**The moment they save or share it:** The distinction between wifi and the internet — the thing that stops people blaming the wrong object.

## Hooks (pick one, test the others)

1. "Your wifi doesn't hate you. It has rush hour." **← in the sheet**
2. "Nine pm is not a coincidence. It is the busiest minute on your street."
3. "The wifi is fine. Your street is downloading a film."

Hook 1 is what beat 1 currently says. The others are alternates for an A/B test:
render them as 4-second cold opens and compare 3-second retention. Change the
`narration` cell to switch, and keep the winning one in the sheet.

## Beat map

| # | Type | s | Narration | `on_screen_text` |
| --- | --- | --- | --- | --- |
| 1 | hook | 4 | Your wifi does not hate you. It has rush hour. | Rush hour |
| 2 | title | 3 | Why your wifi dies at nine pm. | Why nine pm? |
| 3 | explain | 7 | Wifi is radio. It travels through the same air as everyone else's. | Wifi is radio |
| 4 | explain | 8 | On the crowded band there are only three channels that do not overlap. | Three channels only |
| 5 | explain | 7 | So your neighbours' routers are already talking over yours. | Neighbours talking over you |
| 6 | explain | 8 | At nine, everyone in the building starts streaming at the same time. | Nine pm: everyone streams |
| 7 | compare | 8 | And the internet coming into your home is shared with your street, not just your flat. | Wifi vs internet |
| 8 | explain | 7 | Wifi is the last few metres. The internet is the long part. | Two different things |
| 9 | step-by-step | 9 | Three fixes that actually work. Move closer. Use the five gigahertz band. Plug in a cable. | Fixes that work |
| 10 | myth-check | 7 | It is not your provider being evil. It is a queue, and queues have a shape. | Not evil. A queue. |
| 11 | recap | 5 | Shared air. Shared pipe. Everyone at once. | Why it dies |
| 12 | outro | 3 | Try the cable tonight. You will hear the difference in one video. | Episode 04 |

## Character usage

- **Outfit:** `casual` — pink tee, charcoal shorts. Every explainer uses it.
- **Framing:** full body in the `presenter` zone; head is ~180 px, so lip-sync runs
  in `full-body` mode (three mouth states, see `docs/11-lip-sync.md`).
- **Expressions used:** `confident`, `confused`, `curious`, `emphatic`, `focused`, `happy`, `neutral`, `pout`, `relieved`, `shocked`, `skeptical`
- **Gestures used:** `count-three`, `finger-heart`, `hands-on-hips`, `point-board`, `point-camera`, `present-open`, `present-wide`, `shake-no`, `sweep-wide`, `talk-hands`
- **Sign-off:** `finger-heart` on the outro. That is the whole CTA.
- **Reserved for restrictions:** `flirty` never appears on this episode, and the
  `summer` outfit is never rendered at all (see `docs/02`).

## Props

| Prop | Slot | Label | Family | First beat |
| --- | --- | --- | --- | --- |
| `router` | C3 | router | network | 1 |
| `clock` | D2 | clock | abstract | 1 |
| `tower` | B2 | tower | network | 3 |
| `queue` | D2 | queue | people | 5 |
| `figure` | D2 | figure | people | 6 |
| `phone` | E3 | phone | compute | 6 |
| `server` | E3 | server | compute | 7 |
| `cable` | E3 | cable | network | 9 |

## Accuracy

4 sourced claims. Every claim on screen has a row in `Sources` with a URL
and the date a human opened the link:

- `0104-c2` (beat 3, secondary) — Wifi operates in unlicensed radio bands shared by many devices and networks.
- `0104-c1` (beat 4, secondary) — In the 2.4 GHz band there are only three non-overlapping channels: 1, 6 and 11.
- `0104-c4` (beat 5, secondary) — Neighbouring networks compete for the same limited set of non-overlapping channels.
- `0104-c3` (beat 9, secondary) — The 5 GHz band offers many more non-overlapping channels than 2.4 GHz.

`tools/check_content.py` also warns where an `explain` beat makes a mechanism
claim with no source row. Remaining warnings on this episode are editorial beats
(restatements of a cited fact, or framing), which is why they are warnings and not
errors. Do not silently delete a warning: decide, and record the decision here.

## Production notes

- First frame of beat 1 is fully composed and does not fade: a feed shows it before play.
- Beat 2 lands the title on the first prop assembly, so the world starts here.
- One `packet-trip` maximum per episode; if it is used, add a row to the `Paths` tab.
- Props accumulate across beats and are never removed except on `compare` or
  `myth-check`. The accumulation *is* the explanation.

## What is still missing

- Renderer (`src/stage/`) — no frames exist yet.
- Narration audio (optional; silent is a valid cut, captions carry the script).
- Prop art: the ids above must exist in the library before a render.
