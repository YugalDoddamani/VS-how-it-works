# 0105 — What actually happens when you post

> What happens to a photo after you post it?

| | |
| --- | --- |
| Series | **Your Data, Explained** |
| Level | beginner |
| Length | 76 s · 2280 frames · 12 beats |
| Words spoken | 143 |
| Status | `scripted` — **not rendered** |
| Sheet rows | `content/csv/beats.csv` filtered to `episode_id = '0105'` |

## Where this is up to

Written, validated, and scheduled into beats. There is no `final.mp4` for this
episode, and this folder does not claim one. What exists:

- `script.md` — narration, claims, and the reading-speed check (generated).
- `storyboard.md` — per-beat visuals, props, camera, and the real mouth schedule (generated).
- `publishing.md` — caption, hashtags, cover, sources (generated).
- `README.md` — this file (hand-written).

Regenerate the three derived files with `node tools/build-projects.mjs`.

## The idea

The privacy episode, done without panic. The moral is agency, not abstinence: post on purpose. The saveable payoff is the four things a post becomes.

**The walkaway:** Copies, caches, screenshots and metadata. Deleting removes one of those four.

## Audience

Women who post, delete, repost, and have a vague uneasy feeling about it.

**The moment they save or share it:** "Post on purpose" — calm, not fear-mongering. That tone is the brand.

## Hooks (pick one, test the others)

1. "You posted one photo. Seconds later there were copies you will never see." **← in the sheet**
2. "Deleting a post removes your copy. It does not remove the screenshot."
3. "Your photo has a second file inside it that tells people where you were."

Hook 1 is what beat 1 currently says. The others are alternates for an A/B test:
render them as 4-second cold opens and compare 3-second retention. Change the
`narration` cell to switch, and keep the winning one in the sheet.

## Beat map

| # | Type | s | Narration | `on_screen_text` |
| --- | --- | --- | --- | --- |
| 1 | hook | 4 | You posted one photo. Seconds later there were copies you will never see. | Copies you will never see |
| 2 | title | 3 | What actually happens when you post. | After you press post |
| 3 | explain | 7 | Your phone sends it up. The app immediately makes several smaller versions. | Several smaller versions |
| 4 | explain | 8 | Those copies sit on servers in many cities, near the people who will view them. | Copies in many cities |
| 5 | explain | 7 | And every viewer's phone keeps its own copy, quietly, to load it faster. | A copy on their phone |
| 6 | explain | 7 | A screenshot is also a copy. The app cannot delete it, ever. | A screenshot is a copy |
| 7 | myth-check | 8 | Deleting removes your copy and the public link. Not the screenshots. | Delete is not a recall |
| 8 | explain | 8 | The photo can also carry hidden data: where it was taken, when, and on what. | Hidden data inside |
| 9 | step-by-step | 9 | Three habits. Strip the location. Share to a small group first. Assume it is permanent. | Three habits |
| 10 | explain | 7 | None of this is a reason to stop posting. It is a reason to post on purpose. | Post on purpose |
| 11 | recap | 5 | Copies. Caches. Screenshots. Metadata. | What a post becomes |
| 12 | outro | 3 | Post like it is permanent. Because the internet already does. | Episode 05 |

## Character usage

- **Outfit:** `casual` — pink tee, charcoal shorts. Every explainer uses it.
- **Framing:** full body in the `presenter` zone; head is ~180 px, so lip-sync runs
  in `full-body` mode (three mouth states, see `docs/11-lip-sync.md`).
- **Expressions used:** `confident`, `focused`, `happy`, `neutral`, `pout`, `relieved`, `shocked`, `skeptical`, `surprised`, `wink`
- **Gestures used:** `count-three`, `finger-heart`, `holding-phone`, `point-board`, `point-camera`, `present-open`, `present-wide`, `shake-no`, `sweep-wide`
- **Sign-off:** `finger-heart` on the outro. That is the whole CTA.
- **Reserved for restrictions:** `flirty` never appears on this episode, and the
  `summer` outfit is never rendered at all (see `docs/02`).

## Props

| Prop | Slot | Label | Family | First beat |
| --- | --- | --- | --- | --- |
| `phone` | C3 | phone | compute | 1 |
| `cloud` | D2 | cloud | abstract | 2 |
| `server` | D2 | server | compute | 3 |
| `disk` | D2 | disk | storage | 5 |
| `parcel` | D2 | parcel | people | 6 |
| `lock` | D2 | lock | abstract | 7 |
| `signpost` | E3 | signpost | abstract | 8 |
| `clock` | E3 | clock | abstract | 9 |

## Accuracy

4 sourced claims. Every claim on screen has a row in `Sources` with a URL
and the date a human opened the link:

- `0105-c2` (beat 4, primary) — Content is commonly served to viewers from caches or content delivery networks rather than a single origin.
- `0105-c1` (beat 5, primary) — Caches keep local copies of responses to serve later requests faster.
- `0105-c4` (beat 6, definition) — A screenshot is produced by the viewer's device and is not something the platform can revoke.
- `0105-c3` (beat 8, definition) — Image files can carry metadata such as capture time, device and location.

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
