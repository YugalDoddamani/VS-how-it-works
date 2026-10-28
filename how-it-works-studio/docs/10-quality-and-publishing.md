# Quality, Safety, and Publishing

Two separate questions, checked separately:

- **Is it good?** Readable, clear, well-paced, on-model.
- **Is it true?** Every claim sourced, current, and not overstated.

An explainer channel fails on the second one slowly and completely. A wrong video
that performs well is the worst possible outcome, because it is the one that gets
shared.

## Accuracy checklist

- [ ] Every factual claim has a `Sources` row with a URL and a `checked` date.
- [ ] The source was **opened and read**, not inferred from its title.
- [ ] `kind = primary` wherever a spec, RFC, or official doc exists.
- [ ] Any `secondary` source carries a `quote`, and the publishing copy says so.
- [ ] Numbers carry a date ("as of 2026") and are still current.
- [ ] Hedged where the answer is genuinely conditional ("usually", "by default").
- [ ] Named products are described only as their own documentation describes them.
- [ ] No security instructions, no exploitation detail, no vulnerability speculation.
- [ ] No medical, legal, or financial advice.
- [ ] Analogies are on the tested list, or the episode says where the new one
      breaks.
- [ ] The recap does not contradict any beat.
- [ ] A second person read the `script.md` for errors the author cannot see.

## Script checklist

- [ ] The question passes the four-question test in `03-script-and-explainer-writing.md`.
- [ ] The answer is stated within the first 10 seconds.
- [ ] One idea per beat. No beat could be deleted without loss.
- [ ] No more than three new terms across the episode.
- [ ] Each term is defined by what it does before it is named.
- [ ] The caveat beat exists and says one honest limit.
- [ ] The recap chips use the same words as the beats that introduced them.
- [ ] Read aloud, nothing causes a stumble.
- [ ] It is understandable muted, in one watch, on a phone.

## Visual checklist

- [ ] Every caption fits the band in two lines at 44 px.
- [ ] Nothing readable in the top 176 px or bottom 72 px.
- [ ] Nao is inside the `presenter` zone in every sampled frame.
- [ ] Every prop is inside the `board` zone at the beat's camera.
- [ ] Depth order is correct — no prop pokes through another.
- [ ] Lighting is consistent: top lightest, left mid, right darkest.
- [ ] No more than three prop families visible at once.
- [ ] One accent object per beat, maximum.
- [ ] Nothing behind the caption band moves while a caption is legible.
- [ ] No missing glyphs (no tofu boxes) — no emoji anywhere.
- [ ] No blank or half-built frames at a beat start, except a sanctioned
      `hook` or `title`.

## Character checklist

- [ ] Proportions match the design (6.5 heads, 1120 px tall).
- [ ] Palette is exactly Nao's; she is not tinted by the world.
- [ ] Line weight matches the props.
- [ ] Expression matches the sentence's intent.
- [ ] No expression is reused as filler in three consecutive beats.
- [ ] Blink and breathe are present in every beat over 4 s (she must look alive).
- [ ] Gesture is on the emphasis word, not on a random frame.
- [ ] First and last beat carry the "Illustrated explainer · not a real person"
      footer.

## Motion checklist

- [ ] Each beat has a real hold: at least 45 frames where nothing moves but idle
      life.
- [ ] Camera moves on beat changes, not mid-sentence.
- [ ] Props assemble in slot order, staggered, in the first third of a beat.
- [ ] No text moves while it is being read.
- [ ] Captions were on screen before they were needed.
- [ ] No motion faster than 0.2 s that carries meaning.
- [ ] No flashing above 3 Hz.

## Technical checklist

- [ ] MP4 exists and opens.
- [ ] 1080 × 1920, 30 fps, H.264, `yuv420p`, faststart.
- [ ] Duration equals `totalFrames / 30` exactly.
- [ ] ffprobe frame count equals `totalFrames`.
- [ ] Contact sheet inspected; every sampled frame is a composed frame.
- [ ] `npm run determinism -- <slug>` passes.
- [ ] If audio: exactly one AAC stream, synced, measured, and **listened to**.
- [ ] If silent: the report says so and the user was told.
- [ ] `render-report.json` contains no unresolved error.
- [ ] Frames deleted only after `verify` passed.

Do not claim a visual review you did not perform. "Rendered and verified" means
the commands ran and you looked at the contact sheet; it does not mean a human
watched the finished film.

## Accessibility checklist

- [ ] Caption contrast ≥ 7:1 (ink on white: ~13:1).
- [ ] Meaning is never carried by colour alone — pair with a strike-through, a
      check, or a label.
- [ ] The smallest text is 24 px.
- [ ] No all-caps body text.
- [ ] The narration is a faithful reading of the caption (not a different script),
      so a listener and a reader get the same lesson.
- [ ] Gestures and expressions are not the only signal for a key idea.

## Asset rights

- [ ] Only original geometry, bundled fonts, and audio the channel has rights to.
- [ ] Fonts: Inter, SIL OFL 1.1, licence file present in `assets/fonts/`.
- [ ] Music: licensed or synthesized locally; recorded in `assets/README.md`.
- [ ] Generated narration: noted as generated, with the tool named, in the report.
- [ ] No vendor logos, no screenshots of real products, no copied diagrams.
- [ ] No real people's names, accounts, photos, or data.

## Publishing document

`npm run publish -- <slug>` writes `projects/<slug>/publishing.md` containing:

1. Suggested title (the question, restated as a hook).
2. The post caption from the `Publish` tab.
3. Three to five hashtags.
4. The disclosure line: `Illustrated explainer. Not a real person.`
5. Cover frame and cover text.
6. **The full source list**, with URLs and `checked` dates.
7. The audio status (silent / narrated) and how the narration was produced.
8. Known limitations and any outstanding review item.

The source list in the post description is not optional. It is the difference
between an explainer and a confident guess.

## Corrections

- A factual error is corrected by shipping a re-cut, `-v2`, with the correction
  named in the description. Never silently replace a published file.
- The `Sources` row that was wrong gets a note, so the next episode does not
  repeat the mistake.
- If the error is significant, the fix goes out as its own short episode rather
  than quietly disappearing — an audience that watches a correction trusts the
  channel more, not less.

## Final report to the user

Report:

- Video path and duration.
- `episode.json`, `script.md`, and `publishing.md` paths.
- Resolution, frame rate, codec, and whether there is audio.
- The checks actually performed, and which were skipped.
- Any issue requiring human review: an unverified claim, a beat that feels
  rushed, a prop that reads ambiguously.
- What was **not** done — no audition of the mix, no human watch-through — stated
  plainly.

## Publishing is manual

Nothing in this repository posts to a platform. The operator reviews the file,
fills the `Publish` tab, runs `npm run publish`, and uploads by hand. Automation
of publishing is out of scope until there is a supported, authorised workflow —
and even then, an explainer should not go out without someone having read it.
