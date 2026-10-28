# 0102 — How AI automation actually works

> How does AI automation actually work?

| | |
| --- | --- |
| Series | **AI Without the Hype** |
| Level | beginner |
| Length | 78 s · 2340 frames · 12 beats |
| Words spoken | 139 |
| Status | `scripted` — **not rendered** |
| Sheet rows | `content/csv/beats.csv` filtered to `episode_id = '0102'` |

## Where this is up to

Written, validated, and scheduled into beats. There is no `final.mp4` for this
episode, and this folder does not claim one. What exists:

- `script.md` — narration, claims, and the reading-speed check (generated).
- `storyboard.md` — per-beat visuals, props, camera, and the real mouth schedule (generated).
- `publishing.md` — caption, hashtags, cover, sources (generated).
- `README.md` — this file (hand-written).

Regenerate the three derived files with `node tools/build-projects.mjs`.

## The idea

Defuses the fear by making the mechanism visible. The saveable payoff is the four-step loop — goal, tools, check, repeat — plus the question it gives her to ask at work: "where is the check?"

**The walkaway:** A goal, some tools, a check, and a loop. The model is one part of it.

## Audience

Women whose jobs are being "automated" and who have been told nothing useful about it. Curious, slightly worried, not technical.

**The moment they save or share it:** The relief of "it is a checklist, not a mind". That is the shareable feeling.

## Hooks (pick one, test the others)

1. "You didn't get replaced by AI. You got replaced by a checklist." **← in the sheet**
2. "AI automation is not a genius robot. It's a loop with a safety check."
3. "Everyone says AI will do your job. Nobody shows you the four steps it actually runs."

Hook 1 is what beat 1 currently says. The others are alternates for an A/B test:
render them as 4-second cold opens and compare 3-second retention. Change the
`narration` cell to switch, and keep the winning one in the sheet.

## Beat map

| # | Type | s | Narration | `on_screen_text` |
| --- | --- | --- | --- | --- |
| 1 | hook | 4 | You did not get replaced by AI. You got replaced by a checklist. | A checklist |
| 2 | title | 3 | How AI automation actually works. | How AI automation works |
| 3 | explain | 7 | Automation just means steps a machine follows without asking you first. | Steps without asking |
| 4 | explain | 7 | For fifty years those steps were rules. If this, then that. | If this, then that |
| 5 | explain | 7 | Rules break the moment real life looks slightly different from the example. | Rules break easily |
| 6 | analogy | 9 | Now add a model. Something that reads a messy pile and guesses the sensible thing. | Messy in, sensible out |
| 7 | step-by-step | 10 | Set a goal. Give it tools. Check the result. Go again. | The loop |
| 8 | explain | 8 | That loop is the automation. The model is only one part of it. | The loop is the automation |
| 9 | myth-check | 8 | It is not one genius robot. It is a loop with a safety check bolted on. | Not a genius robot |
| 10 | explain | 7 | And the check is where it fails. No check means no automation, just vibes. | Where it fails |
| 11 | recap | 5 | Goal. Tools. Check. Repeat. | The loop |
| 12 | outro | 3 | So next time someone says the AI does it, ask where the check is. | Episode 02 |

## Character usage

- **Outfit:** `casual` — pink tee, charcoal shorts. Every explainer uses it.
- **Framing:** full body in the `presenter` zone; head is ~180 px, so lip-sync runs
  in `full-body` mode (three mouth states, see `docs/11-lip-sync.md`).
- **Expressions used:** `angry`, `confident`, `confused`, `emphatic`, `focused`, `neutral`, `relieved`, `skeptical`, `surprised`, `thinking`, `wink`
- **Gestures used:** `count-three`, `finger-heart`, `point-board`, `point-camera`, `present-open`, `present-wide`, `shake-no`, `sweep-wide`, `talk-hands`
- **Sign-off:** `finger-heart` on the outro. That is the whole CTA.
- **Reserved for restrictions:** `flirty` never appears on this episode, and the
  `summer` outfit is never rendered at all (see `docs/02`).

## Props

| Prop | Slot | Label | Family | First beat |
| --- | --- | --- | --- | --- |
| `board` | C3 | board | abstract | 1 |
| `server` | B2 | server | compute | 2 |
| `figure` | D2 | figure | people | 3 |
| `signpost` | D2 | signpost | abstract | 4 |
| `parcel` | E3 | parcel | people | 5 |
| `envelope` | E3 | envelope | people | 6 |
| `lock` | E3 | lock | abstract | 7 |
| `clock` | C2 | clock | abstract | 7 |

## Accuracy

6 sourced claims. Every claim on screen has a row in `Sources` with a URL
and the date a human opened the link:

- `0102-c1` (beat 3, primary) — Automation follows predefined action sequences, which is why it runs consistently and quickly.
- `0102-c4` (beat 6, primary) — A model can be given tools, and the framework decides when to call them.
- `0102-c2` (beat 7, primary) — Agentic workflows iteratively plan, call tools, evaluate results and correct themselves in a loop.
- `0102-c5` (beat 8, primary) — The defining behaviour of an agentic system is the loop: plan, call tools, evaluate, adjust.
- `0102-c3` (beat 9, primary) — An agent combines a generative model with instructions, knowledge, tools and memory.
- `0102-c6` (beat 10, primary) — Reliable agent systems need explicit checks, approvals and governance rather than autonomy alone.

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
