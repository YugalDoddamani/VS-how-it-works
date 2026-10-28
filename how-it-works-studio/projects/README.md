# Projects

One folder per episode. Five live here, all **written and scheduled, none rendered**.

| Episode | Series | Length | Folder |
| --- | --- | --- | --- |
| 0101 Where your photos actually live | The Cloud | 76 s | `0101-where-your-photos-actually-live/` |
| 0102 How AI automation actually works | AI Without the Hype | 78 s | `0102-how-ai-automation-actually-works/` |
| 0103 How to tell if a free tool is actually free | Free and Actually Good | 76 s | `0103-how-to-tell-if-a-free-tool-is-actually-free/` |
| 0104 Why your wifi dies at nine pm | Small Tech Mysteries | 76 s | `0104-why-your-wifi-dies-at-nine-pm/` |
| 0105 What actually happens when you post | Your Data, Explained | 76 s | `0105-what-happens-when-you-post/` |

Each folder holds:

| File | Authored by | Contents |
| --- | --- | --- |
| `README.md` | a person | the idea, audience, three hook variants, beat map, character usage, accuracy notes |
| `script.md` | `tools/build-projects.mjs` | narration, claims, and the reading-speed check |
| `storyboard.md` | `tools/build-projects.mjs` | per-beat visuals plus the real mouth schedule from the lip-sync engine |
| `publishing.md` | `tools/build-projects.mjs` | caption, hashtags, cover, YouTube title, source list |

A render adds `episode.json`, `preview/`, `frames/` (git-ignored) and
`output/final.mp4`. None of those exist yet, and nothing in these folders claims
otherwise.

The episode rows live in `content/csv/` — one workbook for the whole series. A
project folder is a *view* of those rows, not a second copy. Fix the sheet, then
rebuild:

```bash
python3 tools/check_content.py     # validate every episode
node tools/build-projects.mjs      # regenerate script / storyboard / publishing
```
