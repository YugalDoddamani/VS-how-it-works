# Reels

Five short-form scripts, ready to shoot or render. **45–60 seconds each, shot by
shot, with focal lengths — 48.4, 52.0, 54.0, 50.0 and 55.2 seconds.**

| # | Reel | Series | Length | Shots | Outfit |
| --- | --- | --- | --- | --- | --- |
| R01 | [Your phone isn't dying. It's cold.](r01-your-phone-isnt-dying-its-cold/script.md) | Small Tech Mysteries | 48.4 s | 26 | `hoodie` |
| R02 | [The padlock isn't a safety badge.](r02-the-padlock-isnt-a-safety-badge/script.md) | Your Data, Explained | 52.0 s | 26 | `office-casual` |
| R03 | [Why the ad follows you around.](r03-why-the-ad-follows-you/script.md) | Your Data, Explained | 54.0 s | 27 | `casual-dress` |
| R04 | [Why your wifi dies at nine pm.](r04-why-your-wifi-dies-at-9pm/script.md) | Small Tech Mysteries | 50.0 s | 26 | `sporty` |
| R05 | [Your photos live in a warehouse.](r05-your-photos-live-in-a-warehouse/script.md) | The Cloud | 55.2 s | 27 | `casual` |

`index.csv` is the same list in machine-readable form (length, frames, shot count,
outfit) for a future scheduler.

---

## What is in a script

Every `script.md` is the same shape, so any of them can be picked up cold:

1. **Header** — length in seconds *and* frames, shot count, average shot length,
   the outfit and why that outfit.
2. **The promise** and **what the viewer keeps** — the one sentence each.
3. **Three hook variants** — only the first four seconds change between them, so
   they can be A/B tested without re-cutting the reel.
4. **The look** — grade, props, what she is wearing and holding.
5. **The shot list** — the core. One row per shot: timecode in and out, duration,
   shot code, focal length, framing, Nao's position, background, on-screen graphic,
   and the voice-over line.
6. **Key shots in detail** — the 4–6 shots that carry the reel, with the motion,
   the timing, and *why* it works.
7. **How she talks to the viewer** — which interaction device appears where.
8. **Sound** — bed, entries, and the two deliberate silences.
9. **Sources** — one row per claim, with a link status.
10. **Production notes** and a **checklist**.

---

## The format in one screen

| | |
| --- | --- |
| Length | 45–60 s · 1350–1800 frames · 30 fps |
| Shots | 22–27 · average 1.8–2.2 s |
| Hook | 1.2–1.6 s, a thing the viewer has already done |
| The turn | the world appears before 12 s |
| Save frame | one held 2 s still, in the payoff block |
| Sign-off | exactly 2.0 s, never padded |
| Cuts | 95 % hard cuts; one whip per reel |
| Captions | ≤ 14 words, on screen before the line |
| Sound | enters after the hook; two silences |
| Outfit | a different one every reel, no restrictions |

Full spec, including the corner-overlay numbers, the lens table, and the cut
rhythm: [`../docs/12-reels-format.md`](../docs/12-reels-format.md).

---

## The five, briefly

**R01 — Your phone isn't dying. It's cold.** *(48.4 s, hoodie, winter)*
Opens on a phone reading 40 % indoors, then dying outside. The mechanism is a
battery full of slowed ions; the payoff is that the charge was never gone. Ends on
three fixes and one warning: don't charge a frozen battery. The most seasonal of
the five — shoot it when the weather matches.

**R02 — The padlock isn't a safety badge.** *(52.0 s, office-casual)*
Opens on a scam text, then the question everyone actually has: "it has a padlock,
so it's safe, right?" No. The tunnel is encrypted; the building at the end is
unvetted. The save frame is a lookalike domain with two letters swapped. Highest
share rate of the five, because correcting a belief is a social act.

**R03 — Why the ad follows you around.** *(54.0 s, casual-dress)*
One small file, carried between sites. The cookie is a tagged box she physically
moves between shelves — the clearest metaphor in the slate. Ends with the actual
switch, flipped on camera. The only reel with a bright, Saturday grade.

**R04 — Why your wifi dies at nine pm.** *(50.0 s, sporty)*
Starts on a buffering workout video because everyone has watched that spinner.
Three lanes, one pipe, everyone home at once. Three fixes, one of which is a real
cable being plugged in. Broadest audience of the five.

**R05 — Your photos live in a warehouse.** *(55.2 s, casual)*
The wonder reel. She starts scrolling her own camera roll in the dark, then the
warehouse assembles and the frame opens up. One number, held in silence: 1.5 % of
the world's electricity. Ends where it started, phone gone, hands free.

---

## Order to shoot them

1. **R04** — broadest appeal, simplest props, proves the format.
2. **R02** — same prop library, highest share potential.
3. **R01** — seasonal; hold until the weather is cold if it is not already.
4. **R03** — needs the brightest grade and the most props; do it once the pipeline
   is warm.
5. **R05** — the most expensive world; the reward for having the pipeline running.

---

## Honesty about these scripts

- **No reel has been shot or rendered.** These are scripts with timing, not films.
- **Source links marked `confirm link`** were written from knowledge, not opened
  today. A human must open them before publishing. Rows marked `quoted` had their
  supporting sentence read and copied into the workbook's `Sources` tab.
- **Lengths are frame-exact**, not estimates: each shot table sums to the stated
  total at 30 fps, and `tools/` can re-check that when the compiler lands.
- The 76-second explainers in [`../projects/`](../projects/) are a **different
  format** and are not reels. They stay as the long-form archive.
