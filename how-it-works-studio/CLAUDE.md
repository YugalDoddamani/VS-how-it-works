# Claude Code Instructions

## Project

This project turns technology questions into short vertical explainer videos.
The presenter is an anime character, **Nao**, drawn as an SVG rig. The world
behind her is an isometric prop stage that assembles itself in step with what she
says.

The distinguishing constraint: **the episode is authored in a spreadsheet**, not
in code. A row in `Beats` is a scene. If you find yourself hand-editing
`episode.json` or hardcoding narration in `src/stage/`, you are in the wrong
layer.

Read the relevant files in `docs/` before changing behaviour, and read
`README.md` for the commands that actually run.

## Current state

- **Specification only.** `docs/` and `templates/` are written. `src/` does not
  exist yet.
- `IMPLEMENTATION-PLAN.md` is the build order. Work through it in order; do not
  start the renderer before the workbook compiler exists, because the compiler
  defines the contract the renderer consumes.
- No episode has been rendered. Do not claim one has.

Verify before you claim anything works:

```bash
npm run doctor
npm test
npm run sheet:check
npm run check -- <slug>
npm run render -- <slug>
```

## Creating an episode

When the user says "create an episode", "explain X", or similar:

1. Use the supplied question. If none is supplied, take the first unchecked
   entry in `topics.md`.
2. Add a row to `Episodes` with the next free `episode_id`, a slug
   `NNNN-short-title`, a `level` from `Vocab`, and `status = draft`.
3. Write the answer **before** writing the beats. One paragraph, plain language,
   no jargon that the episode does not then define. If you cannot write that
   paragraph, the question is too big for one episode — split it and say so.
4. Add `Sources` rows for every claim you intend to make. A claim without a
   source does not go on screen. Prefer primary documentation over blog posts.
5. Fill `Beats`: 8–14 rows, 4–10 s each, `beat_type` from `Vocab`, one idea per
   beat. Obey the narration and caption length limits in
   `docs/03-script-and-explainer-writing.md`.
6. Fill `Props` for anything the world must show. Reuse prop ids from
   `templates/sheet/props.csv` before inventing one.
7. `npm run sheet:check`, then `npm run sheet:build -- <slug>`.
8. `npm run preview -- <slug>` and actually look at the contact sheet.
9. `npm run render -- <slug>`, then the checks in
   `docs/10-quality-and-publishing.md`.
10. Fill `Publish`. Report output paths, duration, checks performed, and
    limitations.

Only move `status` forward after the step it names has actually happened. A
revision of a shipped episode gets its own project folder with a `-v2` suffix —
never overwrite a rendered project.

## Writing rules for Nao

- **Short sentences, one idea each.** If a sentence has a comma and a "which",
  split it or cut it.
- **Second person for the viewer, first person sparingly.** "You type an address"
  beats "the user types an address".
- **Define by doing, not by naming.** Describe what the thing *does* before you
  say what it is called. The name then lands as confirmation.
- **Analogy first, mechanism second, caveat third.** Never lead with a caveat.
- **Never dumb down to the point of being wrong.** "The internet is a big
  library" is fine as a hook only if the beat immediately says where the analogy
  breaks. Add a `myth-check` beat when the common simplification is actively
  false.
- **No hype.** "Blazing fast", "revolutionary", "game-changing" are banned.
  Numbers with a source are welcome.
- **Anime is visual, not verbal.** Nao's expressions and the props carry the
  tone. Do not write "Wow!" in the narration when a surprised face and a
  squash-and-stretch prop can do it.

## Recurring character

- Nao is a fixed design: silhouette, palette, and proportions come from
  `docs/02-character-and-voice.md` and must not drift episode to episode.
- She is drawn, and the video says so. The first and last beats carry the
  "Illustrated explainer · not a real person" footer.
- She has no biography, no age, no relationships, and no opinions outside the
  topic. Keep her blank enough that she can explain anything.
- She gestures; she does not walk through a doorway into a new scene, she does
  not fight, and she is never sexualised. Poses are listed in `Vocab`.

## Creative defaults

- Genre: illustrated technology explainer.
- Format: vertical, 1080 × 1920, for Reels / Shorts / TikTok.
- Target duration: 45–75 s. Under 30 s only for a single-definition episode;
  over 90 s means split it.
- Structure: hook → what it is → how it works → why it matters → recap.
- One topic per episode. No "part 1 of 7" unless the series column says so.
- Audience: a curious adult who is not a programmer. Assume no background.
- Language: English. Keep on-screen text free of idiom that breaks in
  translation, since the channel is watched subtitled.

## Technical defaults

- Resolution 1080 × 1920, 30 fps, H.264, yuv420p, faststart.
- Render with a headless browser, stitch frames with FFmpeg.
- Animation must be deterministic and driven by frame time. No `Date.now()`,
  no `Math.random()`, no CSS animations, no network at render time.
- The sheet is the only external input, and it is read at build time by
  `src/lib/sheet.js`, never by the browser.
- Use local assets. Four Inter weights ship in `assets/fonts/`; add nothing
  without a licence file next to it.
- Never assume TTS or music is configured. Silent is a valid output.
- Never fabricate a quality check or claim to have viewed an output you did not
  inspect.

## Working rules

- Reuse components instead of building a new visual system per episode.
- Preserve the established style unless the user asks for a change.
- If a beat needs a visual the prop library cannot make, add the prop to the
  library (and to the gallery config) rather than a one-off scene.
- If the question is vague, make a reasonable editorial call and note it in
  `script.md`. Ask only when a decision cannot be safely inferred.
- Keep the implementation simple, documented, and reproducible.

## Where to change what

| Goal | File |
| --- | --- |
| Change a column name or add a tab | `docs/08-content-sheet.md`, then `src/lib/sheet.js` |
| Add a validation rule | `src/lib/plan.js`, then `test/plan.test.js` |
| Change sheet → episode.json | `src/lib/compile.js` |
| Add a beat type | `src/stage/scenes.js`, register in `SCENES`, add to `gallery.js` |
| Add a prop | `src/stage/iso/props.js`, add mesh style to `style.css`, add to gallery |
| Add a Nao pose or expression | `src/stage/rig/nao.js`, then `Vocab` |
| Change palette, type scale, or the five zones | `src/stage/style.css` (`:root` custom properties) |
| Change timing maths | `src/stage/timeline.js` |
| Add an easing curve | `src/stage/motion.js` |
| Change the output format | `src/lib/encode.js` |
| Add a CLI command | `src/cli.js` |
| Teach the docs a new behaviour | `docs/`, then `README.md` |

Keep all visual state a pure function of `(episode, frame)`. `npm run
determinism -- <slug>` is what catches a regression.

After changing anything in `src/`, run `npm test` and re-render the example
episode to confirm frames still look right.

## Expected project output

```
projects/<slug>/
├── episode.json          # compiled from the sheet, never edited by hand
├── script.md             # narration and sources, generated for review
├── publishing.md         # copied from the Publish tab
├── render-report.json
├── preview/
│   ├── contact-sheet.png
│   └── frames/
├── frames/               # generated, git-ignored, safe to delete after verification
└── output/
    └── final.mp4
```

`content/how-it-works.xlsx` and `content/csv/*.csv` are the source of truth and
are always committed. `projects/*/frames/` is not.
