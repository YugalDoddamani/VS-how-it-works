# Series

Everything in the channel lives under a **series**. A series is the promise; the
format is the length. That is why this folder exists instead of a `reels/` folder
and a `projects/` folder sitting next to each other: `r03` and `0105` are not
siblings just because they are both "Your Data, Explained" — the series is the
parent, and the format is what hangs off it.

```
series/
├── index.csv                     every item, one row, with its series and format
├── <series-slug>/
│   ├── series.md                 who it is for, the look, the roster, the rules
│   ├── reels/<reel-slug>/script.md       45–60 s, shot by shot
│   ├── reels/<reel-slug>/reel.json       compiled (git-ignored)
│   ├── reels/<reel-slug>/output/         the cut: .mp4 + key-frames.jpg
│   └── episodes/<episode-slug>/          76–78 s, beat by beat
```

Two formats, one character, one world, one compiler:

| Format | Length | Where | What it is |
| --- | --- | --- | --- |
| **Reel** | 45–60 s · 22–27 shots | `<series>/reels/` | the feed format — fast cuts, several framings, her in the corner over a moving isometric world |
| **Episode** | 76–78 s · 12 beats | `<series>/episodes/` | the deep cut — calmer, more diagram, same character |

## The five series

| Series | The promise | Reels | Episodes |
| --- | --- | --- | --- |
| [Small Tech Mysteries](small-tech-mysteries/series.md) | The everyday gadget behaves badly and nobody explains why. | R01, R04 | 0104 |
| [Your Data, Explained](your-data-explained/series.md) | What actually happens to your data, minus the panic. | R02, R03 | 0105 |
| [The Cloud](the-cloud/series.md) | It is a building. It is always a building. | R05 | 0101 |
| [AI Without the Hype](ai-without-the-hype/series.md) | AI, described the way an engineer would describe it to a friend. | — | 0102 |
| [Free and Actually Good](free-and-actually-good/series.md) | Nothing is free. Find out who is paying. | — | 0103 |

**Two series have no reel yet.** That is a gap, not a decision — 0102 and 0103
were written before the reel format existed. Their reels are the next two things
to write.

## All ten items

| Id | Title | Series | Format | Length |
| --- | --- | --- | --- | --- |
| R01 | Your phone isn't dying. It's cold. | Small Tech Mysteries | reel | 48.4 s |
| R02 | The padlock isn't a safety badge. | Your Data, Explained | reel | 52.0 s |
| **R03** | **Why the ad follows you around.** | Your Data, Explained | reel | **45.0 s — rendered** |
| R04 | Why your wifi dies at nine pm. | Small Tech Mysteries | reel | 50.0 s |
| R05 | Your photos live in a warehouse. | The Cloud | reel | 55.2 s |
| 0101 | Where your photos actually live | The Cloud | episode | 76 s |
| 0102 | How AI automation actually works | AI Without the Hype | episode | 78 s |
| 0103 | How to tell if a free tool is actually free | Free and Actually Good | episode | 76 s |
| 0104 | Why your wifi dies at nine pm | Small Tech Mysteries | episode | 76 s |
| 0105 | What actually happens when you post | Your Data, Explained | episode | 76 s |

R04 and 0104 are the **same question in two formats** on purpose: the reel is the
feed cut, the episode is the archive cut, and they share their sources.

`index.csv` is the same list for a scheduler: series, format, id, slug, seconds,
frames, shots, outfit, status, path.

## What is in a reel script

1. **Header** — length in seconds *and* frames, shot count, average shot length, the outfit and why.
2. **The promise** and **what the viewer keeps**.
3. **Three hook variants** — only the first four seconds change.
4. **The look** — grade, props, the world.
5. **The shot list** — one row per shot: in/out, duration, shot code, focal length, framing, her position, background, graphic, voice-over.
6. **Key shots in detail** — the 4–8 shots that carry the reel.
7. **How she talks to the viewer** — which device appears where.
8. **Sound** — bed, entries, the two silences.
9. **Sources** — with `quoted` vs `confirm link`.
10. **Production notes** and a **checklist**.

Format spec: [`../docs/12-reels-format.md`](../docs/12-reels-format.md).

## What is in an episode folder

| File | Authored by | Contents |
| --- | --- | --- |
| `README.md` | a person | idea, audience, hooks, beat map, accuracy notes |
| `script.md` | `tools/build-projects.mjs` | narration, claims, reading-speed check |
| `storyboard.md` | `tools/build-projects.mjs` | per-beat visuals + the real mouth schedule |
| `publishing.md` | `tools/build-projects.mjs` | caption, hashtags, cover, title, sources |

A render adds `episode.json`, `frames/` and `output/final.mp4`. None exist yet.

## Commands

```bash
python3 tools/check_content.py          # validates every reel and every episode
node tools/compile-reel.mjs             # script.md → reel.json, for every reel
node tools/preview-server.mjs           # play and scrub a reel in a browser
node tools/render-reel.mjs --reel r03 --all --mp4 <path>   # frames → MP4
node tools/build-projects.mjs           # regenerate episode documents
python3 tools/build-nao-sprites.py      # re-cut the 12 viseme sprites
```

## Honest status

Ten items are written. **One is rendered**: R03 has a 45.00 s animatic MP4 and a
scrubbable browser preview.

| Item | State |
| --- | --- |
| R03 Why the ad follows you around | **rendered** — `output/r03-why-the-ad-follows-you.mp4` |
| R01, R02, R04, R05 | scripts, shot by shot, not compiled |
| 0101–0105 | episode documents, not compiled |

"Rendered" means an animatic: real timing, captions, lip-sync and camera grammar
drawn by the stage — flat vector illustrations, **no sound**, talking heads only.
It is not a finished illustrated film, and nothing here is published. Every
`confirm link` in a sources table still needs a human to open it.
