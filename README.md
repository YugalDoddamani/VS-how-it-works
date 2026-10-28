# Nao Explains

**Tech, explained by someone who is actually nice about it.**

Short vertical videos where a pink-haired illustrated presenter explains how the
things you already use actually work — the cloud, wifi, AI, your own data — in
about seventy seconds, with the whole script on screen so you can watch on mute.

Instagram Reels · YouTube Shorts · TikTok

---

**Watching the films:** every finished reel and episode is copied, unchanged, into
[`final-reels/`](final-reels/) at the root of this repository — one folder, every
film, with a subtitle track and a key-frame sheet beside it. Refresh it with
`cd how-it-works-studio && npm run reels:collect`.

---

## The one-line pitch

> **Nao Explains** — the tech you use every day, explained like a friend showing
> you her phone instead of a man telling you it's simple.

**Promise:** you will never be made to feel late.
**Format:** 60–80 seconds, vertical, captioned, no talking head, no face cam.
**Character:** Nao — illustrated, not a real person, says so on screen.

---

## Who this is for

**Primary — "the curious scroller".**
A woman in her twenties or thirties. Uses tech constantly, has never been given a
straight answer about how it works. Curious, but she is not searching for this:
she is scrolling, and the video has to earn the next three seconds. She does not
want to become a developer. She wants to understand the thing in her hand.

She is not looking for a tutorial. She is not looking for news. She wants the
"oh, *that's* what that is" feeling, and she wants it to be pleasant.

**Secondary — the anime/waifu audience.**
Watches for the character and stays for the explanation. This audience is large,
loyal, and shares aggressively. Important: they must never feel the channel is
using the character as bait. Nao is the presenter, not the product.

**Where the two overlap:** the videos are genuinely good explainers, and genuinely
nice to look at. Neither audience is being tricked into the other.

### What the audience is NOT

- Not developers (they will find the simplification too soft — fine).
- Not children (the tone is adult, the topics are adult: money, privacy, work).
- Not people looking for product reviews or "top 10 AI tools" listicles.

---

## Why this works as a channel

1. **A character, so the topic has a face.** Faces get watched. Diagrams do not.
2. **One question per video.** Never a topic, never "everything about X".
3. **The script is on screen.** Muted autoplay is the default feed experience;
   captions are the product, not an accessibility afterthought.
4. **An isometric world that builds itself.** Each prop arriving is a small
   satisfying event, and the stack of props at the end *is* the explanation.
5. **We say where we are wrong.** Every episode has a caveat beat: the one place
   the analogy breaks. That is what makes the next episode believable.
6. **Sources are listed, in public.** An explainer channel's only real asset is
   being right.

---

## The character

**Nao** — pink bob, black headband, gold eyes, choker, pink tee, charcoal shorts.
Drawn, not filmed. She is the fixed point: topics change, she does not.

- She is an **illustrated explainer**, and every video says so.
- She has no age, no backstory, no opinions outside the topic. That is what lets
  her explain anything without continuity homework.
- She is **never sexualised**, never flirty about money, health, privacy or
  security, and never sells a product.
- Her sign-off is a finger heart. That is the entire CTA.
- Her one running joke is a cat pillow that appears in exactly one beat per
  episode, doing something useful.

Full design, palette, 15 expressions, 18 hand poses, 12 visemes:
[`how-it-works-studio/docs/02-character-and-voice.md`](how-it-works-studio/docs/02-character-and-voice.md)

---

## Visual identity

| | |
| --- | --- |
| **Palette** | warm paper `#FBF7F0`, ink `#241F2B`, one hot accent `#E8743B`, plus Nao's pink `#F2A6C0` |
| **Type** | Inter — 600 weight for statement lines, 700 for titles. Nothing else. |
| **Layout** | five fixed zones: badge, board, presenter, caption, footer. Nothing readable in the platform-risk edges. |
| **Captions** | opaque paper card, two lines maximum, 14 words maximum. Readable over a bright world. |
| **Motion** | the world assembles, then holds. One moving thing at a time. |
| **Signature shot** | `packet-trip`: the camera follows one glowing packet along a path. Once per episode. |
| **Thumbnail** | Nao's face, one prop, three words. Pink reads at every size. |

The style is "a well-printed children's science book an adult is not embarrassed
to watch". Not neon-on-black tech. Not dark mode. Nothing glowing.

---

## The five series

Each episode belongs to one series, and the badge in the corner says which. A
series is a promise about the *kind* of question, which is how a feed turns into
a habit.

| Series | Answers | Example episodes |
| --- | --- | --- |
| **The Cloud** | where your data physically lives | *Where your photos actually live* |
| **AI Without the Hype** | what AI systems actually do | *How AI automation actually works* |
| **Free and Actually Good** | tools, and who really pays for them | *How to tell if a free tool is actually free* |
| **Small Tech Mysteries** | the everyday annoyances | *Why your wifi dies at nine pm* |
| **Your Data, Explained** | privacy, calmly | *What actually happens when you post* |

Series also give the audience a reason to come back: "the wifi one" and "the
privacy one" are things people search for *after* they have seen the format once.

---

## Two formats

| Format | Length | Where | What it is |
| --- | --- | --- | --- |
| **Reel** | 45–60 s · 22–27 shots | [`series/<series>/reels/`](how-it-works-studio/series/README.md) | the feed format — fast cuts, multiple framings, the character in the corner over a moving isometric world |
| Long-form explainer | ~76 s · 12 beats | [`series/<series>/episodes/`](how-it-works-studio/series/README.md) | the deep-cut archive — calmer, more diagram, same character |

Reels are what gets posted. Five are written and shot-listed:
**R01** your phone in the cold · **R02** the padlock · **R03** the ad that follows
you · **R04** wifi at 9pm · **R05** where your photos live.

### The reel look

- She is **in frame constantly**, at three distances: `CU` (85 mm), `MCU` (50 mm),
  and a `CORNER` key at 34 % height over a full-frame world.
- Portrait lenses are the default. 85 mm and 100 mm do the emotional work; 24 mm is
  reserved for the world, never for her face.
- `SPLIT` for comparison only (62 / 38, hard edge), `INSERT` for the mechanism.
- **One cut every ~2.4 s**, hooks at 1.2–1.6 s, and exactly one whip per reel.
- Every reel has one **save frame**: a single held image, legible with the sound
  off, at the 34–44 second mark.

Full grammar, including overlay measurements:
[`docs/12-reels-format.md`](how-it-works-studio/docs/12-reels-format.md)

## Episode anatomy

The shape is fixed. It is why an episode can be written in an afternoon.

| Beat | Length | Job |
| --- | --- | --- |
| 1. Hook | 4 s | a scene she has physically lived through |
| 2. Title | 3 s | name the episode, start the world |
| 3–5. What it is | 18–22 s | the plain-language version, one prop at a time |
| 6. Analogy | 8–9 s | the mental picture, with its mapping said out loud |
| 7–9. How it works | 20–27 s | the mechanism, three steps maximum |
| 10. Caveat / myth | 7–8 s | where the analogy breaks. The trust beat. |
| 11. Recap | 5 s | three or four words, the whole answer |
| 12. Outro | 3 s | the takeaway, the badge, a finger heart |

**Rules that keep retention:**

- The answer is stated by 10 seconds. Never later.
- One new idea per beat. Exactly one.
- Three new terms per episode, maximum.
- No beat exists that could be deleted without confusing anyone.
- The caption is on screen *before* it is needed, and nothing moves while it is
  being read.

---

## Hook formulas that work for this audience

Hooks are written as a **thing that already happened to her**, not as a topic.

| Formula | Example (used in the slate) |
| --- | --- |
| Reframe a familiar annoyance | "Your wifi doesn't hate you. It has rush hour." |
| Contradict the lazy version | "It's not the cloud. It's a building with a security guard." |
| Name the invisible labour | "You didn't get replaced by AI. You got replaced by a checklist." |
| Show the hidden copy | "You posted one photo. Seconds later there were copies you'll never see." |
| Give a reusable test | "If a tool is free, one of four people is paying. None of them are the company." |
| Small number, big scale | "1.5% of the world's electricity goes to buildings you've never seen." |

**Never:** "Did you know…", "Let me explain…", "In today's video…", "Top 5…".

Each episode folder contains three hook variants ready for an A/B test
(`<series>/episodes/<slug>/README.md`).

---

## Profile setup

### Handle

Proposed primary: **@naoexplains** — short, says the format, survives a name
search, and works identically on all three platforms.

Alternates, in order of preference: `@heynao` · `@naoactually` ·
`@howitworks.nao` · `@naosplain`.

Check availability before committing to one, and buy the matching domain even if
you never use it. Use the **same handle everywhere** — a viewer who finds you on
Shorts and searches on Instagram must land in the right place.

### Instagram

**Name field** (the searchable one, not the handle):
`Nao · tech explained simply`

**Bio** (150 characters maximum):

```
tech explained like a friend would
✨ the cloud, wifi, AI, your data
🎀 new episode every week
illustrated character · not a person
```

**Highlights:** `the cloud` · `wifi` · `AI` · `your data` · `free tools` — one per
series, each holding that series' episodes.

**Link in bio:** a single page listing the series, the source list, and the
"start here" episode. Five links in a bio splits attention; one page does not.

### YouTube Shorts

**Channel name:** `Nao Explains`
**Handle:** `@naoexplains`
**Banner:** paper background, Nao on the right at 40% height, three words on the
left: "tech explained simply". Readable at 25% zoom, because that is how it is
actually seen.
**Channel description:**

```
The tech you use every day, explained in about a minute — the cloud, wifi, AI,
your data — by Nao, an illustrated character. Not a real person.

One question per episode. Sources in every description. New episode weekly.
```

**Shorts title formula:** the question, then the promise.
`Why your wifi dies at 9pm (it's rush hour)` · `Where your photos actually live
(it's not the cloud)`.

Never title a Short with a bare topic ("Data Centres"). Title it with the thing
the viewer already felt.

---

## Posting cadence

One episode per week, same day, same time. Consistency beats volume for a channel
whose value is a *habit* of being understood.

| Slot | Use |
| --- | --- |
| Weekly episode | the slate in `series/<series>/episodes/` (0101–0105 are written) |
| Alternate weeks | a 15-second "one thing" cut from an existing episode — the single best sentence, re-hooked |
| Never | posting twice in a day, or a "part 2" with no part 1 shipped |

Each episode yields at least three assets: the Reel/Short, a 15 s cut, and a
carousel of the recap chips.

---

## Hashtags

Three sets, rotated so no post looks copy-pasted:

- **Core (always):** `#techexplained` `#howitworks`
- **Series (one):** `#thecloud` `#aiwithoutthehype` `#freeandactuallygood`
  `#smalltechmysteries` `#yourdataexplained`
- **Reach (one or two):** `#womenintech` `#techtok` `#learnontiktok`
  `#digitalwellbeing`

Five tags maximum. Tags are a weak signal on every platform right now; the hook
and the first two seconds do the work. Do not spend a save slot on tag research.

---

## Engagement playbook

- **Reply in character, briefly.** Nao is warm and never condescending. Never
  "actually…".
- **Pin a comment with the sources** for every episode. It is the cheapest trust
  signal available and almost nobody does it.
- **Answer "but what about X" with next week's episode.** Every objection is a
  topic backlog entry; that is what `how-it-works-studio/topics.md` is for.
- **Ask the question from the video back.** "Which one were you today?" outperforms
  "follow for more" every time.
- **Never bait comments with a deliberately wrong statement.** It works once and
  costs the channel's entire premise.

## Metrics that matter

| Metric | Why | Target after 10 episodes |
| --- | --- | --- |
| 3-second retention | the hook either works or the episode is invisible | > 70% |
| Saves per 1,000 views | the framework episodes should be saved, not just liked | > 15 |
| Shares per 1,000 views | a shared explainer is a social object | > 8 |
| Follows per 1,000 views | the feed is converting to a habit | > 4 |
| Comments asking a question | the audience is treating us as an explainer | > 5 per episode |

Likes are not on this list. A like is the cheapest possible signal.

---

## Disclosure and safety

- Every episode opens and closes with **"Illustrated explainer · not a real
  person"**.
- Nao never gives medical, legal, financial or security advice, and never
  explains how to attack a system.
- Every factual claim has a source row with a URL and the date it was checked.
  Sources go in the description, not just the repo.
- No vendor logos, no real screenshots, no copied diagrams. Every visual is drawn.
- A correction ships as a re-cut with the correction named. Never a silent swap.

---

## What we do not do

- No face cam, no voice-only videos, no "reaction" format.
- No engagement bait, no fake outrage, no "you're using your phone wrong".
- No AI-generated scripts published unchecked. The pipeline renders what a person
  wrote and sourced.
- No listicles that expire. Frameworks that stay true.
- No outfit is flagged off. Every look in the model sheet is in rotation, one per
  reel, chosen to match the setting. The character stays constant: headband,
  choker, pink palette, bob.

---

## The repository

The studio is a real, if unfinished, pipeline: the episodes are authored in a
spreadsheet, compiled to a timeline, and rendered frame by frame in a headless
browser.

```
how-it-works-studio/
├── README.md               the technical quick start
├── docs/01–14              the spec: character, writing, style, world, motion,
│                           scenes, the content sheet, rendering, QC, lip-sync, reels,
│                           the R03 production report
├── IMPLEMENTATION-PLAN.md  build order, phase by phase
├── series/                 ← everything is organised by series
│   ├── index.csv           every item: series, format, length, outfit, status
│   ├── <series>/series.md  who it is for, the look, the roster
│   ├── <series>/reels/r0N-slug/script.md        45–60 s, shot by shot
│   └── <series>/episodes/010N-slug/             76–78 s, beat by beat
├── content/how-it-works.xlsx   the workbook: 5 episodes, 60 beats, 22 sources
├── assets/nao/             model sheet, viseme set, expression and pose crops
├── tools/                  content checker, workbook builder, episode generator
└── src/                    the lip-sync engine, the reel compiler, the stage renderer
```

**Status, stated plainly:** five reels are written shot-by-shot, five long-form
episodes are written, validated and scheduled, and **one reel has been rendered** —
[R03, 45.00 s](how-it-works-studio/series/your-data-explained/reels/r03-why-the-ad-follows-you/output/r03-why-the-ad-follows-you.mp4)
— with a scrubbable browser preview (`node tools/preview-server.mjs`). It is an
animatic: real timing, captions, lip-sync and camera grammar; flat vector art, no
sound, talking heads only. Nothing is published.
There is **no renderer yet** and no episode has been rendered. The lip-sync
engine is real and tested (`npm test`), and the storyboards contain the actual
mouth schedules it produces.

Start with [`how-it-works-studio/README.md`](how-it-works-studio/README.md).
