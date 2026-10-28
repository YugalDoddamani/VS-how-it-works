# Assets

Every visual in an episode is drawn with HTML/CSS/SVG at render time. There are no
image or video files to license, and nothing is downloaded during a render.

## Fonts

**Status: not yet added.** These four files are the intended set, copied from the
reference studio (`digital-suspense-studio/assets/fonts/`) during Phase 0 of
`IMPLEMENTATION-PLAN.md`. Until they are in place, `npm run doctor` reports the
fonts as missing and the stage falls back to a system sans-serif, which changes
line breaks and therefore layout. Do not ship a rendered episode on the fallback.

| File | Family | Weight | License |
| --- | --- | --- | --- |
| `fonts/inter-latin-400-normal.woff2` | Inter | 400 | SIL OFL 1.1 |
| `fonts/inter-latin-500-normal.woff2` | Inter | 500 | SIL OFL 1.1 |
| `fonts/inter-latin-600-normal.woff2` | Inter | 600 | SIL OFL 1.1 |
| `fonts/inter-latin-700-normal.woff2` | Inter | 700 | SIL OFL 1.1 |

Source: <https://github.com/rsms/inter> (the Inter Project Authors), distributed via
the `@fontsource/inter` npm package. Latin subset only, under 25 KB per file.

The full licence is `fonts/OFL.txt` and must travel with the files. The SIL Open
Font License allows bundling and redistribution, including commercially, provided
the licence stays with the fonts and the fonts are not sold on their own.

Fonts load from disk, never a CDN, so a render is offline and byte-identical
across machines. This matters more here than it does for a story video: Inter has
no emoji glyphs, so an emoji in the sheet renders as a tofu box and nobody notices
until a frame is inspected.

## Audio (not present yet)

| Path | What | Rights |
| --- | --- | --- |
| `audio/sfx/*.mp3` | Interface and prop sounds | to be recorded/synthesized locally |
| `audio/music/*.mp3` | Beds | must be licensed; record the licence here |

Rules:

- Synthesize or record locally where possible, and note how in this file.
- If a track is licensed, record the licence name, the source, and the expiry.
- Generated narration is noted as generated, with the tool and the date, in the
  episode's `render-report.json`.
- Never commit audio the channel cannot prove the rights to.

## Character art

The presenter **Nao** is drawn from a rig in `src/stage/rig/`, not from images.

Once the rig exists, `nao/model-sheet.png` belongs here: front, three-quarter, and
side views plus the expression grid. It is a reference for a human checking new
poses. It is not used at render time, and the render never loads it.

## Adding an asset

1. Confirm the licence permits commercial use and redistribution.
2. Put the licence text next to the file.
3. Record it in the tables above.
4. Load it locally — never over the network.
5. Re-run `npm run determinism -- <slug>` to confirm nothing shifted.
