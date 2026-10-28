# The Content Sheet

## The idea

The only authoring surface in this project is a spreadsheet. One workbook holds
every episode: what it says, what the world shows, where the facts came from, and
what the caption will be.

This is a deliberate constraint, and it buys four things:

1. **Non-technical editing.** Someone who has never opened a terminal can write an
   episode. The words, the timings, and the props are all cells.
2. **Diffable history.** Exported to CSV and committed, a change to one sentence
   is one line in a pull request.
3. **Bounded output.** Fixed columns mean every episode has the same shape. You
   cannot accidentally author a 4-minute video.
4. **Fast failure.** The whole workbook is validated before a single frame is
   drawn, so a typo costs a second, not a 20-minute render.

The cost is real: some things are awkward in rows, and the format resists
one-off ideas. That is the trade, made on purpose.

## Where the sheet lives

| Form | Path | Role |
| --- | --- | --- |
| **Working copy** | a Google Sheet (or `content/how-it-works.xlsx`) | where a person edits |
| **Snapshot** | `content/how-it-works.xlsx` | committed, the input to a build |
| **CSV mirror** | `content/csv/<tab>.csv` | committed, readable diffs |
| **Schema** | `templates/sheet/*.csv` | committed starting points: header-only, except `Vocab` (fully seeded) and `Episodes`/`Beats` (one illustrative row each) |

The workbook is never read at render time. `content/how-it-works.xlsx` is read by
`npm run sheet:build`, compiled to `projects/<slug>/episode.json`, and the
renderer consumes only that JSON.

### Getting a Google Sheet into the repo

```bash
npm run sheet:pull
```

This downloads every tab from a *published* Google Sheet as CSV, writes
`content/csv/`, and reassembles `content/how-it-works.xlsx`. It needs network
access and a sheet URL in `studio.config.json` (`sheet.id`). It is a
convenience, not part of the pipeline — a build never needs it, so a laptop on a
plane can still render.

**The snapshot is committed even when the working copy is a Google Sheet.** That
is what makes a published episode reproducible: the sheet can keep changing, but
the episode's input is frozen in git alongside the episode itself.

### Headers, not positions

The reader maps columns by **header name**, normalised: lowercased, spaces and
punctuation collapsed to `_`. So `Beat No`, `beat_no` and `BEAT_NO` are the same
column, and column order in the sheet is irrelevant.

- Renaming a header is a breaking change: update the `Vocab` tab, this document,
  and `src/lib/sheet.js` together.
- Deleting a column is safe; its field falls back to a default.
- Adding a column is safe; unknown columns are ignored (and reported as a note by
  `sheet:check`, so typos like `naration` are caught).

Fully empty rows are dropped. A row whose first required cell is empty is
dropped with a warning naming the row number — spreadsheets accumulate empty
rows at the bottom and a build should not fail because of one.

## The tabs

| Tab | One row is | Required | Contributes |
| --- | --- | --- | --- |
| `Episodes` | an episode | yes | top-level metadata |
| `Beats` | one beat | yes | `scenes[]` and `captions[]` |
| `Props` | one prop instance | no | prop id → label, colour, slot, state |
| `Paths` | one travel path | no | `packet-trip` geometry |
| `Character` | one Nao cue | no | pose / gesture / expression changes |
| `Sources` | one factual claim | yes, per claim | fact-check trail |
| `Publish` | one episode's publishing copy | before publishing | `publishing.md` |
| `Vocab` | one allowed value | yes | the controlled vocabulary |

Six tabs get you a working episode. `Character` and `Paths` are refinements.

---

## `Episodes`

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `episode_id` | text, 4 digits | yes | `0001`. Never reused, never reformatted as a number in Sheets (`'0001`). |
| `slug` | text | yes | `0001-what-happens-when-you-type-a-url`. Lowercase, hyphens, ≤ 60 chars. Becomes the project folder. |
| `title` | text | yes | Sentence case, ≤ 60 chars. Shown on the `title` beat. |
| `question` | text | yes | The hook's question, ending in `?`. ≤ 90 chars. |
| `series` | text | yes | `Networking`, `Security`, `Web`. Must exist in `Vocab.series`. |
| `level` | enum | yes | `beginner` / `intermediate` / `advanced`. Sets the pacing preset. |
| `target_seconds` | int | yes | 45–90. The compiler's timing source of truth. |
| `answer_oneliner` | text | yes | ≤ 90 chars. The recap/outro line. |
| `music` | text | no | Local file under `assets/audio/`, or blank for silent. |
| `status` | enum | yes | `draft` → `scripted` → `built` → `rendered` → `published`. |
| `author` | text | no | Who wrote it. |
| `updated` | date | no | `YYYY-MM-DD`. |

`status` is a state machine, and the CLI enforces it: `sheet:build` refuses a
`draft` that has no beats, and `publish` refuses anything not `rendered`. A row
cannot claim to be finished.

## `Beats`

The heart of the sheet. One row per beat, in order.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `episode_id` | text | yes | Foreign key to `Episodes`. |
| `beat_no` | int | yes | 1..n, contiguous. |
| `beat_type` | enum | yes | From `Vocab.beat_type`. |
| `duration_s` | decimal | yes | Seconds, one decimal. 3.0–12.0. |
| `narration` | text | yes | What she says. ≤ 22 words, ≤ 2 sentences. |
| `on_screen_text` | text | no | The board's title/card label. ≤ 6 words. |
| `board_items` | list | no | `;`-separated, each ≤ 4 words. Rendered as rows or steps. |
| `props` | list | no | `prop_id` or `prop_id@slot`, `;`-separated. ≤ 5. |
| `camera` | enum | no | From `Vocab.camera`. Defaults per beat type. |
| `gesture` | enum | no | From `Vocab.gesture`. |
| `expression` | enum | no | From `Vocab.expression`. |
| `emphasis` | list | no | Tokens in `narration` to tint and stress. ≤ 2. |
| `transition` | enum | no | `fade` (default) / `wipe` / `none`. |
| `sfx` | text | no | Local file name under `assets/audio/sfx/`. |
| `note` | text | no | Editorial note for the human. Never rendered. |

Constraints that the validator enforces:

- `(episode_id, beat_no)` is unique, and `beat_no` runs `1..n` with no gaps.
- `sum(duration_s) × 30` is within ±15 % of `target_seconds × 30`.
- No beat shorter than 3.0 s or longer than 12.0 s.
- `narration` ≤ 22 words and ≤ 2 sentences (`?!.` boundaries). Two exceptions,
  because they are not prose: `step-by-step` may carry one short sentence per
  step (3–4 sentences for 3–4 steps), and `recap` may be a list of noun
  fragments ("Name. Address. Request. Page.").
- `on_screen_text` ≤ 6 words, and not a verbatim copy of `narration` — the board
  is a label, not a subtitle.
- `emphasis` tokens must appear (case-insensitive) inside `narration`.
- A `step-by-step` beat has 2–4 `board_items`.
- An `analogy` beat has at least 2 `props` (the metaphor has to be visible) and
  at least 2 `board_items` (the mapping has to be stated).
- A `packet-trip` beat has 2+ `props` and a matching `Paths` row.
- `props` referencing an unknown prop id is an error, not a warning.

Example:

```
episode_id,beat_no,beat_type,duration_s,narration,on_screen_text,board_items,props,camera,gesture,expression,emphasis,transition,sfx,note
0001,6,step-by-step,10.0,"You ask a resolver. It asks up the chain. The answer comes back.",The lookup,Resolver; Root; Authoritative,server@C3;tower@B2;server@E4,board,count-three,focused,resolver;chain,fade,pop-soft,first time we show three machines
```

## `Props`

Optional. A row here overrides a prop's default label, colour family, slot, or
state for one episode. Anything not listed uses the library default.

The key is `(episode_id, prop_id, slot)` — the slot is part of it because one
episode may place the same prop twice, at two slots, with two different labels
(the reference episode has a `server` as `C3` and another as `E4`).

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `episode_id` | text | yes | |
| `prop_id` | enum | yes | Must exist in the prop library. |
| `slot` | text | no | `A1`–`F6`. Overrides the slot in `Beats`. |
| `label` | text | no | Pin label, ≤ 3 words. Blank = no label. |
| `family` | enum | no | `compute` / `network` / `storage` / `people` / `abstract`. |
| `state` | enum | no | `idle` / `busy` / `off` / `error` / `focus`. |
| `first_beat` | int | no | Becomes visible at this beat instead of the one that names it. |
| `note` | text | no | |

`first_beat` exists for continuity: a prop that appears at beat 4 and is referred
to at beat 9 stays on stage, and marking where it starts keeps the assembly
stagger predictable.

## `Paths`

Optional. Only `packet-trip` beats need it.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `episode_id` | text | yes | |
| `beat_no` | int | yes | Which beat the path belongs to. |
| `from_slot` | slot | yes | |
| `to_slot` | slot | yes | |
| `arc_height` | decimal | no | World units, 0.5–3.0. Default 1.5. |
| `role` | enum | yes | `request` (`--accent`) / `response` (`--good`) / `sync` (`--link`). |
| `delay_s` | decimal | no | Offset from beat start. Default 0. |
| `travel_s` | decimal | no | Default: remainder of the beat minus 0.6 s. |

## `Character`

Optional. Fine control over Nao within a beat, when the beat's own `gesture` and
`expression` columns are not enough — for example, a pose change mid-beat.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `episode_id` | text | yes | |
| `beat_no` | int | yes | |
| `at_s` | decimal | yes | Offset from beat start. |
| `pose` | enum | no | From `Vocab.pose`. |
| `gesture` | enum | no | From `Vocab.gesture`. |
| `expression` | enum | no | From `Vocab.expression`. |
| `blend_s` | decimal | no | Default 0.4. |

If this tab has rows for a beat, they *replace* that beat's single
`gesture`/`expression` with a timeline. Keep it to 1–2 rows per beat; more means
the performance is being over-directed.

## `Sources`

Required for every factual claim.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `episode_id` | text | yes | |
| `claim_id` | text | yes | `0001-c1`, unique across the workbook. |
| `beat_no` | int | yes | Which beat makes the claim. |
| `claim` | text | yes | The claim, as stated on screen. ≤ 20 words. |
| `source_title` | text | yes | |
| `source_url` | url | yes | Prefer primary docs, RFCs, specs. |
| `checked` | date | yes | `YYYY-MM-DD`, the day a human opened the link. |
| `kind` | enum | yes | `primary` / `secondary` / `definition` / `measured`. |
| `quote` | text | no | The sentence that supports it. Strongly recommended. |

Rules:

- Every beat that states a fact needs a `Sources` row. The validator cannot read
  for meaning, so it applies a proxy rule: a beat is treated as *factual* when
  `beat_type` is in `explain`, `diagram`, `step-by-step`, `compare`,
  `myth-check`, or `analogy`, and it then requires at least one source row for
  that beat. A warning, not an error, because some beats are pure transition.
- `kind = primary` is the default expectation. A `secondary` source needs a
  `quote`, and the publishing copy says so.
- `checked` older than 12 months is a warning. Numbers age.
- The `quote` column is what makes a claim auditable months later, when the page
  has changed.

## `Publish`

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `episode_id` | text | yes | |
| `caption` | text | yes | The post text, ≤ 220 chars, ending with a question. |
| `hashtags` | list | yes | 3–5, `;`-separated, no banned tags. |
| `cover_frame` | int | no | Frame number for the cover. Default: the hook's `on_screen_text` frame. |
| `cover_text` | text | no | ≤ 5 words for a text overlay on the cover. |
| `series_tag` | text | no | e.g. `#Networking101`. |
| `disclosure` | text | yes | Default: `Illustrated explainer. Not a real person.` |
| `published_url` | url | no | Filled after posting. |

## `Vocab`

The controlled vocabulary. Every enum cell elsewhere is checked against this tab,
so adding a value is a data edit, not a code edit.

| Column | Type | Notes |
| --- | --- | --- |
| `kind` | enum | `beat_type` / `beat_type_target` / `camera` / `gesture` / `expression` / `pose` / `prop_id` / `prop_family` / `level` / `series` / `status` / `transition` / `source_kind` / `sfx` |
| `value` | text | The exact string used in the sheet. |
| `label` | text | Human-readable name for reports. |
| `notes` | text | When to use it. |
| `deprecated` | bool | `TRUE` means "reject new uses, warn on existing". |

Because the vocabulary is data, the validator's error message can be genuinely
useful:

```
Beats!C7: beat_type "step" is not in Vocab.
  Did you mean: step-by-step?
  Known beat_type values: hook, title, explain, analogy, diagram,
  zoom-in, step-by-step, compare, packet-trip, myth-check, recap, outro
```

Levenshtein distance is used for the "did you mean" hint. It costs three lines
and it is the difference between a writer fixing a cell and a writer asking for
help.

---

## Compiler behaviour

`npm run sheet:build -- <episode_id>` performs, in order:

1. Read every tab, normalise headers, drop empty rows.
2. Validate (all issues collected; errors stop the build, warnings print).
3. Filter `Beats`, `Props`, `Paths`, `Character`, `Sources`, `Publish` to the one
   `episode_id`. (Rows for other episodes are ignored, not an error — one
   workbook holds the whole series.)
4. Convert seconds to frames; the last beat absorbs rounding.
5. Resolve prop instances (join `Beats.props` against `Props`).
6. Emit `captions[]` from `narration` + `emphasis`, timed in **global** frames.
7. Emit `episode.json` and `script.md`.
8. Record `source: { workbook, hash, builtAt }` so a stale compile is detectable.

`npm run sheet:check` runs steps 1–2 and, for each episode, step 4's arithmetic —
without writing anything.

### Staleness

`episode.json` records a SHA-256 of the workbook. `npm run check -- <slug>`
recomputes it and warns `episode.json is stale: rebuild from the sheet` when they
differ. That single hash prevents the most confusing class of bug in a
sheet-driven pipeline: a render that reflects a sentence someone already fixed.

---

## Editing workflow in Google Sheets

Practical notes for whoever holds the pen.

1. **Always work on the `Beats` tab with `episode_id` filtered** to the episode
   you are writing. The tab holds the whole series.
2. **`episode_id` is text.** Prepend an apostrophe (`'0001`) or format the column
   as plain text, or Sheets will strip the leading zeros and every foreign key
   breaks.
3. **`duration_s` is a decimal with a dot.** A locale that writes `4,5` gets a
   clear error, not a silently wrong frame count.
4. **No line breaks inside cells.** A narration cell is one paragraph. The
   compiler does not join multi-line cells; if it sees a newline, `sheet:check`
   warns that the text will be collapsed.
5. **No merged cells, no formulas in data cells, no conditional formatting that
   rewrites text.** Formatting is fine; computed content is not, because the CSV
   export carries the *value*, and a formula's value depends on when it was read.
6. **One episode per branch.** Two people editing the same episode in a Google
   Sheet will both win the merge; the workbook is not git-merged.
7. **`npm run sheet:pull && npm run sheet:check` before every commit.** A pull
   followed by a clean check is the only proof that the real sheet is valid.

### When the sheet is a file, not a Google Doc

If the working copy is `content/how-it-works.xlsx` in the repo, the same rules
apply, plus:

- Never commit with a render's intermediate state in the file.
- Export the CSVs in the same commit (`npm run sheet:export`), so the diff is
  readable in review.
- `.xlsx` is binary; the CSV mirror is what a reviewer reads. If the two
  disagree, the CSV mirror is wrong and must be regenerated.

---

## Adding a column

1. Is it needed by **two** episodes? If not, use `note` and move on.
2. Add it to this document and to `templates/sheet/<tab>.csv`.
3. Add the field to `src/lib/sheet.js` (read) and `src/lib/compile.js` (emit).
4. Add a validation rule to `src/lib/plan.js` with a test for both the pass and
   the fail case.
5. Add it to the `Vocab` tab if it is an enum.
6. Rebuild every existing episode to prove the default is backward compatible.

A column that only one episode uses is a column every future episode pays for in
confusion. The format's value is its narrowness.

## Anti-patterns

| Don't | Because |
| --- | --- |
| Put narration text in `src/` | The renderer must not know the script |
| Hand-edit `episode.json` | It is generated; the sheet is truth and the hash will disagree |
| Author captions directly | `narration` + `emphasis` is the single source; two sources drift |
| Use `duration_s` with two decimals | It is a typo, not a precision request; frames are integers |
| Put a whole paragraph in `on_screen_text` | It is a board label; the caption band is the script |
| Reference a prop that has no gallery entry | An unreviewable visual ships |
| Keep an episode at `built` after re-rendering | Status must reflect reality; the CLI checks files, not the cell |
