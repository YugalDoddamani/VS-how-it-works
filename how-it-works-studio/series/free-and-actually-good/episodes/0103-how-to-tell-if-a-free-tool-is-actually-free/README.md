# 0103 — How to tell if a free tool is actually free

> What are the free tools that are actually worth using?

| | |
| --- | --- |
| Series | **Free and Actually Good** |
| Level | beginner |
| Length | 76 s · 2280 frames · 12 beats |
| Words spoken | 150 |
| Status | `scripted` — **not rendered** |
| Sheet rows | `content/csv/beats.csv` filtered to `episode_id = '0103'` |

## Where this is up to

Written, validated, and scheduled into beats. There is no `final.mp4` for this
episode, and this folder does not claim one. What exists:

- `script.md` — narration, claims, and the reading-speed check (generated).
- `storyboard.md` — per-beat visuals, props, camera, and the real mouth schedule (generated).
- `publishing.md` — caption, hashtags, cover, sources (generated).
- `README.md` — this file (hand-written).

Regenerate the three derived files with `node tools/build-projects.mjs`.

## The idea

A framework episode, not a list episode: the four ways anything free gets paid for. A list would be stale in a month; the framework stays true and can be re-run forever.

**The walkaway:** Every free tool is paid for in one of four ways. Ask who pays before you sign up.

## Audience

Women building a small business, a portfolio or a side project who need good tools and cannot pay for six subscriptions.

**The moment they save or share it:** "If I never pay, who is paying?" — one reusable sentence.

## Hooks (pick one, test the others)

1. "Nothing on the internet is free. But some things are genuinely worth it." **← in the sheet**
2. "If a tool is free, one of four people is paying for it. None of them are the company."
3. "The best free tools are free for a reason. Learn the four reasons and nothing can trick you."

Hook 1 is what beat 1 currently says. The others are alternates for an A/B test:
render them as 4-second cold opens and compare 3-second retention. Change the
`narration` cell to switch, and keep the winning one in the sheet.

## Beat map

| # | Type | s | Narration | `on_screen_text` |
| --- | --- | --- | --- | --- |
| 1 | hook | 4 | Nothing on the internet is free. But some free things are genuinely worth it. | Genuinely free? |
| 2 | title | 3 | How to tell if a free tool is actually free. | Is it actually free? |
| 3 | explain | 7 | Every free thing is paid for somehow. There are only four ways. | Four ways to pay |
| 4 | step-by-step | 10 | You pay with attention. Or with data. Or later. Or somebody else pays. | The four ways |
| 5 | explain | 7 | Ads mean the product is your attention. The tool is just the delivery. | You pay with attention |
| 6 | explain | 7 | Data means the tool learns you, and that is the actual price of entry. | You pay with data |
| 7 | explain | 7 | And later means the free tier runs out exactly when you are hooked. | You pay later |
| 8 | explain | 7 | Somebody else means a community, a school, or an open source project pays. | Somebody else pays |
| 9 | explain | 8 | So ask one question before you sign up. If I never pay, who is paying for this? | Who pays if I never do? |
| 10 | compare | 8 | Free and private is rare and worth finding. Free and mining you is everywhere. | Rare vs everywhere |
| 11 | recap | 5 | Attention. Data. Later. Somebody else. | Who pays |
| 12 | outro | 3 | Ask who pays. Then enjoy the free stuff without the uneasy feeling. | Episode 03 |

## Character usage

- **Outfit:** `casual` — pink tee, charcoal shorts. Every explainer uses it.
- **Framing:** full body in the `presenter` zone; head is ~180 px, so lip-sync runs
  in `full-body` mode (three mouth states, see `docs/11-lip-sync.md`).
- **Expressions used:** `confident`, `curious`, `emphatic`, `focused`, `happy`, `neutral`, `relieved`, `skeptical`
- **Gestures used:** `count-three`, `finger-heart`, `hands-on-hips`, `point-board`, `point-camera`, `present-wide`, `sweep-wide`, `talk-hands`
- **Sign-off:** `finger-heart` on the outro. That is the whole CTA.
- **Reserved for restrictions:** `flirty` never appears on this episode, and the
  `summer` outfit is never rendered at all (see `docs/02`).

## Props

| Prop | Slot | Label | Family | First beat |
| --- | --- | --- | --- | --- |
| `signpost` | C3 | signpost | abstract | 1 |
| `board` | D2 | board | abstract | 2 |
| `token` | D2 | token | abstract | 3 |
| `phone` | E3 | phone | compute | 4 |
| `disk` | D2 | disk | storage | 6 |
| `figure` | E3 | figure | people | 6 |
| `clock` | D2 | clock | abstract | 7 |
| `lock` | E3 | lock | abstract | 7 |
| `queue` | E3 | queue | people | 8 |

## Accuracy

3 sourced claims. Every claim on screen has a row in `Sources` with a URL
and the date a human opened the link:

- `0103-c1` (beat 3, definition) — Free products are commonly funded by advertising, by data, by upgrades, or by a non-commercial sponsor.
- `0103-c2` (beat 8, definition) — Open source means a licence that allows use, study, modification and redistribution.
- `0103-c3` (beat 9, definition) — You can usually identify how a free service is funded before you sign up, from its pricing page or licence.

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
