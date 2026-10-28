# 0101 — Where your photos actually live

> Where do your photos actually go when you back them up?

| | |
| --- | --- |
| Series | **The Cloud** |
| Level | beginner |
| Length | 76 s · 2280 frames · 12 beats |
| Words spoken | 149 |
| Status | `scripted` — **not rendered** |
| Sheet rows | `content/csv/beats.csv` filtered to `episode_id = '0101'` |

## Where this is up to

Written, validated, and scheduled into beats. There is no `final.mp4` for this
episode, and this folder does not claim one. What exists:

- `script.md` — narration, claims, and the reading-speed check (generated).
- `storyboard.md` — per-beat visuals, props, camera, and the real mouth schedule (generated).
- `publishing.md` — caption, hashtags, cover, sources (generated).
- `README.md` — this file (hand-written).

Regenerate the three derived files with `node tools/build-projects.mjs`.

## The idea

Turns "the cloud" from a floating nothing into a warehouse you can picture. The saveable payoff is beat 4: everything digital needs a building, power and cooling.

**The walkaway:** A building full of computers, copied three times, powered and cooled.

## Audience

Women who back up photos every day and have never wondered where they land. Not searching for this — scrolling into it.

**The moment they save or share it:** The moment the viewer can picture the building. Everything after that is detail.

## Hooks (pick one, test the others)

1. "There is a city with no people in it, and your photos live there." **← in the sheet**
2. "Your photos are not in the sky. They are in a building with a security guard."
3. "You have 8,000 photos in 'the cloud'. Here is the actual address."

Hook 1 is what beat 1 currently says. The others are alternates for an A/B test:
render them as 4-second cold opens and compare 3-second retention. Change the
`narration` cell to switch, and keep the winning one in the sheet.

## Beat map

| # | Type | s | Narration | `on_screen_text` |
| --- | --- | --- | --- | --- |
| 1 | hook | 4 | There is a city with no people in it. And your photos live there. | No people |
| 2 | title | 3 | Where your photos actually live. | Where your photos live |
| 3 | explain | 6 | You take a photo. The app says it is safe in the cloud. | Safe in the cloud |
| 4 | myth-check | 8 | The cloud is not in the sky. It is a building full of computers. | Not in the sky |
| 5 | explain | 7 | Thousands of machines, stacked in racks, in a warehouse with no windows. | A warehouse of computers |
| 6 | explain | 7 | Every one of them needs power, and every search turns into heat. | Power in, heat out |
| 7 | step-by-step | 10 | First your photo is copied. Then it is checked. Then it is stored, more than once. | The journey |
| 8 | explain | 8 | Good storage keeps copies in separate buildings, so one flood cannot erase your holiday. | Copies in separate buildings |
| 9 | explain | 7 | All of it adds up to about one and a half percent of the world's electricity. | 1.5% of world electricity |
| 10 | myth-check | 8 | It is not magic. It is a building, a power bill, and a very patient security guard. | Not magic. A building. |
| 11 | recap | 5 | Copied. Checked. Stored. Powered. | Where it lives |
| 12 | outro | 3 | So when you hit back up, you know exactly where it goes. | Episode 01 |

## Character usage

- **Outfit:** `casual` — pink tee, charcoal shorts. Every explainer uses it.
- **Framing:** full body in the `presenter` zone; head is ~180 px, so lip-sync runs
  in `full-body` mode (three mouth states, see `docs/11-lip-sync.md`).
- **Expressions used:** `confident`, `focused`, `happy`, `neutral`, `pout`, `relieved`, `shocked`, `skeptical`, `surprised`
- **Gestures used:** `arms-crossed`, `count-three`, `finger-heart`, `holding-phone`, `point-board`, `point-camera`, `present-open`, `present-wide`, `shake-no`, `sweep-wide`
- **Sign-off:** `finger-heart` on the outro. That is the whole CTA.
- **Reserved for restrictions:** `flirty` never appears on this episode, and the
  `summer` outfit is never rendered at all (see `docs/02`).

## Props

| Prop | Slot | Label | Family | First beat |
| --- | --- | --- | --- | --- |
| `cloud` | C3 | cloud | abstract | 1 |
| `desktop` | B3 | desktop | compute | 2 |
| `phone` | C3 | phone | compute | 3 |
| `warehouse` | C3 | warehouse | storage | 4 |
| `server` | B2 | server | compute | 5 |
| `signpost` | D3 | signpost | abstract | 6 |
| `clock` | B2 | clock | abstract | 6 |
| `disk` | D2 | disk | storage | 7 |
| `lock` | D2 | lock | abstract | 10 |

## Accuracy

5 sourced claims. Every claim on screen has a row in `Sources` with a URL
and the date a human opened the link:

- `0101-c4` (beat 6, primary) — Most of a data centre's electricity reaches IT equipment and the rest is mainly cooling and power conversion.
- `0101-c5` (beat 7, primary) — Storing an object usually means writing it more than once, in more than one place.
- `0101-c3` (beat 8, primary) — Common cloud object storage keeps data redundantly across a minimum of three availability zones by default.
- `0101-c1` (beat 9, secondary) — All data centres together used about 1.5% of the world's electricity in 2025.
- `0101-c2` (beat 9, primary) — Most of a data centre's electricity goes to IT equipment, and the rest is mainly cooling and power conversion.

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
